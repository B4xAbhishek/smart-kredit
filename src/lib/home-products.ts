/** Home “More recommendations” products — ids match `/order/[productId]` routes. */
export type HomeProductId = "KS-7500" | "SL-6500";

export type HomeProductDetail = {
  id: HomeProductId;
  productName: string;
  /** Principal in rupees (integer). */
  loanAmountRupees: number;
};

export const HOME_PRODUCTS: Record<HomeProductId, HomeProductDetail> = {
  "KS-7500": {
    id: "KS-7500",
    productName: "Kredit Smart",
    loanAmountRupees: 7500,
  },
  "SL-6500": {
    id: "SL-6500",
    productName: "Smart Loan",
    loanAmountRupees: 6500,
  },
};

export function isHomeProductId(id: string): id is HomeProductId {
  return id in HOME_PRODUCTS;
}

/** All home recommendation product ids (Kredit Smart, Smart Loan). */
export const HOME_PRODUCT_IDS = Object.keys(HOME_PRODUCTS) as HomeProductId[];

/** Default: visible. Only explicit `false` hides a product (global or per-user map). */
export function isHomeProductSwitchOn(
  map: Partial<Record<HomeProductId, boolean>> | null | undefined,
  productId: HomeProductId,
): boolean {
  return map?.[productId] !== false;
}

/** Same as {@link isHomeProductSwitchOn} (per-user profile map). */
export function isHomeProductEnabledForUser(
  map: Partial<Record<HomeProductId, boolean>> | null | undefined,
  productId: HomeProductId,
): boolean {
  return isHomeProductSwitchOn(map, productId);
}

/**
 * Home recommendations and `/order/[productId]`: both global and per-user must
 * allow the product (explicit `false` in either map hides it).
 */
export function isHomeProductVisibleForUser(
  globalMap: Partial<Record<HomeProductId, boolean>> | null | undefined,
  userMap: Partial<Record<HomeProductId, boolean>> | null | undefined,
  productId: HomeProductId,
): boolean {
  return (
    isHomeProductSwitchOn(globalMap, productId) &&
    isHomeProductSwitchOn(userMap, productId)
  );
}
