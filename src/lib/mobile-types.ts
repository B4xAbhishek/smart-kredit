import type { HomeProductId } from "@/lib/home-products";

export type MobileAuthUser = {
  userId: string;
  phone: string | null;
  email: string | null;
  repeatCustomer: boolean;
};

export type MobileAuthResponse = {
  ok: true;
  token: string;
  expiresAt: number;
  redirectTo: "/home" | "/orders";
  user: MobileAuthUser;
};

export type MobileHomeRecommendation = {
  id: string;
  productName: string;
  amountRupees: number;
  status: string;
  statusVariant: "settled" | "active" | "pending";
};

export type MobileHomeResponse = {
  featuredAmountRange: string;
  recommendations: MobileHomeRecommendation[];
};

export type MobileOrdersLoan = {
  id: string;
  productName: string;
  amountRupees: number;
  status: string;
  statusVariant: "settled" | "active" | "pending";
  detailProductId?: string;
  paymentAmountRupees?: number;
};

export type MobileOrderDetailResponse = {
  productId: string;
  productName: string;
  loanAmountRupees: number;
  interestFeeRupees: number;
  unpaidAmountRupees: number;
  dueDateDisplay: string;
};

export type MobilePaymentConfigResponse = {
  paymentReceiveUpi: string | null;
};

export type MobileContactSettingsResponse = {
  contactEmail: string;
  contactPhone: string | null;
  contactMailtoHref: string;
};
