use std::path::{Path, PathBuf};

use anyhow::{anyhow, Context, Result};
use git2::{BranchType, DescribeOptions, Repository, Status, StatusOptions};

use super::types::{
    GitBranchInfo, GitInfo, GitOperationStatus, GitStashInfo, GitVersionInfo, GitWorkingStatus,
};

#[derive(Debug, Clone, Copy)]
#[allow(clippy::struct_excessive_bools)]
pub struct GitCollectionOptions {
    pub include_status: bool,
    pub include_stash: bool,
    pub include_operation: bool,
    pub include_version: bool,
}

impl Default for GitCollectionOptions {
    fn default() -> Self {
        Self {
            include_status: true,
            include_stash: true,
            include_operation: true,
            include_version: true,
        }
    }
}

/// High level helper around git repositories.
pub struct GitService {
    repo: Repository,
    workdir: PathBuf,
    git_dir: PathBuf,
}

impl GitService {
    /// Try to discover a Git repository starting from the provided path.
    ///
    /// # Errors
    ///
    /// Returns an error if Git repository discovery fails or if the working
    /// directory cannot be determined.
    pub fn discover<P: AsRef<Path>>(path: P) -> Result<Self> {
        let repo = Repository::discover(path.as_ref()).with_context(|| {
            format!(
                "Failed to locate git repository from {}",
                path.as_ref().display()
            )
        })?;

        let workdir = repo.workdir().map_or_else(
            || {
                repo.path()
                    .parent()
                    .map_or_else(|| PathBuf::from("."), Path::to_path_buf)
            },
            Path::to_path_buf,
        );
        let git_dir = repo.path().to_path_buf();

        Ok(Self {
            repo,
            workdir,
            git_dir,
        })
    }

    /// Collect a snapshot of repository state.
    #[must_use]
    pub fn collect_info(&self) -> GitInfo {
        self.collect_info_with_options(&GitCollectionOptions::default())
    }

    /// Collect repository information according to the provided options.
    #[must_use]
    pub fn collect_info_with_options(&self, options: &GitCollectionOptions) -> GitInfo {
        let branch = self.branch_info().unwrap_or_default();
        let status = if options.include_status {
            self.working_status().unwrap_or_default()
        } else {
            GitWorkingStatus::default()
        };
        let stash = if options.include_stash {
            self.stash_info().unwrap_or_default()
        } else {
            GitStashInfo::default()
        };
        let operation = if options.include_operation {
            self.operation_status()
        } else {
            GitOperationStatus::default()
        };
        let version = if options.include_version {
            self.version_info().unwrap_or_default()
        } else {
            GitVersionInfo::default()
        };

        GitInfo {
            is_repo: true,
            branch,
            status,
            stash,
            operation,
            version,
        }
    }

    /// Estimate number of tracked entries (index size) in the repository.
    #[must_use]
    pub fn estimate_workdir_entries(&self) -> usize {
        self.repo.index().map(|index| index.len()).unwrap_or(0)
    }

    fn branch_info(&self) -> Result<GitBranchInfo> {
        let head = self.repo.head()?;
        let detached = !head.is_branch();

        let current = if detached {
            head.target().map_or_else(
                || "HEAD".to_string(),
                |oid| format!("HEAD@{}", &oid.to_string()[..7]),
            )
        } else {
            head.shorthand().unwrap_or("HEAD").to_string()
        };

        let mut info = GitBranchInfo {
            current,
            detached,
            ..GitBranchInfo::default()
        };

        if detached {
            return Ok(info);
        }

        let shorthand = head
            .shorthand()
            .ok_or_else(|| anyhow!("Unable to resolve branch name"))?;

        let local_branch = self.repo.find_branch(shorthand, BranchType::Local)?;
        if let Ok(upstream) = local_branch.upstream() {
            info.upstream = upstream.name()?.map(std::string::ToString::to_string);

            if let (Some(local_oid), Some(upstream_oid)) =
                (local_branch.get().target(), upstream.get().target())
            {
                if let Ok((ahead, behind)) = self.repo.graph_ahead_behind(local_oid, upstream_oid) {
                    info.ahead = ahead;
                    info.behind = behind;
                }
            }
        }

        Ok(info)
    }

    fn working_status(&self) -> Result<GitWorkingStatus> {
        let mut opts = StatusOptions::new();
        opts.include_untracked(true)
            .recurse_untracked_dirs(true)
            .renames_head_to_index(true)
            .renames_index_to_workdir(true);

        let statuses = self.repo.statuses(Some(&mut opts))?;

        let mut result = GitWorkingStatus::default();

        for entry in statuses.iter() {
            let status = entry.status();

            if status.intersects(Status::CONFLICTED) {
                result.conflicted += 1;
            }

            if status.intersects(
                Status::INDEX_NEW
                    | Status::INDEX_MODIFIED
                    | Status::INDEX_DELETED
                    | Status::INDEX_RENAMED
                    | Status::INDEX_TYPECHANGE,
            ) {
                result.staged += 1;
            }

            if status.intersects(
                Status::WT_MODIFIED
                    | Status::WT_DELETED
                    | Status::WT_TYPECHANGE
                    | Status::WT_RENAMED,
            ) {
                result.unstaged += 1;
            }

            if status.intersects(Status::WT_NEW) {
                result.untracked += 1;
            }
        }

        result.clean = result.staged == 0
            && result.unstaged == 0
            && result.untracked == 0
            && result.conflicted == 0;

        Ok(result)
    }

    fn stash_info(&self) -> Result<GitStashInfo> {
        let mut count = 0usize;
        let mut repo = Repository::open(&self.workdir)
            .with_context(|| "Failed to open repository for stash inspection")?;
        repo.stash_foreach(|_, _, _| {
            count += 1;
            true
        })
        .ok();

        Ok(GitStashInfo { count })
    }

    fn operation_status(&self) -> GitOperationStatus {
        let mut status = GitOperationStatus::default();

        let git_dir = &self.git_dir;
        status.rebasing =
            git_dir.join("rebase-apply").exists() || git_dir.join("rebase-merge").exists();
        status.merging = git_dir.join("MERGE_HEAD").exists();
        status.cherry_pick =
            git_dir.join("CHERRY_PICK_HEAD").exists() || git_dir.join("REVERT_HEAD").exists();
        status.bisecting = git_dir.join("BISECT_LOG").exists();

        status
    }

    fn version_info(&self) -> Result<GitVersionInfo> {
        let head = self.repo.head()?;
        let commit = head.peel_to_commit()?;

        let commit_id = commit.id().to_string();
        let short_commit_id: String = commit.id().to_string().chars().take(7).collect();
        let message = commit.summary().unwrap_or("").to_string();
        let author = commit
            .author()
            .name()
            .map(std::string::ToString::to_string)
            .unwrap_or_default();
        let timestamp = commit.time().seconds();

        let describe = self.repo.describe(
            DescribeOptions::new()
                .describe_tags()
                .show_commit_oid_as_fallback(true),
        );
        let tag = describe.ok().and_then(|desc| desc.format(None).ok());

        Ok(GitVersionInfo {
            commit_id,
            short_commit_id,
            message,
            author,
            timestamp,
            tag,
        })
    }

    /// Expose repository workdir for callers that need it.
    #[must_use]
    pub fn workdir(&self) -> &Path {
        &self.workdir
    }
}
