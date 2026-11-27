import api from '../utils/request';
import type { Product, ProductsResponse } from '../types';

export interface ProductQuery {
  group?: string;
  category?: string;
  subcategory?: string;
  search?: string;
  sort?: string;
  page?: number;
  limit?: number;
}

/** Catalogue paginé avec filtres. */
export const listProducts = async (query: ProductQuery = {}): Promise<ProductsResponse> => {
  const { data } = await api.get<ProductsResponse>('/products', { params: query });
  return data;
};

export const getProduct = async (id: string): Promise<Product> => {
  const { data } = await api.get<Product>(`/products/${id}`);
  return data;
};

export const listCategories = async (): Promise<string[]> => {
  const { data } = await api.get<{ categories: string[] }>('/products/categories');
  return data.categories;
};

/** Arbre public des catégories (catégorie → famille → sous-familles). */
export const listCategoryTree = async () => {
  const { data } = await api.get<import('../types').CategoryInfo[]>('/categories');
  return data;
};
