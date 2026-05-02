import { NextResponse, type NextRequest } from "next/server";
import { ObjectId } from "mongodb";

import {
  buildHomeProductLoanMap,
  normalizeLoanStatus,
  resolveHomeProductKeyForLoan,
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

function amountToRupees(v: unknown): number {
  return Math.round(Number(v ?? 0));
}

async function loadLoanDetailById(
  userId: string | null,
  loanId: string,
): Promise<MobileOrderDetailResponse | null> {
  if (!userId || !ObjectId.isValid(loanId)) {
    return null;
  }

  try {
    const db = await getMongoDb();
    const loan = await db.collection("loans").findOne({
      _id: new ObjectId(loanId),
    });
    if (!loan) {
      return null;
    }
    const ownerId =
      loan.userId != null ? String(loan.userId).trim() : "";
    if (!ownerId || ownerId !== String(userId).trim()) {
      return null;
    }

    const row = loan as {
      _id: ObjectId;
      product_name?: string;
      amount_rupees?: unknown;
      due_date?: unknown;
      status?: unknown;
      default_product_key?: string | null;
    };

    const statusVariant = normalizeLoanStatus(row.status);
    if (statusVariant === "settled") {
      return null;
    }

    const loanAmountRupees = amountToRupees(row.amount_rupees);
    const dueDateDisplay =
      row.due_date instanceof Date
        ? formatDateDmy(row.due_date)
        : formatDateDmy(new Date());
    const resolvedProductId = resolveHomeProductKeyForLoan({
      product_name: row.product_name,
      amount_rupees: row.amount_rupees,
      default_product_key: row.default_product_key,
    });

    return {
      productId: resolvedProductId ?? String(row._id),
      productName: String(row.product_name ?? "Loan"),
      loanAmountRupees,
      interestFeeRupees: INTEREST_FEE_RUPEES,
      unpaidAmountRupees: loanAmountRupees + INTEREST_FEE_RUPEES,
      dueDateDisplay,
    };
  } catch {
    return null;
  }
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

  const [userId, globalMap, userProductMap] = await Promise.all([
    resolveProfileUserId(session),
    getGlobalHomeProductEnabledMap(),
    getHomeProductEnabledMapForSession(session),
  ]);

  if (!isHomeProductId(productId)) {
    const loanDetail = await loadLoanDetailById(userId, productId);
    if (!loanDetail) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    return NextResponse.json(loanDetail);
  }

  // Prefer the user's concrete loan row for KS-7500 / SL-6500 so Detail works even
  // when catalog visibility toggles disagree, and so we always match seeded defaults.
  if (userId) {
    try {
      const db = await getMongoDb();
      let keyed = await db.collection("loans").findOne({
        userId,
        default_product_key: productId,
      });
      if (!keyed) {
        const mine = await db
          .collection("loans")
          .find({ userId })
          .toArray();
        keyed =
          mine.find(
            d =>
              String((d as { default_product_key?: unknown }).default_product_key ?? '') ===
              productId,
          ) ?? null;
      }
      if (
        keyed &&
        normalizeLoanStatus(
          (keyed as { status?: unknown }).status,
        ) !== "settled"
      ) {
        const fromLoan = await loadLoanDetailById(
          userId,
          String((keyed as { _id: ObjectId })._id),
        );
        if (fromLoan) {
          return NextResponse.json(fromLoan);
        }
      }
    } catch {
      // fall through to catalog path
    }
  }

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
