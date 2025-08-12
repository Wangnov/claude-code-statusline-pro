"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/config/schema.ts
var import_zod, UsageInfoSchema, TranscriptEntrySchema, ColorSchema, AutoDetectSchema, BaseComponentSchema, ProjectComponentSchema, ModelComponentSchema, BranchComponentSchema, TokenThresholdsSchema, TokenColorsSchema, TokenStatusIconsSchema, TokenComponentSchema, StatusIconsSchema, StatusColorsSchema, StatusComponentSchema, ComponentsSchema, StyleSchema, AdvancedSchema, ExperimentalSchema, PresetMappingSchema, TemplateConfigSchema, TemplatesSchema, ConfigSchema, InputDataSchema, RenderContextSchema;
var init_schema = __esm({
  "src/config/schema.ts"() {
    "use strict";
    import_zod = require("zod");
    UsageInfoSchema = import_zod.z.object({
      input_tokens: import_zod.z.number(),
      cache_creation_input_tokens: import_zod.z.number(),
      cache_read_input_tokens: import_zod.z.number(),
      output_tokens: import_zod.z.number()
    });
    TranscriptEntrySchema = import_zod.z.object({
      type: import_zod.z.string(),
      message: import_zod.z.object({
        usage: UsageInfoSchema.optional(),
        stop_reason: import_zod.z.string().optional(),
        content: import_zod.z.array(import_zod.z.unknown()).optional()
      }).optional()
    }).passthrough();
    ColorSchema = import_zod.z.enum([
      "black",
      "red",
      "green",
      "yellow",
      "blue",
      "magenta",
      "cyan",
      "white",
      "gray",
      "bright_red",
      "bright_green",
      "bright_yellow",
      "bright_blue",
      "bright_magenta",
      "bright_cyan",
      "bright_white"
    ]);
    AutoDetectSchema = import_zod.z.union([import_zod.z.boolean(), import_zod.z.literal("auto")]);
    BaseComponentSchema = import_zod.z.object({
      enabled: import_zod.z.boolean().default(true),
      icon: import_zod.z.string(),
      nerd_icon: import_zod.z.string().optional(),
      text_icon: import_zod.z.string().optional(),
      color: ColorSchema
    });
    ProjectComponentSchema = BaseComponentSchema.extend({
      show_when_empty: import_zod.z.boolean().default(false)
    });
    ModelComponentSchema = BaseComponentSchema.extend({
      show_full_name: import_zod.z.boolean().default(false),
      custom_names: import_zod.z.record(import_zod.z.string(), import_zod.z.string()).default({})
    });
    BranchComponentSchema = BaseComponentSchema.extend({
      show_when_no_git: import_zod.z.boolean().default(false),
      max_length: import_zod.z.number().min(1).default(20)
    });
    TokenThresholdsSchema = import_zod.z.object({
      warning: import_zod.z.number().min(0).max(100).default(60),
      danger: import_zod.z.number().min(0).max(100).default(85),
      backup: import_zod.z.number().min(0).max(100).default(85),
      critical: import_zod.z.number().min(0).max(100).default(95)
    });
    TokenColorsSchema = import_zod.z.object({
      safe: ColorSchema.default("green"),
      warning: ColorSchema.default("yellow"),
      danger: ColorSchema.default("red")
    });
    TokenStatusIconsSchema = import_zod.z.object({
      backup: import_zod.z.string().default("\u26A1"),
      critical: import_zod.z.string().default("\u{1F525}")
    });
    TokenComponentSchema = BaseComponentSchema.extend({
      show_progress_bar: import_zod.z.boolean().default(true),
      show_percentage: import_zod.z.boolean().default(true),
      show_raw_numbers: import_zod.z.boolean().default(false),
      context_window: import_zod.z.number().default(2e5),
      progress_bar_width: import_zod.z.number().default(10),
      progress_bar_chars: import_zod.z.object({
        filled: import_zod.z.string().default("\u2588"),
        empty: import_zod.z.string().default("\u2591"),
        backup: import_zod.z.string().default("\u2593")
      }).optional(),
      colors: TokenColorsSchema.optional(),
      thresholds: TokenThresholdsSchema.optional(),
      status_icons: TokenStatusIconsSchema.optional(),
      status_nerd_icons: TokenStatusIconsSchema.optional(),
      status_text_icons: TokenStatusIconsSchema.optional()
    });
    StatusIconsSchema = import_zod.z.object({
      ready: import_zod.z.string().default("\u2705"),
      thinking: import_zod.z.string().default("\u{1F4AD}"),
      tool: import_zod.z.string().default("\u{1F527}"),
      error: import_zod.z.string().default("\u274C"),
      warning: import_zod.z.string().default("\u26A0\uFE0F")
    });
    StatusColorsSchema = import_zod.z.object({
      ready: ColorSchema.default("green"),
      thinking: ColorSchema.default("yellow"),
      tool: ColorSchema.default("blue"),
      error: ColorSchema.default("red"),
      warning: ColorSchema.default("yellow")
    });
    StatusComponentSchema = BaseComponentSchema.extend({
      show_recent_errors: import_zod.z.boolean().default(true),
      icons: StatusIconsSchema.optional(),
      nerd_icons: StatusIconsSchema.optional(),
      text_icons: StatusIconsSchema.optional(),
      colors: StatusColorsSchema.optional()
    });
    ComponentsSchema = import_zod.z.object({
      order: import_zod.z.array(import_zod.z.string()).default(["project", "model", "branch", "tokens", "status"]),
      project: ProjectComponentSchema.optional(),
      model: ModelComponentSchema.optional(),
      branch: BranchComponentSchema.optional(),
      tokens: TokenComponentSchema.optional(),
      status: StatusComponentSchema.optional()
    });
    StyleSchema = import_zod.z.object({
      separator: import_zod.z.string().default(" | "),
      enable_colors: AutoDetectSchema.default("auto"),
      enable_emoji: AutoDetectSchema.default("auto"),
      enable_nerd_font: AutoDetectSchema.default("auto"),
      compact_mode: import_zod.z.boolean().default(false),
      max_width: import_zod.z.number().min(0).default(0)
    });
    AdvancedSchema = import_zod.z.object({
      cache_enabled: import_zod.z.boolean().default(true),
      recent_error_count: import_zod.z.number().min(1).default(5),
      git_timeout: import_zod.z.number().min(100).default(1e3),
      debug_mode: import_zod.z.boolean().default(false),
      custom_color_codes: import_zod.z.record(import_zod.z.string(), import_zod.z.string()).default({})
    });
    ExperimentalSchema = import_zod.z.object({
      show_context_health: import_zod.z.boolean().default(false),
      adaptive_colors: import_zod.z.boolean().default(false),
      show_timestamp: import_zod.z.boolean().default(false),
      show_session_info: import_zod.z.boolean().default(false),
      force_nerd_font: import_zod.z.boolean().default(false)
    });
    PresetMappingSchema = import_zod.z.object({
      P: import_zod.z.literal("project"),
      M: import_zod.z.literal("model"),
      B: import_zod.z.literal("branch"),
      T: import_zod.z.literal("tokens"),
      S: import_zod.z.literal("status")
    }).default({
      P: "project",
      M: "model",
      B: "branch",
      T: "tokens",
      S: "status"
    });
    TemplateConfigSchema = import_zod.z.object({
      description: import_zod.z.string().optional(),
      style: StyleSchema.partial().optional(),
      components: ComponentsSchema.partial().optional()
    }).passthrough();
    TemplatesSchema = import_zod.z.record(import_zod.z.string(), TemplateConfigSchema).optional();
    ConfigSchema = import_zod.z.object({
      preset: import_zod.z.string().default("PMBTS"),
      theme: import_zod.z.string().optional(),
      preset_mapping: PresetMappingSchema.optional(),
      components: ComponentsSchema.optional(),
      style: StyleSchema.optional(),
      advanced: AdvancedSchema.optional(),
      experimental: ExperimentalSchema.optional(),
      templates: TemplatesSchema
    }).passthrough();
    InputDataSchema = import_zod.z.object({
      // 支持两种字段名格式
      hook_event_name: import_zod.z.string().optional(),
      hookEventName: import_zod.z.string().optional(),
      session_id: import_zod.z.string().optional(),
      sessionId: import_zod.z.string().optional(),
      transcript_path: import_zod.z.string().optional(),
      transcriptPath: import_zod.z.string().optional(),
      cwd: import_zod.z.string().optional(),
      model: import_zod.z.object({
        id: import_zod.z.string().optional(),
        display_name: import_zod.z.string().optional()
      }).optional(),
      workspace: import_zod.z.object({
        current_dir: import_zod.z.string().optional(),
        project_dir: import_zod.z.string().optional()
      }).optional(),
      gitBranch: import_zod.z.string().optional(),
      git: import_zod.z.object({
        branch: import_zod.z.string().optional(),
        status: import_zod.z.string().optional(),
        ahead: import_zod.z.number().optional(),
        behind: import_zod.z.number().optional()
      }).optional()
    }).passthrough().transform((data) => ({
      hookEventName: data.hookEventName || data.hook_event_name || "Status",
      sessionId: data.sessionId || data.session_id || null,
      transcriptPath: data.transcriptPath || data.transcript_path || null,
      cwd: data.cwd || process.cwd(),
      model: data.model || {},
      workspace: data.workspace || {},
      gitBranch: data.gitBranch || data.git?.branch || null
    }));
    RenderContextSchema = import_zod.z.object({
      inputData: InputDataSchema,
      capabilities: import_zod.z.object({
        colors: import_zod.z.boolean(),
        emoji: import_zod.z.boolean(),
        nerdFont: import_zod.z.boolean()
      }),
      colors: import_zod.z.record(import_zod.z.string(), import_zod.z.string()),
      icons: import_zod.z.record(import_zod.z.string(), import_zod.z.string()),
      config: ConfigSchema
    });
  }
});

// src/config/loader.ts
var loader_exports = {};
__export(loader_exports, {
  ConfigLoader: () => ConfigLoader,
  configLoader: () => configLoader
});
function getCurrentDir() {
  try {
    if (typeof __dirname !== "undefined") {
      return __dirname;
    }
  } catch {
  }
  try {
    if (typeof import_meta !== "undefined" && import_meta.url) {
      const url = import_meta.url;
      if (url.startsWith("file://")) {
        return import_node_path.default.dirname(url.slice(7));
      }
    }
  } catch {
  }
  return process.cwd();
}
var import_node_fs, import_node_path, import_toml, import_meta, ConfigLoader, configLoader;
var init_loader = __esm({
  "src/config/loader.ts"() {
    "use strict";
    import_node_fs = __toESM(require("fs"), 1);
    import_node_path = __toESM(require("path"), 1);
    import_toml = __toESM(require("@iarna/toml"), 1);
    init_schema();
    import_meta = {};
    ConfigLoader = class {
      cachedConfig = null;
      configPath = null;
      /**
       * 查找配置文件 | Find config file
       */
      findConfigFile() {
        const possiblePaths = [
          // 当前目录 | Current directory
          import_node_path.default.join(process.cwd(), "statusline.config.toml"),
          import_node_path.default.join(process.cwd(), ".statusline.toml"),
          // 用户主目录 | User home directory
          import_node_path.default.join(
            process.env["HOME"] || process.env["USERPROFILE"] || "",
            ".config",
            "claude-statusline",
            "config.toml"
          ),
          import_node_path.default.join(process.env["HOME"] || process.env["USERPROFILE"] || "", ".statusline.toml"),
          // 包目录 | Package directory (fallback)
          import_node_path.default.join(getCurrentDir(), "../../statusline.config.toml")
        ];
        for (const configPath of possiblePaths) {
          if (import_node_fs.default.existsSync(configPath)) {
            return configPath;
          }
        }
        return null;
      }
      /**
       * 深度合并对象 | Deep merge objects
       */
      deepMerge(target, source) {
        const result = { ...target };
        for (const key in source) {
          const sourceValue = source[key];
          const targetValue = result[key];
          if (sourceValue && typeof sourceValue === "object" && !Array.isArray(sourceValue)) {
            result[key] = this.deepMerge(targetValue || {}, sourceValue);
          } else if (sourceValue !== void 0) {
            result[key] = sourceValue;
          }
        }
        return result;
      }
      /**
       * 清理对象中的 Symbol 属性 | Clean Symbol properties from objects
       * TOML 解析器会在数组上添加 Symbol 元数据，需要清理以避免序列化错误
       */
      cleanSymbols(obj) {
        if (obj === null || typeof obj !== "object") {
          return obj;
        }
        if (Array.isArray(obj)) {
          return obj.map((item) => this.cleanSymbols(item));
        }
        const cleaned = {};
        for (const [key, value] of Object.entries(obj)) {
          cleaned[key] = this.cleanSymbols(value);
        }
        return cleaned;
      }
      /**
       * 应用预设配置 | Apply preset configuration
       */
      applyPreset(config) {
        if (!config.preset) return config;
        const preset = config.preset.toUpperCase();
        const mapping = config.preset_mapping;
        if (!mapping) {
          console.warn("No preset mapping found, using default");
          return config;
        }
        for (const char of preset) {
          if (!(char in mapping)) {
            console.warn(`Unknown preset character: ${char}`);
            return config;
          }
        }
        const newOrder = [];
        for (const char of preset) {
          const componentName = mapping[char];
          if (componentName) {
            newOrder.push(componentName);
          }
        }
        const updatedConfig = { ...config };
        if (!updatedConfig.components) {
          updatedConfig.components = {
            order: newOrder
          };
        } else {
          updatedConfig.components.order = newOrder;
        }
        const allComponents = Object.values(mapping);
        for (const componentName of allComponents) {
          if (updatedConfig.components) {
            const component = updatedConfig.components[componentName];
            if (component && typeof component === "object" && "enabled" in component) {
              component["enabled"] = newOrder.includes(componentName);
            }
          }
        }
        return updatedConfig;
      }
      /**
       * 加载配置 | Load configuration
       */
      async loadConfig(options = {}) {
        try {
          if (this.cachedConfig && !options.customPath && !options.overridePreset) {
            return this.cachedConfig;
          }
          this.configPath = options.customPath || this.findConfigFile();
          let userConfig = {};
          if (this.configPath && import_node_fs.default.existsSync(this.configPath)) {
            try {
              const configContent = await import_node_fs.default.promises.readFile(this.configPath, "utf8");
              const parsedToml = import_toml.default.parse(configContent);
              userConfig = this.cleanSymbols(parsedToml);
            } catch (error) {
              console.warn(`Failed to parse config file ${this.configPath}:`, error);
            }
          }
          if (options.overridePreset) {
            userConfig.preset = options.overridePreset;
          }
          if (process.env["DEBUG"]) {
            console.error(
              "Before ConfigSchema.parse, userConfig:",
              JSON.stringify(userConfig, null, 2)
            );
          }
          const config = ConfigSchema.parse(userConfig);
          if (process.env["DEBUG"]) {
            console.error("After ConfigSchema.parse, config keys:", Object.keys(config));
          }
          const finalConfig = this.applyPreset(config);
          this.cachedConfig = finalConfig;
          return finalConfig;
        } catch (error) {
          if (error instanceof Error && "issues" in error) {
            const zodError = error;
            console.error("Configuration validation failed:");
            for (const issue of zodError.issues) {
              console.error(`  ${issue.path.join(".")}: ${issue.message}`);
            }
          } else {
            console.error("Failed to load configuration:", error);
          }
          console.warn("Using default configuration");
          const defaultConfig = ConfigSchema.parse({});
          this.cachedConfig = this.applyPreset(defaultConfig);
          return this.cachedConfig;
        }
      }
      /**
       * 获取配置路径 | Get config path
       */
      getConfigPath() {
        return this.configPath;
      }
      /**
       * 清除缓存 | Clear cache
       */
      clearCache() {
        this.cachedConfig = null;
      }
      /**
       * 验证配置文件 | Validate config file
       */
      async validateConfig(configPath) {
        const errors = [];
        try {
          const targetPath = configPath || this.findConfigFile();
          if (!targetPath || !import_node_fs.default.existsSync(targetPath)) {
            errors.push("Configuration file not found");
            return { valid: false, errors };
          }
          const configContent = await import_node_fs.default.promises.readFile(targetPath, "utf8");
          const parsedToml = import_toml.default.parse(configContent);
          ConfigSchema.parse(parsedToml);
          return { valid: true, errors: [] };
        } catch (error) {
          if (error instanceof Error && "issues" in error) {
            const zodError = error;
            for (const issue of zodError.issues) {
              errors.push(`${issue.path.join(".")}: ${issue.message}`);
            }
          } else {
            errors.push(error instanceof Error ? error.message : "Unknown error");
          }
          return { valid: false, errors };
        }
      }
      /**
       * 别名方法 - 为了向后兼容
       */
      async load(configPath) {
        return this.loadConfig({ customPath: configPath });
      }
      /**
       * 获取配置源路径
       */
      getConfigSource() {
        return this.configPath;
      }
      /**
       * 检查配置文件是否存在
       */
      async configExists(configPath) {
        const targetPath = configPath || this.findConfigFile();
        return targetPath !== null && import_node_fs.default.existsSync(targetPath);
      }
      /**
       * 创建默认配置文件
       */
      async createDefaultConfig(configPath) {
        const defaultConfig = ConfigSchema.parse({});
        const targetPath = configPath || import_node_path.default.join(process.cwd(), "statusline.config.toml");
        const tomlContent = import_toml.default.stringify(defaultConfig);
        await import_node_fs.default.promises.writeFile(targetPath, tomlContent, "utf8");
        this.configPath = targetPath;
        this.cachedConfig = defaultConfig;
      }
      /**
       * 保存配置到文件
       */
      async save(config, configPath) {
        const targetPath = configPath || this.configPath || import_node_path.default.join(process.cwd(), "statusline.config.toml");
        const tomlContent = import_toml.default.stringify(config);
        await import_node_fs.default.promises.writeFile(targetPath, tomlContent, "utf8");
        this.cachedConfig = config;
        this.configPath = targetPath;
      }
      /**
       * 重置配置到默认值
       */
      async resetToDefaults(configPath) {
        const defaultConfig = ConfigSchema.parse({});
        await this.save(defaultConfig, configPath);
      }
      /**
       * 应用主题
       */
      async applyTheme(themeName, configPath) {
        const currentConfig = await this.load(configPath);
        const themedConfig = {
          ...currentConfig,
          theme: themeName
        };
        await this.save(themedConfig, configPath);
      }
      /**
       * 获取默认配置
       */
      getDefaultConfig() {
        return ConfigSchema.parse({});
      }
    };
    configLoader = new ConfigLoader();
  }
});

// src/components/base.ts
var BaseComponent, ComponentRegistry;
var init_base = __esm({
  "src/components/base.ts"() {
    "use strict";
    BaseComponent = class {
      name;
      config;
      renderContext;
      constructor(name, config) {
        this.name = name;
        this.config = config;
      }
      /** 组件是否启用 | Whether component is enabled */
      get enabled() {
        return this.config.enabled ?? true;
      }
      /**
       * 渲染组件 | Render component
       */
      render(context) {
        this.renderContext = context;
        if (!this.enabled) {
          return { content: null, success: true };
        }
        try {
          const content = this.renderContent(context);
          if (content instanceof Promise) {
            return content.then((result) => ({ content: result, success: true })).catch((error) => ({
              content: null,
              success: false,
              error: error instanceof Error ? error.message : String(error)
            }));
          }
          return { content, success: true };
        } catch (error) {
          return {
            content: null,
            success: false,
            error: error instanceof Error ? error.message : String(error)
          };
        }
      }
      /**
       * 获取颜色代码 | Get color code
       */
      getColor(colorName) {
        if (!this.renderContext?.colors) return "";
        return this.renderContext.colors[colorName] || "";
      }
      /**
       * 获取重置颜色代码 | Get reset color code
       */
      getResetColor() {
        if (!this.renderContext?.colors) return "";
        return this.renderContext.colors["reset"] || "";
      }
      /**
       * 获取图标 | Get icon
       */
      getIcon(iconName) {
        if (!this.renderContext?.icons) return "";
        return this.renderContext.icons[iconName] || "";
      }
      /**
       * 应用颜色和重置 | Apply color and reset
       */
      colorize(content, colorName) {
        if (!content) return "";
        if (!this.renderContext?.capabilities?.colors) return content;
        const color = this.getColor(colorName);
        const reset = this.getResetColor();
        return `${color}${content}${reset}`;
      }
      /**
       * 格式化组件输出 | Format component output
       */
      formatOutput(icon, text, colorName) {
        const formattedText = `${icon} ${text}`;
        return colorName ? this.colorize(formattedText, colorName) : formattedText;
      }
    };
    ComponentRegistry = class {
      factories = /* @__PURE__ */ new Map();
      /**
       * 注册组件工厂 | Register component factory
       */
      register(type, factory) {
        this.factories.set(type, factory);
      }
      /**
       * 创建组件 | Create component
       */
      create(type, name, config) {
        const factory = this.factories.get(type);
        if (!factory) {
          console.warn(`Unknown component type: ${type}`);
          return null;
        }
        return factory.createComponent(name, config);
      }
      /**
       * 获取所有注册的组件类型 | Get all registered component types
       */
      getRegisteredTypes() {
        return Array.from(this.factories.keys());
      }
    };
  }
});

// src/components/branch.ts
var import_node_child_process, BranchComponent, BranchComponentFactory;
var init_branch = __esm({
  "src/components/branch.ts"() {
    "use strict";
    import_node_child_process = require("child_process");
    init_base();
    BranchComponent = class extends BaseComponent {
      branchConfig;
      constructor(name, config) {
        super(name, config);
        this.branchConfig = config;
      }
      renderContent(context) {
        const { inputData, config } = context;
        let branch = inputData.gitBranch;
        if (!branch) {
          try {
            branch = (0, import_node_child_process.execSync)("git rev-parse --abbrev-ref HEAD 2>/dev/null", {
              cwd: inputData.workspace?.current_dir || inputData.cwd,
              encoding: "utf8",
              timeout: config.advanced?.git_timeout || 1e3
            }).trim();
          } catch (_error) {
            branch = "no-git";
          }
        }
        if (branch === "no-git" && !this.branchConfig.show_when_no_git) {
          return null;
        }
        let displayBranch = branch;
        const maxLength = this.branchConfig.max_length;
        if (maxLength && displayBranch.length > maxLength) {
          displayBranch = `${displayBranch.substring(0, maxLength - 3)}...`;
        }
        const icon = this.getIcon("branch");
        const colorName = this.branchConfig.color || "green";
        return this.formatOutput(icon, displayBranch, colorName);
      }
    };
    BranchComponentFactory = class {
      createComponent(name, config) {
        return new BranchComponent(name, config);
      }
      getSupportedTypes() {
        return ["branch"];
      }
    };
  }
});

// src/components/model.ts
var DEFAULT_MODEL_CONFIGS, ModelComponent, ModelComponentFactory;
var init_model = __esm({
  "src/components/model.ts"() {
    "use strict";
    init_base();
    DEFAULT_MODEL_CONFIGS = {
      "claude-sonnet-4": { contextWindow: 2e5, shortName: "S4" },
      "claude-sonnet-3.7": { contextWindow: 2e5, shortName: "S3.7" },
      "claude-opus-4.1": { contextWindow: 2e5, shortName: "O4.1" },
      "claude-haiku-3.5": { contextWindow: 2e5, shortName: "H3.5" }
    };
    ModelComponent = class extends BaseComponent {
      modelConfig;
      constructor(name, config) {
        super(name, config);
        this.modelConfig = config;
      }
      renderContent(context) {
        const { inputData } = context;
        const modelId = inputData.model?.id || inputData.model?.display_name;
        if (!modelId) return null;
        const modelInfo = this.getModelInfo(modelId);
        const displayName = this.modelConfig.show_full_name ? inputData.model?.display_name || inputData.model?.id || "?" : modelInfo.shortName;
        const icon = this.getIcon("model");
        const colorName = this.modelConfig.color || "blue";
        return this.formatOutput(icon, displayName, colorName);
      }
      /**
       * 获取模型配置信息 | Get model configuration info
       */
      getModelInfo(modelId) {
        if (!modelId) {
          return { contextWindow: 2e5, shortName: "?" };
        }
        const customNames = this.modelConfig.custom_names || {};
        const modelKey = Object.keys(DEFAULT_MODEL_CONFIGS).find(
          (key) => modelId.toLowerCase().includes(key.toLowerCase())
        );
        if (modelKey) {
          const config = DEFAULT_MODEL_CONFIGS[modelKey];
          const customName = customNames[modelKey];
          return {
            contextWindow: config.contextWindow,
            shortName: customName || config.shortName
          };
        }
        let shortName = "Unknown";
        const lowerModelId = modelId.toLowerCase();
        if (lowerModelId.includes("sonnet")) {
          const match = modelId.match(/sonnet[\s-]*(\d+(?:\.\d+)?)/i);
          shortName = match ? `S${match[1]}` : "S?";
        } else if (lowerModelId.includes("opus")) {
          const match = modelId.match(/opus[\s-]*(\d+(?:\.\d+)?)/i);
          shortName = match ? `O${match[1]}` : "O?";
        } else if (lowerModelId.includes("haiku")) {
          const match = modelId.match(/haiku[\s-]*(\d+(?:\.\d+)?)/i);
          shortName = match ? `H${match[1]}` : "H?";
        } else {
          shortName = modelId.replace(/[^a-zA-Z0-9]/g, "").substring(0, 4).toUpperCase();
        }
        for (const [key, customName] of Object.entries(customNames)) {
          if (lowerModelId.includes(key.toLowerCase())) {
            shortName = customName;
            break;
          }
        }
        return { contextWindow: 2e5, shortName };
      }
    };
    ModelComponentFactory = class {
      createComponent(name, config) {
        return new ModelComponent(name, config);
      }
      getSupportedTypes() {
        return ["model"];
      }
    };
  }
});

// src/components/project.ts
var import_node_path2, ProjectComponent, ProjectComponentFactory;
var init_project = __esm({
  "src/components/project.ts"() {
    "use strict";
    import_node_path2 = __toESM(require("path"), 1);
    init_base();
    ProjectComponent = class extends BaseComponent {
      projectConfig;
      constructor(name, config) {
        super(name, config);
        this.projectConfig = config;
      }
      renderContent(context) {
        const { inputData } = context;
        const projectPath = inputData.workspace?.project_dir || inputData.workspace?.current_dir || inputData.cwd;
        if (!projectPath) return null;
        const projectName = import_node_path2.default.basename(projectPath);
        if (projectName === "." || projectName === "" && !this.projectConfig.show_when_empty) {
          return null;
        }
        const icon = this.getIcon("project");
        const colorName = this.projectConfig.color || "cyan";
        return this.formatOutput(icon, projectName, colorName);
      }
    };
    ProjectComponentFactory = class {
      createComponent(name, config) {
        return new ProjectComponent(name, config);
      }
      getSupportedTypes() {
        return ["project"];
      }
    };
  }
});

// src/components/status.ts
var import_node_fs2, StatusComponent, StatusComponentFactory;
var init_status = __esm({
  "src/components/status.ts"() {
    "use strict";
    import_node_fs2 = require("fs");
    init_base();
    StatusComponent = class extends BaseComponent {
      statusConfig;
      cachedStatus = null;
      lastTranscriptMtime = null;
      constructor(name, config) {
        super(name, config);
        this.statusConfig = config;
      }
      renderContent(context) {
        const { inputData } = context;
        const mockData = inputData["__mock__"];
        if (mockData && typeof mockData === "object" && "status" in mockData) {
          return this.renderMockStatus(mockData["status"]);
        }
        if (!inputData.transcriptPath) {
          return this.renderDefaultStatus();
        }
        const statusInfo = this.parseTranscriptStatus(inputData.transcriptPath, context);
        if (!statusInfo) {
          return this.renderDefaultStatus();
        }
        return this.formatStatusDisplay(statusInfo);
      }
      /**
       * 渲染Mock状态 | Render mock status
       */
      renderMockStatus(status) {
        const statusMap = {
          ready: { type: "ready", message: "Ready" },
          thinking: { type: "thinking", message: "Thinking..." },
          tool_use: { type: "tool", message: "Tool Use" },
          error: { type: "error", message: "Error" },
          complete: { type: "ready", message: "Complete" }
        };
        const statusInfo = statusMap[status] || { type: "ready", message: "Ready" };
        return this.formatStatusDisplay(statusInfo);
      }
      /**
       * 渲染默认状态 | Render default status
       */
      renderDefaultStatus() {
        const icon = this.getIcon("ready");
        const colorName = this.statusConfig.colors?.ready || "green";
        return this.formatOutput(icon, "Ready", colorName);
      }
      /**
       * 解析transcript状态 | Parse transcript status
       */
      parseTranscriptStatus(transcriptPath, context) {
        let fileExists = false;
        try {
          fileExists = (0, import_node_fs2.existsSync)(transcriptPath) && (0, import_node_fs2.statSync)(transcriptPath).isFile();
        } catch (_error) {
          return null;
        }
        if (!fileExists) {
          return { type: "ready", message: "Ready" };
        }
        try {
          const stat = (0, import_node_fs2.statSync)(transcriptPath);
          const currentMtime = stat.mtime.getTime();
          const cacheEnabled = context.config.advanced?.cache_enabled ?? true;
          if (cacheEnabled && this.cachedStatus && this.lastTranscriptMtime === currentMtime) {
            return this.cachedStatus;
          }
          const transcript = (0, import_node_fs2.readFileSync)(transcriptPath, "utf8");
          const lines = transcript.trim().split("\n");
          let lastStopReason = null;
          let lastToolCall = null;
          let lastEntryType = null;
          let assistantError = false;
          let errorDetails = "Error";
          let _lastAssistantIndex = -1;
          for (let i = lines.length - 1; i >= 0; i--) {
            const line = lines[i]?.trim();
            if (!line) continue;
            try {
              const entry = JSON.parse(line);
              if (!lastEntryType) {
                lastEntryType = entry["type"];
              }
              if (entry.type === "assistant" && entry.message && "usage" in entry.message) {
                lastStopReason = entry.message?.stop_reason || null;
                _lastAssistantIndex = i;
                assistantError = this.isErrorEntry(entry);
                if (assistantError) {
                  errorDetails = this.getErrorDetails(entry);
                }
                break;
              }
            } catch (_parseError) {
            }
          }
          const recentErrorCount = context.config.advanced?.recent_error_count || 5;
          const recentLines = lines.slice(-recentErrorCount);
          for (const line of recentLines) {
            if (!line.trim()) continue;
            try {
              const entry = JSON.parse(line);
              if ("message" in entry && entry.message?.content && Array.isArray(entry.message.content)) {
                const toolUse = entry.message.content.find(
                  (item) => typeof item === "object" && item !== null && "type" in item && item["type"] === "tool_use"
                );
                if (toolUse && typeof toolUse === "object" && "name" in toolUse) {
                  lastToolCall = toolUse.name;
                }
              }
            } catch (_parseError) {
            }
          }
          let statusInfo;
          if (assistantError) {
            statusInfo = { type: "error", message: errorDetails, details: errorDetails };
          } else if (lastStopReason === "tool_use") {
            const toolInfo = lastToolCall ? ` ${lastToolCall}` : "";
            statusInfo = {
              type: "tool",
              message: `Tool${toolInfo}`,
              details: lastToolCall || ""
            };
          } else if (lastStopReason === "end_turn") {
            statusInfo = { type: "ready", message: "Ready" };
          } else if (lastStopReason === null) {
            if (lastEntryType === "user") {
              statusInfo = { type: "thinking", message: "Thinking" };
            } else {
              statusInfo = { type: "ready", message: "Ready" };
            }
          } else {
            statusInfo = { type: "ready", message: "Ready" };
          }
          if (cacheEnabled) {
            this.cachedStatus = statusInfo;
            this.lastTranscriptMtime = currentMtime;
          }
          return statusInfo;
        } catch (error) {
          console.error("Error parsing transcript status:", error);
          return null;
        }
      }
      /**
       * 检测条目是否包含真正的错误 | Detect if entry contains real errors
       */
      isErrorEntry(entry) {
        if (entry["toolUseResult"]) {
          const toolUseResult = entry["toolUseResult"];
          const errorMsg = toolUseResult["error"] || toolUseResult;
          if (typeof errorMsg === "string" && (errorMsg.includes("was blocked") || errorMsg.includes("For security"))) {
            return false;
          }
          if (toolUseResult["error"] || toolUseResult["type"] === "error") {
            return true;
          }
        }
        const message = entry["message"];
        if (message?.["stop_reason"] === "stop_sequence") {
          if (message?.["content"] && Array.isArray(message["content"])) {
            for (const item of message["content"]) {
              if (item["type"] === "text" && item["text"]) {
                const text = item["text"];
                if (text.startsWith("API Error: 403") && text.includes("user quota is not enough")) {
                  return true;
                }
                if (text.includes("filter")) {
                  return true;
                }
              }
            }
          }
        }
        return false;
      }
      /**
       * 获取错误详细信息 | Get error details
       */
      getErrorDetails(entry) {
        const message = entry["message"];
        if (message?.["stop_reason"] === "stop_sequence") {
          if (message?.["content"] && Array.isArray(message["content"])) {
            for (const item of message["content"]) {
              if (item["type"] === "text" && item["text"]) {
                const text = item["text"];
                if (text.startsWith("API Error: 403") && text.includes("user quota is not enough")) {
                  return "403\u914D\u989D\u4E0D\u8DB3";
                }
                if (text.includes("filter")) {
                  return "Filter\u9519\u8BEF";
                }
              }
            }
          }
        }
        return "Error";
      }
      /**
       * 格式化状态显示 | Format status display
       */
      formatStatusDisplay(statusInfo) {
        const { type, message } = statusInfo;
        const icon = this.getIcon(type);
        const colorName = this.statusConfig.colors?.[type] || this.getDefaultColor(type);
        return this.formatOutput(icon, message, colorName);
      }
      /**
       * 获取默认颜色 | Get default color
       */
      getDefaultColor(type) {
        const colorMap = {
          ready: "green",
          thinking: "yellow",
          tool: "blue",
          error: "red",
          warning: "yellow"
        };
        return colorMap[type] || "white";
      }
    };
    StatusComponentFactory = class {
      createComponent(name, config) {
        return new StatusComponent(name, config);
      }
      getSupportedTypes() {
        return ["status"];
      }
    };
  }
});

// src/components/tokens.ts
var import_node_fs3, TokensComponent, TokensComponentFactory;
var init_tokens = __esm({
  "src/components/tokens.ts"() {
    "use strict";
    import_node_fs3 = require("fs");
    init_base();
    TokensComponent = class extends BaseComponent {
      tokensConfig;
      cachedTranscriptData = null;
      lastTranscriptMtime = null;
      constructor(name, config) {
        super(name, config);
        this.tokensConfig = config;
      }
      renderContent(context) {
        const { inputData } = context;
        const mockData = inputData["__mock__"];
        if (mockData && typeof mockData["tokenUsage"] === "number") {
          return this.renderMockTokenData(mockData["tokenUsage"], mockData["status"]);
        }
        if (!inputData.transcriptPath) {
          return this.renderNoTranscript();
        }
        const tokenUsage = this.parseTranscriptFile(inputData.transcriptPath, context);
        if (!tokenUsage) {
          return this.renderNoTranscript();
        }
        return this.formatTokenDisplay(tokenUsage);
      }
      /**
       * 渲染Mock数据 | Render mock token data
       */
      renderMockTokenData(tokenUsagePercent, _status) {
        const contextWindow = this.getContextWindow();
        const contextUsedTokens = Math.floor(tokenUsagePercent / 100 * contextWindow);
        const tokenUsage = {
          contextUsedTokens,
          contextWindow,
          usagePercentage: tokenUsagePercent,
          warning: tokenUsagePercent > (this.tokensConfig.thresholds?.warning || 60),
          critical: tokenUsagePercent > (this.tokensConfig.thresholds?.critical || 95)
        };
        if (this.tokensConfig.show_progress_bar) {
          tokenUsage.progressBar = this.generateProgressBar(tokenUsagePercent);
        }
        return this.formatTokenDisplay(tokenUsage);
      }
      /**
       * 渲染无transcript文件时的显示 | Render display when no transcript file
       */
      renderNoTranscript() {
        const contextWindow = this.getContextWindow();
        const tokenUsage = {
          contextUsedTokens: 0,
          contextWindow,
          usagePercentage: 0,
          warning: false,
          critical: false
        };
        if (this.tokensConfig.show_progress_bar) {
          tokenUsage.progressBar = this.generateProgressBar(0);
        }
        return this.formatTokenDisplay(tokenUsage);
      }
      /**
       * 解析transcript文件 | Parse transcript file
       */
      parseTranscriptFile(transcriptPath, context) {
        let fileExists = false;
        try {
          fileExists = (0, import_node_fs3.existsSync)(transcriptPath) && (0, import_node_fs3.statSync)(transcriptPath).isFile();
        } catch (_error) {
          return null;
        }
        if (!fileExists) {
          return {
            contextUsedTokens: 0,
            contextWindow: this.getContextWindow(),
            usagePercentage: 0
          };
        }
        try {
          const stat = (0, import_node_fs3.statSync)(transcriptPath);
          const currentMtime = stat.mtime.getTime();
          const cacheEnabled = context.config.advanced?.cache_enabled ?? true;
          if (cacheEnabled && this.cachedTranscriptData && this.lastTranscriptMtime === currentMtime) {
            return this.cachedTranscriptData;
          }
          const transcript = (0, import_node_fs3.readFileSync)(transcriptPath, "utf8");
          const lines = transcript.trim().split("\n");
          let contextUsedTokens = 0;
          for (let i = lines.length - 1; i >= 0; i--) {
            const line = lines[i]?.trim();
            if (!line) continue;
            try {
              const entry = JSON.parse(line);
              if (entry.type === "assistant" && entry.message && "usage" in entry.message) {
                const usage = entry.message.usage;
                const requiredKeys = [
                  "input_tokens",
                  "cache_creation_input_tokens",
                  "cache_read_input_tokens",
                  "output_tokens"
                ];
                if (usage && requiredKeys.every((key) => key in usage)) {
                  contextUsedTokens = usage.input_tokens + usage.cache_creation_input_tokens + usage.cache_read_input_tokens + usage.output_tokens;
                  break;
                }
              }
            } catch (_parseError) {
            }
          }
          const contextWindow = this.getContextWindow();
          const usagePercentage = contextUsedTokens / contextWindow * 100;
          const result = {
            contextUsedTokens,
            contextWindow,
            usagePercentage,
            warning: usagePercentage > (this.tokensConfig.thresholds?.warning || 60),
            critical: usagePercentage > (this.tokensConfig.thresholds?.critical || 95)
          };
          if (this.tokensConfig.show_progress_bar) {
            result.progressBar = this.generateProgressBar(usagePercentage);
          }
          if (cacheEnabled) {
            this.cachedTranscriptData = result;
            this.lastTranscriptMtime = currentMtime;
          }
          return result;
        } catch (error) {
          console.error("Error parsing transcript file:", error);
          return null;
        }
      }
      /**
       * 获取上下文窗口大小 | Get context window size
       */
      getContextWindow() {
        return this.tokensConfig.context_window || 2e5;
      }
      /**
       * 生成进度条 | Generate progress bar
       */
      generateProgressBar(usagePercentage) {
        const width = this.tokensConfig.progress_bar_width || 10;
        const filled = Math.round(usagePercentage / 100 * width);
        const _empty = width - filled;
        const filledChar = this.tokensConfig.progress_bar_chars?.filled || "\u2588";
        const emptyChar = this.tokensConfig.progress_bar_chars?.empty || "\u2591";
        const backupChar = this.tokensConfig.progress_bar_chars?.backup || "\u2593";
        let bar = "";
        for (let i = 0; i < width; i++) {
          const segmentPercentage = i / width * 100;
          if (i < filled) {
            bar += segmentPercentage >= 85 ? backupChar : filledChar;
          } else {
            bar += emptyChar;
          }
        }
        return bar;
      }
      /**
       * 格式化Token显示 | Format token display
       */
      formatTokenDisplay(tokenUsage) {
        const { contextUsedTokens, contextWindow, usagePercentage, progressBar, warning, critical } = tokenUsage;
        const icon = this.getIcon("token");
        let colorName = this.tokensConfig.color || "yellow";
        if (critical) {
          colorName = "red";
        } else if (warning) {
          colorName = "yellow";
        }
        let displayText = "";
        if (progressBar) {
          displayText += `[${progressBar}] `;
        }
        if (this.tokensConfig.show_percentage) {
          displayText += `${usagePercentage.toFixed(1)}% `;
        }
        const usedDisplay = this.tokensConfig.show_raw_numbers ? contextUsedTokens.toString() : `${(contextUsedTokens / 1e3).toFixed(1)}k`;
        const totalDisplay = this.tokensConfig.show_raw_numbers ? contextWindow.toString() : `${(contextWindow / 1e3).toFixed(0)}k`;
        displayText += `(${usedDisplay}/${totalDisplay})`;
        if (critical) {
          displayText += " \u{1F525}";
        } else if (warning) {
          displayText += " \u26A1";
        }
        return this.formatOutput(icon, displayText, colorName);
      }
    };
    TokensComponentFactory = class {
      createComponent(name, config) {
        return new TokensComponent(name, config);
      }
      getSupportedTypes() {
        return ["tokens"];
      }
    };
  }
});

// src/terminal/colors.ts
var TerminalRenderer, ColorSystem, IconSystem;
var init_colors = __esm({
  "src/terminal/colors.ts"() {
    "use strict";
    TerminalRenderer = class {
      colors;
      icons;
      capabilities;
      constructor(capabilities, config) {
        this.capabilities = capabilities;
        this.colors = this.setupColors(config);
        this.icons = this.setupIcons(config);
      }
      /**
       * 获取颜色代码 | Get color code
       */
      getColor(colorName) {
        return this.colors[colorName] || "";
      }
      /**
       * 获取图标 | Get icon
       */
      getIcon(iconName) {
        return this.icons[iconName] || "";
      }
      /**
       * 获取重置颜色代码 | Get reset color code
       */
      getReset() {
        return this.colors["reset"] || "";
      }
      /**
       * 应用颜色 | Apply color
       */
      colorize(text, colorName) {
        if (!text || !this.capabilities.colors) return text;
        const color = this.getColor(colorName);
        const reset = this.getReset();
        return `${color}${text}${reset}`;
      }
      /**
       * 设置颜色系统 | Setup color system
       */
      setupColors(config) {
        const baseColors = {
          reset: "\x1B[0m",
          bright: "\x1B[1m",
          dim: "\x1B[2m",
          black: "\x1B[30m",
          red: "\x1B[31m",
          green: "\x1B[32m",
          yellow: "\x1B[33m",
          blue: "\x1B[34m",
          magenta: "\x1B[35m",
          cyan: "\x1B[36m",
          white: "\x1B[37m",
          gray: "\x1B[90m",
          bright_red: "\x1B[91m",
          bright_green: "\x1B[92m",
          bright_yellow: "\x1B[93m",
          bright_blue: "\x1B[94m",
          bright_magenta: "\x1B[95m",
          bright_cyan: "\x1B[96m",
          bright_white: "\x1B[97m"
        };
        const customColors = config.advanced?.custom_color_codes || {};
        if (!this.capabilities.colors) {
          const emptyColors = {};
          for (const key of Object.keys({ ...baseColors, ...customColors })) {
            emptyColors[key] = "";
          }
          return emptyColors;
        }
        return { ...baseColors, ...customColors };
      }
      /**
       * 设置图标系统 | Setup icon system
       */
      setupIcons(config) {
        const components = config.components;
        const nerdFontIcons = {
          project: components?.project?.nerd_icon || "\uF07B",
          // fa-folder
          model: components?.model?.nerd_icon || "\uF085",
          // fa-cogs (机器/模型)
          branch: components?.branch?.nerd_icon || "\uF126",
          // fa-code-branch (git分支)
          token: components?.tokens?.nerd_icon || "\uF080",
          // fa-bar-chart
          ready: components?.status?.nerd_icons?.ready || "\uF00C",
          // fa-check
          thinking: components?.status?.nerd_icons?.thinking || "\uF110",
          // fa-spinner
          tool: components?.status?.nerd_icons?.tool || "\uF0AD",
          // fa-wrench
          error: components?.status?.nerd_icons?.error || "\uF00D",
          // fa-times
          warning: components?.status?.nerd_icons?.warning || "\uF071"
          // fa-exclamation-triangle
        };
        const emojiIcons = {
          project: components?.project?.icon || "\u{1F4C1}",
          model: components?.model?.icon || "\u{1F916}",
          branch: components?.branch?.icon || "\u{1F33F}",
          token: components?.tokens?.icon || "\u{1F4CA}",
          ready: components?.status?.icons?.ready || "\u2705",
          thinking: components?.status?.icons?.thinking || "\u{1F4AD}",
          tool: components?.status?.icons?.tool || "\u{1F527}",
          error: components?.status?.icons?.error || "\u274C",
          warning: components?.status?.icons?.warning || "\u26A0\uFE0F"
        };
        const textIcons = {
          project: components?.project?.text_icon || "[P]",
          model: components?.model?.text_icon || "[M]",
          branch: components?.branch?.text_icon || "[B]",
          token: components?.tokens?.text_icon || "[T]",
          ready: components?.status?.text_icons?.ready || "[OK]",
          thinking: components?.status?.text_icons?.thinking || "[...]",
          tool: components?.status?.text_icons?.tool || "[TOOL]",
          error: components?.status?.text_icons?.error || "[ERR]",
          warning: components?.status?.text_icons?.warning || "[WARN]"
        };
        if (this.capabilities.nerdFont) {
          return nerdFontIcons;
        } else if (this.capabilities.emoji) {
          return emojiIcons;
        } else {
          return textIcons;
        }
      }
      /**
       * 获取所有颜色 | Get all colors
       */
      getColors() {
        return { ...this.colors };
      }
      /**
       * 获取所有图标 | Get all icons
       */
      getIcons() {
        return { ...this.icons };
      }
      /**
       * 获取终端能力 | Get terminal capabilities
       */
      getCapabilities() {
        return { ...this.capabilities };
      }
      /**
       * 创建格式化字符串 | Create formatted string
       */
      format(icon, text, colorName) {
        const iconStr = this.getIcon(icon);
        const content = iconStr ? `${iconStr} ${text}` : text;
        return colorName ? this.colorize(content, colorName) : content;
      }
    };
    ColorSystem = TerminalRenderer;
    IconSystem = TerminalRenderer;
  }
});

// src/terminal/detector.ts
function detectColors(enableColors) {
  if (typeof enableColors === "boolean") {
    return enableColors;
  }
  return !!(process.env["COLORTERM"] === "truecolor" || process.env["TERM"]?.includes("256") || process.env["TERM_PROGRAM"] === "vscode" || process.env["TERM_PROGRAM"] === "iTerm.app" || process.env["TERM_PROGRAM"] === "Hyper" || process.env["WT_SESSION"] || // Windows Terminal
  process.env["ConEmuPID"]);
}
function detectEmoji(enableEmoji) {
  if (typeof enableEmoji === "boolean") {
    return enableEmoji;
  }
  return !!(process.platform !== "win32" || process.env["WT_SESSION"] || process.env["TERM_PROGRAM"] === "vscode" || process.env["ConEmuPID"] || process.env["TERM_PROGRAM"] === "Hyper");
}
function isNerdFontCompatibleTerminal() {
  const termProgram = process.env["TERM_PROGRAM"];
  const term = process.env["TERM"];
  const supportedTerminals = ["iTerm.app", "WezTerm", "Alacritty", "kitty", "Hyper"];
  if (termProgram && supportedTerminals.includes(termProgram)) {
    return true;
  }
  if (term === "xterm-kitty" || term === "alacritty") {
    return true;
  }
  return false;
}
function isNerdFontName(fontName) {
  const nerdFontIndicators = [
    "nerd",
    "nf-",
    "powerline",
    "fira code",
    "jetbrains mono",
    "hack",
    "source code pro",
    "ubuntu mono",
    "cascadia code",
    "dejavu sans mono"
  ];
  const lowerFontName = fontName.toLowerCase();
  return nerdFontIndicators.some((indicator) => lowerFontName.includes(indicator));
}
function detectNerdFontByName() {
  const fontVars = [process.env["FONT"], process.env["TERMINAL_FONT"], process.env["NERD_FONT_NAME"]];
  for (const fontVar of fontVars) {
    if (fontVar && isNerdFontName(fontVar)) {
      return true;
    }
  }
  return false;
}
function conservativeNerdFontDetection() {
  if (process.env["TERM_PROGRAM"] === "vscode") {
    return false;
  }
  if (process.env["WT_SESSION"]) {
    return true;
  }
  return false;
}
function detectNerdFont(enableNerdFont, forceNerdFont) {
  if (forceNerdFont) {
    return true;
  }
  if (typeof enableNerdFont === "boolean") {
    return enableNerdFont;
  }
  if (process.env["NERD_FONT"] === "1" || process.env["NERD_FONT"] === "true") {
    return true;
  }
  if (isNerdFontCompatibleTerminal()) {
    return true;
  }
  if (detectNerdFontByName()) {
    return true;
  }
  return conservativeNerdFontDetection();
}
function detect(enableColors = "auto", enableEmoji = "auto", enableNerdFont = "auto", forceNerdFont = false) {
  return {
    colors: detectColors(enableColors),
    emoji: detectEmoji(enableEmoji),
    nerdFont: detectNerdFont(enableNerdFont, forceNerdFont)
  };
}
function getCapabilityInfo() {
  return {
    platform: process.platform,
    env: {
      COLORTERM: process.env["COLORTERM"],
      TERM: process.env["TERM"],
      TERM_PROGRAM: process.env["TERM_PROGRAM"],
      TERM_PROGRAM_VERSION: process.env["TERM_PROGRAM_VERSION"],
      WT_SESSION: process.env["WT_SESSION"],
      ConEmuPID: process.env["ConEmuPID"],
      NERD_FONT: process.env["NERD_FONT"],
      FONT: process.env["FONT"]
    },
    detected: detect()
  };
}
var TerminalDetector;
var init_detector = __esm({
  "src/terminal/detector.ts"() {
    "use strict";
    TerminalDetector = class {
      detectCapabilities() {
        return detect();
      }
      getCapabilityInfo() {
        return getCapabilityInfo();
      }
    };
  }
});

// src/core/generator.ts
var generator_exports = {};
__export(generator_exports, {
  StatuslineGenerator: () => StatuslineGenerator
});
var StatuslineGenerator;
var init_generator = __esm({
  "src/core/generator.ts"() {
    "use strict";
    init_base();
    init_branch();
    init_model();
    init_project();
    init_status();
    init_tokens();
    init_colors();
    init_detector();
    StatuslineGenerator = class {
      config;
      componentRegistry;
      renderer;
      lastUpdate = 0;
      lastResult = null;
      updateInterval = 300;
      // 官方建议的300ms更新间隔 | Official 300ms update interval
      disableCache = false;
      constructor(config, options = {}) {
        this.config = config;
        this.componentRegistry = new ComponentRegistry();
        this.initializeComponents();
        if (options.updateThrottling !== false) {
          this.updateInterval = 300;
        }
        this.disableCache = options.disableCache || false;
      }
      /**
       * 初始化组件注册表 | Initialize component registry
       */
      initializeComponents() {
        this.componentRegistry.register("project", new ProjectComponentFactory());
        this.componentRegistry.register("model", new ModelComponentFactory());
        this.componentRegistry.register("branch", new BranchComponentFactory());
        this.componentRegistry.register("tokens", new TokensComponentFactory());
        this.componentRegistry.register("status", new StatusComponentFactory());
      }
      /**
       * 生成状态行 | Generate statusline
       */
      async generate(inputData) {
        try {
          if (!this.shouldUpdate()) {
            return this.lastResult || "";
          }
          const capabilities = detect(
            this.config.style?.enable_colors,
            this.config.style?.enable_emoji,
            this.config.style?.enable_nerd_font,
            this.config.experimental?.force_nerd_font
          );
          this.renderer = new TerminalRenderer(capabilities, this.config);
          const context = {
            inputData,
            config: this.config,
            capabilities,
            colors: this.renderer.getColors(),
            icons: this.renderer.getIcons()
          };
          const componentOrder = this.getComponentOrder();
          const componentResults = [];
          for (const componentName of componentOrder) {
            const componentConfig = this.getComponentConfig(componentName);
            if (!componentConfig || !componentConfig["enabled"]) {
              continue;
            }
            const component = this.componentRegistry.create(
              componentName,
              componentName,
              componentConfig
            );
            if (component) {
              try {
                const result2 = await component.render(context);
                if (result2.success && result2.content) {
                  componentResults.push(result2.content);
                } else if (!result2.success && result2.error) {
                  console.error(`Component ${componentName} failed:`, result2.error);
                }
              } catch (error) {
                console.error(`Error rendering component ${componentName}:`, error);
              }
            }
          }
          const separator = this.config.style?.separator || " ";
          const result = componentResults.join(separator);
          this.lastResult = result;
          return result;
        } catch (error) {
          console.error("Error generating statusline:", error);
          return this.generateFallbackStatus(inputData);
        }
      }
      /**
       * 获取组件顺序 | Get component order
       */
      getComponentOrder() {
        const components = this.config.components;
        if (components?.order && Array.isArray(components.order)) {
          return components.order;
        }
        const preset = this.config.preset || "PMBTS";
        return this.parsePreset(preset);
      }
      /**
       * 解析预设字符串 | Parse preset string
       */
      parsePreset(preset) {
        const mapping = this.config.preset_mapping || {
          P: "project",
          M: "model",
          B: "branch",
          T: "tokens",
          S: "status"
        };
        return preset.split("").map((char) => mapping[char]).filter(Boolean);
      }
      /**
       * 获取组件配置 | Get component configuration
       */
      getComponentConfig(componentName) {
        const components = this.config.components;
        if (!components) return null;
        return components[componentName];
      }
      /**
       * 检查是否应该更新 | Check if should update
       */
      shouldUpdate() {
        if (this.disableCache) {
          return true;
        }
        const now = Date.now();
        if (now - this.lastUpdate < this.updateInterval) {
          return false;
        }
        this.lastUpdate = now;
        return true;
      }
      /**
       * 生成后备状态 | Generate fallback status
       */
      generateFallbackStatus(inputData) {
        try {
          const parts = [];
          if (inputData.workspace?.project_dir) {
            const projectName = inputData.workspace.project_dir.split("/").pop();
            if (projectName) {
              parts.push(`[P] ${projectName}`);
            }
          }
          if (inputData.model?.id) {
            const modelName = inputData.model.id.includes("sonnet") ? "S4" : "M";
            parts.push(`[M] ${modelName}`);
          }
          parts.push("[S] Ready");
          return parts.join(" ");
        } catch (_error) {
          return "[ERR] Statusline Error";
        }
      }
      /**
       * 更新配置 | Update configuration
       */
      updateConfig(newConfig) {
        this.config = newConfig;
        this.lastResult = null;
        this.lastUpdate = 0;
      }
      /**
       * 获取当前配置 | Get current configuration
       */
      getConfig() {
        return { ...this.config };
      }
      /**
       * 获取终端能力信息 | Get terminal capability info
       */
      getTerminalCapabilities() {
        return getCapabilityInfo();
      }
      /**
       * 强制刷新 | Force refresh
       */
      forceRefresh() {
        this.lastUpdate = 0;
        this.lastResult = null;
      }
    };
  }
});

// src/index.ts
var src_exports = {};
__export(src_exports, {
  BranchComponent: () => BranchComponent,
  BranchComponentSchema: () => BranchComponentSchema,
  CliMessageIconManager: () => CliMessageIconManager,
  ColorSystem: () => ColorSystem,
  ComponentRegistry: () => ComponentRegistry,
  ConfigEditor: () => ConfigEditor,
  ConfigLoader: () => ConfigLoader,
  ConfigSchema: () => ConfigSchema,
  IconSystem: () => IconSystem,
  InputDataSchema: () => InputDataSchema,
  LivePreviewEngine: () => LivePreviewEngine,
  MockDataGenerator: () => MockDataGenerator,
  ModelComponent: () => ModelComponent,
  ModelComponentSchema: () => ModelComponentSchema,
  ProjectComponent: () => ProjectComponent,
  ProjectComponentSchema: () => ProjectComponentSchema,
  RenderContextSchema: () => RenderContextSchema,
  StatusComponent: () => StatusComponent,
  StatusComponentSchema: () => StatusComponentSchema,
  StatuslineGenerator: () => StatuslineGenerator,
  TerminalDetector: () => TerminalDetector,
  TokenComponentSchema: () => TokenComponentSchema,
  TokensComponent: () => TokensComponent,
  TranscriptEntrySchema: () => TranscriptEntrySchema,
  UsageInfoSchema: () => UsageInfoSchema,
  VERSION: () => VERSION,
  calculatePercentage: () => calculatePercentage,
  createConfigEditor: () => createConfigEditor,
  createLivePreviewEngine: () => createLivePreviewEngine,
  createStatuslineGenerator: () => createStatuslineGenerator,
  debounce: () => debounce,
  deepMerge: () => deepMerge,
  default: () => StatuslineGenerator,
  formatBytes: () => formatBytes,
  formatCliMessage: () => formatCliMessage,
  formatNumber: () => formatNumber,
  formatTime: () => formatTime,
  generateId: () => generateId,
  generateProgressBar: () => generateProgressBar,
  generateStatusline: () => generateStatusline,
  getCliIcon: () => getCliIcon,
  getCliIconManager: () => getCliIconManager,
  getDebugInfo: () => getDebugInfo,
  getDefaultConfig: () => getDefaultConfig,
  getOS: () => getOS,
  getProjectName: () => getProjectName,
  getRelativeTime: () => getRelativeTime,
  isValidInputData: () => isValidInputData,
  mergeInputData: () => mergeInputData,
  mockDataGenerator: () => mockDataGenerator,
  parseArguments: () => parseArguments,
  parseInput: () => parseInput,
  parseJson: () => parseJson,
  safeJsonParse: () => safeJsonParse,
  simplifyBranchName: () => simplifyBranchName,
  throttle: () => throttle,
  truncateString: () => truncateString,
  validate: () => validate,
  validateConfig: () => validateConfig
});
module.exports = __toCommonJS(src_exports);

// src/cli/config-editor.ts
var import_prompts = require("@inquirer/prompts");
init_loader();
init_generator();
init_detector();

// src/cli/mock-data.ts
var MockDataGenerator = class {
  scenarios = /* @__PURE__ */ new Map();
  constructor() {
    this.initializeScenarios();
  }
  /**
   * 初始化所有Mock场景
   */
  initializeScenarios() {
    this.scenarios.set("dev", {
      id: "dev",
      name: "\u5F00\u53D1\u4E2D",
      description: "\u6B63\u5E38\u5F00\u53D1\u9879\u76EE\uFF0C\u4F4Etoken\u4F7F\u7528\u7387\uFF0C\u4E00\u5207\u8FD0\u884C\u826F\u597D",
      inputData: {
        hookEventName: "Status",
        sessionId: "dev_session_123",
        model: { id: "claude-sonnet-4" },
        workspace: {
          current_dir: "/Users/developer/my-awesome-project",
          project_dir: "/Users/developer/my-awesome-project"
        },
        transcriptPath: "/tmp/claude_transcript_dev.json",
        cwd: "/Users/developer/my-awesome-project",
        gitBranch: "feature/user-auth"
      },
      tokenUsage: 25,
      expectedStatus: "ready"
    });
    this.scenarios.set("critical", {
      id: "critical",
      name: "\u4E34\u754C\u72B6\u6001",
      description: "Token\u4F7F\u7528\u63A5\u8FD1\u4E0A\u9650\uFF0C\u9700\u8981\u6CE8\u610F\u4E0A\u4E0B\u6587\u7BA1\u7406",
      inputData: {
        hookEventName: "Status",
        sessionId: "critical_session_456",
        model: { id: "claude-opus-4.1" },
        workspace: {
          current_dir: "/Users/developer/enterprise-system",
          project_dir: "/Users/developer/enterprise-system"
        },
        transcriptPath: "/tmp/claude_transcript_critical.json",
        cwd: "/Users/developer/large-enterprise-system",
        gitBranch: null
      },
      tokenUsage: 92,
      expectedStatus: "ready"
    });
    this.scenarios.set("error", {
      id: "error",
      name: "\u9519\u8BEF\u72B6\u6001",
      description: "API\u8C03\u7528\u5931\u8D25\u6216\u5DE5\u5177\u6267\u884C\u51FA\u9519",
      inputData: {
        hookEventName: "Status",
        sessionId: "error_session_789",
        model: { id: "claude-haiku-3.5" },
        workspace: {
          current_dir: "/Users/developer/error-prone-app",
          project_dir: "/Users/developer/error-prone-app"
        },
        transcriptPath: "/tmp/claude_transcript_error.json",
        cwd: "/Users/developer/error-prone-app",
        gitBranch: "bugfix/critical-error"
      },
      tokenUsage: 45,
      expectedStatus: "error"
    });
    this.scenarios.set("thinking", {
      id: "thinking",
      name: "\u601D\u8003\u4E2D",
      description: "AI\u6B63\u5728\u5904\u7406\u590D\u6742\u4EFB\u52A1\uFF0C\u6DF1\u5EA6\u601D\u8003\u6A21\u5F0F",
      inputData: {
        hookEventName: "Status",
        sessionId: "thinking_session_101",
        model: { id: "claude-opus-4.1" },
        workspace: {
          current_dir: "/Users/developer/ai-research-project",
          project_dir: "/Users/developer/ai-research-project"
        },
        transcriptPath: "/tmp/claude_transcript_thinking.json",
        cwd: "/Users/developer/ai-research-project",
        gitBranch: null
      },
      tokenUsage: 65,
      expectedStatus: "thinking"
    });
    this.scenarios.set("tool", {
      id: "tool",
      name: "\u5DE5\u5177\u6267\u884C",
      description: "\u6B63\u5728\u6267\u884C\u5DE5\u5177\u8C03\u7528\uFF0C\u5982\u6587\u4EF6\u64CD\u4F5C\u3001\u4EE3\u7801\u5206\u6790\u7B49",
      inputData: {
        hookEventName: "Status",
        sessionId: "tool_session_202",
        model: { id: "claude-sonnet-4" },
        workspace: {
          current_dir: "/Users/developer/automation-scripts",
          project_dir: "/Users/developer/automation-scripts"
        },
        transcriptPath: "/tmp/claude_transcript_tool.json",
        cwd: "/Users/developer/automation-scripts",
        gitBranch: null
      },
      tokenUsage: 55,
      expectedStatus: "tool_use"
    });
    this.scenarios.set("complete", {
      id: "complete",
      name: "\u4EFB\u52A1\u5B8C\u6210",
      description: "\u4EFB\u52A1\u6210\u529F\u5B8C\u6210\uFF0C\u51C6\u5907\u63A5\u53D7\u65B0\u7684\u6307\u4EE4",
      inputData: {
        hookEventName: "Status",
        sessionId: "complete_session_303",
        model: { id: "claude-sonnet-4" },
        workspace: {
          current_dir: "/Users/developer/completed-feature",
          project_dir: "/Users/developer/completed-feature"
        },
        transcriptPath: "/tmp/claude_transcript_complete.json",
        cwd: "/Users/developer/completed-feature",
        gitBranch: null
      },
      tokenUsage: 35,
      expectedStatus: "complete"
    });
    this.scenarios.set("empty", {
      id: "empty",
      name: "\u7A7A\u9879\u76EE",
      description: "\u65B0\u5EFA\u9879\u76EE\u6216\u7A7A\u76EE\u5F55\uFF0C\u57FA\u7840\u72B6\u6001",
      inputData: {
        hookEventName: "Status",
        sessionId: "empty_session_404",
        model: { id: "claude-haiku-3.5" },
        workspace: {
          current_dir: "/Users/developer/new-project",
          project_dir: "/Users/developer/new-project"
        },
        transcriptPath: "/tmp/claude_transcript_empty.json",
        cwd: "/Users/developer/new-project",
        gitBranch: null
      },
      tokenUsage: 8,
      expectedStatus: "ready"
    });
    this.scenarios.set("git", {
      id: "git",
      name: "Git\u9879\u76EE",
      description: "Git\u7BA1\u7406\u7684\u9879\u76EE\uFF0C\u5305\u542B\u5206\u652F\u548C\u4ED3\u5E93\u4FE1\u606F",
      inputData: {
        hookEventName: "Status",
        sessionId: "git_session_505",
        model: { id: "claude-sonnet-4" },
        workspace: {
          current_dir: "/Users/developer/web-application",
          project_dir: "/Users/developer/web-application"
        },
        transcriptPath: "/tmp/claude_transcript_git.json",
        cwd: "/Users/developer/web-application",
        gitBranch: "feature/user-authentication"
      },
      tokenUsage: 42,
      expectedStatus: "ready"
    });
  }
  /**
   * 根据场景ID生成Mock数据
   */
  generate(scenarioId) {
    const scenario = this.scenarios.get(scenarioId.toLowerCase());
    if (!scenario) {
      throw new Error(
        `Unknown mock scenario: ${scenarioId}. Available: ${this.getAvailableScenarios().join(", ")}`
      );
    }
    const mockData = JSON.parse(JSON.stringify(scenario.inputData));
    mockData["__mock__"] = {
      tokenUsage: scenario.tokenUsage || 0,
      status: scenario.expectedStatus || "ready",
      scenarioId: scenario.id,
      scenarioName: scenario.name
    };
    return mockData;
  }
  /**
   * 获取场景详情
   */
  getScenario(scenarioId) {
    return this.scenarios.get(scenarioId.toLowerCase());
  }
  /**
   * 获取所有可用场景
   */
  getAvailableScenarios() {
    return Array.from(this.scenarios.keys());
  }
  /**
   * 获取所有场景详情
   */
  getAllScenarios() {
    return Array.from(this.scenarios.values());
  }
  /**
   * 根据token使用率筛选场景
   */
  getScenariosByTokenUsage(minUsage, maxUsage) {
    return this.getAllScenarios().filter((scenario) => {
      const usage = scenario.tokenUsage || 0;
      return usage >= minUsage && usage <= maxUsage;
    });
  }
  /**
   * 根据状态筛选场景
   */
  getScenariosByStatus(status) {
    return this.getAllScenarios().filter((scenario) => scenario.expectedStatus === status);
  }
  /**
   * 生成随机场景数据
   */
  generateRandom() {
    const scenarios = this.getAvailableScenarios();
    const randomScenario = scenarios[Math.floor(Math.random() * scenarios.length)];
    return this.generate(randomScenario || "dev");
  }
  /**
   * 添加自定义场景
   */
  addCustomScenario(scenario) {
    this.scenarios.set(scenario.id, scenario);
  }
  /**
   * 生成压力测试场景 - 极限token使用
   */
  generateStressTestScenario() {
    return {
      hookEventName: "Status",
      sessionId: "stress_test_999",
      model: { id: "claude-opus-4.1" },
      workspace: {
        current_dir: "/Users/developer/massive-codebase",
        project_dir: "/Users/developer/massive-codebase"
      },
      transcriptPath: "/tmp/claude_transcript_stress.json",
      cwd: "/Users/developer/massive-codebase",
      gitBranch: "performance/optimization-hell"
    };
  }
};
var mockDataGenerator = new MockDataGenerator();

// src/cli/preview-engine.ts
init_loader();
init_generator();
init_detector();
var ANSI_ESCAPE_REGEX = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, "g");
var LivePreviewEngine = class {
  generator;
  configLoader;
  mockGenerator;
  terminalDetector;
  currentConfig;
  options;
  isRunning = false;
  constructor(options = {}) {
    this.options = {
      refreshInterval: options.refreshInterval || 300,
      maxScenarios: options.maxScenarios || 6,
      debug: options.debug || false,
      dynamicBanner: options.dynamicBanner ?? true
    };
    if (options.configPath) {
      this.options.configPath = options.configPath;
    }
    if (options.theme) {
      this.options.theme = options.theme;
    }
    this.configLoader = new ConfigLoader();
    this.mockGenerator = new MockDataGenerator();
    this.terminalDetector = new TerminalDetector();
  }
  /**
   * 公开的初始化方法
   */
  async initialize() {
    try {
      this.currentConfig = await this.configLoader.load(this.options.configPath);
      if (this.options.theme) {
        await this.configLoader.applyTheme(this.options.theme);
        this.currentConfig = await this.configLoader.load();
      }
      this.generator = new StatuslineGenerator(this.currentConfig, { disableCache: true });
    } catch (error) {
      console.error("Failed to initialize preview engine:", error);
      throw error;
    }
  }
  /**
   * 异步初始化 - 私有方法，确保初始化
   */
  async ensureInitialized() {
    if (!this.generator || !this.currentConfig) {
      await this.initialize();
    }
  }
  /**
   * 启动实时预览模式
   */
  async startLivePreview() {
    if (this.isRunning) {
      throw new Error("Preview engine is already running");
    }
    await this.ensureInitialized();
    this.isRunning = true;
    this.setupKeyboardHandling();
    this.clearScreen();
    await this.renderLivePreview();
    const intervalId = setInterval(async () => {
      if (!this.isRunning) {
        clearInterval(intervalId);
        return;
      }
      await this.renderLivePreview();
    }, this.options.refreshInterval);
    process.on("SIGINT", () => {
      this.isRunning = false;
      clearInterval(intervalId);
      console.log("\n\u{1F44B} Preview stopped");
      process.exit(0);
    });
  }
  /**
   * 停止实时预览
   */
  stopLivePreview() {
    this.isRunning = false;
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(false);
      process.stdin.pause();
    }
    console.clear();
    console.log("\n\u{1F44B} \u5B9E\u65F6\u9884\u89C8\u5DF2\u505C\u6B62 - Live Preview stopped");
    process.exit(0);
  }
  /**
   * 渲染实时预览界面
   */
  async renderLivePreview() {
    const capabilities = this.terminalDetector.detectCapabilities();
    const scenarios = this.getSelectedScenarios();
    process.stdout.write("\x1B[H");
    this.renderHeader(capabilities);
    if (this.options.dynamicBanner) {
      await this.renderDynamicBanner();
    }
    this.renderConfigInfo();
    await this.renderScenariosPreview(scenarios, capabilities);
    this.renderShortcutsHelp(capabilities);
  }
  /**
   * 渲染静态预览 - 用于preview子命令
   */
  async renderStaticPreview(scenarioIds) {
    await this.ensureInitialized();
    const capabilities = this.terminalDetector.detectCapabilities();
    console.log(this.formatTitle("Claude Code Statusline Pro - Static Preview", capabilities));
    console.log();
    for (const scenarioId of scenarioIds) {
      try {
        const result = await this.renderScenario(scenarioId);
        console.log(this.formatScenarioOutput(result, capabilities));
      } catch (error) {
        console.error(`Error rendering scenario ${scenarioId}:`, error);
      }
    }
  }
  /**
   * 更新配置并刷新预览
   */
  async updateConfig(changes) {
    try {
      this.currentConfig = { ...this.currentConfig, ...changes };
      this.generator = new StatuslineGenerator(this.currentConfig, { disableCache: true });
      if (this.isRunning) {
        await this.renderLivePreview();
      }
    } catch (error) {
      console.error("Failed to update config:", error);
    }
  }
  /**
   * 获取要预览的场景列表
   */
  getSelectedScenarios() {
    const allScenarios = this.mockGenerator.getAllScenarios();
    return allScenarios.slice(0, this.options.maxScenarios);
  }
  /**
   * 渲染单个场景
   */
  async renderScenario(scenarioId) {
    const startTime = Date.now();
    try {
      const inputData = this.mockGenerator.generate(scenarioId);
      const output = await this.generator.generate(inputData);
      return {
        scenarioId,
        output,
        renderTime: Date.now() - startTime,
        hasError: false
      };
    } catch (error) {
      return {
        scenarioId,
        output: "",
        renderTime: Date.now() - startTime,
        hasError: true,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  /**
   * 渲染标题栏
   */
  renderHeader(capabilities) {
    const title = this.formatTitle("Claude Code Statusline Pro v2.0.0", capabilities);
    const subtitle = capabilities.colors ? "\x1B[36m\u{1F4CA} \u5B9E\u65F6\u9884\u89C8\u6A21\u5F0F - Live Preview\x1B[0m" : "\u{1F4CA} \u5B9E\u65F6\u9884\u89C8\u6A21\u5F0F - Live Preview";
    console.log(title);
    console.log(subtitle);
    console.log(this.formatSeparator(capabilities));
    console.log();
  }
  /**
   * 渲染动态Banner
   */
  async renderDynamicBanner() {
    const timestamp = (/* @__PURE__ */ new Date()).toLocaleTimeString();
    const uptime = process.uptime().toFixed(1);
    console.log(`\u23F0 \u66F4\u65B0\u65F6\u95F4: ${timestamp}  \u{1F4C8} \u8FD0\u884C\u65F6\u95F4: ${uptime}s`);
    console.log();
  }
  /**
   * 渲染配置信息
   */
  renderConfigInfo() {
    const configSource = this.configLoader.getConfigSource() || "default";
    const theme = this.currentConfig.theme || "default";
    console.log(`\u{1F4DD} \u914D\u7F6E\u6E90: ${configSource}`);
    console.log(`\u{1F3A8} \u5F53\u524D\u4E3B\u9898: ${theme}`);
    console.log(`\u{1F527} \u7EC4\u4EF6\u9884\u8BBE: ${this.currentConfig.preset || "PMBTS"}`);
    console.log();
  }
  /**
   * 渲染场景预览
   */
  async renderScenariosPreview(scenarios, capabilities) {
    for (const scenario of scenarios) {
      const result = await this.renderScenario(scenario.id);
      console.log(this.formatScenarioOutput(result, capabilities, scenario));
      console.log();
    }
  }
  /**
   * 渲染快捷键帮助
   */
  renderShortcutsHelp(capabilities) {
    const helpText = capabilities.colors ? "\x1B[90m\u5FEB\u6377\u952E: [c] \u914D\u7F6E  [t] \u4E3B\u9898  [p] \u9884\u8BBE  [r] \u5237\u65B0  [q] \u9000\u51FA\x1B[0m" : "\u5FEB\u6377\u952E: [c] \u914D\u7F6E  [t] \u4E3B\u9898  [p] \u9884\u8BBE  [r] \u5237\u65B0  [q] \u9000\u51FA";
    console.log(this.formatSeparator(capabilities));
    console.log(helpText);
  }
  /**
   * 获取不包含ANSI代码的可见文本长度
   */
  getVisibleLength(text) {
    return text.replace(ANSI_ESCAPE_REGEX, "").length;
  }
  /**
   * 对包含ANSI代码的文本进行可视化padding
   */
  padEndVisible(text, targetLength) {
    const visibleLength = this.getVisibleLength(text);
    const paddingNeeded = Math.max(0, targetLength - visibleLength);
    return text + " ".repeat(paddingNeeded);
  }
  /**
   * 获取终端宽度
   */
  getTerminalWidth() {
    return process.stdout.columns || parseInt(process.env["COLUMNS"] || "80") || 80;
  }
  /**
   * 格式化场景输出
   */
  formatScenarioOutput(result, capabilities, scenario) {
    const scenarioInfo = scenario ? ` - ${scenario.name}` : "";
    const performanceInfo = this.options.debug ? ` (${result.renderTime}ms)` : "";
    const terminalWidth = this.getTerminalWidth();
    const maxBoxWidth = terminalWidth - 2;
    const headerText = `\u573A\u666F: ${result.scenarioId}${scenarioInfo}${performanceInfo}`;
    const headerVisibleLength = this.getVisibleLength(headerText);
    const contentText = result.hasError ? capabilities.colors ? `\u274C \u9519\u8BEF: ${result.error}` : `\u274C \u9519\u8BEF: ${result.error}` : result.output;
    const contentVisibleLength = this.getVisibleLength(contentText);
    const idealBoxWidth = Math.max(
      headerVisibleLength + 8,
      // header + "┌─ " + " ─┐"
      contentVisibleLength + 4
      // content + "│ " + " │"
    );
    const boxWidth = Math.min(idealBoxWidth, maxBoxWidth);
    const topBorderLength = boxWidth - headerVisibleLength - 4;
    const topBorder = "\u2500".repeat(Math.max(1, topBorderLength));
    let output = `\u250C\u2500 ${headerText} ${topBorder}\u2510
`;
    const maxContentWidth = boxWidth - 4;
    if (result.hasError) {
      const errorMsg = capabilities.colors ? `\x1B[31m\u274C \u9519\u8BEF: ${result.error}\x1B[0m` : `\u274C \u9519\u8BEF: ${result.error}`;
      let displayMsg = errorMsg;
      if (this.getVisibleLength(errorMsg) > maxContentWidth) {
        const visibleError = errorMsg.replace(ANSI_ESCAPE_REGEX, "");
        const truncatedError = `${visibleError.substring(0, maxContentWidth - 3)}...`;
        displayMsg = capabilities.colors ? `\x1B[31m${truncatedError}\x1B[0m` : truncatedError;
      }
      output += `\u2502 ${this.padEndVisible(displayMsg, maxContentWidth)} \u2502
`;
    } else {
      let displayOutput = result.output;
      if (this.getVisibleLength(displayOutput) > maxContentWidth) {
        const truncatedOutput = `${this.truncateWithAnsi(displayOutput, maxContentWidth - 3)}...`;
        displayOutput = truncatedOutput;
      }
      output += `\u2502 ${this.padEndVisible(displayOutput, maxContentWidth)} \u2502
`;
    }
    const bottomBorder = "\u2500".repeat(boxWidth - 2);
    output += `\u2514${bottomBorder}\u2518`;
    return output;
  }
  /**
   * 安全截断包含ANSI代码的文本
   */
  truncateWithAnsi(text, maxLength) {
    let visibleLength = 0;
    let result = "";
    let i = 0;
    while (i < text.length && visibleLength < maxLength) {
      if (text[i] === "\x1B" && text[i + 1] === "[") {
        const ansiStart = i;
        i += 2;
        while (i < text.length && !/[a-zA-Z]/.test(text[i] || "")) {
          i++;
        }
        if (i < text.length) i++;
        result += text.substring(ansiStart, i);
      } else {
        result += text[i];
        visibleLength++;
        i++;
      }
    }
    return result;
  }
  /**
   * 格式化标题
   */
  formatTitle(title, capabilities) {
    if (capabilities.colors) {
      return `\x1B[1;36m${title}\x1B[0m`;
    }
    return title;
  }
  /**
   * 格式化分隔线
   */
  formatSeparator(capabilities) {
    const line = "\u2500".repeat(70);
    if (capabilities.colors) {
      return `\x1B[90m${line}\x1B[0m`;
    }
    return line;
  }
  /**
   * 清屏
   */
  clearScreen() {
    process.stdout.write("\x1B[2J\x1B[H");
  }
  /**
   * 处理键盘输入 (用于交互式模式)
   */
  setupKeyboardHandling() {
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.setEncoding("utf8");
      process.stdin.on("data", (key) => {
        switch (key) {
          case "c":
            break;
          case "t":
            break;
          case "p":
            break;
          case "r":
            this.renderLivePreview();
            break;
          case "q":
          case "":
            this.stopLivePreview();
            break;
        }
      });
    }
  }
  /**
   * 获取当前配置
   */
  getCurrentConfig() {
    return this.currentConfig;
  }
  /**
   * 获取可用场景列表
   */
  getAvailableScenarios() {
    return this.mockGenerator.getAvailableScenarios();
  }
};
function createLivePreviewEngine(options) {
  return new LivePreviewEngine(options);
}

// src/cli/config-editor.ts
var ConfigEditor = class {
  configLoader;
  previewEngine = null;
  terminalDetector;
  currentConfig;
  options;
  hasUnsavedChanges = false;
  constructor(options = {}) {
    this.options = {
      configPath: options.configPath || "",
      enableLivePreview: options.enableLivePreview ?? true,
      autoSave: options.autoSave ?? false
    };
    if (options.configPath) {
      this.options.configPath = options.configPath;
    }
    this.configLoader = new ConfigLoader();
    this.terminalDetector = new TerminalDetector();
    if (this.options.enableLivePreview) {
      this.previewEngine = new LivePreviewEngine({
        configPath: this.options.configPath,
        refreshInterval: 100
        // 快速响应配置变更
      });
    }
  }
  /**
   * 启动交互式配置模式
   */
  async startInteractiveMode() {
    try {
      await this.loadConfiguration();
      this.checkTerminalCompatibility();
      if (this.previewEngine) {
        await this.previewEngine.initialize();
      }
      await this.runConfigurationLoop();
    } catch (error) {
      console.error("Configuration editor error:", error);
      throw error;
    } finally {
      if (this.previewEngine) {
        this.previewEngine.stopLivePreview();
      }
    }
  }
  /**
   * 加载配置
   */
  async loadConfiguration() {
    try {
      this.currentConfig = await this.configLoader.load(this.options.configPath);
    } catch (error) {
      console.error("Failed to load configuration:", error);
      throw error;
    }
  }
  /**
   * 检查终端兼容性
   */
  checkTerminalCompatibility() {
    const capabilities = this.terminalDetector.detectCapabilities();
    if (!process.stdin.isTTY) {
      throw new Error("\u4EA4\u4E92\u6A21\u5F0F\u9700\u8981TTY\u7EC8\u7AEF");
    }
    console.log("\u{1F5A5}\uFE0F  \u7EC8\u7AEF\u80FD\u529B\u68C0\u6D4B:");
    console.log(`   \u989C\u8272\u652F\u6301: ${capabilities.colors ? "\u2705" : "\u274C"}`);
    console.log(`   \u8868\u60C5\u7B26\u53F7: ${capabilities.emoji ? "\u2705" : "\u274C"}`);
    console.log(`   Nerd Font: ${capabilities.nerdFont ? "\u2705" : "\u274C"}`);
    console.log();
  }
  /**
   * 渲染实时预览界面
   */
  async renderLivePreviewInterface() {
    console.clear();
    const capabilities = this.terminalDetector.detectCapabilities();
    const title = capabilities.colors ? "\x1B[1;36mClaude Code Statusline Pro v2.0.0\x1B[0m" : "Claude Code Statusline Pro v2.0.0";
    const subtitle = capabilities.colors ? "\x1B[36m\u{1F39B}\uFE0F  \u4EA4\u4E92\u5F0F\u914D\u7F6E\u7F16\u8F91\u5668 - Interactive Configuration Editor\x1B[0m" : "\u{1F39B}\uFE0F  \u4EA4\u4E92\u5F0F\u914D\u7F6E\u7F16\u8F91\u5668 - Interactive Configuration Editor";
    console.log(title);
    console.log(subtitle);
    console.log();
    const previewTitle = capabilities.colors ? "\x1B[32m\u2705 \u5B9E\u65F6\u9884\u89C8 - Live Preview (\u914D\u7F6E\u53D8\u5316\u65F6\u81EA\u52A8\u66F4\u65B0)\x1B[0m" : "\u2705 \u5B9E\u65F6\u9884\u89C8 - Live Preview (\u914D\u7F6E\u53D8\u5316\u65F6\u81EA\u52A8\u66F4\u65B0)";
    console.log(previewTitle);
    console.log();
    const scenarios = ["dev", "critical", "error"];
    for (const scenarioId of scenarios) {
      try {
        const mockGenerator = new MockDataGenerator();
        const mockData = mockGenerator.generate(scenarioId);
        const scenario = mockGenerator.getScenario(scenarioId);
        const generator = new StatuslineGenerator(this.currentConfig, { disableCache: true });
        const output = await generator.generate(mockData);
        const scenarioName = scenario?.name || scenarioId;
        const _description = scenario?.description || "";
        const scenarioLabel = capabilities.colors ? `\x1B[90m\u573A\u666F: ${scenarioName}\x1B[0m` : `\u573A\u666F: ${scenarioName}`;
        console.log(`${scenarioLabel}`);
        console.log(output);
        console.log();
      } catch (error) {
        const errorLabel = capabilities.colors ? `\x1B[31m\u573A\u666F: ${scenarioId} - \u9519\u8BEF\x1B[0m` : `\u573A\u666F: ${scenarioId} - \u9519\u8BEF`;
        console.log(errorLabel);
        console.log(`\u274C \u6E32\u67D3\u5931\u8D25: ${error instanceof Error ? error.message : String(error)}`);
        console.log();
      }
    }
    const separator = capabilities.colors ? `\x1B[90m${"\u2500".repeat(70)}\x1B[0m` : "\u2500".repeat(70);
    console.log(separator);
  }
  /**
   * 运行主配置循环
   */
  async runConfigurationLoop() {
    let continueEditing = true;
    while (continueEditing) {
      try {
        await this.renderLivePreviewInterface();
        const action = await this.showMainMenu();
        switch (action) {
          case "components":
            await this.configureComponents();
            break;
          case "themes":
            await this.configureThemes();
            break;
          case "styles":
            await this.configureStyles();
            break;
          case "presets":
            await this.configurePresets();
            break;
          case "reset":
            await this.resetConfiguration();
            break;
          case "save":
            await this.saveConfiguration();
            break;
          case "exit":
            continueEditing = await this.handleExit();
            break;
          default:
            console.log("Unknown action:", action);
        }
      } catch (error) {
        if (error instanceof Error && error.name === "ExitPromptError") {
          continueEditing = await this.handleExit();
        } else {
          console.error("Configuration error:", error);
          await this.waitForKeyPress();
        }
      }
    }
  }
  /**
   * 显示主菜单
   */
  async showMainMenu() {
    const unsavedIndicator = this.hasUnsavedChanges ? " (*)" : "";
    return await (0, import_prompts.select)({
      message: `\u914D\u7F6E\u83DC\u5355${unsavedIndicator}`,
      choices: [
        {
          name: "\u{1F9E9} \u7EC4\u4EF6\u914D\u7F6E - \u914D\u7F6E\u663E\u793A\u7EC4\u4EF6",
          value: "components",
          description: "\u542F\u7528/\u7981\u7528\u548C\u914D\u7F6E\u5404\u4E2A\u72B6\u6001\u884C\u7EC4\u4EF6"
        },
        {
          name: "\u{1F3A8} \u4E3B\u9898\u7BA1\u7406 - \u4E3B\u9898\u7BA1\u7406",
          value: "themes",
          description: "\u9009\u62E9\u548C\u81EA\u5B9A\u4E49\u89C6\u89C9\u4E3B\u9898"
        },
        {
          name: "\u{1F484} \u6837\u5F0F\u8BBE\u7F6E - \u6837\u5F0F\u8BBE\u7F6E",
          value: "styles",
          description: "\u914D\u7F6E\u989C\u8272\u3001\u56FE\u6807\u548C\u89C6\u89C9\u5143\u7D20"
        },
        {
          name: "\u{1F4CB} \u7EC4\u4EF6\u9884\u8BBE - \u7EC4\u4EF6\u9884\u8BBE",
          value: "presets",
          description: "\u7BA1\u7406\u7EC4\u4EF6\u987A\u5E8F\u548C\u9884\u8BBE\u914D\u7F6E"
        },
        {
          name: "\u{1F504} \u91CD\u7F6E\u914D\u7F6E - \u91CD\u7F6E\u4E3A\u9ED8\u8BA4",
          value: "reset",
          description: "\u5C06\u914D\u7F6E\u91CD\u7F6E\u4E3A\u51FA\u5382\u9ED8\u8BA4\u503C"
        },
        {
          name: "\u{1F4BE} \u4FDD\u5B58\u914D\u7F6E - \u4FDD\u5B58\u914D\u7F6E",
          value: "save",
          description: "\u4FDD\u5B58\u5F53\u524D\u914D\u7F6E\u5230\u6587\u4EF6"
        },
        {
          name: "\u{1F6AA} \u9000\u51FA\u7F16\u8F91\u5668 - \u9000\u51FA\u7F16\u8F91\u5668",
          value: "exit",
          description: "\u9000\u51FA\u914D\u7F6E\u7F16\u8F91\u5668"
        }
      ],
      pageSize: 10
    });
  }
  /**
   * 配置组件
   */
  async configureComponents() {
    const componentName = await (0, import_prompts.select)({
      message: "\u9009\u62E9\u8981\u914D\u7F6E\u7684\u7EC4\u4EF6\uFF1A",
      choices: [
        { name: "\u{1F4C1} \u9879\u76EE\u540D\u79F0 - \u9879\u76EE\u540D\u79F0\u663E\u793A", value: "project" },
        { name: "\u{1F916} AI\u6A21\u578B - AI\u6A21\u578B\u4FE1\u606F", value: "model" },
        { name: "\u{1F33F} Git\u5206\u652F - Git\u5206\u652F\u663E\u793A", value: "branch" },
        { name: "\u{1F4CA} Token\u4F7F\u7528 - Token\u4F7F\u7528\u7387\u548C\u8FDB\u5EA6", value: "tokens" },
        { name: "\u26A1 \u4F1A\u8BDD\u72B6\u6001 - \u4F1A\u8BDD\u72B6\u6001\u6307\u793A\u5668", value: "status" },
        { name: "\u2190 \u8FD4\u56DE\u4E3B\u83DC\u5355", value: "back" }
      ]
    });
    if (componentName === "back") return;
    await this.configureIndividualComponent(componentName);
  }
  /**
   * 配置单个组件
   */
  async configureIndividualComponent(componentName) {
    const component = this.currentConfig.components?.[componentName];
    if (!component) {
      console.log(`\u7EC4\u4EF6 ${componentName} \u672A\u627E\u5230`);
      return;
    }
    console.log(`\\n\u{1F527} \u914D\u7F6E ${componentName} \u7EC4\u4EF6:`);
    const enabled = await (0, import_prompts.confirm)({
      message: `\u542F\u7528 ${componentName} \u7EC4\u4EF6\uFF1F`,
      default: component.enabled
    });
    let icon = component.icon;
    if (enabled) {
      icon = await (0, import_prompts.input)({
        message: `${componentName} \u7EC4\u4EF6\u56FE\u6807\uFF1A`,
        default: component.icon
      });
    }
    let color = component.color;
    if (enabled) {
      color = await (0, import_prompts.select)({
        message: `${componentName} \u7EC4\u4EF6\u989C\u8272\uFF1A`,
        choices: [
          { name: "\u9752\u8272 (\u9ED8\u8BA4)", value: "cyan" },
          { name: "\u7EFF\u8272", value: "green" },
          { name: "\u9EC4\u8272", value: "yellow" },
          { name: "\u84DD\u8272", value: "blue" },
          { name: "\u7D2B\u7EA2\u8272", value: "magenta" },
          { name: "\u7EA2\u8272", value: "red" },
          { name: "\u767D\u8272", value: "white" },
          { name: "\u7070\u8272", value: "gray" }
        ],
        default: component.color || "cyan"
      });
    }
    const updatedComponent = {
      ...component,
      enabled,
      icon,
      color
    };
    this.currentConfig.components = {
      order: this.currentConfig.components?.order || [
        "project",
        "model",
        "branch",
        "tokens",
        "status"
      ],
      ...this.currentConfig.components,
      [componentName]: updatedComponent
    };
    this.hasUnsavedChanges = true;
    console.log(`\u2705 ${componentName} \u7EC4\u4EF6\u914D\u7F6E\u5DF2\u66F4\u65B0\uFF01`);
    await this.waitForKeyPress();
  }
  /**
   * 配置主题
   */
  async configureThemes() {
    const theme = await (0, import_prompts.select)({
      message: "\u9009\u62E9\u4E3B\u9898\uFF1A",
      choices: [
        { name: "\u7B80\u6D01\u4E3B\u9898 - \u6E05\u723D\u7B80\u5355", value: "minimal" },
        { name: "\u8BE6\u7EC6\u4E3B\u9898 - \u8BE6\u7EC6\u4FE1\u606F", value: "verbose" },
        { name: "\u5F00\u53D1\u8005\u4E3B\u9898 - \u4FBF\u4E8E\u8C03\u8BD5", value: "developer" },
        { name: "\u81EA\u5B9A\u4E49\u4E3B\u9898 - \u5F53\u524D\u914D\u7F6E", value: "custom" },
        { name: "\u2190 \u8FD4\u56DE\u4E3B\u83DC\u5355", value: "back" }
      ]
    });
    if (theme === "back") return;
    if (theme !== "custom") {
      await this.configLoader.applyTheme(theme);
      this.currentConfig = await this.configLoader.load();
      this.hasUnsavedChanges = true;
    }
    console.log(`\u2705 \u5DF2\u5E94\u7528\u4E3B\u9898: ${theme}`);
    await this.waitForKeyPress();
  }
  /**
   * 配置样式
   */
  async configureStyles() {
    const style = this.currentConfig.style;
    const enableColors = await (0, import_prompts.confirm)({
      message: "\u542F\u7528\u989C\u8272\uFF1F",
      default: style?.enable_colors === true
    });
    const enableEmoji = await (0, import_prompts.confirm)({
      message: "\u542F\u7528\u8868\u60C5\u7B26\u53F7\uFF1F",
      default: style?.enable_emoji === true
    });
    const enableNerdFont = await (0, import_prompts.confirm)({
      message: "\u542F\u7528 Nerd Font \u56FE\u6807\uFF1F",
      default: style?.enable_nerd_font === true
    });
    const separator = await (0, import_prompts.input)({
      message: "\u7EC4\u4EF6\u5206\u9694\u7B26\uFF1A",
      default: style?.separator || " | "
    });
    this.currentConfig.style = {
      separator,
      enable_colors: enableColors,
      enable_emoji: enableEmoji,
      enable_nerd_font: enableNerdFont,
      compact_mode: style?.compact_mode || false,
      max_width: style?.max_width || 0
    };
    this.hasUnsavedChanges = true;
    console.log("\u2705 \u6837\u5F0F\u8BBE\u7F6E\u5DF2\u66F4\u65B0\uFF01");
    await this.waitForKeyPress();
  }
  /**
   * 配置预设
   */
  async configurePresets() {
    const preset = await (0, import_prompts.select)({
      message: "\u9009\u62E9\u7EC4\u4EF6\u9884\u8BBE\uFF1A",
      choices: [
        { name: "PMBTS - \u9879\u76EE\u3001\u6A21\u578B\u3001\u5206\u652F\u3001Token\u3001\u72B6\u6001", value: "PMBTS" },
        { name: "PMB - \u4EC5\u9879\u76EE\u3001\u6A21\u578B\u3001\u5206\u652F", value: "PMB" },
        { name: "PMBT - \u9879\u76EE\u3001\u6A21\u578B\u3001\u5206\u652F\u3001Token", value: "PMBT" },
        { name: "MBT - \u6A21\u578B\u3001\u5206\u652F\u3001Token", value: "MBT" },
        { name: "\u81EA\u5B9A\u4E49 - \u624B\u52A8\u914D\u7F6E", value: "custom" },
        { name: "\u2190 \u8FD4\u56DE\u4E3B\u83DC\u5355", value: "back" }
      ]
    });
    if (preset === "back") return;
    if (preset === "custom") {
      const selectedComponents = await (0, import_prompts.checkbox)({
        message: "\u9009\u62E9\u8981\u663E\u793A\u7684\u7EC4\u4EF6\uFF1A",
        choices: [
          { name: "\u9879\u76EE\u540D\u79F0", value: "project" },
          { name: "AI\u6A21\u578B", value: "model" },
          { name: "Git\u5206\u652F", value: "branch" },
          { name: "Token\u4F7F\u7528", value: "tokens" },
          { name: "\u4F1A\u8BDD\u72B6\u6001", value: "status" }
        ]
      });
      if (this.currentConfig.components) {
        this.currentConfig.components.order = selectedComponents;
      } else {
        this.currentConfig.components = { order: selectedComponents };
      }
    } else {
      this.currentConfig.preset = preset;
    }
    this.hasUnsavedChanges = true;
    console.log(`\u2705 \u5DF2\u5E94\u7528\u9884\u8BBE: ${preset}`);
    await this.waitForKeyPress();
  }
  /**
   * 重置配置
   */
  async resetConfiguration() {
    const confirmReset = await (0, import_prompts.confirm)({
      message: "\u786E\u5B9A\u8981\u5C06\u6240\u6709\u914D\u7F6E\u91CD\u7F6E\u4E3A\u9ED8\u8BA4\u503C\u5417\uFF1F\u6B64\u64CD\u4F5C\u65E0\u6CD5\u64A4\u9500\u3002",
      default: false
    });
    if (confirmReset) {
      await this.configLoader.resetToDefaults(this.options.configPath);
      this.currentConfig = await this.configLoader.load();
      this.hasUnsavedChanges = false;
      console.log("\u2705 \u914D\u7F6E\u5DF2\u91CD\u7F6E\u4E3A\u9ED8\u8BA4\u503C");
    } else {
      console.log("\u91CD\u7F6E\u5DF2\u53D6\u6D88");
    }
    await this.waitForKeyPress();
  }
  /**
   * 保存配置
   */
  async saveConfiguration() {
    try {
      await this.configLoader.save(this.currentConfig, this.options.configPath);
      this.hasUnsavedChanges = false;
      console.log("\u2705 \u914D\u7F6E\u4FDD\u5B58\u6210\u529F");
    } catch (error) {
      console.error("\u914D\u7F6E\u4FDD\u5B58\u5931\u8D25:", error);
    }
    await this.waitForKeyPress();
  }
  /**
   * 处理退出
   */
  async handleExit() {
    if (this.hasUnsavedChanges) {
      const action = await (0, import_prompts.select)({
        message: "\u60A8\u6709\u672A\u4FDD\u5B58\u7684\u66F4\u6539\u3002\u60A8\u5E0C\u671B\u5982\u4F55\u5904\u7406\uFF1F",
        choices: [
          { name: "\u4FDD\u5B58\u5E76\u9000\u51FA", value: "save" },
          { name: "\u4E0D\u4FDD\u5B58\u76F4\u63A5\u9000\u51FA", value: "discard" },
          { name: "\u53D6\u6D88\uFF08\u7EE7\u7EED\u7F16\u8F91\uFF09", value: "cancel" }
        ]
      });
      switch (action) {
        case "save":
          await this.saveConfiguration();
          return false;
        // Exit
        case "discard":
          return false;
        // Exit without saving
        case "cancel":
          return true;
      }
    }
    return false;
  }
  /**
   * 等待按键
   */
  async waitForKeyPress() {
    console.log("\n\u6309\u4EFB\u610F\u952E\u7EE7\u7EED...");
    return new Promise((resolve) => {
      const stdin = process.stdin;
      if (stdin.isTTY) {
        stdin.setRawMode(true);
        stdin.resume();
        stdin.setEncoding("utf8");
      }
      const onData = (key) => {
        stdin.removeListener("data", onData);
        if (stdin.isTTY) {
          stdin.setRawMode(false);
          stdin.pause();
        }
        if (key === "") {
          console.log("\n\u{1F44B} \u5DF2\u9000\u51FA\u914D\u7F6E\u7F16\u8F91\u5668");
          process.exit(0);
        }
        resolve();
      };
      stdin.on("data", onData);
    });
  }
};
function createConfigEditor(options) {
  return new ConfigEditor(options);
}

// src/cli/message-icons.ts
init_detector();
var CliMessageIconManager = class {
  capabilities;
  icons;
  constructor() {
    this.capabilities = detect();
    this.icons = this.setupCliIcons();
  }
  /**
   * 获取图标 | Get icon
   */
  getIcon(iconName) {
    return this.icons[iconName] || "";
  }
  /**
   * 设置CLI图标系统 | Setup CLI icon system
   */
  setupCliIcons() {
    const nerdFontIcons = {
      // 状态图标 | Status icons
      success: "\uF00C",
      // fa-check
      error: "\uF00D",
      // fa-times  
      warning: "\uF071",
      // fa-exclamation-triangle
      info: "\uF05A",
      // fa-info-circle
      // 功能图标 | Function icons
      config: "\uF013",
      // fa-cog
      file: "\uF15B",
      // fa-file-o
      folder: "\uF07B",
      // fa-folder
      theme: "\uF0C7",
      // fa-floppy-o
      edit: "\uF044",
      // fa-edit
      validate: "\uF058",
      // fa-check-circle
      reset: "\uF0E2",
      // fa-undo
      // 诊断图标 | Diagnostic icons  
      doctor: "\uF0F8",
      // fa-stethoscope
      platform: "\uF109",
      // fa-desktop
      terminal: "\uF120",
      // fa-terminal
      // 交互图标 | Interactive icons
      goodbye: "\uF164",
      // fa-thumbs-up
      prompt: "\uF059"
      // fa-question-circle
    };
    const emojiIcons = {
      // 状态图标 | Status icons
      success: "\u2705",
      error: "\u274C",
      warning: "\u26A0\uFE0F",
      info: "\u2139\uFE0F",
      // 功能图标 | Function icons
      config: "\u2699\uFE0F",
      file: "\u{1F4C4}",
      folder: "\u{1F4C1}",
      theme: "\u{1F3A8}",
      edit: "\u270F\uFE0F",
      validate: "\u{1F50D}",
      reset: "\u{1F504}",
      // 诊断图标 | Diagnostic icons
      doctor: "\u{1F50D}",
      platform: "\u{1F4BB}",
      terminal: "\u{1F4DF}",
      // 交互图标 | Interactive icons
      goodbye: "\u{1F44B}",
      prompt: "\u2753"
    };
    const textIcons = {
      // 状态图标 | Status icons
      success: "[OK]",
      error: "[ERR]",
      warning: "[WARN]",
      info: "[INFO]",
      // 功能图标 | Function icons
      config: "[CFG]",
      file: "[FILE]",
      folder: "[DIR]",
      theme: "[THEME]",
      edit: "[EDIT]",
      validate: "[CHECK]",
      reset: "[RESET]",
      // 诊断图标 | Diagnostic icons
      doctor: "[DIAG]",
      platform: "[PLAT]",
      terminal: "[TERM]",
      // 交互图标 | Interactive icons  
      goodbye: "[BYE]",
      prompt: "[?]"
    };
    if (this.capabilities.nerdFont) {
      return nerdFontIcons;
    } else if (this.capabilities.emoji) {
      return emojiIcons;
    } else {
      return textIcons;
    }
  }
  /**
   * 格式化消息与图标 | Format message with icon
   */
  format(iconName, message) {
    const icon = this.getIcon(iconName);
    return icon ? `${icon} ${message}` : message;
  }
  /**
   * 获取终端能力信息 | Get terminal capabilities
   */
  getCapabilities() {
    return { ...this.capabilities };
  }
  /**
   * 强制刷新终端检测 | Force refresh terminal detection
   */
  refresh() {
    this.capabilities = detect();
    this.icons = this.setupCliIcons();
  }
};
var globalCliIconManager = null;
function getCliIconManager() {
  if (!globalCliIconManager) {
    globalCliIconManager = new CliMessageIconManager();
  }
  return globalCliIconManager;
}
function formatCliMessage(iconName, message) {
  return getCliIconManager().format(iconName, message);
}
function getCliIcon(iconName) {
  return getCliIconManager().getIcon(iconName);
}

// src/index.ts
init_base();
init_branch();
init_model();
init_project();
init_status();
init_tokens();
init_loader();
init_schema();
init_generator();

// src/core/parser.ts
init_schema();
async function readFromStdin() {
  return new Promise((resolve, reject) => {
    let input2 = "";
    const timeout = setTimeout(() => {
      reject(new Error("Input timeout"));
    }, 5e3);
    process.stdin.setEncoding("utf8");
    process.stdin.on("readable", () => {
      let chunk;
      chunk = process.stdin.read();
      while (chunk !== null) {
        input2 += chunk;
        chunk = process.stdin.read();
      }
    });
    process.stdin.on("end", () => {
      clearTimeout(timeout);
      resolve(input2);
    });
    process.stdin.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}
function createDefaultInputData() {
  return {
    hookEventName: "Status",
    sessionId: null,
    transcriptPath: null,
    cwd: process.cwd(),
    model: {},
    workspace: {
      current_dir: process.cwd(),
      project_dir: process.cwd()
    },
    gitBranch: null
  };
}
function parseJson(input2) {
  try {
    if (!input2.trim()) {
      return {
        success: true,
        data: createDefaultInputData()
      };
    }
    const rawData = JSON.parse(input2);
    const result = InputDataSchema.safeParse(rawData);
    if (result.success) {
      return {
        success: true,
        data: result.data
      };
    } else {
      return {
        success: false,
        error: `Input validation failed: ${result.error.message}`
      };
    }
  } catch (error) {
    if (error instanceof SyntaxError) {
      return {
        success: false,
        error: `Invalid JSON: ${error.message}`
      };
    }
    return {
      success: false,
      error: `Parse error: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
async function parseInput() {
  try {
    const input2 = await readFromStdin();
    return parseJson(input2);
  } catch (_error) {
    return {
      success: true,
      data: createDefaultInputData()
    };
  }
}
function validate(data) {
  try {
    const result = InputDataSchema.safeParse(data);
    if (result.success) {
      return {
        success: true,
        data: result.data
      };
    } else {
      return {
        success: false,
        error: `Validation failed: ${result.error.message}`
      };
    }
  } catch (error) {
    return {
      success: false,
      error: `Validation error: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
function parseArguments(args) {
  const parsed = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];
    switch (arg) {
      case "--transcript-path":
      case "-t":
        if (nextArg && !nextArg.startsWith("-")) {
          parsed.transcriptPath = nextArg;
          i++;
        }
        break;
      case "--cwd":
      case "-c":
        if (nextArg && !nextArg.startsWith("-")) {
          parsed.cwd = nextArg;
          i++;
        }
        break;
      case "--model":
      case "-m":
        if (nextArg && !nextArg.startsWith("-")) {
          parsed.model = { id: nextArg };
          i++;
        }
        break;
      case "--branch":
      case "-b":
        if (nextArg && !nextArg.startsWith("-")) {
          parsed.gitBranch = nextArg;
          i++;
        }
        break;
    }
  }
  return parsed;
}
function mergeInputData(base, override) {
  return {
    ...base,
    ...override,
    model: { ...base.model, ...override.model },
    workspace: { ...base.workspace, ...override.workspace }
  };
}
function getDebugInfo(data) {
  return {
    hookEventName: data.hookEventName,
    sessionId: data.sessionId,
    transcriptPath: data.transcriptPath,
    cwd: data.cwd,
    model: data.model,
    workspace: data.workspace,
    gitBranch: data.gitBranch,
    env: {
      PWD: process.env["PWD"],
      HOME: process.env["HOME"],
      USER: process.env["USER"],
      TERM: process.env["TERM"],
      TERM_PROGRAM: process.env["TERM_PROGRAM"]
    }
  };
}

// src/index.ts
init_colors();
init_detector();

// src/utils/index.ts
function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`;
}
function formatNumber(num) {
  return num.toLocaleString();
}
function truncateString(str, maxLength, suffix = "...") {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - suffix.length) + suffix;
}
function getProjectName(projectPath) {
  return projectPath.split("/").filter(Boolean).pop() || "unknown";
}
function calculatePercentage(used, total) {
  if (total === 0) return 0;
  return Math.round(used / total * 100);
}
function generateProgressBar(percentage, length = 10, fillChar = "\u2588", emptyChar = "\u2591", warningThreshold = 60, criticalThreshold = 95) {
  const filled = Math.round(percentage / 100 * length);
  const empty = length - filled;
  let progressChar = fillChar;
  if (percentage >= criticalThreshold) {
    progressChar = "\u{1F525}";
  } else if (percentage >= warningThreshold) {
    progressChar = "\u2593";
  }
  return progressChar.repeat(filled) + emptyChar.repeat(empty);
}
function simplifyBranchName(branchName, maxLength = 20) {
  let simplified = branchName.replace(/^(origin\/|refs\/heads\/|refs\/remotes\/)/, "");
  if (simplified.length > maxLength) {
    const parts = simplified.split(/[-_/]/);
    if (parts.length > 1) {
      const lastPart = parts[parts.length - 1];
      const firstPart = parts[0]?.substring(0, Math.max(3, maxLength - (lastPart?.length || 0) - 3)) || "";
      simplified = `${firstPart}...${lastPart || ""}`;
    } else {
      simplified = truncateString(simplified, maxLength);
    }
  }
  return simplified;
}
function deepMerge(target, source) {
  const result = { ...target };
  for (const key in source) {
    if (source[key] !== void 0) {
      if (typeof source[key] === "object" && source[key] !== null && !Array.isArray(source[key]) && typeof result[key] === "object" && result[key] !== null && !Array.isArray(result[key])) {
        result[key] = deepMerge(
          result[key],
          source[key]
        );
      } else {
        result[key] = source[key];
      }
    }
  }
  return result;
}
function getOS() {
  const platform = process.platform;
  switch (platform) {
    case "win32":
      return "windows";
    case "darwin":
      return "macos";
    case "linux":
      return "linux";
    default:
      return "unknown";
  }
}
function safeJsonParse(str, fallback) {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}
function debounce(func, wait) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}
function throttle(func, limit) {
  let inThrottle;
  return (...args) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}
function generateId(prefix = "", length = 8) {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = prefix;
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
function formatTime(date = /* @__PURE__ */ new Date()) {
  return date.toLocaleTimeString("zh-CN", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}
function getRelativeTime(timestamp) {
  const now = /* @__PURE__ */ new Date();
  const time = new Date(timestamp);
  const diff = now.getTime() - time.getTime();
  const seconds = Math.floor(diff / 1e3);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (seconds < 60) return `${seconds}\u79D2\u524D`;
  if (minutes < 60) return `${minutes}\u5206\u949F\u524D`;
  if (hours < 24) return `${hours}\u5C0F\u65F6\u524D`;
  if (days < 7) return `${days}\u5929\u524D`;
  return time.toLocaleDateString("zh-CN");
}

// src/index.ts
init_generator();
var VERSION = "2.0.0-beta.1";
async function createStatuslineGenerator(configPath) {
  const { ConfigLoader: ConfigLoader2 } = await Promise.resolve().then(() => (init_loader(), loader_exports));
  const { StatuslineGenerator: StatuslineGenerator2 } = await Promise.resolve().then(() => (init_generator(), generator_exports));
  const loader = new ConfigLoader2();
  const config = await loader.load(configPath);
  return new StatuslineGenerator2(config);
}
async function generateStatusline(inputData, configPath) {
  const generator = await createStatuslineGenerator(configPath);
  return generator.generate(inputData);
}
function isValidInputData(data) {
  return data !== null && typeof data === "object" && "model" in data && typeof data["model"] === "object";
}
async function getDefaultConfig() {
  const { ConfigLoader: ConfigLoader2 } = await Promise.resolve().then(() => (init_loader(), loader_exports));
  const loader = new ConfigLoader2();
  return loader.getDefaultConfig();
}
async function validateConfig(_config) {
  try {
    const { ConfigLoader: ConfigLoader2 } = await Promise.resolve().then(() => (init_loader(), loader_exports));
    const loader = new ConfigLoader2();
    const result = await loader.validateConfig();
    return result.valid;
  } catch {
    return false;
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  BranchComponent,
  BranchComponentSchema,
  CliMessageIconManager,
  ColorSystem,
  ComponentRegistry,
  ConfigEditor,
  ConfigLoader,
  ConfigSchema,
  IconSystem,
  InputDataSchema,
  LivePreviewEngine,
  MockDataGenerator,
  ModelComponent,
  ModelComponentSchema,
  ProjectComponent,
  ProjectComponentSchema,
  RenderContextSchema,
  StatusComponent,
  StatusComponentSchema,
  StatuslineGenerator,
  TerminalDetector,
  TokenComponentSchema,
  TokensComponent,
  TranscriptEntrySchema,
  UsageInfoSchema,
  VERSION,
  calculatePercentage,
  createConfigEditor,
  createLivePreviewEngine,
  createStatuslineGenerator,
  debounce,
  deepMerge,
  formatBytes,
  formatCliMessage,
  formatNumber,
  formatTime,
  generateId,
  generateProgressBar,
  generateStatusline,
  getCliIcon,
  getCliIconManager,
  getDebugInfo,
  getDefaultConfig,
  getOS,
  getProjectName,
  getRelativeTime,
  isValidInputData,
  mergeInputData,
  mockDataGenerator,
  parseArguments,
  parseInput,
  parseJson,
  safeJsonParse,
  simplifyBranchName,
  throttle,
  truncateString,
  validate,
  validateConfig
});
/**
 * Claude Code Statusline Pro - 公共API导出
 * Enhanced statusline for Claude Code with TypeScript, live preview, and interactive configuration
 *
 * @version 2.0.0-beta.1
 * @author wangnov
 * @license MIT
 */
//# sourceMappingURL=index.cjs.map