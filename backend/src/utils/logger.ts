export enum LogColor {
  Reset = '\x1b[0m',
  Red = '\x1b[31m',
  Green = '\x1b[32m',
  Yellow = '\x1b[33m',
  Blue = '\x1b[34m',
  Magenta = '\x1b[35m',
  Cyan = '\x1b[36m',
  Gray = '\x1b[90m',
}

class Logger {
  private context: string;

  constructor(context: string = 'App') {
    this.context = context;
  }

  private format(level: string, color: LogColor, message: string, meta?: any): string {
    const ts = new Date().toISOString();
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
    return `${LogColor.Gray}${ts}${LogColor.Reset} ${color}[${level}]${LogColor.Reset} ${LogColor.Cyan}[${this.context}]${LogColor.Reset} ${message}${metaStr}`;
  }

  info(message: string, meta?: any) {
    console.log(this.format('INFO', LogColor.Green, message, meta));
  }

  warn(message: string, meta?: any) {
    console.warn(this.format('WARN', LogColor.Yellow, message, meta));
  }

  error(message: string, meta?: any) {
    console.error(this.format('ERROR', LogColor.Red, message, meta));
  }

  debug(message: string, meta?: any) {
    console.log(this.format('DEBUG', LogColor.Blue, message, meta));
  }

  child(context: string): Logger {
    return new Logger(`${this.context}:${context}`);
  }
}

export const logger = new Logger('VortexJob');
export function createLogger(context: string): Logger {
  return new Logger(context);
}
