import http from 'http';
import { App } from './app';
import { DIContainer } from './services/di-container';
import { readdirSync } from 'fs';
import { join } from 'path';
import { Server } from 'socket.io';

let io: any;
let stockNamespace: any;
async function bootstrap() {
  // Initialize core services
  const ConfigService = require('./services/config.service').ConfigService;
  const LoggerService = require('./services/logger.service').LoggerService;
  const EmailService = require('./services/email.service').EmailService;

  // Register ConfigService first (no dependencies)
  const configService = new ConfigService();
  DIContainer.register('ConfigService', configService);
  configService.get('LOG_LEVEL'); // Ensure ConfigService is initialized
  console.log('Registered service: ConfigService');

  // Register LoggerService (depends on ConfigService)
  const loggerService = new LoggerService(configService);
  DIContainer.setLogger(loggerService);
  DIContainer.register('LoggerService', loggerService);
  loggerService.info('Registered service: LoggerService');

  const emailService = new EmailService(configService);
  // Removed the erroneous line: DIContainer.setLogger(emailService);
  DIContainer.register('EmailService', emailService);
  loggerService.info('Registered service: EmailService');

  // Collect module services
  const modulesDir = join(__dirname, 'modules');
  const moduleFolders = readdirSync(modulesDir, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);

  //socket setup
  const moduleServices: {
    name: string;
    ServiceClass: any;
    dependencies: string[];
    optionalDependencies: string[];
  }[] = [];
  for (const folder of moduleFolders) {
    try {
      const serviceName = `${folder.charAt(0).toUpperCase() + folder.slice(1)}Service`;
      const servicePath = join(modulesDir, folder, `${folder}.service`);
      const ServiceClass = require(servicePath)[serviceName];
      if (!ServiceClass) {
        throw new Error(`Service class ${serviceName} not found in ${servicePath}`);
      }
      const dependencies = ServiceClass.dependencies || [];
      const optionalDependencies = ServiceClass.optionalDependencies || [];
      moduleServices.push({
        name: serviceName,
        ServiceClass,
        dependencies,
        optionalDependencies,
      });
    } catch (error) {
      loggerService.error(
        `Failed to load service for module ${folder}: ${(error as Error).message}`,
      );
    }
  }

  // Topological sort for dependency resolution
  const coreServices = [
    {
      name: 'ConfigService',
      ServiceClass: ConfigService,
      dependencies: [],
      optionalDependencies: [],
    },
    {
      name: 'LoggerService',
      ServiceClass: LoggerService,
      dependencies: ['ConfigService'],
      optionalDependencies: [],
    },
    {
      name: 'EmailService',
      ServiceClass: EmailService,
      dependencies: [],
      optionalDependencies: [],
    },
  ];
  const allServices = [...coreServices, ...moduleServices];
  const registered = new Set<string>();
  const servicesToRegister: {
    name: string;
    ServiceClass: any;
    dependencies: string[];
    optionalDependencies: string[];
  }[] = [];
  const visited = new Set<string>();

  function visit(service: {
    name: string;
    ServiceClass: any;
    dependencies: string[];
    optionalDependencies: string[];
  }) {
    if (registered.has(service.name)) return;
    if (visited.has(service.name)) {
      throw new Error(`Circular dependency detected involving ${service.name}`);
    }
    visited.add(service.name);
    for (const dep of service.dependencies) {
      const depService = allServices.find((s) => s.name === dep);
      if (!depService) {
        throw new Error(`Dependency ${dep} not found for ${service.name}`);
      }
      visit(depService);
    }
    servicesToRegister.push(service);
    registered.add(service.name);
    visited.delete(service.name);
  }

  for (const service of allServices) {
    visit(service);
  }

  // Register services
  const failedServices: string[] = [];
  for (const { name, ServiceClass, dependencies, optionalDependencies } of servicesToRegister) {
    if (coreServices.some((s) => s.name === name)) continue;
    try {
      DIContainer.registerService(name, ServiceClass, dependencies, optionalDependencies);
      loggerService.info(`Registered service: ${name}`);
    } catch (error) {
      loggerService.error(`Failed to register service ${name}: ${(error as Error).message}`);
      failedServices.push(name);
    }
  }

  if (failedServices.length > 0) {
    throw new Error(`Failed to register services: ${failedServices.join(', ')}`);
  }

  const app = new App();
  await app.initialize();
  const server = http.createServer(app.getApp());

  //socket configration
  io = new Server(server, {
    cors: {
      origin: '*', // Allow all origins for simplicity (adjust for production)
      methods: ['GET', 'POST'],
    },
  });
  stockNamespace = io.of('/stock');
  stockNamespace.on('connection', (socket: any) => {
    console.log('Client connected to /chat namespace:', socket.id);

    // When a message is received from the client
    socket.on('message', (data: any) => {
      console.log(`Received in /chat: ${data}`);
      // Echo the message back to the client in the same namespace
      socket.emit('message', `Echo: ${data}`);
    });

    // When the client disconnects
    socket.on('disconnect', () => {
      console.log('Client disconnected from /chat namespace:', socket.id);
    });
  });

  const port = configService.getNumber('PORT') || 3000;
  server.listen(port, () => {
    loggerService.info(`Server running on port ${port}`);
  });
}

bootstrap().catch((error) => {
  console.error('Bootstrap error:', (error as Error).message);
  process.exit(1);
});

export { stockNamespace };
