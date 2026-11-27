import Bookings from "@/components/bookings";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { hasPermission } from "@/utils/permissions.utils";
import type {
  BookingOrigin,
  BookingStatus,
  SerializedBooking,
  SerializedBookingGuestOption,
  SerializedBookingRoomOption,
} from "@/types/bookings";

interface ReservasPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function computeStayDuration(checkIn: Date, checkOut: Date) {
  const diffMs = Math.max(0, checkOut.getTime() - checkIn.getTime());
  const durationHours = Math.max(1, Math.round(diffMs / (1000 * 60 * 60)));
  const isSameDayNightly =
    checkIn.getHours() === 14 &&
    checkOut.getHours() === 23 &&
    checkOut.getMinutes() === 59;
  const isHourly = durationHours < 20 && !isSameDayNightly;
  const nights = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  return { nights, isHourly, durationHours };
}

export default async function ReservasPage(props: ReservasPageProps) {
  const session = await auth();
  const permissions = session?.user?.permissions ?? [];

  if (
    !hasPermission(
      permissions,
      ["bookings:read", "bookings:manage"],
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
  const originFilter =
    typeof searchParams.origin === "string" ? searchParams.origin : "all";

  const limit = 10;
  const skip = (page - 1) * limit;

  const whereClause: Record<string, unknown> = {};

  if (search) {
    whereClause.OR = [
      { code: { contains: search, mode: "insensitive" } },
      { room: { number: { contains: search, mode: "insensitive" } } },
      { guest: { firstName: { contains: search, mode: "insensitive" } } },
      { guest: { lastName: { contains: search, mode: "insensitive" } } },
      { guest: { documentNumber: { contains: search, mode: "insensitive" } } },
    ];
  }

  const validStatuses: BookingStatus[] = [
    "PENDING",
    "CONFIRMED",
    "CHECKED_IN",
    "CANCELLED",
    "NO_SHOW",
  ];
  if (validStatuses.includes(statusFilter as BookingStatus)) {
    whereClause.status = statusFilter;
  }

  if (originFilter === "RECEPTION" || originFilter === "WEB") {
    whereClause.origin = originFilter as BookingOrigin;
  }

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  const [
    bookingsFromDb,
    totalItems,
    overallCount,
    pendingCount,
    confirmedCount,
    arrivalsTodayCount,
    roomsDb,
    guestsDb,
    openCashShift,
  ] = await Promise.all([
    prisma.booking.findMany({
      where: whereClause,
      include: {
        room: { include: { roomType: true, floor: true } },
        guest: true,
        _count: { select: { payments: true } },
      },
      take: limit,
      skip,
      orderBy: { createdAt: "desc" },
    }),
    prisma.booking.count({ where: whereClause }),
    prisma.booking.count(),
    prisma.booking.count({ where: { status: "PENDING" } }),
    prisma.booking.count({ where: { status: "CONFIRMED" } }),
    prisma.booking.count({
      where: {
        status: { in: ["PENDING", "CONFIRMED"] },
        checkInDate: { gte: startOfToday, lte: endOfToday },
      },
    }),
    prisma.room.findMany({
      where: { deletedAt: null, status: { not: "MAINTENANCE" } },
      include: { roomType: true, floor: true },
      orderBy: [{ floor: { number: "asc" } }, { number: "asc" }],
    }),
    prisma.guest.findMany({
      where: { deletedAt: null },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
    prisma.cashShift.findFirst({
      where: { status: "OPEN" },
      select: { id: true },
    }),
  ]);

  const initialBookings: SerializedBooking[] = bookingsFromDb.map((b) => {
    const totalPrice = Number(b.totalPrice);
    const depositPaid = Number(b.depositPaid);
    const duration = computeStayDuration(b.checkInDate, b.checkOutDate);
    return {
      id: b.id,
      code: b.code,
      origin: b.origin,
      roomId: b.roomId,
      roomNumber: b.room.number,
      floorName: b.room.floor.name,
      roomTypeName: b.room.roomType.name,
      roomBasePrice: Number(b.room.roomType.basePrice),
      roomHourlyPrice: b.room.roomType.hourlyPrice
        ? Number(b.room.roomType.hourlyPrice)
        : null,
      roomMaxGuests: b.room.roomType.maxGuests,
      guestId: b.guestId,
      guestFullName: `${b.guest.firstName} ${b.guest.lastName}`,
      guestDocumentType: b.guest.documentType,
      guestDocumentNumber: b.guest.documentNumber,
      guestPhone: b.guest.phone,
      checkInDate: b.checkInDate.toISOString(),
      checkOutDate: b.checkOutDate.toISOString(),
      nights: duration.nights,
      isHourly: duration.isHourly,
      durationHours: duration.durationHours,
      numberOfGuests: b.numberOfGuests,
      status: b.status,
      totalPrice,
      depositPaid,
      pendingBalance: roundMoney(Math.max(0, totalPrice - depositPaid)),
      paymentProofUrl: b.paymentProofUrl,
      clientNotes: b.clientNotes,
      receptionNotes: b.receptionNotes,
      createdAt: b.createdAt.toISOString(),
      updatedAt: b.updatedAt.toISOString(),
      paymentsCount: b._count.payments,
    };
  });

  const rooms: SerializedBookingRoomOption[] = roomsDb.map((r) => ({
    id: r.id,
    number: r.number,
    floorName: r.floor.name,
    roomTypeName: r.roomType.name,
    basePrice: Number(r.roomType.basePrice),
    hourlyPrice: r.roomType.hourlyPrice ? Number(r.roomType.hourlyPrice) : null,
    maxGuests: r.roomType.maxGuests,
    status: r.status,
  }));

  const guests: SerializedBookingGuestOption[] = guestsDb.map((g) => ({
    id: g.id,
    fullName: `${g.firstName} ${g.lastName}`,
    documentType: g.documentType,
    documentNumber: g.documentNumber,
    phone: g.phone,
    businessName: g.businessName,
  }));

  const totalPages = Math.ceil(totalItems / limit) || 1;

  return (
    <Bookings
      initialBookings={initialBookings}
      rooms={rooms}
      guests={guests}
      hasOpenCashShift={Boolean(openCashShift)}
      stats={{
        pending: pendingCount,
        confirmed: confirmedCount,
        arrivalsToday: arrivalsTodayCount,
        overall: overallCount,
      }}
      totalItems={totalItems}
      totalPages={totalPages}
      currentPage={page}
      itemsPerPage={limit}
      search={search}
      statusFilter={statusFilter}
      originFilter={originFilter}
      permissions={permissions}
      userRole={session?.user?.role}
    />
  );
}
