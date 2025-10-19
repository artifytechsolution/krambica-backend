#!/bin/bash

# Script to generate a new module with CRUD functionality for the Node.js Modular API
# Usage: ./generate-module.sh <module-name>

usage() {
  echo "Usage: $0 <module-name>"
  echo "Example: $0 reviews"
  exit 1
}

if [ -z "$1" ]; then
  usage
fi

MODULE_NAME="$1"
MODULE_DIR="src/modules/$MODULE_NAME"
INTERFACES_DIR="src/interfaces"
CONST_DIR="src/const"

if ! [[ "$MODULE_NAME" =~ ^[a-z][a-z0-9-]*$ ]]; then
  echo "Error: Module name must be lowercase, start with a letter, and contain only letters, numbers, or hyphens."
  exit 1
fi

if [ -d "$MODULE_DIR" ]; then
  echo "Error: Module '$MODULE_NAME' already exists at $MODULE_DIR."
  exit 1
fi

PASCAL_NAME=$(echo "$MODULE_NAME" | awk -F'-' '{
  for(i=1; i<=NF; i++) {
    if ($i) {
      printf "%s%s", toupper(substr($i,1,1)), tolower(substr($i,2))
    }
  }
}')
SINGULAR_NAME=$(echo "$MODULE_NAME" | sed 's/s$//')
SINGULAR_PASCAL=$(echo "$PASCAL_NAME" | sed 's/s$//')

mkdir -p "$MODULE_DIR" "$INTERFACES_DIR" "$CONST_DIR"
echo "Created directories under src/: $MODULE_DIR, $INTERFACES_DIR, $CONST_DIR"

# types.ts
cat << EOF > "$MODULE_DIR/$MODULE_NAME.types.ts"
export interface $SINGULAR_PASCAL {
  id: number;
  name: string;
  createdAt: string;
}
EOF

# service.interface.ts
cat << EOF > "$INTERFACES_DIR/$MODULE_NAME-service.interface.ts"
import { $SINGULAR_PASCAL } from '../modules/$MODULE_NAME/$MODULE_NAME.types';

export interface I${PASCAL_NAME}Service {
  initialize(): Promise<void>;
  getAll(): Promise<$SINGULAR_PASCAL[]>;
  getById(id: number): Promise<$SINGULAR_PASCAL | undefined>;
  create(data: Omit<$SINGULAR_PASCAL, 'id' | 'createdAt'>): Promise<$SINGULAR_PASCAL>;
  update(id: number, data: Partial<Omit<$SINGULAR_PASCAL, 'id' | 'createdAt'>>): Promise<$SINGULAR_PASCAL | undefined>;
  delete(id: number): Promise<boolean>;
}
EOF

# service.ts
cat << EOF > "$MODULE_DIR/$MODULE_NAME.service.ts"
import { injectable } from '../../services/di-container';
import { IService } from '../../interfaces/service.interface';
import { ILoggerService } from '../../services/logger.service';
import { I${PASCAL_NAME}Service } from '../../interfaces/$MODULE_NAME-service.interface';
import { $SINGULAR_PASCAL } from './$MODULE_NAME.types';
import { InvalidInputError } from '../../utils/error.utils';

@injectable()
export class ${PASCAL_NAME}Service implements IService, I${PASCAL_NAME}Service {
  static dependencies = ['LoggerService'];
  static optionalDependencies: string[] = [];
  private ${MODULE_NAME}: $SINGULAR_PASCAL[] = [
    { id: 1, name: 'Sample $SINGULAR_PASCAL 1', createdAt: new Date().toISOString() },
    { id: 2, name: 'Sample $SINGULAR_PASCAL 2', createdAt: new Date().toISOString() }
  ];
  private logger: ILoggerService;

  constructor(logger: ILoggerService) {
    this.logger = logger;
    this.logger.info('${PASCAL_NAME}Service instantiated');
  }

  async initialize() {
    this.logger.info('${PASCAL_NAME}Service initialized with in-memory data');
  }

  async getAll(): Promise<$SINGULAR_PASCAL[]> {
    return this.${MODULE_NAME};
  }

  async getById(id: number): Promise<$SINGULAR_PASCAL | undefined> {
    if (id <= 0) throw new InvalidInputError('Invalid ID');
    const item = this.${MODULE_NAME}.find(r => r.id === id);
    if (!item) throw new InvalidInputError('$SINGULAR_PASCAL not found');
    return item;
  }

  async create(data: Omit<$SINGULAR_PASCAL, 'id' | 'createdAt'>): Promise<$SINGULAR_PASCAL> {
    const newItem: $SINGULAR_PASCAL = {
      id: this.${MODULE_NAME}.length > 0 ? Math.max(...this.${MODULE_NAME}.map(r => r.id)) + 1 : 1,
      name: data.name,
      createdAt: new Date().toISOString()
    };
    this.${MODULE_NAME}.push(newItem);
    return newItem;
  }

  async update(id: number, data: Partial<Omit<$SINGULAR_PASCAL, 'id' | 'createdAt'>>): Promise<$SINGULAR_PASCAL | undefined> {
    const item = this.${MODULE_NAME}.find(r => r.id === id);
    if (!item) throw new InvalidInputError('$SINGULAR_PASCAL not found');
    Object.assign(item, data);
    return item;
  }

  async delete(id: number): Promise<boolean> {
    const index = this.${MODULE_NAME}.findIndex(r => r.id === id);
    if (index === -1) throw new InvalidInputError('$SINGULAR_PASCAL not found');
    this.${MODULE_NAME}.splice(index, 1);
    return true;
  }
}
EOF

# controller.ts
cat << EOF > "$MODULE_DIR/$MODULE_NAME.controller.ts"
import { Request, Response } from 'express';
import { ResponseUtil } from '../../utils/response.util';
import { DIContainer } from '../../services/di-container';
import { I${PASCAL_NAME}Service } from '../../interfaces/$MODULE_NAME-service.interface';
import { ILoggerService } from '../../services/logger.service';

export class ${PASCAL_NAME}Controller {
  private ${MODULE_NAME}Service: I${PASCAL_NAME}Service;
  private logger: ILoggerService;

  constructor() {
    this.${MODULE_NAME}Service = DIContainer.resolve<I${PASCAL_NAME}Service>('${PASCAL_NAME}Service');
    this.logger = DIContainer.resolve<ILoggerService>('LoggerService');
  }

  async getAll(req: Request, res: Response) {
    const result = await this.${MODULE_NAME}Service.getAll();
    res.json(ResponseUtil.success(result, '${PASCAL_NAME} list'));
  }

  async getById(req: Request, res: Response) {
    const item = await this.${MODULE_NAME}Service.getById(parseInt(req.params.id));
    res.json(ResponseUtil.success(item, '${SINGULAR_PASCAL} found'));
  }

  async create(req: Request, res: Response) {
    const item = await this.${MODULE_NAME}Service.create(req.body);
    res.status(201).json(ResponseUtil.success(item, '${SINGULAR_PASCAL} created'));
  }

  async update(req: Request, res: Response) {
    const item = await this.${MODULE_NAME}Service.update(parseInt(req.params.id), req.body);
    res.json(ResponseUtil.success(item, '${SINGULAR_PASCAL} updated'));
  }

  async delete(req: Request, res: Response) {
    await this.${MODULE_NAME}Service.delete(parseInt(req.params.id));
    res.json(ResponseUtil.success(null, '${SINGULAR_PASCAL} deleted'));
  }
}
EOF

# routes.ts
cat << EOF > "$MODULE_DIR/$MODULE_NAME.routes.ts"
import { Router } from 'express';
import { ${PASCAL_NAME}Controller } from './$MODULE_NAME.controller';
import { validateId } from '../../middleware/validation.middleware';

export const ${MODULE_NAME}Routes = (controller: ${PASCAL_NAME}Controller): Router => {
  const router = Router();
  router.get('/', controller.getAll.bind(controller));
  router.get('/:id', validateId, controller.getById.bind(controller));
  router.post('/', controller.create.bind(controller));
  router.put('/:id', validateId, controller.update.bind(controller));
  router.delete('/:id', validateId, controller.delete.bind(controller));
  return router;
};
EOF

# module.ts
cat << EOF > "$MODULE_DIR/$MODULE_NAME.module.ts"
import { Router } from 'express';
import { IModule } from '../../interfaces/module.interface';
import { ${PASCAL_NAME}Controller } from './$MODULE_NAME.controller';
import { ${MODULE_NAME}Routes } from './$MODULE_NAME.routes';
import { DIContainer } from '../../services/di-container';
import { ILoggerService } from '../../services/logger.service';

export class ${PASCAL_NAME}Module implements IModule {
  private controller: ${PASCAL_NAME}Controller;

  constructor() {
    this.controller = new ${PASCAL_NAME}Controller();
  }

  async initialize() {
    const service = DIContainer.resolve('${PASCAL_NAME}Service');
    const logger = DIContainer.resolve<ILoggerService>('LoggerService');
    await service.initialize();
    logger.info('${PASCAL_NAME}Module initialized');
  }

  getRouter(): Router {
    return ${MODULE_NAME}Routes(this.controller);
  }
}
EOF

echo "✅ Module '$MODULE_NAME' generated successfully under src/"
echo "👉 Next steps:"
echo "1. Register the module in your loader"
echo "2. Restart your dev server"
