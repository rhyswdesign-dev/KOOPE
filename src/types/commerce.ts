export interface PricingPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  billingPeriod: 'monthly' | 'yearly' | 'lifetime';
  originalPrice?: number; // For showing discount
  features: string[];
  popular?: boolean;
  stripeId?: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  brand?: string;
  tags?: string[];
  inStock: boolean;
  xpRequired?: number;
  value?: string; // e.g. "$350+ Value"
}

export interface CartItem {
  id: string;
  type: 'plan' | 'product';
  planId?: string;
  productId?: string;
  quantity: number;
  price: number;
  name: string;
  image?: string;
  recipeId?: string; // Link to cocktail recipe if this is an ingredient
}

export interface PromoCode {
  id: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  validUntil?: string;
  usageLimit?: number;
  usedCount?: number;
  minOrderValue?: number;
}

export interface Address {
  id: string;
  firstName: string;
  lastName: string;
  street1: string;
  street2?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  isDefault?: boolean;
}

export interface PaymentMethod {
  id: string;
  type: 'card' | 'paypal' | 'apple_pay' | 'google_pay';
  last4?: string;
  brand?: string; // visa, mastercard, etc.
  expiryMonth?: number;
  expiryYear?: number;
  isDefault?: boolean;
  stripeId?: string;
}

export interface Tax {
  rate: number;
  amount: number;
  description: string;
}

export interface Shipping {
  method: string;
  cost: number;
  estimatedDays: number;
}

export interface OrderItem {
  id: string;
  type: 'plan' | 'product';
  name: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  image?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  tax: number;
  shipping: number;
  total: number;
  shippingAddress?: Address;
  billingAddress?: Address;
  paymentMethod?: PaymentMethod;
  promoCode?: string;
  trackingNumber?: string;
  estimatedDelivery?: string;
  stripePaymentIntentId?: string;
}

export interface Subscription {
  id: string;
  planId: string;
  planName: string;
  status: 'active' | 'cancelled' | 'past_due' | 'unpaid';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  price: number;
  billingPeriod: 'monthly' | 'yearly' | 'lifetime';
  stripeSubscriptionId?: string;
}

export interface Receipt {
  id: string;
  orderId: string;
  subscriptionId?: string;
  type: 'order' | 'subscription';
  amount: number;
  currency: string;
  date: string;
  status: 'paid' | 'pending' | 'failed';
  paymentMethod: string;
  downloadUrl?: string;
}