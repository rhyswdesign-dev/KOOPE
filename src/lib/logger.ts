/**
 * LOGGING SERVICE
 *
 * Centralized logging utility that:
 * - Only logs in development mode
 * - Supports different log levels (debug, info, warn, error)
 * - Can be extended to send logs to analytics/crash reporting
 * - Provides clean, formatted output with timestamps
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogConfig {
  enabled: boolean;
  minLevel: LogLevel;
  includeTimestamp: boolean;
  includeLocation: boolean;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const LOG_COLORS = {
  debug: '\x1b[36m', // Cyan
  info: '\x1b[32m',  // Green
  warn: '\x1b[33m',  // Yellow
  error: '\x1b[31m', // Red
  reset: '\x1b[0m',
};

class Logger {
  private config: LogConfig = {
    enabled: __DEV__, // Only log in development
    minLevel: 'debug',
    includeTimestamp: true,
    includeLocation: false,
  };

  /**
   * Configure the logger
   */
  configure(config: Partial<LogConfig>) {
    this.config = { ...this.config, ...config };
  }

  /**
   * Check if a log level should be output
   */
  private shouldLog(level: LogLevel): boolean {
    if (!this.config.enabled) return false;
    return LOG_LEVELS[level] >= LOG_LEVELS[this.config.minLevel];
  }

  /**
   * Format the log message with timestamp and level
   */
  private formatMessage(level: LogLevel, context: string, message: string): string {
    const parts: string[] = [];

    if (this.config.includeTimestamp) {
      const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
      parts.push(`[${timestamp}]`);
    }

    parts.push(`[${level.toUpperCase()}]`);
    parts.push(`[${context}]`);
    parts.push(message);

    return parts.join(' ');
  }

  /**
   * Output the log with appropriate console method
   */
  private output(level: LogLevel, context: string, message: string, ...args: any[]) {
    if (!this.shouldLog(level)) return;

    const formattedMessage = this.formatMessage(level, context, message);
    const color = LOG_COLORS[level];
    const reset = LOG_COLORS.reset;

    switch (level) {
      case 'debug':
        console.log(`${color}${formattedMessage}${reset}`, ...args);
        break;
      case 'info':
        console.info(`${color}${formattedMessage}${reset}`, ...args);
        break;
      case 'warn':
        console.warn(`${color}${formattedMessage}${reset}`, ...args);
        break;
      case 'error':
        console.error(`${color}${formattedMessage}${reset}`, ...args);
        break;
    }
  }

  /**
   * Debug level logging (most verbose)
   * Use for detailed diagnostic information
   */
  debug(context: string, message: string, ...args: any[]) {
    this.output('debug', context, message, ...args);
  }

  /**
   * Info level logging
   * Use for general informational messages
   */
  info(context: string, message: string, ...args: any[]) {
    this.output('info', context, message, ...args);
  }

  /**
   * Warning level logging
   * Use for potentially harmful situations
   */
  warn(context: string, message: string, ...args: any[]) {
    this.output('warn', context, message, ...args);
  }

  /**
   * Error level logging
   * Use for error events that might still allow the app to continue
   */
  error(context: string, message: string, error?: Error | any, ...args: any[]) {
    this.output('error', context, message, error, ...args);

    // In production, send to crash reporting service
    if (!__DEV__ && error) {
      // TODO: Send to a crash reporting SDK (Sentry, etc.) once one is chosen
      // crashlytics().recordError(error);
    }
  }

  /**
   * Log a function call with its parameters (useful for debugging)
   */
  fn(context: string, functionName: string, params?: any) {
    if (params) {
      this.debug(context, `${functionName}()`, params);
    } else {
      this.debug(context, `${functionName}()`);
    }
  }

  /**
   * Log API requests/responses
   */
  api(method: string, endpoint: string, data?: any) {
    this.info('API', `${method} ${endpoint}`, data);
  }

  /**
   * Log navigation events
   */
  nav(from: string, to: string, params?: any) {
    this.info('Navigation', `${from} → ${to}`, params);
  }

  /**
   * Log state changes (Redux, Zustand, etc.)
   */
  state(store: string, action: string, payload?: any) {
    this.debug('State', `${store}: ${action}`, payload);
  }
}

// Export singleton instance
export const logger = new Logger();

// Export convenience methods
export const log = {
  debug: logger.debug.bind(logger),
  info: logger.info.bind(logger),
  warn: logger.warn.bind(logger),
  error: logger.error.bind(logger),
  fn: logger.fn.bind(logger),
  api: logger.api.bind(logger),
  nav: logger.nav.bind(logger),
  state: logger.state.bind(logger),
};

// Export configuration function
export const configureLogger = logger.configure.bind(logger);

/**
 * USAGE EXAMPLES:
 *
 * // Basic logging
 * log.info('VaultScreen', 'User opened vault');
 * log.error('PaymentService', 'Payment failed', error);
 *
 * // Function call logging
 * log.fn('AuthService', 'login', { email: user.email });
 *
 * // API logging
 * log.api('POST', '/api/recipes', recipeData);
 *
 * // Navigation logging
 * log.nav('HomeScreen', 'RecipeDetail', { recipeId: 123 });
 *
 * // State logging
 * log.state('userStore', 'setUser', userData);
 *
 * // Configuration (in App.tsx or index.ts)
 * configureLogger({
 *   minLevel: 'info',  // Don't show debug logs
 *   includeTimestamp: true,
 * });
 */
