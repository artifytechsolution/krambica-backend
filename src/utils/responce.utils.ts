export interface ApiResponse<T> {
  status: 'success' | 'error';
  data: T | null;
  message: string;
  errorDetails?: any;
}

export class ResponseUtil {
  static success<T>(data: T, message: string): ApiResponse<T> {
    return { status: 'success', data, message };
  }

  static error(message: string, errorDetails?: any): ApiResponse<null> {
    return { status: 'error', data: null, message, errorDetails };
  }
}
