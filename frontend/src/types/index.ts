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

export interface User {
  id: string;
  name: string;
  email: string;
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
}

export interface CheckoutResponse {
  orderId: string;
  clientSecret: string;
  totalAmount: number;
  trackingToken: string;
}
