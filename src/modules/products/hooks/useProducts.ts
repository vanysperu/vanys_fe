import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { createProduct, getProducts, toggleProductStatus, updateProduct } from '@/modules/products/api/products.api';
import { productsKeys } from '@/modules/products/hooks/products.keys';
import type { CatalogListParams, UpdateProductDto } from '@/modules/products/types/product.types';

export function useProducts(params: CatalogListParams) {
  return useQuery({
    queryKey: productsKeys.list(params),
    queryFn: () => getProducts(params),
    placeholderData: keepPreviousData,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createProduct,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: productsKeys.lists() }),
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: UpdateProductDto }) => updateProduct(id, dto),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: productsKeys.lists() }),
  });
}

export function useToggleProductStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: toggleProductStatus,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: productsKeys.lists() }),
  });
}
