import CheckInManagement from "@/components/stays";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { hasPermission } from "@/utils/permissions.utils";
import type {
  SerializedPendingBookingOption,
  SerializedStay,
  SerializedStayGuestOption,
  SerializedStayProductOption,
  SerializedStayRoomOption,
  StayStatus,
} from "@/types/stays";

interface CheckInPageProps {
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

export default async function CheckInPage(props: CheckInPageProps) {
  const session = await auth();
  const permissions = session?.user?.permissions ?? [];

  if (
    !hasPermission(
      permissions,
      ["stays:read", "stays:checkin", "stays:create", "stays:manage"],
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

  const validStatuses: StayStatus[] = ["ACTIVE", "COMPLETED", "CANCELLED"];
  if (validStatuses.includes(statusFilter as StayStatus)) {
    whereClause.status = statusFilter;
  }

  const [
    staysFromDb,
    totalItems,
    overallCount,
    activeStaysForTotals,
    availableRoomsDb,
    guestsDb,
    productsDb,
    pendingBookingsDb,
    openCashShift,
  ] = await Promise.all([
    prisma.stay.findMany({
      where: whereClause,
      include: {
        room: { include: { roomType: true, floor: true } },
        primaryGuest: true,
        booking: { select: { code: true } },
        _count: {
          select: { additionalGuests: true, extraCharges: true },
        },
      },
      take: limit,
      skip,
      orderBy: [{ status: "asc" }, { checkInAt: "desc" }],
    }),
    prisma.stay.count({ where: whereClause }),
    prisma.stay.count(),
    prisma.stay.findMany({
      where: { status: "ACTIVE" },
      select: { totalAmount: true, paidAmount: true },
    }),
    prisma.room.findMany({
      where: { deletedAt: null, status: { in: ["AVAILABLE", "RESERVED"] } },
      include: { roomType: true, floor: true },
      orderBy: [{ floor: { number: "asc" } }, { number: "asc" }],
    }),
    prisma.guest.findMany({
      where: { deletedAt: null },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
    prisma.product.findMany({
      where: { deletedAt: null, isActive: true },
      include: { category: { select: { name: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.booking.findMany({
      where: { status: { in: ["PENDING", "CONFIRMED"] } },
      include: {
        room: { include: { roomType: true } },
        guest: true,
      },
      orderBy: { checkInDate: "asc" },
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

  const availableRooms: SerializedStayRoomOption[] = availableRoomsDb.map(
    (r) => ({
      id: r.id,
      number: r.number,
      floorName: r.floor.name,
      roomTypeName: r.roomType.name,
      basePrice: Number(r.roomType.basePrice),
      hourlyPrice: r.roomType.hourlyPrice
        ? Number(r.roomType.hourlyPrice)
        : null,
      maxGuests: r.roomType.maxGuests,
      status: r.status,
    }),
  );

  const guests: SerializedStayGuestOption[] = guestsDb.map((g) => ({
    id: g.id,
    fullName: `${g.firstName} ${g.lastName}`,
    documentType: g.documentType,
    documentNumber: g.documentNumber,
    phone: g.phone,
    businessName: g.businessName,
  }));

  const products: SerializedStayProductOption[] = productsDb.map((p) => ({
    id: p.id,
    name: p.name,
    categoryName: p.category.name,
    price: Number(p.price),
    stock: p.stock,
  }));

  const pendingBookings: SerializedPendingBookingOption[] =
    pendingBookingsDb.map((b) => {
      const duration = computeStayDuration(b.checkInDate, b.checkOutDate);
      return {
        id: b.id,
        code: b.code,
        roomId: b.roomId,
        roomNumber: b.room.number,
        roomTypeName: b.room.roomType.name,
        guestId: b.guestId,
        guestFullName: `${b.guest.firstName} ${b.guest.lastName}`,
        checkInDate: b.checkInDate.toISOString(),
        checkOutDate: b.checkOutDate.toISOString(),
        totalPrice: Number(b.totalPrice),
        depositPaid: Number(b.depositPaid),
        numberOfGuests: b.numberOfGuests,
        isHourly: duration.isHourly,
        durationHours: duration.durationHours,
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
    <CheckInManagement
      initialStays={initialStays}
      availableRooms={availableRooms}
      guests={guests}
      products={products}
      pendingBookings={pendingBookings}
      hasOpenCashShift={Boolean(openCashShift)}
      stats={{
        activeStays: activeStaysForTotals.length,
        availableRooms: availableRooms.length,
        pendingBookings: pendingBookings.length,
        pendingBalanceTotal,
        overall: overallCount,
      }}
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
