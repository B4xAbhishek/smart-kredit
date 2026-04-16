import { NextResponse, type NextRequest } from "next/server";

import {
  buildHomeProductLoanMap,
  type HomeLoanDoc,
} from "@/lib/home-product-loan";
import {
  HOME_PRODUCTS,
  isHomeProductId,
  isHomeProductVisibleForUser,
  type HomeProductId,
} from "@/lib/home-products";
import { requireMobileSession } from "@/lib/mobile-api";
import type { MobileOrderDetailResponse } from "@/lib/mobile-types";
import { ensureDefaultLoansForUser } from "@/lib/mongodb/default-loans";
import { getMongoDb } from "@/lib/mongodb/client";
import {
  getGlobalHomeProductEnabledMap,
  getHomeProductEnabledMapForSession,
  resolveProfileUserId,
} from "@/lib/session-profile";

const INTEREST_FEE_RUPEES = 45;

function formatDateDmy(d: Date) {
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

async function getLoanDueDate(
  userId: string | null,
  defaultProductKey: string,
): Promise<string> {
  if (!userId) return formatDateDmy(new Date());
  try {
    const db = await getMongoDb();
    const loan = await db.collection("loans").findOne({
      userId,
      default_product_key: defaultProductKey,
    });
    if (loan && loan.due_date) {
      return formatDateDmy(new Date(loan.due_date as Date));
    }
  } catch {
    // fall through to default
  }
  return formatDateDmy(new Date());
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ productId: string }> },
) {
  const session = requireMobileSession(request);
  if (session instanceof NextResponse) {
    return session;
  }

  const { productId } = await context.params;
  if (!isHomeProductId(productId)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const [userId, globalMap, userProductMap] = await Promise.all([
    resolveProfileUserId(session),
    getGlobalHomeProductEnabledMap(),
    getHomeProductEnabledMapForSession(session),
  ]);

  if (
    !isHomeProductVisibleForUser(
      globalMap,
      userProductMap,
      productId as HomeProductId,
    )
  ) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const product = HOME_PRODUCTS[productId as HomeProductId];
  let loanAmountRupees = product.loanAmountRupees;

  if (userId) {
    try {
      await ensureDefaultLoansForUser(userId);
      const db = await getMongoDb();
      const docs = await db.collection("loans").find({ userId }).toArray();
      const map = buildHomeProductLoanMap(docs as HomeLoanDoc[]);
      const entry = map.get(productId as HomeProductId);
      if (entry) {
        loanAmountRupees = entry.amountRupees;
      }
    } catch {
      // keep fallback
    }
  }

  const dueDateDisplay = await getLoanDueDate(userId, productId);
  const response: MobileOrderDetailResponse = {
    productId: product.id,
    productName: product.productName,
    loanAmountRupees,
    interestFeeRupees: INTEREST_FEE_RUPEES,
    unpaidAmountRupees: loanAmountRupees + INTEREST_FEE_RUPEES,
    dueDateDisplay,
  };

  return NextResponse.json(response);
}
