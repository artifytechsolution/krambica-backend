export function injectable() {
  return (target: any) => {
    target.isInjectable = true;
  };
}

export class DIContainer {
  private static services: Map<string, any> = new Map();
  private static logger: any;

  static register(name: string, instance: any) {
    this.services.set(name, instance);
    this.logger?.info(`Registered service: ${name}`);
  }

  static resolve<T>(name: string): T {
    const service = this.services.get(name);
    if (!service) {
      this.logger?.error(
        `Service ${name} not found. Available: ${Array.from(this.services.keys()).join(', ')}`,
      );
      throw new Error(`Service ${name} not found`);
    }
    this.logger?.info(`Resolved service: ${name}`);
    return service;
  }

  static resolveOptional<T>(name: string): T | null {
    const service = this.services.get(name);
    if (!service) {
      this.logger?.info(`Optional service ${name} not found, returning null`);
      return null;
    }
    this.logger?.info(`Resolved optional service: ${name}`);
    return service;
  }

  static resolveDependencies(dependencies: string[]): any[] {
    this.logger?.info(`Resolving dependencies: ${dependencies.join(', ')}`);
    return dependencies.map((dep) => {
      const service = this.resolve(dep);
      this.logger?.info(`Resolved dependency: ${dep}`);
      return service;
    });
  }

  static resolveOptionalDependencies(dependencies: string[]): any[] {
    this.logger?.info(
      `Resolving optional dependencies: ${dependencies.join(', ')}`,
    );
    return dependencies.map((dep) => {
      const service = this.resolveOptional(dep);
      this.logger?.info(`Resolved optional dependency: ${dep}`);
      return service;
    });
  }

  static registerService(
    name: string,
    ServiceClass: any,
    dependencies: string[] = [],
    optionalDependencies: string[] = [],
  ) {
    this.logger?.info(
      `Registering service: ${name} with dependencies: ${dependencies.join(', ')}, optional: ${optionalDependencies.join(', ')}`,
    );
    try {
      const resolvedDeps = this.resolveDependencies(dependencies);
      const resolvedOptionalDeps =
        this.resolveOptionalDependencies(optionalDependencies);
      const instance = new ServiceClass(
        ...resolvedDeps,
        ...resolvedOptionalDeps,
      );
      this.register(name, instance);
      this.logger?.info(`Service registered successfully: ${name}`);
    } catch (error) {
      this.logger?.error(
        `Failed to register service ${name}: ${(error as Error).message}`,
      );
      throw error;
    }
  }

  static setLogger(logger: any) {
    this.logger = logger;
  }
}
