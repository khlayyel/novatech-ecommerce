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
  stock: number;
  imageUrl: string;
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
  stock: number;
  imageUrl?: string;
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
