export interface ILoggerService {
  readonly service: string;
  info(message: string): void;
  error(message: string): void;
}
