import { TableQuery } from '@shared/ui/data-table/data-table.models';
import { arrayOf, nullable, objectOf, optional, ResponseCheck, text } from './response-validation';

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  revision?: string | null;
}

export const INITIAL_QUERY: TableQuery = {
  page: 1,
  pageSize: 10,
  search: '',
  sortField: null,
  sortOrder: 1,
};

export function pageParams(query: TableQuery, defaultSort: string) {
  return {
    page: query.page,
    pageSize: query.pageSize,
    search: query.search,
    sort: query.sortField || defaultSort,
    direction: query.sortOrder === -1 ? 'desc' : 'asc',
  };
}

const nonnegativeInteger: ResponseCheck = (value) =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
const positiveInteger: ResponseCheck = (value) => nonnegativeInteger(value) && Number(value) > 0;

export function pageResponse(item: ResponseCheck): ResponseCheck {
  return objectOf({
    items: arrayOf(item),
    total: nonnegativeInteger,
    page: positiveInteger,
    pageSize: positiveInteger,
    revision: optional(nullable(text)),
  });
}

export function sameTableQuery(left: TableQuery, right: TableQuery): boolean {
  return (
    left.page === right.page &&
    left.pageSize === right.pageSize &&
    left.search === right.search &&
    left.sortField === right.sortField &&
    left.sortOrder === right.sortOrder
  );
}
