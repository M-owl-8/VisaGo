/**
 * Pagination utilities for efficient database queries
 * Implements cursor-based and offset-based pagination
 */

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  cursor?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    hasMore: boolean;
    totalPages: number;
    cursor?: string;
  };
}

export interface CursorPaginatedResponse<T> {
  data: T[];
  cursor?: string;
  hasMore: boolean;
}

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

/**
 * Validate and normalize pagination parameters
 */
export function validatePaginationParams(
  page?: number,
  pageSize?: number
): { page: number; pageSize: number } {
  const normalizedPage = Math.max(1, page || 1);
  const normalizedPageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, pageSize || DEFAULT_PAGE_SIZE)
  );

  return {
    page: normalizedPage,
    pageSize: normalizedPageSize,
  };
}

/**
 * Calculate skip value for offset-based pagination
 */
export function calculateSkip(page: number, pageSize: number): number {
  return (page - 1) * pageSize;
}

/**
 * Create paginated response
 */
export function createPaginatedResponse<T>(
  data: T[],
  page: number,
  pageSize: number,
  total: number
): PaginatedResponse<T> {
  const totalPages = Math.ceil(total / pageSize);

  return {
    data,
    pagination: {
      page,
      pageSize,
      total,
      hasMore: page < totalPages,
      totalPages,
    },
  };
}

/**
 * Create cursor-paginated response
 */
export function createCursorPaginatedResponse<T>(
  data: T[],
  pageSize: number,
  nextCursor?: string
): CursorPaginatedResponse<T> {
  return {
    data,
    cursor: nextCursor,
    hasMore: !!nextCursor,
  };
}

/**
 * Generate next cursor for cursor-based pagination
 * Encodes the last item's ID
 */
export function generateNextCursor(lastItemId: string): string {
  return Buffer.from(lastItemId).toString('base64');
}

/**
 * Decode cursor to get the starting point
 */
export function decodeCursor(cursor: string): string {
  try {
    return Buffer.from(cursor, 'base64').toString('utf-8');
  } catch (error) {
    throw new Error('Invalid cursor');
  }
}

/**
 * Prisma query parameters for pagination
 */
export function getPaginationQueryParams(page: number, pageSize: number) {
  return {
    skip: calculateSkip(page, pageSize),
    take: pageSize,
  };
}

/**
 * Prisma query parameters for cursor-based pagination
 */
export function getCursorQueryParams(cursor?: string, pageSize: number = DEFAULT_PAGE_SIZE) {
  const params: any = {
    take: pageSize + 1, // Take one extra to determine hasMore
  };

  if (cursor) {
    params.skip = 1; // Skip the cursor item itself
    params.cursor = {
      id: decodeCursor(cursor),
    };
  }

  return params;
}

/**
 * Extract next cursor from results
 */
export function extractNextCursor<T extends { id: string }>(
  items: T[],
  pageSize: number
): string | undefined {
  if (items.length > pageSize) {
    return generateNextCursor(items[pageSize].id);
  }
  return undefined;
}

/**
 * Trim results to pageSize (when fetching one extra for hasMore check)
 */
export function trimResults<T>(items: T[], pageSize: number): T[] {
  return items.slice(0, pageSize);
}