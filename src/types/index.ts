// ============================================
// Core Data Types - Jamui Super Mart
// ============================================

// Product
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

// CartItem - same shape as OrderItem
export interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  emoji: string;
  category: string;
}

// Cart is a map of productId -> quantity
export type Cart = Record<number, number>;

// Customer (derived from orders)
export interface Customer {
  phone: string;
  name: string;
  totalSpent: number;
  orderCount: number;
  lastOrder: string | null;
  loyaltyPoints: number;
}

// Driver
export interface Driver {
  id: number;
  name: string;
  phone: string;
  vehicle?: string;
  active: boolean;
}

// Order Status
export type OrderStatus = 'pending' | 'completed' | 'rejected' | 'cancelled';

// Order
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

// PromoCode
export interface PromoCode {
  code: string;
  discount: number;
  min_order: number;
  active: boolean;
}

// DeliveryZone (API response uses camelCase)
export interface DeliveryZone {
  name: string;
  fee: number;
  minOrder: number;
}

// Notice
export interface Notice {
  id?: number;
  text: string;
  active: boolean;
}

// StockLog
export interface StockLog {
  id: number;
  product_id: number;
  product_name: string;
  old_stock: number;
  new_stock: number;
  reason: string;
  timestamp: string;
}

// Toast notification
export interface Toast {
  message: string;
  type: 'success' | 'error';
}

// Admin Action Types
export type AdminActionType =
  | 'delete'
  | 'deleteCategory'
  | 'addCategory'
  | 'updateOrderStatus'
  | 'deleteOrder'
  | 'edit'
  | 'add'
  | 'save';

export interface AdminActionData {
  id?: number;
  status?: OrderStatus;
  [key: string]: unknown;
}

// JWT Payload
export interface JWTPayload {
  id: number;
  username: string;
  iat?: number;
  exp?: number;
}

// API Response Types
export interface ProductsResponse {
  products: Product[];
  settings?: Settings;
}

export interface LoginResponse {
  token: string;
  username: string;
}

export interface TrackOrderResponse extends Order {}

export interface ApiError {
  error: string;
}

// Settings
export interface Settings {
  publicOrderToken?: string;
  [key: string]: unknown;
}

// Admin
export interface Admin {
  id: number;
  username: string;
}

// ============================================
// Component Prop Types
// ============================================

export interface HeaderProps {
  cartCount: number;
  onCartClick: () => void;
  onTrackClick: () => void;
  isAdmin: boolean;
  notice: Notice;
}

export interface HeroProps {
  // No props currently
}

export interface StepsProps {
  // No props currently
}

export interface ProductCardProps {
  product: Product;
  quantity: number;
  onAdd: (product: Product) => void;
  onRemove: (product: Product) => void;
  isAdmin: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

export interface ProductListProps {
  products: Product[];
  categories: string[];
  cart: Cart;
  onAdd: (product: Product) => void;
  onRemove: (product: Product) => void;
  isAdmin: boolean;
  onAdminAction: (action: AdminActionType, data: AdminActionData) => void;
  loading: boolean;
}

export interface CartProps {
  cart: Cart;
  products: Product[];
  promoCodes: PromoCode[];
  deliveryZones: DeliveryZone[];
  onAdd: (product: Product) => void;
  onRemove: (product: Product) => void;
  onClose: () => void;
  onOrder: (
    cartItems: CartItem[],
    total: number,
    customerInfo: { name: string; phone: string }
  ) => Promise<boolean>;
}

export interface FooterProps {
  isAdmin: boolean;
  onLogout: () => void;
}

export interface AdminLoginProps {
  onLogin: (token: string) => void;
  onClose: () => void;
}

export interface SecretChallengeProps {
  onPass: () => void;
  onFail: () => void;
}

export interface OrderTrackingProps {
  initialOrderId: string | null;
  onClose: () => void;
}

export interface ProductEditModalProps {
  product: Product | null;
  categories: string[];
  onSave: (product: Partial<Product>) => void;
  onClose: () => void;
}

export interface AdminDashboardProps {
  token: string;
  onLogout: () => void;
  onAdminAction: (action: AdminActionType, data: AdminActionData) => void;
  products: Product[];
  categories: string[];
  orders: Order[];
}
