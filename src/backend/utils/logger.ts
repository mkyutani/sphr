/**
 * Logger Utility
 * Provides structured logging capabilities
 */

/**
 * Log levels
 */
export enum LogLevel {
  DEBUG = "DEBUG",
  INFO = "INFO",
  WARN = "WARN",
  ERROR = "ERROR",
}

/**
 * Log level priorities
 */
const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  [LogLevel.DEBUG]: 0,
  [LogLevel.INFO]: 1,
  [LogLevel.WARN]: 2,
  [LogLevel.ERROR]: 3,
};

/**
 * Current log level from environment
 */
const currentLogLevel = (Deno.env.get("LOG_LEVEL")?.toUpperCase() || "INFO") as LogLevel;

/**
 * Check if a log level should be logged
 */
function shouldLog(level: LogLevel): boolean {
  return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[currentLogLevel];
}

/**
 * Format log message
 */
function formatLog(level: LogLevel, message: string, meta?: Record<string, unknown>): string {
  const timestamp = new Date().toISOString();
  const logObject = {
    timestamp,
    level,
    message,
    ...meta,
  };
  return JSON.stringify(logObject);
}

/**
 * Logger class
 */
export class Logger {
  constructor(private context?: string) {}

  /**
   * Log debug message
   */
  debug(message: string, meta?: Record<string, unknown>) {
    if (!shouldLog(LogLevel.DEBUG)) return;

    const logMeta = this.context ? { context: this.context, ...meta } : meta;
    console.log(formatLog(LogLevel.DEBUG, message, logMeta));
  }

  /**
   * Log info message
   */
  info(message: string, meta?: Record<string, unknown>) {
    if (!shouldLog(LogLevel.INFO)) return;

    const logMeta = this.context ? { context: this.context, ...meta } : meta;
    console.log(formatLog(LogLevel.INFO, message, logMeta));
  }

  /**
   * Log warning message
   */
  warn(message: string, meta?: Record<string, unknown>) {
    if (!shouldLog(LogLevel.WARN)) return;

    const logMeta = this.context ? { context: this.context, ...meta } : meta;
    console.warn(formatLog(LogLevel.WARN, message, logMeta));
  }

  /**
   * Log error message
   */
  error(message: string, error?: Error, meta?: Record<string, unknown>) {
    if (!shouldLog(LogLevel.ERROR)) return;

    const logMeta = this.context ? { context: this.context, ...meta } : meta;
    const errorMeta = error
      ? {
        ...logMeta,
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
      }
      : logMeta;

    console.error(formatLog(LogLevel.ERROR, message, errorMeta));
  }

  /**
   * Create a child logger with additional context
   */
  child(context: string): Logger {
    const childContext = this.context ? `${this.context}:${context}` : context;
    return new Logger(childContext);
  }
}

/**
 * Default logger instance
 */
export const logger = new Logger();

/**
 * Create a logger with specific context
 */
export function createLogger(context: string): Logger {
  return new Logger(context);
}
