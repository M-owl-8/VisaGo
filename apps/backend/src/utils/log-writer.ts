/**
 * Log Writer Utility
 * Handles writing logs to files with rotation support
 */

import * as fs from "fs";
import * as path from "path";
import { getEnvConfig } from "../config/env";

export interface LogWriterConfig {
  enabled: boolean;
  logDir: string;
  maxFileSize: number; // in bytes
  maxFiles: number;
}

class LogWriter {
  private config: LogWriterConfig;
  private currentLogFile: string | null = null;
  private currentFileSize: number = 0;

  constructor() {
    const envConfig = getEnvConfig();
    this.config = {
      enabled: envConfig.LOG_FILE_ENABLED || false,
      logDir: envConfig.LOG_FILE_PATH || "logs",
      maxFileSize: envConfig.LOG_FILE_MAX_SIZE || 10 * 1024 * 1024, // 10MB
      maxFiles: envConfig.LOG_FILE_MAX_FILES || 5,
    };

    if (this.config.enabled) {
      this.initializeLogDirectory();
    }
  }

  /**
   * Initialize log directory
   */
  private initializeLogDirectory(): void {
    try {
      if (!fs.existsSync(this.config.logDir)) {
        fs.mkdirSync(this.config.logDir, { recursive: true });
      }
    } catch (error) {
      console.error("Failed to create log directory:", error);
      this.config.enabled = false;
    }
  }

  /**
   * Get current log file path
   */
  private getCurrentLogFile(): string {
    const date = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    return path.join(this.config.logDir, `app-${date}.log`);
  }

  /**
   * Rotate log files if needed
   */
  private rotateLogs(): void {
    try {
      const files = fs.readdirSync(this.config.logDir)
        .filter((file) => file.startsWith("app-") && file.endsWith(".log"))
        .map((file) => ({
          name: file,
          path: path.join(this.config.logDir, file),
          stats: fs.statSync(path.join(this.config.logDir, file)),
        }))
        .sort((a, b) => b.stats.mtime.getTime() - a.stats.mtime.getTime());

      // Keep only the most recent maxFiles
      if (files.length > this.config.maxFiles) {
        const filesToDelete = files.slice(this.config.maxFiles);
        filesToDelete.forEach((file) => {
          try {
            fs.unlinkSync(file.path);
          } catch (error) {
            console.error(`Failed to delete old log file ${file.name}:`, error);
          }
        });
      }
    } catch (error) {
      console.error("Failed to rotate log files:", error);
    }
  }

  /**
   * Write log entry to file
   */
  write(entry: string): void {
    if (!this.config.enabled) {
      return;
    }

    try {
      const logFile = this.getCurrentLogFile();

      // Check if we need to rotate (new day or file too large)
      if (this.currentLogFile !== logFile) {
        this.currentLogFile = logFile;
        this.currentFileSize = fs.existsSync(logFile) ? fs.statSync(logFile).size : 0;
      }

      // Check if file size exceeds limit
      if (this.currentFileSize >= this.config.maxFileSize) {
        // Rotate to new file with timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const rotatedFile = path.join(
          this.config.logDir,
          `app-${new Date().toISOString().split("T")[0]}-${timestamp}.log`
        );
        if (fs.existsSync(logFile)) {
          fs.renameSync(logFile, rotatedFile);
        }
        this.currentFileSize = 0;
        this.rotateLogs();
      }

      // Append log entry
      fs.appendFileSync(logFile, entry + "\n", "utf8");
      this.currentFileSize += Buffer.byteLength(entry + "\n", "utf8");
    } catch (error) {
      // Don't throw - logging should not break the application
      console.error("Failed to write log to file:", error);
    }
  }

  /**
   * Get log statistics
   */
  getStats(): {
    enabled: boolean;
    logDir: string;
    currentFile: string | null;
    currentFileSize: number;
    maxFileSize: number;
    maxFiles: number;
  } {
    return {
      enabled: this.config.enabled,
      logDir: this.config.logDir,
      currentFile: this.currentLogFile,
      currentFileSize: this.currentFileSize,
      maxFileSize: this.config.maxFileSize,
      maxFiles: this.config.maxFiles,
    };
  }
}

// Singleton instance
let logWriterInstance: LogWriter | null = null;

export function getLogWriter(): LogWriter {
  if (!logWriterInstance) {
    logWriterInstance = new LogWriter();
  }
  return logWriterInstance;
}








