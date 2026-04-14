import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import {
  getGlobalHomeProductEnabledMap,
  getHomeProductEnabledMapForSession,
  resolveProfileUserId,
} from "@/lib/session-profile";
import { markHomeVisitedForSession } from "@/lib/mongodb/profile";
import { ensureDefaultLoansForUser } from "@/lib/mongodb/default-loans";
import { getMongoDb } from "@/lib/mongodb/client";
import {
  buildHomeProductLoanMap,
  loanStatusDisplay,
  normalizeLoanStatus,
  type HomeLoanDoc,
} from "@/lib/home-product-loan";
import { HOME_PRODUCTS, isHomeProductVisibleForUser } from "@/lib/home-products";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await markHomeVisitedForSession(session);

    const enabledMap = await getHomeProductEnabledMapForSession(session);
    const globalMap = await getGlobalHomeProductEnabledMap();
    const profileId = await resolveProfileUserId(session);

    let loanByHomeId = {};

    if (profileId) {
      try {
        await ensureDefaultLoansForUser(profileId);
        const db = await getMongoDb();
        const docs = await db
          .collection("loans")
          .find({ userId: profileId })
          .toArray();
        const map = buildHomeProductLoanMap(docs as HomeLoanDoc[]);
        loanByHomeId = Object.fromEntries(map);
      } catch (e) {
        console.error("Loan lookup failed", e);
      }
    }

    const recommendations = Object.values(HOME_PRODUCTS)
      .filter((row) => {
        if (!isHomeProductVisibleForUser(globalMap, enabledMap, row.id)) {
          return false;
        }
        const fromDb = (loanByHomeId as Record<string, { amountRupees: number; status: string }>)[
          row.id
        ];
        if (fromDb && normalizeLoanStatus(fromDb.status) === "settled") {
          return false;
        }
        return true;
      })
      .map((row) => {
        const fromDb = (loanByHomeId as Record<string, { amountRupees: number; status: string }>)[
          row.id
        ];
        const statusUi = loanStatusDisplay(fromDb?.status ?? "active");
        return {
          id: row.id,
          productName: row.productName,
          loanAmountRupees: fromDb ? fromDb.amountRupees : row.loanAmountRupees,
          statusLabel: statusUi.label,
          statusVariant: normalizeLoanStatus(fromDb?.status ?? "active"),
        };
      });

    return NextResponse.json({
      recommendations,
      featuredRange: [2000, 80000],
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
