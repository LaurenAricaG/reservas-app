import Rooms from "@/components/rooms";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { hasPermission } from "@/utils/permissions.utils";
import { RoomStatus } from "@/types/rooms";

interface HabitacionesPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function HabitacionesPage(props: HabitacionesPageProps) {
  const session = await auth();
  const permissions = session?.user?.permissions ?? [];

  // Validar permisos de acceso al módulo (granular o maestro)
  if (
    !hasPermission(
      permissions,
      ["rooms:read", "rooms:manage"],
      session?.user?.role,
    )
  ) {
    redirect("/admin");
  }

  const searchParams = await props.searchParams;
  const page = Number(searchParams.page) || 1;
  const search =
    typeof searchParams.search === "string" ? searchParams.search : "";
  const statusFilter =
    typeof searchParams.status === "string" ? searchParams.status : "all";
  const floorFilter =
    typeof searchParams.floor === "string" ? searchParams.floor : "all";

  const limit = 10;
  const skip = (page - 1) * limit;

  // Filtros de búsqueda
  const whereClause: {
    deletedAt: null;
    number?: { contains: string; mode: "insensitive" };
    status?: RoomStatus;
    floorId?: number;
  } = {
    deletedAt: null,
    ...(search
      ? {
          number: { contains: search, mode: "insensitive" },
        }
      : {}),
  };

  if (statusFilter !== "all") {
    whereClause.status = statusFilter as RoomStatus;
  }

  if (floorFilter !== "all" && !isNaN(Number(floorFilter))) {
    whereClause.floorId = Number(floorFilter);
  }

  const [rooms, floors, roomTypes, totalItems, overallCount] = await Promise.all([
    prisma.room.findMany({
      where: whereClause,
      include: {
        floor: {
          select: { id: true, number: true, name: true },
        },
        roomType: {
          select: { id: true, name: true, basePrice: true, maxGuests: true },
        },
      },
      take: limit,
      skip: skip,
      orderBy: { number: "asc" },
    }),
    prisma.floor.findMany({
      where: { deletedAt: null },
      select: { id: true, number: true, name: true },
      orderBy: { number: "asc" },
    }),
    prisma.roomType.findMany({
      where: { deletedAt: null, isActive: true },
      select: { id: true, name: true, basePrice: true, maxGuests: true },
      orderBy: { name: "asc" },
    }),
    prisma.room.count({
      where: whereClause,
    }),
    prisma.room.count({
      where: { deletedAt: null },
    }),
  ]);

  const totalPages = Math.ceil(totalItems / limit);

  return (
    <Rooms
      initialRooms={JSON.parse(JSON.stringify(rooms))}
      floors={floors}
      roomTypes={JSON.parse(JSON.stringify(roomTypes))}
      overallCount={overallCount}
      totalItems={totalItems}
      totalPages={totalPages}
      currentPage={page}
      itemsPerPage={limit}
      search={search}
      floorFilter={floorFilter}
      statusFilter={statusFilter}
      permissions={permissions}
      userRole={session?.user?.role}
    />
  );
}

