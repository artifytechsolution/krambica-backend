import http from 'http';
import { App } from './app';
import { DIContainer } from './services/di-container';
import { readdirSync } from 'fs';
import { join } from 'path';
import { initializeWebSocket } from './config/websocket';

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
  configService.get('LOG_LEVEL');
  console.log('Registered service: ConfigService');

  // Register LoggerService (depends on ConfigService)
  const loggerService = new LoggerService(configService);
  DIContainer.setLogger(loggerService);
  DIContainer.register('LoggerService', loggerService);
  loggerService.info('Registered service: LoggerService');

  const emailService = new EmailService(configService);
  DIContainer.register('EmailService', emailService);
  loggerService.info('Registered service: EmailService');

  // Collect module services
  const modulesDir = join(__dirname, 'modules');
  const moduleFolders = readdirSync(modulesDir, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);

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

  // Initialize Express app
  const app = new App();
  await app.initialize();
  const server = http.createServer(app.getApp());

  // ========================================
  // ✅ PROPERLY INITIALIZE WEBSOCKET FOR NOTIFICATIONS
  // ========================================
  loggerService.info('🔌 Initializing WebSocket for notifications...');

  try {
    // Initialize notification WebSocket (with Redis Pub/Sub)
    await initializeWebSocket(server);
    loggerService.info('✅ WebSocket for notifications initialized successfully');
  } catch (error) {
    loggerService.error(
      `❌ Failed to initialize notification WebSocket: ${(error as Error).message}`,
    );
    throw error;
  }

  // ========================================
  // ✅ YOUR EXISTING STOCK NAMESPACE (Keep as is)
  // ========================================
  loggerService.info('📊 Initializing Stock namespace...');

  const { Server } = require('socket.io');
  io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  stockNamespace = io.of('/stock');
  stockNamespace.on('connection', (socket: any) => {
    loggerService.info(`Client connected to /stock namespace: ${socket.id}`);

    socket.on('message', (data: any) => {
      loggerService.info(`Received in /stock: ${data}`);
      socket.emit('message', `Echo: ${data}`);
    });

    socket.on('disconnect', () => {
      loggerService.info(`Client disconnected from /stock namespace: ${socket.id}`);
    });
  });

  loggerService.info('✅ Stock namespace initialized');

  // Start server
  const port = configService.getNumber('PORT') || 3000;
  server.listen(port, () => {
    loggerService.info('═══════════════════════════════════════');
    loggerService.info(`🚀 SERVER RUNNING ON PORT ${port}`);
    loggerService.info(`🌐 HTTP: http://localhost:${port}`);
    loggerService.info(`📡 WebSocket (Notifications): ws://localhost:${port}/socket.io`);
    loggerService.info(`📊 WebSocket (Stock): ws://localhost:${port}/stock`);
    loggerService.info('═══════════════════════════════════════');
  });
}

bootstrap().catch((error) => {
  console.error('Bootstrap error:', (error as Error).message);
  process.exit(1);
});

export { stockNamespace, io };
