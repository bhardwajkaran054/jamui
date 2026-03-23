// ============================================
// Backend Types - Jamui Super Mart API
// Shared with frontend via duplication
// ============================================

export interface Product {
  id: number;
  name: string;
  price: number;
  unit: string;
  category: string;
  emoji: string;
  image?: string;
  useImage?: boolean;
  stock: number;
}

export interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  emoji: string;
  category: string;
}

export type OrderStatus = 'pending' | 'completed' | 'rejected' | 'cancelled';

export interface Order {
  id: number;
  customer: {
    name: string;
    phone: string;
    address?: string;
  };
  items: CartItem[];
  total: number;
  status: OrderStatus;
  timestamp: string;
  driver?: Driver;
  deliveryMessage?: string;
  rejectionReason?: string;
  approvalTimestamp?: string;
  deliveryHours?: number;
  promo_code?: string;
  delivery_fee: number;
  cancelReason?: string;
}

export interface Driver {
  id: number;
  name: string;
  phone: string;
  vehicle?: string;
  active: boolean;
}

export interface PromoCode {
  code: string;
  discount: number;
  min_order: number;
  active: boolean;
}

export interface DeliveryZone {
  name: string;
  fee: number;
  minOrder: number;
}

export interface Notice {
  id?: number;
  text: string;
  active: boolean;
}

export interface StockLog {
  id: number;
  product_id: number;
  product_name: string;
  old_stock: number;
  new_stock: number;
  reason: string;
  timestamp: string;
}

export interface Settings {
  [key: string]: unknown;
}

export interface Admin {
  id: number;
  username: string;
}

export interface JWTPayload {
  id: number;
  username: string;
  iat?: number;
  exp?: number;
}

export interface LoginResponse {
  token: string;
  username: string;
}

export interface ProductsResponse {
  products: Product[];
  settings?: Settings;
}

export interface Customer {
  phone: string;
  name: string;
  totalSpent: number;
  orderCount: number;
  lastOrder: string | null;
  loyaltyPoints: number;
}
