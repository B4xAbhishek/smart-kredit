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
