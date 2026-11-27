import api from '../utils/request';
import type {
  AdminAnalytics,
  AdminOrder,
  AdminOrdersResponse,
  AdminStats,
  AdminUsersResponse,
  AuditLogsResponse,
  CategoryGroup,
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

export const getAnalytics = async (
  params: { days?: number; from?: string; to?: string } = { days: 14 }
): Promise<AdminAnalytics> => {
  const { data } = await api.get<AdminAnalytics>('/admin/analytics', { params });
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

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Lecture du fichier impossible.'));
    reader.readAsDataURL(file);
  });

/** Envoie une image (fichier local) et renvoie son URL publique. */
export const uploadImage = async (file: File): Promise<string> => {
  const dataUrl = await readFileAsDataUrl(file);
  const { data } = await api.post<{ url: string }>('/admin/uploads', {
    dataUrl,
    filename: file.name
  });
  return data.url;
};

/** Visuels des catégories de niveau 1. */
export const listCategoryGroups = async (): Promise<CategoryGroup[]> => {
  const { data } = await api.get<CategoryGroup[]>('/category-groups');
  return data;
};

export const upsertCategoryGroup = async (name: string, imageUrl: string): Promise<CategoryGroup> => {
  const { data } = await api.put<CategoryGroup>('/admin/category-groups', { name, imageUrl });
  return data;
};

/** Supprime immédiatement un média non référencé (les médias utilisés sont ignorés). */
export const deleteMedia = async (url: string): Promise<void> => {
  if (!url.includes('/api/media/')) return;
  try {
    await api.delete('/admin/uploads', { data: { url } });
  } catch {
    // Suppression best-effort : le serveur protège les médias référencés.
  }
};
