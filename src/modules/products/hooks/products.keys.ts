import type { CatalogListParams } from '@/modules/products/types/product.types';

export const productsKeys = {
  all: ['products'] as const,
  lists: () => [...productsKeys.all, 'list'] as const,
  list: (params: CatalogListParams) => [...productsKeys.lists(), params] as const,
};

export const techniquesKeys = {
  all: ['techniques'] as const,
  lists: () => [...techniquesKeys.all, 'list'] as const,
  list: (params: CatalogListParams) => [...techniquesKeys.lists(), params] as const,
};
