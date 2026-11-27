import api from '../utils/request';
import type {
  AdminOrder,
  AdminOrdersResponse,
  AdminStats,
  OrderStatus,
  Product,
  ProductInput
} from '../types';

/** Appels réservés au rôle `admin` (le backend revérifie le rôle à chaque requête). */

export const getStats = async (): Promise<AdminStats> => {
  const { data } = await api.get<AdminStats>('/admin/stats');
  return data;
};

export const listOrders = async (
  params: { status?: string; page?: number; limit?: number } = {}
): Promise<AdminOrdersResponse> => {
  const { data } = await api.get<AdminOrdersResponse>('/admin/orders', { params });
  return data;
};

export const updateOrderStatus = async (
  orderId: string,
  status: OrderStatus
): Promise<AdminOrder> => {
  const { data } = await api.patch<AdminOrder>(`/admin/orders/${orderId}/status`, { status });
  return data;
};

export const createProduct = async (input: ProductInput): Promise<Product> => {
  const { data } = await api.post<Product>('/admin/products', input);
  return data;
};

export const updateProduct = async (id: string, input: Partial<ProductInput>): Promise<Product> => {
  const { data } = await api.put<Product>(`/admin/products/${id}`, input);
  return data;
};

export const deleteProduct = async (id: string): Promise<void> => {
  await api.delete(`/admin/products/${id}`);
};
