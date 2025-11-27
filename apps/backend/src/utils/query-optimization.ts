/**
 * Database query optimization utilities
 * Implements selective field fetching, query batching, and lazy loading strategies
 */

/**
 * Prisma select configuration for different endpoints
 * Only fetch required fields to reduce payload size
 */
export const PRISMA_SELECTS = {
  // User queries
  user: {
    id: true,
    email: true,
    firstName: true,
    lastName: true,
    avatar: true,
    role: true,
    emailVerified: true,
    language: true,
  },
  userFull: {
    id: true,
    email: true,
    firstName: true,
    lastName: true,
    phone: true,
    avatar: true,
    role: true,
    emailVerified: true,
    language: true,
    timezone: true,
    currency: true,
    createdAt: true,
    updatedAt: true,
  },
  userProfile: {
    id: true,
    email: true,
    firstName: true,
    lastName: true,
    phone: true,
    avatar: true,
    language: true,
    timezone: true,
    currency: true,
  },

  // Country queries
  country: {
    id: true,
    name: true,
    code: true,
    flagEmoji: true,
    description: true,
  },
  countryFull: {
    id: true,
    name: true,
    code: true,
    flagEmoji: true,
    description: true,
    requirements: true,
    createdAt: true,
    updatedAt: true,
  },

  // Visa type queries
  visaType: {
    id: true,
    name: true,
    processingDays: true,
    validity: true,
    fee: true,
    description: true,
  },
  visaTypeFull: {
    id: true,
    countryId: true,
    name: true,
    description: true,
    processingDays: true,
    validity: true,
    fee: true,
    requirements: true,
    documentTypes: true,
    createdAt: true,
    updatedAt: true,
  },

  // Application queries
  application: {
    id: true,
    userId: true,
    countryId: true,
    visaTypeId: true,
    status: true,
    progress: true,
    createdAt: true,
    updatedAt: true,
  },
  applicationFull: {
    id: true,
    userId: true,
    countryId: true,
    visaTypeId: true,
    status: true,
    progress: true,
    notes: true,
    paymentStatus: true,
    createdAt: true,
    updatedAt: true,
  },

  // Payment queries
  payment: {
    id: true,
    applicationId: true,
    amount: true,
    status: true,
    provider: true,
    createdAt: true,
  },
  paymentFull: {
    id: true,
    applicationId: true,
    amount: true,
    currency: true,
    status: true,
    provider: true,
    transactionId: true,
    createdAt: true,
    updatedAt: true,
  },

  // Chat queries
  chatMessage: {
    id: true,
    sessionId: true,
    role: true,
    content: true,
    createdAt: true,
  },
  chatSession: {
    id: true,
    userId: true,
    applicationId: true,
    status: true,
    createdAt: true,
    updatedAt: true,
  },
};

/**
 * Include relations configuration for different endpoints
 */
export const PRISMA_INCLUDES = {
  applicationWithRelations: {
    country: {
      select: PRISMA_SELECTS.country,
    },
    visaType: {
      select: PRISMA_SELECTS.visaType,
    },
    payments: {
      select: PRISMA_SELECTS.payment,
      orderBy: {
        createdAt: 'desc' as const,
      },
      take: 10,
    },
    documents: {
      select: {
        id: true,
        documentType: true,
        status: true,
        fileUrl: true,
        uploadedAt: true,
      },
      orderBy: {
        uploadedAt: 'desc' as const,
      },
    },
  },

  userWithRelations: {
    visaApplications: {
      select: PRISMA_SELECTS.application,
      orderBy: {
        createdAt: 'desc' as const,
      },
      take: 5,
    },
    preferences: {
      select: {
        id: true,
        notificationsEnabled: true,
        emailNotifications: true,
        pushNotifications: true,
      },
    },
  },

  countryWithVisaTypes: {
    visaTypes: {
      select: PRISMA_SELECTS.visaType,
      orderBy: {
        name: 'asc' as const,
      },
    },
  },
};

/**
 * Query optimization config for common queries
 */
export const QUERY_OPTIMIZATION = {
  // Batch size for bulk operations
  BATCH_SIZE: 100,

  // Default pagination size
  DEFAULT_PAGE_SIZE: 20,

  // Max results for list endpoints
  MAX_RESULTS: 1000,

  // Query timeout in milliseconds
  QUERY_TIMEOUT: 30000,

  // Connection pool size
  POOL_SIZE: 20,

  // Connection idle timeout
  IDLE_TIMEOUT: 60000,
};

/**
 * Helper to build optimized query for user with relations
 */
export function buildUserQuery(includeRelations: boolean = false) {
  if (includeRelations) {
    return {
      select: PRISMA_SELECTS.userFull,
      include: PRISMA_INCLUDES.userWithRelations,
    };
  }
  return {
    select: PRISMA_SELECTS.user,
  };
}

/**
 * Helper to build optimized query for application with relations
 */
export function buildApplicationQuery(includeRelations: boolean = true) {
  if (includeRelations) {
    return {
      select: PRISMA_SELECTS.applicationFull,
      include: PRISMA_INCLUDES.applicationWithRelations,
    };
  }
  return {
    select: PRISMA_SELECTS.application,
  };
}

/**
 * Helper to build optimized query for country with visa types
 */
export function buildCountryQuery(includeVisaTypes: boolean = true) {
  if (includeVisaTypes) {
    return {
      select: PRISMA_SELECTS.countryFull,
      include: PRISMA_INCLUDES.countryWithVisaTypes,
    };
  }
  return {
    select: PRISMA_SELECTS.country,
  };
}

/**
 * Batch load multiple resources efficiently
 */
export async function batchLoad<T>(
  ids: string[],
  loader: (ids: string[]) => Promise<Record<string, T>>
): Promise<Map<string, T>> {
  const result = new Map<string, T>();

  // Process in batches
  for (let i = 0; i < ids.length; i += QUERY_OPTIMIZATION.BATCH_SIZE) {
    const batch = ids.slice(i, i + QUERY_OPTIMIZATION.BATCH_SIZE);
    const batchResults = await loader(batch);

    Object.entries(batchResults).forEach(([id, value]) => {
      result.set(id, value);
    });
  }

  return result;
}

/**
 * Create an efficient query builder
 */
export class QueryBuilder<T> {
  private _select: any = true;
  private _include: any = {};
  private _where: any = {};
  private _orderBy: any = {};
  private take?: number;
  private skip?: number;

  select(fields: any): this {
    this._select = fields;
    return this;
  }

  include(relations: any): this {
    this._include = relations;
    return this;
  }

  where(conditions: any): this {
    this._where = conditions;
    return this;
  }

  orderBy(sort: any): this {
    this._orderBy = sort;
    return this;
  }

  paginate(page: number, pageSize: number): this {
    this.skip = (page - 1) * pageSize;
    this.take = pageSize;
    return this;
  }

  build(): any {
    return {
      select: this._select !== true ? this._select : undefined,
      include: Object.keys(this._include).length > 0 ? this._include : undefined,
      where: this._where,
      orderBy: Object.keys(this._orderBy).length > 0 ? this._orderBy : undefined,
      take: this.take,
      skip: this.skip,
    };
  }
}
