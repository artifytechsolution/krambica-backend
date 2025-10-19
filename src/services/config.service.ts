import { injectable } from './di-container';
import * as dotenv from 'dotenv';

export interface IConfigService {
  get(key: string): string | undefined;
  getNumber(key: string): number | undefined;
}

@injectable()
export class ConfigService implements IConfigService {
  static dependencies: string[] = [];

  constructor() {
    dotenv.config();
  }

  get(key: string): string | undefined {
    return process.env[key];
  }

  getNumber(key: string): number | undefined {
    const value = this.get(key);
    return value ? parseInt(value, 10) : undefined;
  }
}
