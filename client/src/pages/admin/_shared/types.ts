export interface Product {
  id: string;
  name: string;
  slug: string;
  description?: string;
  sku?: string;
  basePrice: string;
  categoryId: string;
  categoryIds?: string[];
  images: string[];
  availableSizes: string[];
  availableColors: { name: string; hex: string | null }[];
  isActive: boolean;
  isFeatured: boolean;
  isNew: boolean;
  discountBadge?: string | null;
  brand?: string | null;
  specs?: Record<string, string> | null;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  image: string;
  displayOrder: number;
  seoTitle?: string | null;
  seoDescription?: string | null;
  contentHtml?: string | null;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: {
    address: string;
    city: string;
    district: string;
    postalCode: string;
  };
  total: string;
  status: string;
  createdAt: string;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  createdAt: string;
}

export interface Stats {
  totalProducts: number;
  totalCategories: number;
  totalOrders: number;
  totalUsers: number;
  totalRevenue: number;
  pendingOrders: number;
}

export interface ProductVariant {
  id: string;
  productId: string;
  productName?: string;
  productSlug?: string;
  size: string;
  color: string;
  price: string;
  stock: number;
  product?: Product;
}

export type BulkPriceAction = 'increase' | 'decrease' | 'set' | 'percent_increase' | 'percent_decrease';

export interface OrderItem {
  id?: string;
  productId?: string;
  productSlug?: string;
  productName?: string;
  productImage?: string;
  sku?: string;
  size?: string;
  color?: string;
  quantity: number;
  price: number | string;
  subtotal?: number | string;
  variantDetails?: string;
}

export interface OrderNote {
  id: string;
  note?: string;
  content?: string;
  createdAt: string;
  isPublic?: boolean;
}

export interface OrderUpdatePayload {
  status?: string;
  trackingNumber?: string;
  cargoCompany?: string;
  cancelReason?: string;
  notes?: string;
}

export interface AnalyticsStatusRow {
  status: string;
  count: number;
  revenue?: number;
}

export interface AnalyticsBestSeller {
  productId: string;
  productName: string;
  totalSold: number;
  revenue: number;
  imageUrl?: string;
  product?: Pick<Product, 'id' | 'name' | 'slug' | 'images'>;
}

export interface AnalyticsCountryRow {
  country: string;
  city?: string;
  count: number;
  revenue: number;
}

export type ProductDraft = Omit<Product, 'id' | 'createdAt'> & {
  id?: string;
  createdAt?: string;
};

export type TabType =
  | 'dashboard'
  | 'products'
  | 'categories'
  | 'orders'
  | 'users'
  | 'analytics'
  | 'inventory'
  | 'settings'
  | 'database'
  | 'menu'
  | 'homepage'
  | 'pages'
  | 'blog'
  | 'marketplaces'
  | 'marketplaceOrders'
  | 'coupons'
  | 'reviews'
  | 'wholesale';
