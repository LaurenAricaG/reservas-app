import RoomTypes from "@/components/roomTypes";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

interface RoomTypesPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function RoomTypesPage(props: RoomTypesPageProps) {
  const session = await auth();
  const permissions = session?.user?.permissions ?? [];

  // Validar permisos (rooms:manage o rooms:read)
  if (
    permissions.length > 0 &&
    !permissions.includes("rooms:manage") &&
    !permissions.includes("rooms:read")
  ) {
    redirect("/admin");
  }

  const searchParams = await props.searchParams;
  const page = Number(searchParams.page) || 1;
  const search =
    typeof searchParams.search === "string" ? searchParams.search : "";
  const status =
    typeof searchParams.status === "string" ? searchParams.status : "all";

  const limit = 10;
  const skip = (page - 1) * limit;

  // Filtros de búsqueda y estado
  const whereClause: {
    deletedAt: null;
    name?: { contains: string; mode: "insensitive" };
    isActive?: boolean;
  } = {
    deletedAt: null,
    ...(search
      ? {
          name: { contains: search, mode: "insensitive" },
        }
      : {}),
  };

  if (status === "active") {
    whereClause.isActive = true;
  } else if (status === "inactive") {
    whereClause.isActive = false;
  }

  const [roomTypes, totalItems, overallCount] = await Promise.all([
    prisma.roomType.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        description: true,
        basePrice: true,
        hourlyPrice: true,
        maxGuests: true,
        amenities: true,
        images: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: { rooms: true },
        },
      },
      take: limit,
      skip: skip,
      orderBy: { name: "asc" },
    }),
    prisma.roomType.count({
      where: whereClause,
    }),
    prisma.roomType.count({
      where: { deletedAt: null },
    }),
  ]);

  const totalPages = Math.ceil(totalItems / limit);

  return (
    <RoomTypes
      initialRoomTypes={JSON.parse(JSON.stringify(roomTypes))}
      overallCount={overallCount}
      totalItems={totalItems}
      totalPages={totalPages}
      currentPage={page}
      itemsPerPage={limit}
      search={search}
      status={status}
      permissions={permissions}
    />
  );
}

