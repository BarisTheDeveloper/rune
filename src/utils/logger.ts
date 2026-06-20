/**
 * Rune - Logger Utility
 * Provides formatted console output for different log levels
 */

/**
 * Log levels
 */
export enum LogLevel {
  INFO = "INFO",
  WARN = "WARN",
  ERROR = "ERROR",
  DEBUG = "DEBUG",
  SUCCESS = "SUCCESS",
}

/**
 * ANSI color codes for terminal output
 */
const COLORS = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
};

/**
 * Logger class for formatted console output
 */
export class Logger {
  private verbose: boolean;

  constructor(verbose = false) {
    this.verbose = verbose;
  }

  /**
   * Format a log message with timestamp and level
   */
  private formatMessage(level: LogLevel, message: string): string {
    const timestamp = new Date().toLocaleTimeString();
    const color = this.getColorForLevel(level);

    return `${color}${COLORS.bright}[RUNE]${COLORS.reset} ${COLORS.dim}[${timestamp}]${COLORS.reset} ${color}${message}${COLORS.reset}`;
  }

  /**
   * Get color code for log level
   */
  private getColorForLevel(level: LogLevel): string {
    switch (level) {
      case LogLevel.INFO:
        return COLORS.blue;
      case LogLevel.WARN:
        return COLORS.yellow;
      case LogLevel.ERROR:
        return COLORS.red;
      case LogLevel.DEBUG:
        return COLORS.magenta;
      case LogLevel.SUCCESS:
        return COLORS.green;
      default:
        return COLORS.reset;
    }
  }

  /**
   * Log an info message
   */
  info(message: string): void {
    console.log(this.formatMessage(LogLevel.INFO, message));
  }

  /**
   * Log a warning message
   */
  warn(message: string): void {
    console.warn(this.formatMessage(LogLevel.WARN, message));
  }

  /**
   * Log an error message
   */
  error(message: string, error?: Error): void {
    const formattedMessage = this.formatMessage(LogLevel.ERROR, message);
    if (error) {
      console.error(formattedMessage);
      console.error(this.formatMessage(LogLevel.ERROR, `  ${error.message}`));
      if (this.verbose && error.stack) {
        console.error(
          this.formatMessage(LogLevel.DEBUG, `  Stack: ${error.stack}`),
        );
      }
    } else {
      console.error(formattedMessage);
    }
  }

  /**
   * Log a debug message (only in verbose mode)
   */
  debug(message: string): void {
    if (this.verbose) {
      console.log(this.formatMessage(LogLevel.DEBUG, message));
    }
  }

  /**
   * Log a success message
   */
  success(message: string): void {
    console.log(this.formatMessage(LogLevel.SUCCESS, message));
  }

  /**
   * Log a separator line
   */
  separator(): void {
    console.log(`${COLORS.dim}${"─".repeat(50)}${COLORS.reset}`);
  }

  /**
   * Log a header message
   */
  header(message: string): void {
    console.log("");
    console.log(
      `${COLORS.cyan}${COLORS.bright}╔═══════════════════════════════════════════════════════════╗${COLORS.reset}`,
    );
    console.log(
      `${COLORS.cyan}${COLORS.bright}║  ${message.padEnd(56)}║${COLORS.reset}`,
    );
    console.log(
      `${COLORS.cyan}${COLORS.bright}╚═══════════════════════════════════════════════════════════╝${COLORS.reset}`,
    );
    console.log("");
  }

  /**
   * Set verbose mode
   */
  setVerbose(verbose: boolean): void {
    this.verbose = verbose;
  }

  /**
   * Get current verbose state
   */
  isVerbose(): boolean {
    return this.verbose;
  }
}

// Export singleton instance
export const logger = new Logger();
