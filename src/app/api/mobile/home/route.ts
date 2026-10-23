import { NextResponse, type NextRequest } from "next/server";

import {
  buildHomeProductLoanMap,
  loanStatusDisplay,
  normalizeLoanStatus,
  resolveHomeProductKeyForLoan,
  type HomeLoanDoc,
} from "@/lib/home-product-loan";
import { HOME_PRODUCTS } from "@/lib/home-products";
import { requireMobileSession } from "@/lib/mobile-api";
import type { MobileHomeResponse } from "@/lib/mobile-types";
import { ensureDefaultLoansForUser } from "@/lib/mongodb/default-loans";
import { getMongoDb } from "@/lib/mongodb/client";
import { markHomeVisitedForSession } from "@/lib/mongodb/profile";
import {
  getGlobalHomeProductEnabledMap,
  getHomeProductEnabledMapForSession,
  resolveProfileUserId,
} from "@/lib/session-profile";

export async function GET(request: NextRequest) {
  const session = requireMobileSession(request);
  if (session instanceof NextResponse) {
    return session;
  }

  await markHomeVisitedForSession(session);

  const enabledMap = await getHomeProductEnabledMapForSession(session);
  const globalMap = await getGlobalHomeProductEnabledMap();
  const profileId = await resolveProfileUserId(session);

  let loanByHomeId = new Map<
    keyof typeof HOME_PRODUCTS,
    { amountRupees: number; status: string; loanId: string }
  >();
  let customRecommendations: MobileHomeResponse["recommendations"] = [];

  if (profileId) {
    try {
      await ensureDefaultLoansForUser(profileId);
      const db = await getMongoDb();
      const docs = await db
        .collection("loans")
        .find({ userId: profileId })
        .sort({ created_at: -1 })
        .toArray();
      loanByHomeId = buildHomeProductLoanMap(docs as HomeLoanDoc[]);
      customRecommendations = docs
        .filter((doc) => {
          const row = doc as {
            product_name?: string;
            amount_rupees?: unknown;
            default_product_key?: string | null;
            status?: unknown;
          };
          if (normalizeLoanStatus(row.status) === "settled") {
            return false;
          }
          return !resolveHomeProductKeyForLoan(row);
        })
        .map((doc) => {
          const row = doc as {
            _id: unknown;
            product_name?: string;
            amount_rupees?: unknown;
            status?: unknown;
          };
          const statusUi = loanStatusDisplay(row.status ?? "active");
          return {
            id: String(row._id),
            productName: String(row.product_name ?? "Loan"),
            amountRupees: Math.round(Number(row.amount_rupees ?? 0)),
            status: statusUi.label,
            statusVariant: normalizeLoanStatus(row.status ?? "active"),
          };
        });
    } catch {
      // Keep response usable even if loan lookup fails.
    }
  }

  const catalogRecommendations: MobileHomeResponse["recommendations"] = Object.values(
    HOME_PRODUCTS,
  )
    .filter((row) => {
      if (globalMap?.[row.id] === false || enabledMap?.[row.id] === false) {
        return false;
      }
      const fromDb = loanByHomeId.get(row.id);
      return !(fromDb && normalizeLoanStatus(fromDb.status) === "settled");
    })
    .map((row) => {
      const fromDb = loanByHomeId.get(row.id);
      const amountRupees = fromDb ? fromDb.amountRupees : row.loanAmountRupees;
      const statusUi = loanStatusDisplay(fromDb?.status ?? "active");
      const loanRowId =
        fromDb?.loanId && fromDb.loanId.length > 0 ? fromDb.loanId : row.id;
      return {
        id: loanRowId,
        productName: row.productName,
        amountRupees,
        status: statusUi.label,
        statusVariant: normalizeLoanStatus(fromDb?.status ?? "active"),
      };
    });
  const recommendations = [...customRecommendations, ...catalogRecommendations];

  return NextResponse.json<MobileHomeResponse>({
    featuredAmountRange: "₹2,000 - 80,000",
    recommendations,
  });
}
