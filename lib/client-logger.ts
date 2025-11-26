'use client';

/**
 * Client-side logger for browser environment
 * Wraps console methods with environment-aware logging
 * Only logs in development mode (except for errors and warnings)
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  operation?: string;
  [key: string]: unknown;
}

class ClientLogger {
  private isDev = process.env.NODE_ENV === 'development';

  private log(level: LogLevel, message: string, context?: LogContext): void {
    // Only log debug/info in development
    if (!this.isDev && level !== 'error' && level !== 'warn') return;

    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;

    // eslint-disable-next-line no-console
    const method = level === 'debug' ? 'log' : level;
    // eslint-disable-next-line no-console
    console[method](prefix, message, context ? context : '');
  }

  debug(message: string, context?: LogContext): void {
    this.log('debug', message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log('info', message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log('warn', message, context);
  }

  error(message: string, context?: LogContext, err?: Error): void {
    this.log('error', message, {
      ...context,
      error: err?.message,
      stack: err?.stack,
    });
  }
}

export const clientLogger = new ClientLogger();
