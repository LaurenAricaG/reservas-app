import Floors from "@/components/floors";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { hasPermission } from "@/utils/permissions.utils";
import { SerializedFloor } from "@/types/floors";

interface PisosPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function PisosPage(props: PisosPageProps) {
  const session = await auth();
  const permissions = session?.user?.permissions ?? [];

  // Validar permisos de acceso al módulo (granular o maestro)
  if (
    !hasPermission(
      permissions,
      ["floors:read", "floors:manage", "rooms:read", "rooms:manage"],
      session?.user?.role,
    )
  ) {
    redirect("/admin");
  }

  const searchParams = await props.searchParams;
  const page = Number(searchParams.page) || 1;
  const search =
    typeof searchParams.search === "string" ? searchParams.search.trim() : "";
  const status =
    typeof searchParams.status === "string" ? searchParams.status : "all";

  const limit = 10;
  const skip = (page - 1) * limit;

  // Construir cláusula de búsqueda
  const isSearchNumeric = search !== "" && !isNaN(Number(search));

  const whereClause: any = {};

  if (search) {
    if (isSearchNumeric) {
      whereClause.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { number: Number(search) },
      ];
    } else {
      whereClause.name = { contains: search, mode: "insensitive" };
    }
  }

  // Filtrado por estado: active (deletedAt === null), inactive (deletedAt !== null), all (sin filtro)
  if (status === "active") {
    whereClause.deletedAt = null;
  } else if (status === "inactive") {
    whereClause.deletedAt = { not: null };
  }

  const [floorsFromDb, totalItems, overallCount] = await Promise.all([
    prisma.floor.findMany({
      where: whereClause,
      include: {
        rooms: {
          where: { deletedAt: null },
          select: {
            id: true,
            status: true,
          },
        },
      },
      take: limit,
      skip: skip,
      orderBy: { number: "asc" },
    }),
    prisma.floor.count({
      where: whereClause,
    }),
    prisma.floor.count(),
  ]);

  // Serializar datos para el Client Component
  const initialFloors: SerializedFloor[] = floorsFromDb.map((f) => {
    const activeRooms = f.rooms;
    return {
      id: f.id,
      number: f.number,
      name: f.name,
      isActive: f.deletedAt === null,
      createdAt: f.createdAt.toISOString(),
      updatedAt: f.updatedAt.toISOString(),
      deletedAt: f.deletedAt ? f.deletedAt.toISOString() : null,
      totalRooms: activeRooms.length,
      availableRooms: activeRooms.filter((r) => r.status === "AVAILABLE").length,
      occupiedRooms: activeRooms.filter((r) => r.status === "OCCUPIED").length,
      maintenanceRooms: activeRooms.filter((r) => r.status === "MAINTENANCE").length,
      cleaningRooms: activeRooms.filter((r) => r.status === "CLEANING").length,
      reservedRooms: activeRooms.filter((r) => r.status === "RESERVED").length,
    };
  });

  const totalPages = Math.ceil(totalItems / limit) || 1;

  return (
    <Floors
      initialFloors={initialFloors}
      overallCount={overallCount}
      totalItems={totalItems}
      totalPages={totalPages}
      currentPage={page}
      itemsPerPage={limit}
      search={search}
      statusFilter={status}
      permissions={permissions}
      userRole={session?.user?.role}
    />
  );
}
