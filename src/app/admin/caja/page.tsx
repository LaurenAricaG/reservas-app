import CashManagement from "@/components/cash";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { hasPermission } from "@/utils/permissions.utils";
import type {
  PaymentMethodBreakdown,
  SerializedCashShift,
  ShiftStatus,
} from "@/types/cash";

interface CajaPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function serializeShift(shift: {
  id: number;
  userId: number;
  openedAt: Date;
  closedAt: Date | null;
  initialCash: unknown;
  expectedCash: unknown;
  actualCash: unknown;
  difference: unknown;
  status: ShiftStatus;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  user: { name: string; username: string };
  payments: Array<{ amount: unknown; method: string }>;
}): SerializedCashShift {
  const breakdown: PaymentMethodBreakdown = {
    CASH: 0,
    CARD: 0,
    TRANSFER: 0,
    YAPE: 0,
    PLIN: 0,
  };

  for (const p of shift.payments) {
    const amt = Number(p.amount) || 0;
    if (p.method in breakdown) {
      const key = p.method as keyof PaymentMethodBreakdown;
      breakdown[key] = roundMoney(breakdown[key] + amt);
    }
  }

  const cashCollected = breakdown.CASH;
  const digitalCollected = roundMoney(
    breakdown.CARD + breakdown.TRANSFER + breakdown.YAPE + breakdown.PLIN,
  );
  const totalCollected = roundMoney(cashCollected + digitalCollected);
  const initialCash = Number(shift.initialCash);

  return {
    id: shift.id,
    userId: shift.userId,
    userName: shift.user.name,
    userUsername: shift.user.username,
    openedAt: shift.openedAt.toISOString(),
    closedAt: shift.closedAt ? shift.closedAt.toISOString() : null,
    initialCash,
    expectedCash:
      shift.expectedCash !== null
        ? Number(shift.expectedCash)
        : roundMoney(initialCash + cashCollected),
    actualCash: shift.actualCash !== null ? Number(shift.actualCash) : null,
    difference: shift.difference !== null ? Number(shift.difference) : null,
    status: shift.status,
    notes: shift.notes,
    createdAt: shift.createdAt.toISOString(),
    updatedAt: shift.updatedAt.toISOString(),
    totalPaymentsCount: shift.payments.length,
    totalCollected,
    cashCollected,
    digitalCollected,
    breakdown,
  };
}

export default async function CajaPage(props: CajaPageProps) {
  const session = await auth();
  const permissions = session?.user?.permissions ?? [];

  if (
    !hasPermission(
      permissions,
      ["cash:read", "cash:manage"],
      session?.user?.role,
    )
  ) {
    redirect("/admin");
  }

  const searchParams = await props.searchParams;
  const page = Number(searchParams.page) || 1;
  const search =
    typeof searchParams.search === "string" ? searchParams.search.trim() : "";
  const statusFilter =
    typeof searchParams.status === "string" ? searchParams.status : "all";

  const limit = 10;
  const skip = (page - 1) * limit;

  const whereClause: Record<string, unknown> = {};

  if (search) {
    whereClause.OR = [
      { user: { name: { contains: search, mode: "insensitive" } } },
      { user: { username: { contains: search, mode: "insensitive" } } },
      { notes: { contains: search, mode: "insensitive" } },
    ];
  }

  if (statusFilter === "OPEN" || statusFilter === "CLOSED") {
    whereClause.status = statusFilter;
  }

  const [activeShiftDb, shiftsFromDb, totalItems, overallCount] =
    await Promise.all([
      prisma.cashShift.findFirst({
        where: { status: "OPEN" },
        include: {
          user: { select: { name: true, username: true } },
          payments: { select: { amount: true, method: true } },
        },
        orderBy: { openedAt: "desc" },
      }),
      prisma.cashShift.findMany({
        where: whereClause,
        include: {
          user: { select: { name: true, username: true } },
          payments: { select: { amount: true, method: true } },
        },
        take: limit,
        skip,
        orderBy: { openedAt: "desc" },
      }),
      prisma.cashShift.count({ where: whereClause }),
      prisma.cashShift.count(),
    ]);

  const activeShift = activeShiftDb ? serializeShift(activeShiftDb) : null;
  const initialShifts = shiftsFromDb.map(serializeShift);
  const totalPages = Math.ceil(totalItems / limit) || 1;

  return (
    <CashManagement
      activeShift={activeShift}
      initialShifts={initialShifts}
      overallCount={overallCount}
      totalItems={totalItems}
      totalPages={totalPages}
      currentPage={page}
      itemsPerPage={limit}
      search={search}
      statusFilter={statusFilter}
      permissions={permissions}
      userRole={session?.user?.role}
    />
  );
}
