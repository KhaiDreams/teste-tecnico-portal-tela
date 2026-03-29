import config from '../config/env';

enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

const logLevelMap: Record<string, LogLevel> = {
  error: LogLevel.ERROR,
  warn: LogLevel.WARN,
  info: LogLevel.INFO,
  debug: LogLevel.DEBUG,
};

const currentLogLevel = logLevelMap[config.LOG_LEVEL.toLowerCase()] ?? LogLevel.INFO;

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  gray: '\x1b[90m',
};

function formatTimestamp(): string {
  return new Date().toISOString();
}

function log(level: LogLevel, levelName: string, message: string, data?: unknown): void {
  if (level > currentLogLevel) return;

  const timestamp = formatTimestamp();
  const colorCode = {
    [LogLevel.ERROR]: colors.red,
    [LogLevel.WARN]: colors.yellow,
    [LogLevel.INFO]: colors.blue,
    [LogLevel.DEBUG]: colors.gray,
  }[level] || colors.reset;

  const prefix = `${colorCode}[${levelName}]${colors.reset} ${colors.gray}${timestamp}${colors.reset}`;
  const msg = `${prefix} ${message}`;

  if (data) {
    console.log(msg, data);
  } else {
    console.log(msg);
  }
}

export const logger = {
  error: (message: string, data?: unknown) => log(LogLevel.ERROR, 'ERROR', message, data),
  warn: (message: string, data?: unknown) => log(LogLevel.WARN, 'WARN', message, data),
  info: (message: string, data?: unknown) => log(LogLevel.INFO, 'INFO', message, data),
  debug: (message: string, data?: unknown) => log(LogLevel.DEBUG, 'DEBUG', message, data),
};

export default logger;
