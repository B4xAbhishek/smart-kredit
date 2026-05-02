import {
  HOME_PRODUCTS,
  isHomeProductId,
  isHomeProductVisibleForUser,
  type HomeProductId,
} from "@/lib/home-products";

export type HomeLoanDoc = {
  product_name?: string;
  amount_rupees?: unknown;
  default_product_key?: string | null;
  status?: unknown;
  created_at?: unknown;
};

function createdMs(v: unknown): number {
  if (v instanceof Date) return v.getTime();
  if (
    v &&
    typeof v === "object" &&
    "toMillis" in v &&
    typeof (v as { toMillis: () => number }).toMillis === "function"
  ) {
    return (v as { toMillis: () => number }).toMillis();
  }
  return 0;
}

/**
 * Resolves KS-7500 / SL-6500 when `default_product_key` is missing on older loan docs.
 */
export function resolveHomeProductKeyForLoan(row: {
  product_name?: string;
  amount_rupees?: unknown;
  default_product_key?: string | null;
}): HomeProductId | null {
  const k = String(row.default_product_key ?? "");
  if (k && isHomeProductId(k)) {
    return k;
  }

  const amount = Math.round(Number(row.amount_rupees ?? 0));
  const name = String(row.product_name ?? "").trim();

  for (const p of Object.values(HOME_PRODUCTS)) {
    if (p.productName === name && p.loanAmountRupees === amount) {
      return p.id;
    }
  }
  for (const p of Object.values(HOME_PRODUCTS)) {
    if (p.loanAmountRupees === amount) {
      return p.id;
    }
  }
  return null;
}

/**
 * Orders list: custom loans always show. Catalog home products are shown only
 * when visible by current global/per-user switches.
 */
export function shouldIncludeLoanOnOrdersList(
  row: {
    product_name?: string;
    amount_rupees?: unknown;
    default_product_key?: string | null;
    status?: unknown;
  },
  globalMap: Partial<Record<HomeProductId, boolean>> | null | undefined,
  userMap: Partial<Record<HomeProductId, boolean>> | null | undefined,
): boolean {
  const productKey = resolveHomeProductKeyForLoan(row);
  if (!productKey) return true;
  return isHomeProductVisibleForUser(globalMap, userMap, productKey);
}

/**
 * One entry per home product id: prefers explicit `default_product_key`, then newest
 * resolved legacy row per key.
 */
export function buildHomeProductLoanMap(
  docs: HomeLoanDoc[],
): Map<
  HomeProductId,
  { amountRupees: number; status: string; loanId: string }
> {
  const sorted = [...docs].sort((a, b) => createdMs(b.created_at) - createdMs(a.created_at));
  const map = new Map<
    HomeProductId,
    { amountRupees: number; status: string; loanId: string }
  >();

  for (const doc of sorted) {
    const k = String(doc.default_product_key ?? "");
    if (k && isHomeProductId(k) && !map.has(k)) {
      map.set(k, {
        amountRupees: Math.round(Number(doc.amount_rupees ?? 0)),
        status: String(doc.status ?? ""),
        loanId: String((doc as { _id?: unknown })._id ?? ""),
      });
    }
  }
  for (const doc of sorted) {
    const k = String(doc.default_product_key ?? "");
    if (k && isHomeProductId(k)) continue;
    const resolved = resolveHomeProductKeyForLoan(doc);
    if (resolved && !map.has(resolved)) {
      map.set(resolved, {
        amountRupees: Math.round(Number(doc.amount_rupees ?? 0)),
        status: String(doc.status ?? ""),
        loanId: String((doc as { _id?: unknown })._id ?? ""),
      });
    }
  }
  return map;
}

export function normalizeLoanStatus(
  status: unknown,
): "settled" | "active" | "pending" {
  const normalized = String(status ?? "").trim().toLowerCase();
  if (normalized === "settled") return "settled";
  if (normalized === "active") return "active";
  return "pending";
}

export function loanStatusDisplay(
  status: unknown,
): { label: string; className: string } {
  const n = normalizeLoanStatus(status);
  if (n === "settled") {
    return { label: "Settled", className: "text-emerald-600" };
  }
  return {
    label: "Waiting for repayment",
    className: "text-amber-600",
  };
}
