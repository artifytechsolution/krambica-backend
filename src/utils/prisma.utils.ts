// import { PrismaClient } from '@prisma/client';
// import { ILoggerService } from '../services/logger.service';
// import { InvalidInputError } from './error.utils';

// export enum PrismaOperationType {
//   CREATE = 'create',
//   READ = 'read',
//   READ_UNIQUE = 'readUnique',
//   READ_FIRST = 'readFirst',
//   READ_FIRST_OR_THROW = 'readFirstOrThrow',
//   READ_UNIQUE_OR_THROW = 'readUniqueOrThrow',
//   UPDATE = 'update',
//   UPDATE_MANY = 'updateMany',
//   DELETE = 'delete',
//   DELETE_MANY = 'deleteMany',
//   UPSERT = 'upsert',
//   AGGREGATE = 'aggregate',
//   GROUP_BY = 'groupBy',
//   COUNT = 'count',
//   RAW_QUERY = 'rawQuery',
// }

// export interface PrismaOperationParams<T> {
//   operation: PrismaOperationType;
//   data?: any;
//   where?: any;
//   limit?: number;
//   offset?: number;
//   sort?: Array<{ field: keyof T; order: 'asc' | 'desc' }>;
//   search?: string;
//   searchFields?: Array<keyof T>;
//   fieldSearch?: { [key in keyof T]?: string };
//   include?: any;
//   select?: any;
//   groupBy?: Array<keyof T>;
//   having?: any;
//   aggregates?: any;
//   softDelete?: boolean;
//   maskFields?: (keyof T)[];
//   rawQuery?: string;
//   distinct?: Array<keyof T>;
// }

// export async function executePrismaOperation<T>(
//   model: keyof PrismaClient,
//   params: PrismaOperationParams<T>,
//   prisma: PrismaClient,
//   logger: ILoggerService,
// ): Promise<{ data?: any; total?: number }> {
//   const {
//     operation,
//     data,
//     where,
//     limit,
//     offset,
//     sort,
//     search,
//     searchFields,
//     fieldSearch,
//     include,
//     select,
//     groupBy,
//     having,
//     aggregates,
//     softDelete,
//     maskFields,
//     rawQuery,
//     distinct,
//   } = params;

//   if (!operation) throw new InvalidInputError('Operation type is required');
//   logger.info(
//     `Executing Prisma Operation: ${operation} on ${String(model)} with params: ${JSON.stringify(params)}`,
//   );

//   let whereClause = where || {};

//   // 🔍 Global Search Logic
//   if (search && searchFields?.length) {
//     const globalConditions = searchFields.map((field) => ({
//       [field]: { contains: search, mode: 'insensitive' },
//     }));
//     whereClause = {
//       AND: [whereClause, { OR: globalConditions }],
//     };
//   }

//   // 🎯 Field-wise Search Logic
//   if (fieldSearch) {
//     const fieldConditions = Object.entries(fieldSearch).map(([key, value]) => ({
//       [key]: { contains: value, mode: 'insensitive' },
//     }));
//     whereClause = {
//       AND: [whereClause, ...fieldConditions],
//     };
//   }

//   // 🧽 Soft Delete Logic
//   if (softDelete) {
//     whereClause = {
//       AND: [whereClause, { deletedAt: null }],
//     };
//   }

//   const queryOptions: any = {
//     where: whereClause,
//     include,
//     select,
//   };
//   if (limit) queryOptions.take = limit;
//   if (offset) queryOptions.skip = offset;
//   if (sort?.length) {
//     queryOptions.orderBy = sort.map(({ field, order }) => ({ [field]: order }));
//   }
//   if (distinct?.length) {
//     queryOptions.distinct = distinct;
//   }

//   let result: { data?: any; total?: number } = {};

//   switch (operation) {
//     case PrismaOperationType.CREATE:
//       if (!data) throw new InvalidInputError('Data is required for create');
//       result.data = await (prisma[model] as any).create({ data });
//       break;

//     case PrismaOperationType.READ:
//       result.data = await (prisma[model] as any).findMany(queryOptions);
//       result.total = await (prisma[model] as any).count({
//         where: queryOptions.where,
//       });
//       break;

//     case PrismaOperationType.READ_UNIQUE:
//       if (!queryOptions.where) throw new InvalidInputError('Where is required for readUnique');
//       result.data = await (prisma[model] as any).findUnique(queryOptions);
//       break;

//     case PrismaOperationType.READ_FIRST:
//       result.data = await (prisma[model] as any).findFirst(queryOptions);
//       break;

//     case PrismaOperationType.READ_FIRST_OR_THROW:
//       if (!queryOptions.where)
//         throw new InvalidInputError('Where is required for readFirstOrThrow');
//       result.data = await (prisma[model] as any).findFirstOrThrow(queryOptions);
//       break;

//     case PrismaOperationType.READ_UNIQUE_OR_THROW:
//       if (!queryOptions.where)
//         throw new InvalidInputError('Where is required for readUniqueOrThrow');
//       result.data = await (prisma[model] as any).findUniqueOrThrow(queryOptions);
//       break;

//     case PrismaOperationType.UPDATE:
//       if (!data || !queryOptions.where)
//         throw new InvalidInputError('Data and where are required for update');
//       result.data = await (prisma[model] as any).update({
//         where: queryOptions.where,
//         data,
//       });
//       break;

//     case PrismaOperationType.UPDATE_MANY:
//       if (!data) throw new InvalidInputError('Data is required for updateMany');
//       result.data = await (prisma[model] as any).updateMany({
//         where: queryOptions.where,
//         data,
//       });
//       break;

//     case PrismaOperationType.DELETE:
//       if (!queryOptions.where) throw new InvalidInputError('Where is required for delete');
//       if (softDelete) {
//         result.data = await (prisma[model] as any).update({
//           where: queryOptions.where,
//           data: { deletedAt: new Date() },
//         });
//       } else {
//         result.data = await (prisma[model] as any).delete({
//           where: queryOptions.where,
//         });
//       }
//       break;

//     case PrismaOperationType.DELETE_MANY:
//       result.data = await (prisma[model] as any).deleteMany({
//         where: queryOptions.where,
//       });
//       break;

//     case PrismaOperationType.UPSERT:
//       if (!data?.create || !data?.update || !queryOptions.where) {
//         throw new InvalidInputError('Create, update data and where are required for upsert');
//       }
//       result.data = await (prisma[model] as any).upsert({
//         where: queryOptions.where,
//         update: data.update,
//         create: data.create,
//       });
//       break;

//     case PrismaOperationType.AGGREGATE:
//       result.data = await (prisma[model] as any).aggregate({
//         where: queryOptions.where,
//         ...aggregates,
//       });
//       break;

//     case PrismaOperationType.GROUP_BY:
//       result.data = await (prisma[model] as any).groupBy({
//         by: groupBy,
//         where: queryOptions.where,
//         having,
//         ...aggregates,
//       });
//       break;

//     case PrismaOperationType.COUNT:
//       result.data = await (prisma[model] as any).count({
//         where: queryOptions.where,
//         select,
//       });
//       break;

//     case PrismaOperationType.RAW_QUERY:
//       if (!rawQuery) throw new InvalidInputError('Raw query is required for rawQuery operation');
//       result.data = await (prisma.$queryRawUnsafe as any)(rawQuery);
//       break;

//     default:
//       throw new InvalidInputError(`Unsupported operation: ${operation}`);
//   }

//   // 🔐 Mask sensitive fields if needed
//   if (maskFields && result.data) {
//     const mask = (entry: any) => {
//       maskFields.forEach((f) => delete entry[f]);
//       return entry;
//     };
//     result.data = Array.isArray(result.data) ? result.data.map(mask) : mask(result.data);
//   }

//   logger.info(`Prisma operation ${operation} on ${String(model)} completed successfully`);
//   return result;
// }

import { PrismaClient } from '@prisma/client';
import { ILoggerService } from '../services/logger.service';
import { InvalidInputError } from './error.utils';

export enum PrismaOperationType {
  CREATE = 'create',
  READ = 'read',
  READ_UNIQUE = 'readUnique',
  READ_FIRST = 'readFirst',
  READ_FIRST_OR_THROW = 'readFirstOrThrow',
  READ_UNIQUE_OR_THROW = 'readUniqueOrThrow',
  UPDATE = 'update',
  UPDATE_MANY = 'updateMany',
  DELETE = 'delete',
  DELETE_MANY = 'deleteMany',
  UPSERT = 'upsert',
  AGGREGATE = 'aggregate',
  GROUP_BY = 'groupBy',
  COUNT = 'count',
  RAW_QUERY = 'rawQuery',
}

export interface PrismaOperationParams<T> {
  operation: PrismaOperationType;
  data?: any;
  where?: any;
  limit?: number;
  offset?: number;
  sort?: Array<{ field: keyof T; order: 'asc' | 'desc' }>;
  search?: string;
  searchFields?: Array<keyof T>;
  fieldSearch?: { [key in keyof T]?: string };
  include?: any;
  select?: any;
  groupBy?: Array<keyof T>;
  having?: any;
  aggregates?: any;
  softDelete?: boolean;
  maskFields?: (keyof T)[];
  rawQuery?: string;
  distinct?: Array<keyof T>;
  orderBy?: any;
}

// =================== CUSTOM ERROR CLASSES ===================

export class DatabaseConnectionError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly originalError?: any,
  ) {
    super(message);
    this.name = 'DatabaseConnectionError';
  }
}

export class DatabaseValidationError extends Error {
  constructor(
    message: string,
    public readonly field?: string,
    public readonly code?: string,
    public readonly originalError?: any,
  ) {
    super(message);
    this.name = 'DatabaseValidationError';
  }
}

export class DatabaseConstraintError extends Error {
  constructor(
    message: string,
    public readonly constraint?: string,
    public readonly code?: string,
    public readonly originalError?: any,
  ) {
    super(message);
    this.name = 'DatabaseConstraintError';
  }
}

export class DatabaseNotFoundError extends Error {
  constructor(
    message: string,
    public readonly model?: string,
    public readonly code?: string,
    public readonly originalError?: any,
  ) {
    super(message);
    this.name = 'DatabaseNotFoundError';
  }
}

export class DatabaseTimeoutError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly originalError?: any,
  ) {
    super(message);
    this.name = 'DatabaseTimeoutError';
  }
}

export class DatabaseTransactionError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly originalError?: any,
  ) {
    super(message);
    this.name = 'DatabaseTransactionError';
  }
}

// =================== ERROR HANDLER FUNCTION ===================

function handlePrismaError(
  error: any,
  operation: string,
  model: string,
  logger: ILoggerService,
): never {
  logger.error(`Prisma ${operation} error on ${model}:`);

  // Handle Prisma-specific errors with detailed messages
  switch (error.code) {
    // =================== CONNECTION ERRORS ===================
    case 'P1000':
      throw new DatabaseConnectionError(
        `Authentication failed at database server. Please check your database credentials and connection string.`,
        error.code,
        error,
      );

    case 'P1001':
      throw new DatabaseConnectionError(
        `Cannot reach database server at the configured host. Please verify your database server is running and accessible.`,
        error.code,
        error,
      );

    case 'P1002':
      throw new DatabaseTimeoutError(
        `Database server connection timed out. The server may be overloaded or network issues exist.`,
        error.code,
        error,
      );

    case 'P1003':
      throw new DatabaseConnectionError(
        `Database file not found at the specified path. Please check your database file location.`,
        error.code,
        error,
      );

    case 'P1008':
      throw new DatabaseTimeoutError(
        `Database operation timed out. Query execution took too long. Consider optimizing your query or increasing timeout.`,
        error.code,
        error,
      );

    case 'P1009':
      throw new DatabaseConnectionError(
        `Database "${error.meta?.database_name}" already exists. Cannot create a database that already exists.`,
        error.code,
        error,
      );

    case 'P1010':
      throw new DatabaseConnectionError(
        `Access denied for user. Insufficient database permissions for the requested operation.`,
        error.code,
        error,
      );

    case 'P1011':
      throw new DatabaseConnectionError(
        `TLS connection error. Please check your SSL/TLS configuration and certificates.`,
        error.code,
        error,
      );

    case 'P1017':
      throw new DatabaseConnectionError(
        `Database connection was lost during operation. Please check your network connection and retry.`,
        error.code,
        error,
      );

    // =================== VALIDATION & QUERY ERRORS ===================
    case 'P2000':
      throw new DatabaseValidationError(
        `Value too long for field "${error.meta?.field_name}" in table "${error.meta?.table}". Maximum length allowed is ${error.meta?.max_length} characters.`,
        error.meta?.field_name,
        error.code,
        error,
      );

    case 'P2001':
      throw new DatabaseNotFoundError(
        `Record not found. The requested ${model} record does not exist or has been deleted.`,
        model,
        error.code,
        error,
      );

    case 'P2002':
      const duplicateFields = Array.isArray(error.meta?.target)
        ? error.meta.target.join(', ')
        : error.meta?.target || 'field';
      throw new DatabaseConstraintError(
        `Unique constraint violation on field(s): "${duplicateFields}". A record with this value already exists.`,
        error.meta?.constraint,
        error.code,
        error,
      );

    case 'P2003':
      throw new DatabaseConstraintError(
        `Foreign key constraint violation on field "${error.meta?.field_name}". The referenced record does not exist.`,
        error.meta?.field_name,
        error.code,
        error,
      );

    case 'P2004':
      throw new DatabaseConstraintError(
        `Database constraint "${error.meta?.constraint}" was violated. Please check your data integrity.`,
        error.meta?.constraint,
        error.code,
        error,
      );

    case 'P2005':
      throw new DatabaseValidationError(
        `Invalid value "${error.meta?.field_value}" for field "${error.meta?.field_name}". Expected type: ${error.meta?.expected_type}.`,
        error.meta?.field_name,
        error.code,
        error,
      );

    case 'P2006':
      throw new DatabaseValidationError(
        `Invalid value provided for field "${error.meta?.field_name}": ${error.message}`,
        error.meta?.field_name,
        error.code,
        error,
      );

    case 'P2007':
      throw new DatabaseValidationError(
        `Data validation error: ${error.message}. Please check your input data format and types.`,
        undefined,
        error.code,
        error,
      );

    case 'P2011':
      throw new DatabaseValidationError(
        `Null constraint violation: Field "${error.meta?.field_name}" cannot be null. Please provide a valid value.`,
        error.meta?.field_name,
        error.code,
        error,
      );

    case 'P2012':
      throw new DatabaseValidationError(
        `Missing required field: "${error.meta?.field_name}" is required but was not provided.`,
        error.meta?.field_name,
        error.code,
        error,
      );

    case 'P2013':
      throw new DatabaseValidationError(
        `Missing required argument "${error.meta?.argument_name}" for field "${error.meta?.field_name}" on ${error.meta?.object_name}.`,
        error.meta?.field_name,
        error.code,
        error,
      );

    case 'P2014':
      throw new DatabaseConstraintError(
        `Cannot delete or update record because of dependent records in relation "${error.meta?.relation_name}". Delete dependent records first.`,
        error.meta?.relation_name,
        error.code,
        error,
      );

    case 'P2015':
      throw new DatabaseNotFoundError(
        `Related record not found: ${error.meta?.details || 'A required related record does not exist.'}`,
        model,
        error.code,
        error,
      );

    case 'P2018':
      throw new DatabaseConstraintError(
        `Required connected records not found for relation "${error.meta?.relation_name}". Please ensure related records exist.`,
        error.meta?.relation_name,
        error.code,
        error,
      );

    case 'P2019':
      throw new DatabaseValidationError(
        `Input error: ${error.message}. Please check your input parameters and query structure.`,
        undefined,
        error.code,
        error,
      );

    case 'P2020':
      throw new DatabaseValidationError(
        `Value "${error.meta?.value}" is out of range for type "${error.meta?.type}". Please provide a valid value within the allowed range.`,
        undefined,
        error.code,
        error,
      );

    case 'P2021':
      throw new DatabaseValidationError(
        `Table "${error.meta?.table}" does not exist in the current database. Please check your database schema.`,
        error.meta?.table,
        error.code,
        error,
      );

    case 'P2022':
      throw new DatabaseValidationError(
        `Column "${error.meta?.column}" does not exist in table "${error.meta?.table}". Please check your database schema.`,
        error.meta?.column,
        error.code,
        error,
      );

    case 'P2024':
      throw new DatabaseTimeoutError(
        `Connection pool timeout. All database connections are busy. Please try again later or increase the connection pool size.`,
        error.code,
        error,
      );

    case 'P2025':
      throw new DatabaseNotFoundError(
        `Record to ${operation} not found: ${error.meta?.cause || `No ${model} record found matching the specified criteria.`}`,
        model,
        error.code,
        error,
      );

    case 'P2026':
      throw new DatabaseValidationError(
        `Unsupported feature used: ${error.message}. Please check the Prisma documentation for supported features.`,
        undefined,
        error.code,
        error,
      );

    case 'P2027':
      throw new DatabaseValidationError(
        `Multiple errors occurred during query execution: ${error.message}`,
        undefined,
        error.code,
        error,
      );

    // =================== TRANSACTION ERRORS ===================
    case 'P2028':
      throw new DatabaseTransactionError(
        `Transaction API error: ${error.message}. Please check your transaction usage.`,
        error.code,
        error,
      );

    case 'P2030':
      throw new DatabaseValidationError(
        `Cannot find a fulltext index to use for the search. Please create a fulltext index on the searched fields.`,
        undefined,
        error.code,
        error,
      );

    case 'P2033':
      throw new DatabaseValidationError(
        `A number used in the query does not fit into a 64 bit signed integer. Consider using BigInt.`,
        undefined,
        error.code,
        error,
      );

    case 'P2034':
      throw new DatabaseTransactionError(
        `Transaction failed due to a write conflict or a deadlock. Please retry the transaction.`,
        error.code,
        error,
      );

    // =================== DEFAULT PRISMA ERROR ===================
    default:
      if (error.code?.startsWith('P')) {
        throw new DatabaseValidationError(
          `Database operation failed (${error.code}): ${error.message}. Please check your query and data.`,
          error.meta?.field_name,
          error.code,
          error,
        );
      }

      // =================== NON-PRISMA ERRORS ===================
      if (error.name === 'PrismaClientValidationError') {
        throw new DatabaseValidationError(
          `Query validation failed: ${error.message}. Please check your query parameters and structure.`,
          undefined,
          'VALIDATION_ERROR',
          error,
        );
      }

      if (error.name === 'PrismaClientKnownRequestError') {
        throw new DatabaseValidationError(
          `Database request error: ${error.message}`,
          error.meta?.field_name,
          'REQUEST_ERROR',
          error,
        );
      }

      if (error.name === 'PrismaClientUnknownRequestError') {
        throw new DatabaseConnectionError(
          `Unknown database error occurred: ${error.message}. Please check your database connection and retry.`,
          'UNKNOWN_REQUEST_ERROR',
          error,
        );
      }

      if (error.name === 'PrismaClientRustPanicError') {
        throw new DatabaseConnectionError(
          `Critical database engine error occurred. Please restart your application and check your database configuration.`,
          'ENGINE_PANIC',
          error,
        );
      }

      if (error.name === 'PrismaClientInitializationError') {
        throw new DatabaseConnectionError(
          `Database client initialization failed: ${error.message}. Please check your database configuration and connection string.`,
          'INITIALIZATION_ERROR',
          error,
        );
      }

      // =================== GENERIC ERROR FALLBACK ===================
      throw new Error(
        `Unexpected error during ${operation} operation on ${model}: ${error.message}`,
      );
  }
}

// =================== OPERATION VALIDATOR ===================

function validateOperationParams<T>(
  operation: PrismaOperationType,
  params: PrismaOperationParams<T>,
  logger: ILoggerService,
): void {
  const { data, where, rawQuery, groupBy } = params;

  // Validate required parameters for each operation
  switch (operation) {
    case PrismaOperationType.CREATE:
      if (!data || (typeof data === 'object' && Object.keys(data).length === 0)) {
        throw new InvalidInputError(`CREATE operation requires non-empty data object`);
      }
      break;

    case PrismaOperationType.READ_UNIQUE:
    case PrismaOperationType.READ_UNIQUE_OR_THROW:
      if (!where || (typeof where === 'object' && Object.keys(where).length === 0)) {
        throw new InvalidInputError(`${operation} operation requires non-empty where clause`);
      }
      break;

    case PrismaOperationType.UPDATE:
      if (!data || (typeof data === 'object' && Object.keys(data).length === 0)) {
        throw new InvalidInputError(`UPDATE operation requires non-empty data object`);
      }
      if (!where || (typeof where === 'object' && Object.keys(where).length === 0)) {
        throw new InvalidInputError(`UPDATE operation requires non-empty where clause`);
      }
      break;

    case PrismaOperationType.UPDATE_MANY:
      if (!data || (typeof data === 'object' && Object.keys(data).length === 0)) {
        throw new InvalidInputError(`UPDATE_MANY operation requires non-empty data object`);
      }
      break;

    case PrismaOperationType.DELETE:
      if (!where || (typeof where === 'object' && Object.keys(where).length === 0)) {
        throw new InvalidInputError(`DELETE operation requires non-empty where clause`);
      }
      break;

    case PrismaOperationType.UPSERT:
      if (!data?.create || !data?.update) {
        throw new InvalidInputError(`UPSERT operation requires both create and update data`);
      }
      if (!where || (typeof where === 'object' && Object.keys(where).length === 0)) {
        throw new InvalidInputError(`UPSERT operation requires non-empty where clause`);
      }
      break;

    case PrismaOperationType.GROUP_BY:
      if (!groupBy || groupBy.length === 0) {
        throw new InvalidInputError(`GROUP_BY operation requires non-empty groupBy array`);
      }
      break;

    case PrismaOperationType.RAW_QUERY:
      if (!rawQuery || typeof rawQuery !== 'string' || rawQuery.trim().length === 0) {
        throw new InvalidInputError(`RAW_QUERY operation requires non-empty SQL query string`);
      }
      break;
  }
}

// =================== MODEL VALIDATOR ===================

function validateModelExists(model: string, prisma: PrismaClient, logger: ILoggerService): void {
  // Get all available models from the Prisma client
  const availableModels = Object.getOwnPropertyNames(prisma).filter((prop) => {
    const modelObject = (prisma as any)[prop];
    return (
      modelObject &&
      typeof modelObject === 'object' &&
      typeof modelObject.findMany === 'function' &&
      typeof modelObject.create === 'function' &&
      typeof modelObject.update === 'function' &&
      typeof modelObject.delete === 'function'
    );
  });

  logger.info(`Available Prisma models: ${availableModels.join(', ')}`);

  if (!availableModels.includes(model)) {
    logger.error(`Model '${model}' not found in Prisma client.`);

    throw new InvalidInputError(
      `Model '${model}' does not exist in Prisma client. Available models: [${availableModels.join(', ')}]. Make sure to use camelCase for model names (e.g., 'productImage' not 'ProductImage').`,
    );
  }

  logger.info(`Model '${model}' validated successfully`);
}

// =================== MAIN FUNCTION ===================

export async function executePrismaOperation<T>(
  model: keyof PrismaClient,
  params: PrismaOperationParams<T>,
  prisma: PrismaClient,
  logger: ILoggerService,
): Promise<{ data?: any; total?: number }> {
  const operationStartTime = Date.now();
  const {
    operation,
    data,
    where,
    limit,
    offset,
    sort,
    search,
    searchFields,
    fieldSearch,
    include,
    select,
    groupBy,
    having,
    aggregates,
    softDelete,
    maskFields,
    rawQuery,
    distinct,
    orderBy,
  } = params;

  // =================== INITIAL VALIDATION ===================
  if (!operation) {
    throw new InvalidInputError('Operation type is required and cannot be empty');
  }

  if (!model || typeof model !== 'string') {
    throw new InvalidInputError('Model name is required and must be a valid string');
  }

  if (!prisma) {
    throw new InvalidInputError('Prisma client instance is required and cannot be null/undefined');
  }

  logger.info(
    `Executing Prisma Operation: ${operation} on ${String(model)} with params: ${JSON.stringify(params)}`,
  );

  try {
    // =================== VALIDATE MODEL EXISTS ===================
    validateModelExists(String(model), prisma, logger);

    // =================== VALIDATE OPERATION PARAMETERS ===================
    validateOperationParams(operation, params, logger);

    // =================== BUILD WHERE CLAUSE ===================
    let whereClause = where || {};

    // 🔍 Global Search Logic
    if (search && searchFields?.length) {
      const globalConditions = searchFields.map((field) => ({
        [field]: { contains: search, mode: 'insensitive' },
      }));
      whereClause = {
        AND: [whereClause, { OR: globalConditions }],
      };
      logger.info(`Applied global search for: "${search}" on fields: ${searchFields.join(', ')}`);
    }

    // 🎯 Field-wise Search Logic
    if (fieldSearch) {
      const fieldConditions = Object.entries(fieldSearch).map(([key, value]) => ({
        [key]: { contains: value, mode: 'insensitive' },
      }));
      whereClause = {
        AND: [whereClause, ...fieldConditions],
      };
      logger.info(`Applied field search on: ${Object.keys(fieldSearch).join(', ')}`);
    }

    // 🧽 Soft Delete Logic
    if (softDelete) {
      whereClause = {
        AND: [whereClause, { deletedAt: null }],
      };
      logger.info('Applied soft delete filter');
    }

    // =================== BUILD QUERY OPTIONS ===================
    const queryOptions: any = {
      where: whereClause,
    };

    // Add optional parameters
    if (include) queryOptions.include = include;
    if (select) queryOptions.select = select;
    if (limit && limit > 0) queryOptions.take = limit;
    if (offset && offset >= 0) queryOptions.skip = offset;
    if (distinct?.length) queryOptions.distinct = distinct;

    // Handle sorting
    if (sort?.length) {
      queryOptions.orderBy = sort.map(({ field, order }) => ({ [field]: order }));
      logger.info(
        `Applied sorting: ${sort.map((s) => `${String(s.field)}: ${s.order}`).join(', ')}`,
      );
    } else if (orderBy) {
      queryOptions.orderBy = orderBy;
      logger.info('Applied custom orderBy');
    }

    logger.info(`Final query options:`);

    // =================== EXECUTE OPERATION ===================
    let result: { data?: any; total?: number } = {};

    switch (operation) {
      case PrismaOperationType.CREATE:
        if (!data) throw new InvalidInputError('Data is required for create');

        logger.info(`Creating ${String(model)} with data keys: ${Object.keys(data).join(', ')}`);
        result.data = await (prisma[model] as any).create({
          data,
          ...(include && { include }),
          ...(select && { select }),
        });
        logger.info(`Successfully created ${String(model)} record`);
        break;

      case PrismaOperationType.READ:
        logger.info(`Reading ${String(model)} records with options:`);

        const [records, totalCount] = await Promise.all([
          (prisma[model] as any).findMany(queryOptions),
          (prisma[model] as any).count({ where: queryOptions.where }),
        ]);

        result.data = records;
        result.total = totalCount;
        logger.info(
          `Successfully retrieved ${records.length} ${String(model)} records (total: ${totalCount})`,
        );
        break;

      case PrismaOperationType.READ_UNIQUE:
        if (!queryOptions.where) throw new InvalidInputError('Where is required for readUnique');

        logger.info(`Reading unique ${String(model)} record`);
        result.data = await (prisma[model] as any).findUnique(queryOptions);
        logger.info(`ReadUnique ${String(model)}: ${result.data ? 'Found' : 'Not found'}`);
        break;

      case PrismaOperationType.READ_FIRST:
        logger.info(`Reading first ${String(model)} record`);
        result.data = await (prisma[model] as any).findFirst(queryOptions);
        logger.info(`ReadFirst ${String(model)}: ${result.data ? 'Found' : 'Not found'}`);
        break;

      case PrismaOperationType.READ_FIRST_OR_THROW:
        if (!queryOptions.where)
          throw new InvalidInputError('Where is required for readFirstOrThrow');

        logger.info(`Reading first ${String(model)} record (or throw)`);
        result.data = await (prisma[model] as any).findFirstOrThrow(queryOptions);
        logger.info(`ReadFirstOrThrow ${String(model)}: Found record`);
        break;

      case PrismaOperationType.READ_UNIQUE_OR_THROW:
        if (!queryOptions.where)
          throw new InvalidInputError('Where is required for readUniqueOrThrow');

        logger.info(`Reading unique ${String(model)} record (or throw)`);
        result.data = await (prisma[model] as any).findUniqueOrThrow(queryOptions);
        logger.info(`ReadUniqueOrThrow ${String(model)}: Found record`);
        break;

      case PrismaOperationType.UPDATE:
        if (!data || !queryOptions.where)
          throw new InvalidInputError('Data and where are required for update');

        logger.info(
          `Updating ${String(model)} record with data keys: ${Object.keys(data).join(', ')}`,
        );
        result.data = await (prisma[model] as any).update({
          where: queryOptions.where,
          data,
          ...(include && { include }),
          ...(select && { select }),
        });
        logger.info(`Successfully updated ${String(model)} record`);
        break;

      case PrismaOperationType.UPDATE_MANY:
        if (!data) throw new InvalidInputError('Data is required for updateMany');

        logger.info(`Updating multiple ${String(model)} records`);
        result.data = await (prisma[model] as any).updateMany({
          where: queryOptions.where,
          data,
        });
        logger.info(`Successfully updated ${result.data.count} ${String(model)} records`);
        break;

      case PrismaOperationType.DELETE:
        if (!queryOptions.where) throw new InvalidInputError('Where is required for delete');

        if (softDelete) {
          logger.info(`Soft deleting ${String(model)} record`);
          result.data = await (prisma[model] as any).update({
            where: queryOptions.where,
            data: { deletedAt: new Date() },
            ...(include && { include }),
            ...(select && { select }),
          });
          logger.info(`Successfully soft deleted ${String(model)} record`);
        } else {
          logger.info(`Hard deleting ${String(model)} record`);
          result.data = await (prisma[model] as any).delete({
            where: queryOptions.where,
            ...(include && { include }),
            ...(select && { select }),
          });
          logger.info(`Successfully hard deleted ${String(model)} record`);
        }
        break;

      case PrismaOperationType.DELETE_MANY:
        logger.info(`Deleting multiple ${String(model)} records`);
        result.data = await (prisma[model] as any).deleteMany({
          where: queryOptions.where,
        });
        logger.info(`Successfully deleted ${result.data.count} ${String(model)} records`);
        break;

      case PrismaOperationType.UPSERT:
        if (!data?.create || !data?.update || !queryOptions.where) {
          throw new InvalidInputError('Create, update data and where are required for upsert');
        }

        logger.info(`Upserting ${String(model)} record`);
        result.data = await (prisma[model] as any).upsert({
          where: queryOptions.where,
          update: data.update,
          create: data.create,
          ...(include && { include }),
          ...(select && { select }),
        });
        logger.info(`Successfully upserted ${String(model)} record`);
        break;

      case PrismaOperationType.AGGREGATE:
        logger.info(`Aggregating ${String(model)} data`);
        result.data = await (prisma[model] as any).aggregate({
          where: queryOptions.where,
          ...aggregates,
        });
        logger.info(`Successfully aggregated ${String(model)} data`);
        break;

      case PrismaOperationType.GROUP_BY:
        logger.info(`Grouping ${String(model)} data by: ${groupBy?.join(', ')}`);
        result.data = await (prisma[model] as any).groupBy({
          by: groupBy,
          where: queryOptions.where,
          ...(having && { having }),
          ...aggregates,
        });
        logger.info(`Successfully grouped ${String(model)} data`);
        break;

      case PrismaOperationType.COUNT:
        logger.info(`Counting ${String(model)} records`);
        result.data = await (prisma[model] as any).count({
          where: queryOptions.where,
          ...(select && { select }),
        });
        logger.info(`Count result for ${String(model)}: ${result.data}`);
        break;

      case PrismaOperationType.RAW_QUERY:
        if (!rawQuery) throw new InvalidInputError('Raw query is required for rawQuery operation');

        logger.info('Executing raw SQL query');
        result.data = await (prisma.$queryRawUnsafe as any)(rawQuery);
        logger.info('Successfully executed raw query');
        break;

      default:
        throw new InvalidInputError(`Unsupported operation: ${operation}`);
    }

    // =================== POST-PROCESSING ===================

    // 🔐 Mask sensitive fields if needed
    if (maskFields && maskFields.length > 0 && result.data) {
      const mask = (entry: any) => {
        if (entry && typeof entry === 'object') {
          maskFields.forEach((field) => {
            if (entry.hasOwnProperty(field)) {
              delete entry[field];
            }
          });
        }
        return entry;
      };

      result.data = Array.isArray(result.data) ? result.data.map(mask) : mask(result.data);
      logger.info(`Masked sensitive fields: ${maskFields.join(', ')}`);
    }

    // =================== OPERATION COMPLETED ===================
    const executionTime = Date.now() - operationStartTime;
    logger.info(
      `Prisma operation ${operation} on ${String(model)} completed successfully (${executionTime}ms)`,
    );

    return result;
  } catch (error: any) {
    // =================== ERROR HANDLING ===================
    const executionTime = Date.now() - operationStartTime;

    // Handle and transform the error
    handlePrismaError(error, operation, String(model), logger);
  }
}

// =================== UTILITY FUNCTIONS ===================

/**
 * Helper function to create a transaction-wrapped operation
 */
export async function executeInTransaction<T>(
  prisma: PrismaClient,
  operations: Array<{
    model: keyof PrismaClient;
    params: PrismaOperationParams<T>;
  }>,
  logger: ILoggerService,
): Promise<any[]> {
  logger.info(`Starting database transaction with ${operations.length} operations`);

  try {
    const result = await prisma.$transaction(async (tx: any) => {
      const results = [];

      for (let i = 0; i < operations.length; i++) {
        const { model, params } = operations[i];
        logger.info(
          `Transaction operation ${i + 1}/${operations.length}: ${params.operation} on ${String(model)}`,
        );

        const operationResult = await executePrismaOperation(
          model,
          params,
          tx as PrismaClient,
          logger,
        );
        results.push(operationResult);
      }

      return results;
    });

    logger.info(`Transaction completed successfully with ${result.length} operations`);
    return result;
  } catch (error: any) {
    throw new DatabaseTransactionError(
      `Transaction failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'TRANSACTION_FAILED',
      error,
    );
  }
}

/**
 * Helper function to validate model exists in Prisma client
 */
export function validateModel(model: string, prisma: PrismaClient): boolean {
  const availableModels = Object.getOwnPropertyNames(prisma).filter(
    (prop) =>
      typeof (prisma as any)[prop] === 'object' &&
      (prisma as any)[prop] !== null &&
      (prisma as any)[prop].findMany,
  );

  return availableModels.includes(model);
}

/**
 * Helper function to get all available models
 */
export function getAvailableModels(prisma: PrismaClient): string[] {
  return Object.getOwnPropertyNames(prisma).filter(
    (prop) =>
      typeof (prisma as any)[prop] === 'object' &&
      (prisma as any)[prop] !== null &&
      (prisma as any)[prop].findMany,
  );
}

/**
 * Helper function to debug Prisma client
 */
export function debugPrismaClient(prisma: PrismaClient, logger: ILoggerService): void {
  const allProperties = Object.getOwnPropertyNames(prisma);
  const modelProperties = allProperties.filter(
    (prop) =>
      typeof (prisma as any)[prop] === 'object' &&
      (prisma as any)[prop] !== null &&
      (prisma as any)[prop].findMany,
  );
}
