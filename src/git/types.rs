use std::default::Default;

#[derive(Debug, Clone, PartialEq, Eq, Default)]
pub struct GitBranchInfo {
    pub current: String,
    pub upstream: Option<String>,
    pub detached: bool,
    pub ahead: usize,
    pub behind: usize,
}

#[derive(Debug, Clone, PartialEq, Eq, Default)]
pub struct GitWorkingStatus {
    pub clean: bool,
    pub staged: usize,
    pub unstaged: usize,
    pub untracked: usize,
    pub conflicted: usize,
}

#[derive(Debug, Clone, PartialEq, Eq, Default)]
pub struct GitStashInfo {
    pub count: usize,
}

#[derive(Debug, Clone, PartialEq, Eq, Default)]
#[allow(clippy::struct_excessive_bools)]
pub struct GitOperationStatus {
    pub rebasing: bool,
    pub merging: bool,
    pub cherry_pick: bool,
    pub bisecting: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Default)]
pub struct GitVersionInfo {
    pub commit_id: String,
    pub short_commit_id: String,
    pub message: String,
    pub author: String,
    pub timestamp: i64,
    pub tag: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Default)]
pub struct GitInfo {
    pub is_repo: bool,
    pub branch: GitBranchInfo,
    pub status: GitWorkingStatus,
    pub stash: GitStashInfo,
    pub operation: GitOperationStatus,
    pub version: GitVersionInfo,
}
