export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public errorDetails?: string,
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class ModuleNotFoundError extends AppError {
  constructor(moduleName: string) {
    super(
      503,
      `${moduleName} module is deleted, so this service does not work`,
      'ModuleNotFoundError',
    );
  }
}

export class InvalidInputError extends AppError {
  constructor(message: string, errorDetails?: string) {
    super(400, message, errorDetails || 'InvalidInputError');
  }
}
