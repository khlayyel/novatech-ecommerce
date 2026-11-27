/** Types partagés entre l'API et les composants. */

export type Category =
  | 'Ordinateurs'
  | 'Écrans'
  | 'Périphériques'
  | 'Composants'
  | 'Réseau'
  | 'Impression';

export interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  category: Category | string;
  subcategory?: string;
  stock: number;
  imageUrl: string;
  imageUrls?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ProductsResponse {
  products: Product[];
  total: number;
  page: number;
  pages: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Cart {
  _id?: string;
  items: CartItem[];
}

export type UserRole = 'customer' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export type OrderStatus = 'pending' | 'paid' | 'failed' | 'shipped' | 'delivered';

export interface OrderItem {
  product: string;
  name: string;
  imageUrl: string;
  priceAtPurchase: number;
  quantity: number;
}

export interface Order {
  _id: string;
  items: OrderItem[];
  totalAmount: number;
  currency: string;
  status: OrderStatus;
  stripePaymentIntentId?: string;
  createdAt: string;
  updatedAt: string;
  paidAt?: string | null;
  shippedAt?: string | null;
  deliveredAt?: string | null;
}

export interface CheckoutResponse {
  orderId: string;
  clientSecret: string;
  totalAmount: number;
  trackingToken: string;
}

export interface ProductInput {
  name: string;
  description: string;
  price: number;
  category: Category | string;
  subcategory?: string;
  stock: number;
  imageUrl?: string;
  imageUrls?: string[];
}

export interface CategoryInfo {
  _id: string;
  group?: string;
  name: string;
  description: string;
  subcategories: string[];
  imageUrl?: string;
  subcategoryImages?: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryInput {
  group?: string;
  name: string;
  description?: string;
  subcategories?: string[];
  imageUrl?: string;
  subcategoryImages?: Record<string, string>;
}

export interface CategoryGroup {
  name: string;
  imageUrl: string;
}

export interface AdminOrderCustomer {
  _id: string;
  name: string;
  email: string;
}

export interface AdminOrder extends Order {
  user?: AdminOrderCustomer | null;
  sessionId?: string | null;
}

export interface AdminOrdersResponse {
  orders: AdminOrder[];
  total: number;
  page: number;
  pages: number;
}

export interface AdminStats {
  revenue: number;
  paidOrders: number;
  orders: {
    total: number;
    pending: number;
    paid: number;
    failed: number;
    shipped: number;
    delivered: number;
  };
  products: { total: number; lowStock: number };
  users: number;
  recentOrders: AdminOrder[];
}

export interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
  orders: number;
  spent: number;
}

export interface AdminUsersResponse {
  users: AdminUserRow[];
  total: number;
  page: number;
  pages: number;
}

export interface AnalyticsSeriesPoint {
  date: string;
  revenue: number;
  orders: number;
}

export interface AdminAnalytics {
  days: number;
  series: AnalyticsSeriesPoint[];
  statusBreakdown: Record<string, number>;
  topProducts: { name: string; quantity: number; revenue: number }[];
  categories: { category: string; products: number; stock: number; value: number }[];
  totals: { revenue: number; orders: number; averageBasket: number };
}

export interface AuditLogEntry {
  _id: string;
  actor?: string;
  actorEmail: string;
  action: string;
  target: string;
  meta?: unknown;
  ip: string;
  createdAt: string;
}

export interface AuditLogsResponse {
  logs: AuditLogEntry[];
  total: number;
  page: number;
  pages: number;
}
