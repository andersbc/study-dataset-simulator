
import { ensureDir } from "@std/fs";
import { dirname } from "@std/path";

export interface AppConfig {
  authEnabled: boolean;
  accessPassword?: string;
}

const DEFAULT_CONFIG_PATH = "/app/data/config.json";

export class ConfigService {
  private static instance: ConfigService;
  private config: AppConfig;
  private configPath: string;

  private constructor() {
    this.configPath = Deno.env.get("CONFIG_PATH") || DEFAULT_CONFIG_PATH;
    this.config = {
      authEnabled: Deno.env.get("AUTH_ENABLED") !== "false",
      accessPassword: Deno.env.get("ACCESS_PASSWORD"),
    };
  }

  public static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService();
    }
    return ConfigService.instance;
  }

  public async loadConfig() {
    try {
      // Try to read file
      const text = await Deno.readTextFile(this.configPath);
      const json = JSON.parse(text);
      this.config = { ...this.config, ...json };
      console.log(`[ConfigService] Loaded config from ${this.configPath}`);
    } catch (e) {
      if (e instanceof Deno.errors.NotFound) {
        console.log(`[ConfigService] No config file found at ${this.configPath}. using ENV defaults.`);
        // Ensure directory exists and write current state
        await this.saveConfig();
      } else {
        console.warn(`[ConfigService] Failed to load config:`, e);
      }
    }
  }

  public async saveConfig() {
    try {
      await ensureDir(dirname(this.configPath));
      await Deno.writeTextFile(this.configPath, JSON.stringify(this.config, null, 2));
      console.log(`[ConfigService] Saved config to ${this.configPath}`);
    } catch (e) {
      console.error(`[ConfigService] Failed to save config:`, e);
      // Fallback for local dev if /app/data doesn't exist/writable?
      if (this.configPath === DEFAULT_CONFIG_PATH) {
        console.warn("[ConfigService] Attempting local fallback to ./data/config.json");
        this.configPath = "./data/config.json";
        try {
          await ensureDir(dirname(this.configPath));
          await Deno.writeTextFile(this.configPath, JSON.stringify(this.config, null, 2));
          console.log(`[ConfigService] Saved config to local fallback ${this.configPath}`);
        } catch (e2) {
          console.error("[ConfigService] Local fallback failed too:", e2);
        }
      }
    }
  }

  public get authEnabled(): boolean {
    return this.config.authEnabled;
  }

  public get accessPassword(): string | undefined {
    return this.config.accessPassword;
  }

  public setAuthEnabled(enabled: boolean) {
    this.config.authEnabled = enabled;
  }

  public setAccessPassword(password: string) {
    this.config.accessPassword = password;
  }
}

export const configService = ConfigService.getInstance();
