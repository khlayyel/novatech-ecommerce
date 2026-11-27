import api from '../utils/request';
import type {
  AdminAnalytics,
  AdminOrder,
  AdminOrdersResponse,
  AdminStats,
  AdminUsersResponse,
  AuditLogsResponse,
  CategoryInfo,
  CategoryInput,
  OrderStatus,
  Product,
  ProductInput,
  UserRole
} from '../types';

/** Appels réservés au rôle `admin` (le backend revérifie le rôle à chaque requête). */

export const getStats = async (): Promise<AdminStats> => {
  const { data } = await api.get<AdminStats>('/admin/stats');
  return data;
};

export const getAnalytics = async (days = 14): Promise<AdminAnalytics> => {
  const { data } = await api.get<AdminAnalytics>('/admin/analytics', { params: { days } });
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

/** Met à jour uniquement le stock (utilisé par la page Stock). */
export const updateProductStock = async (id: string, stock: number): Promise<Product> => {
  const { data } = await api.put<Product>(`/admin/products/${id}`, { stock });
  return data;
};

export const listCategories = async (): Promise<CategoryInfo[]> => {
  const { data } = await api.get<CategoryInfo[]>('/admin/categories');
  return data;
};

export const getCategory = async (id: string): Promise<CategoryInfo> => {
  const { data } = await api.get<CategoryInfo>(`/admin/categories/${id}`);
  return data;
};

export const createCategory = async (input: CategoryInput): Promise<CategoryInfo> => {
  const { data } = await api.post<CategoryInfo>('/admin/categories', input);
  return data;
};

export const updateCategory = async (id: string, input: CategoryInput): Promise<CategoryInfo> => {
  const { data } = await api.put<CategoryInfo>(`/admin/categories/${id}`, input);
  return data;
};

export const deleteCategory = async (id: string): Promise<void> => {
  await api.delete(`/admin/categories/${id}`);
};

export const listUsers = async (
  params: { search?: string; role?: string; page?: number; limit?: number } = {}
): Promise<AdminUsersResponse> => {
  const { data } = await api.get<AdminUsersResponse>('/admin/users', { params });
  return data;
};

export const updateUserRole = async (id: string, role: UserRole): Promise<{ id: string; role: UserRole }> => {
  const { data } = await api.patch<{ id: string; role: UserRole }>(`/admin/users/${id}/role`, { role });
  return data;
};

export const listAuditLogs = async (
  params: { page?: number; limit?: number } = {}
): Promise<AuditLogsResponse> => {
  const { data } = await api.get<AuditLogsResponse>('/admin/audit', { params });
  return data;
};

/** Télécharge un export CSV protégé (l'API renvoie un blob). */
export const downloadCsv = async (path: string, filename: string): Promise<void> => {
  const { data } = await api.get<Blob>(path, { responseType: 'blob' });
  const url = URL.createObjectURL(data);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};
