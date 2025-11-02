export function buildPrismaQuery(
  filters: any[],
  allowedFields: Record<
    string,
    'string' | 'datetime' | 'uuid' | 'array' | 'enum' | 'boolean' | 'datetimets' | 'int' | 'float'
  >,
  page: number = 1,
  limit: number,
  globalSearch?: string,
  combineFieldsGroups: string[][] = [],
  forceLimit: boolean = false,
  excludeIds: string[] = [],
) {
  let where: any = {};
  let orderBy: any[] = [];
  let skip: number = 0;
  const fieldNames = Object.keys(allowedFields);
  const filterClauses: any[] = [];

  if (excludeIds && excludeIds.length > 0) {
    where.id = {
      ...(where.id || {}),
      notIn: excludeIds,
    };
  }

  // Validate filters
  filters.forEach((filter) => {
    const { fieldname, sort } = filter;
    if (!fieldNames.includes(fieldname)) {
      throw new Error(`Invalid field: ${fieldname}`);
    }

    if (sort !== undefined && ![0, 1].includes(sort)) {
      throw new Error(`Invalid sort value for ${fieldname}, must be 0 (asc) or 1 (desc)`);
    }
  });

  if (!forceLimit) {
    limit = Math.min(Math.max(1, parseInt(String(limit ?? 10))), 100);
    skip = (page - 1) * limit;
  }

  filters.forEach((filter) => {
    let {
      fieldname,
      sort,
      filterType,
      value,
      search,
      range,
      fieldType: explicitFieldType,
    } = filter;
    const path = fieldname.split('.');
    const fieldType = explicitFieldType || allowedFields[fieldname];
    if (!fieldType) return;

    if (filterType) {
      const condition: any = {};

      switch (filterType) {
        case 'equal':
          condition.equals = fieldType === 'int' || fieldType === 'float' ? Number(value) : value;
          break;
        case 'not':
          condition.not = fieldType === 'int' || fieldType === 'float' ? Number(value) : value;
          break;
        case 'contains':
          if (fieldType === 'string' || fieldType === 'array') {
            condition.contains = value;
            condition.mode = 'insensitive';
          }
          break;
        case 'startsWith':
          condition.startsWith = value;
          condition.mode = 'insensitive';
          break;
        case 'endsWith':
          condition.endsWith = value;
          condition.mode = 'insensitive';
          break;
        case 'in':
          condition.in = Array.isArray(value) ? value : [value];
          break;
        case 'notIn':
          condition.notIn = Array.isArray(value) ? value : [value];
          break;
        case 'gt':
          condition.gt = fieldType === 'int' || fieldType === 'float' ? Number(value) : value;
          break;
        case 'gte':
          condition.gte = fieldType === 'int' || fieldType === 'float' ? Number(value) : value;
          break;
        case 'lt':
          condition.lt = fieldType === 'int' || fieldType === 'float' ? Number(value) : value;
          break;
        case 'lte':
          condition.lte = fieldType === 'int' || fieldType === 'float' ? Number(value) : value;
          break;
        case 'range':
          if (fieldType === 'datetime') {
            if (range?.from) condition.gte = parseDate(range.from);
            if (range?.to) condition.lte = parseDate(range.to);
          } else if (fieldType === 'datetimets') {
            if (range?.from) condition.gte = parseDatets(range.from);
            if (range?.to) condition.lte = parseDatets(range.to);
          } else if (fieldType === 'int' || fieldType === 'float') {
            if (range?.from) condition.gte = Number(range.from);
            if (range?.to) condition.lte = Number(range.to);
          }
          break;
        case 'isNull':
          if (fieldType === 'array') {
            setNestedField(filterClauses, path.slice(0, -1), { none: {} });
            return;
          } else {
            const nestedNull: any = {};
            setNestedField(nestedNull, path, { equals: null });
            const nestedEmpty: any = {};
            setNestedField(nestedEmpty, path, { equals: '' });
            filterClauses.push({ OR: [nestedNull, nestedEmpty] });
            return;
          }
        case 'isNotNull':
          if (fieldType === 'array') {
            setNestedField(filterClauses, path.slice(0, -1), { some: {} });
            return;
          } else {
            const nestedNotNull: any = {};
            setNestedField(nestedNotNull, path, { not: null });
            const nestedNotEmpty: any = {};
            setNestedField(nestedNotEmpty, path, { not: '' });
            filterClauses.push({ AND: [nestedNotNull, nestedNotEmpty] });
            return;
          }
        case 'notContains':
          if (fieldType === 'string') {
            const notClause = { contains: value, mode: 'insensitive' };
            const nested: any = {};
            setNestedField(nested, path, notClause);
            filterClauses.push({ NOT: nested });
            return;
          }
          break;
        default:
          if (fieldType === 'string' && typeof value === 'string') {
            condition.contains = value;
            condition.mode = 'insensitive';
          } else if (fieldType === 'int' || fieldType === 'float') {
            condition.equals = Number(value);
          } else {
            condition.equals = value;
          }
      }

      const nested: any = {};
      if (fieldType === 'array') {
        setNestedField(nested, path.slice(0, -1), {
          some: { [path[path.length - 1]]: { ...condition } },
        });
      } else {
        setNestedField(nested, path, condition);
      }
      filterClauses.push(nested);
    } else if (search !== undefined || range !== undefined) {
      const nested: any = {};

      if (range && fieldType === 'datetime') {
        const rangeFilter: any = {};
        if (range.from !== undefined) rangeFilter.gte = parseDate(range.from);
        if (range.to !== undefined) rangeFilter.lte = parseDate(range.to);
        setNestedField(nested, path, rangeFilter);
      } else if (range && fieldType === 'datetimets') {
        const rangeFilter: any = {};
        if (range.from !== undefined) rangeFilter.gte = parseDatets(range.from);
        if (range.to !== undefined) rangeFilter.lte = parseDatets(range.to);
        setNestedField(nested, path, rangeFilter);
      } else if (range && (fieldType === 'int' || fieldType === 'float')) {
        const rangeFilter: any = {};
        if (range.from !== undefined) rangeFilter.gte = Number(range.from);
        if (range.to !== undefined) rangeFilter.lte = Number(range.to);
        setNestedField(nested, path, rangeFilter);
      } else if (fieldType === 'string') {
        if (search === '' || search === undefined) {
          setNestedField(nested, path, { equals: '' });
        } else {
          setNestedField(nested, path, { contains: search, mode: 'insensitive' });
        }
      } else if (fieldType === 'uuid') {
        if (search?.trim()) {
          setNestedField(nested, path, { equals: search });
        } else {
          setNestedField(nested, path, { equals: null });
        }
      } else if (fieldType === 'array') {
        if (search?.trim()) {
          setNestedField(nested, path.slice(0, -1), {
            some: { [path[path.length - 1]]: { contains: search, mode: 'insensitive' } },
          });
        }
      } else if (fieldType === 'enum') {
        if (search?.trim()) {
          setNestedField(nested, path, { equals: search });
        }
      } else if (fieldType === 'boolean') {
        if (typeof search === 'boolean') {
          setNestedField(nested, path, { equals: Boolean(search) });
        }
      } else if (fieldType === 'int' || fieldType === 'float') {
        const num = Number(search);
        if (!isNaN(num)) {
          setNestedField(nested, path, { equals: num });
        }
      }

      filterClauses.push(nested);
    }

    if (sort !== undefined) {
      const sortValue = sort === 0 ? 'asc' : 'desc';
      let nestedSort: any = {};
      let current = nestedSort;

      for (let i = 0; i < path.length; i++) {
        if (i === path.length - 1) {
          current[path[i]] = sortValue;
        } else {
          current[path[i]] = {};
          current = current[path[i]];
        }
      }

      orderBy.push(nestedSort);
    }
  });

  if (filterClauses.length > 0) {
    where.AND = filterClauses;
  }

  if (globalSearch?.trim()) {
    const parts = globalSearch
      .trim()
      .split(' ')
      .filter((part) => part.trim() !== '');
    const orConditions: any[] = [];

    // Combined field logic
    if (combineFieldsGroups.length > 0) {
      for (const group of combineFieldsGroups) {
        const andGroup: any[] = [];

        group.forEach((field, idx) => {
          if (allowedFields[field] === 'string' && parts[idx]) {
            const word = parts[idx].trim();
            const path = field.split('.');
            const nested: any = {};
            setNestedField(nested, path, { contains: word, mode: 'insensitive' });
            andGroup.push(nested);
          }
        });

        if (andGroup.length > 0) {
          orConditions.push({ AND: andGroup });
        }
      }
    }

    // Flat string fields
    fieldNames
      .filter((field) => allowedFields[field] === 'string')
      .forEach((field) => {
        const path = field.split('.');
        const nested: any = {};
        setNestedField(nested, path, {
          contains: globalSearch.trim(),
          mode: 'insensitive',
        });
        orConditions.push(nested);
      });

    // Numeric fields
    const numericValue = Number(globalSearch.trim());
    if (!isNaN(numericValue)) {
      fieldNames
        .filter((field) => allowedFields[field] === 'int' || allowedFields[field] === 'float')
        .forEach((field) => {
          const path = field.split('.');
          const nested: any = {};
          setNestedField(nested, path, { equals: numericValue });
          orConditions.push(nested);
        });
    }

    if (orConditions.length > 0) {
      if (where.AND) {
        where = {
          AND: [{ AND: where.AND }, { OR: orConditions }],
        };
      } else {
        where.OR = orConditions;
      }
    }
  }

  return { where, orderBy, skip, take: limit };
}

function setNestedField(where: any, path: string[], value: any) {
  const [first, ...rest] = path;
  if (!rest.length) {
    where[first] = value;
    return;
  }
  if (!where[first]) where[first] = {};
  setNestedField(where[first], rest, value);
}

function parseDate(dateStr: string): string | undefined {
  if (!dateStr) return undefined;
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? undefined : date.toISOString();
}

function parseDatets(dateStr: string): number | undefined {
  if (!dateStr) return undefined;
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? undefined : date.getTime() / 1000;
}

export function parseQueryParams(query: any): {
  filters: any[];
  page: number;
  limit: number;
  globalSearch?: string;
} {
  const filters: any[] = [];
  let page = 1;
  let limit = 10;
  let globalSearch: string | undefined;

  if (query.page) page = parseInt(query.page);
  if (query.limit) limit = parseInt(query.limit);
  if (query.search) globalSearch = query.search;

  Object.entries(query).forEach(([key, value]) => {
    if (['page', 'limit', 'search'].includes(key)) return;

    if (key.startsWith('filter[')) {
      const match = key.match(/filter\[([^\]]+)\]\[([^\]]+)\]/);
      if (match) {
        const [, fieldname, operator] = match;
        let existingFilter = filters.find((f) => f.fieldname === fieldname);

        if (!existingFilter) {
          existingFilter = { fieldname };
          filters.push(existingFilter);
        }

        if (operator === 'value') {
          existingFilter.value = value;
        } else if (operator === 'search') {
          existingFilter.search = value;
        } else if (operator === 'from' || operator === 'to') {
          if (!existingFilter.range) existingFilter.range = {};
          existingFilter.range[operator] = value;
        } else if (operator === 'type') {
          existingFilter.filterType = value;
        } else if (operator === 'sort') {
          existingFilter.sort = parseInt(value as string);
        }
      }
    }
  });

  return { filters, page, limit, globalSearch };
}
