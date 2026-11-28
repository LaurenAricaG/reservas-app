import CheckOutManagement from "@/components/checkout";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { hasPermission } from "@/utils/permissions.utils";
import type { SerializedStay } from "@/types/stays";

interface CheckOutPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function computeStayDuration(checkIn: Date, checkOut: Date) {
  const diffMs = Math.max(0, checkOut.getTime() - checkIn.getTime());
  const durationHours = Math.max(1, Math.round(diffMs / (1000 * 60 * 60)));
  const isSameDayNightly =
    checkOut.getHours() === 23 && checkOut.getMinutes() === 59;
  const isHourly = durationHours < 20 && !isSameDayNightly;
  const nights = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  return { nights, isHourly, durationHours };
}

export default async function CheckOutPage(props: CheckOutPageProps) {
  const session = await auth();
  const permissions = session?.user?.permissions ?? [];

  if (
    !hasPermission(
      permissions,
      ["stays:read", "stays:checkout", "stays:update", "stays:manage"],
      session?.user?.role,
    )
  ) {
    redirect("/admin");
  }

  const searchParams = await props.searchParams;
  const page = Number(searchParams.page) || 1;
  const search =
    typeof searchParams.search === "string" ? searchParams.search.trim() : "";
  const viewFilter =
    typeof searchParams.view === "string" ? searchParams.view : "active";

  const limit = 10;
  const skip = (page - 1) * limit;

  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);

  const whereClause: Record<string, unknown> = {};

  if (search) {
    whereClause.OR = [
      { code: { contains: search, mode: "insensitive" } },
      { room: { number: { contains: search, mode: "insensitive" } } },
      { primaryGuest: { firstName: { contains: search, mode: "insensitive" } } },
      { primaryGuest: { lastName: { contains: search, mode: "insensitive" } } },
      {
        primaryGuest: {
          documentNumber: { contains: search, mode: "insensitive" },
        },
      },
    ];
  }

  if (viewFilter === "today") {
    whereClause.status = "ACTIVE";
    whereClause.expectedCheckOut = { gte: startOfToday, lte: endOfToday };
  } else if (viewFilter === "overdue") {
    whereClause.status = "ACTIVE";
    whereClause.expectedCheckOut = { lt: now };
  } else if (viewFilter === "completed") {
    whereClause.status = "COMPLETED";
  } else {
    whereClause.status = "ACTIVE";
  }

  const [
    staysFromDb,
    totalItems,
    activeStaysForTotals,
    departuresTodayCount,
    overdueCount,
    openCashShift,
  ] = await Promise.all([
    prisma.stay.findMany({
      where: whereClause,
      include: {
        room: { include: { roomType: true, floor: true } },
        primaryGuest: true,
        booking: { select: { code: true } },
        _count: { select: { additionalGuests: true, extraCharges: true } },
      },
      take: limit,
      skip,
      orderBy:
        viewFilter === "completed"
          ? { actualCheckOut: "desc" }
          : { expectedCheckOut: "asc" },
    }),
    prisma.stay.count({ where: whereClause }),
    prisma.stay.findMany({
      where: { status: "ACTIVE" },
      select: { totalAmount: true, paidAmount: true },
    }),
    prisma.stay.count({
      where: {
        status: "ACTIVE",
        expectedCheckOut: { gte: startOfToday, lte: endOfToday },
      },
    }),
    prisma.stay.count({
      where: {
        status: "ACTIVE",
        expectedCheckOut: { lt: now },
      },
    }),
    prisma.cashShift.findFirst({
      where: { status: "OPEN" },
      select: { id: true },
    }),
  ]);

  const initialStays: SerializedStay[] = staysFromDb.map((s) => {
    const totalAmount = Number(s.totalAmount);
    const paidAmount = Number(s.paidAmount);
    const duration = computeStayDuration(s.checkInAt, s.expectedCheckOut);
    return {
      id: s.id,
      code: s.code,
      roomId: s.roomId,
      roomNumber: s.room.number,
      floorName: s.room.floor.name,
      roomTypeName: s.room.roomType.name,
      primaryGuestId: s.primaryGuestId,
      primaryGuestName: `${s.primaryGuest.firstName} ${s.primaryGuest.lastName}`,
      primaryGuestDocumentType: s.primaryGuest.documentType,
      primaryGuestDocumentNumber: s.primaryGuest.documentNumber,
      primaryGuestPhone: s.primaryGuest.phone,
      bookingId: s.bookingId,
      bookingCode: s.booking?.code ?? null,
      checkInAt: s.checkInAt.toISOString(),
      expectedCheckOut: s.expectedCheckOut.toISOString(),
      actualCheckOut: s.actualCheckOut ? s.actualCheckOut.toISOString() : null,
      status: s.status,
      roomPrice: Number(s.roomPrice),
      totalRoomCost: Number(s.totalRoomCost),
      totalExtraCost: Number(s.totalExtraCost),
      securityDeposit: Number(s.securityDeposit),
      discount: Number(s.discount),
      totalAmount,
      paidAmount,
      pendingBalance: roundMoney(Math.max(0, totalAmount - paidAmount)),
      notes: s.notes,
      additionalGuestsCount: s._count.additionalGuests,
      extraChargesCount: s._count.extraCharges,
      nights: duration.nights,
      isHourly: duration.isHourly,
      durationHours: duration.durationHours,
      createdAt: s.createdAt.toISOString(),
    };
  });

  const pendingBalanceTotal = roundMoney(
    activeStaysForTotals.reduce(
      (sum, s) =>
        sum + Math.max(0, Number(s.totalAmount) - Number(s.paidAmount)),
      0,
    ),
  );

  const totalPages = Math.ceil(totalItems / limit) || 1;

  return (
    <CheckOutManagement
      initialStays={initialStays}
      hasOpenCashShift={Boolean(openCashShift)}
      stats={{
        departuresToday: departuresTodayCount,
        overdueDepartures: overdueCount,
        activeStays: activeStaysForTotals.length,
        pendingBalanceTotal,
      }}
      totalItems={totalItems}
      totalPages={totalPages}
      currentPage={page}
      itemsPerPage={limit}
      search={search}
      viewFilter={viewFilter}
      permissions={permissions}
      userRole={session?.user?.role}
    />
  );
}
