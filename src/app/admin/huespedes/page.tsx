import Guests from "@/components/guests";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { hasPermission } from "@/utils/permissions.utils";
import { SerializedGuest, DocumentType } from "@/types/guests";

interface HuespedesPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function HuespedesPage(props: HuespedesPageProps) {
  const session = await auth();
  const permissions = session?.user?.permissions ?? [];

  // Validar permisos de acceso al módulo (granular o maestro)
  if (
    !hasPermission(
      permissions,
      ["guests:read", "guests:manage"],
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
  const docTypeFilter =
    typeof searchParams.docType === "string" ? searchParams.docType : "all";

  const limit = 10;
  const skip = (page - 1) * limit;

  // Cláusula de filtros
  const whereClause: any = {};

  if (search) {
    whereClause.OR = [
      { firstName: { contains: search, mode: "insensitive" } },
      { lastName: { contains: search, mode: "insensitive" } },
      { documentNumber: { contains: search, mode: "insensitive" } },
      { phone: { contains: search, mode: "insensitive" } },
      { businessName: { contains: search, mode: "insensitive" } },
    ];
  }

  if (docTypeFilter !== "all") {
    whereClause.documentType = docTypeFilter as DocumentType;
  }

  if (statusFilter === "active") {
    whereClause.deletedAt = null;
  } else if (statusFilter === "inactive") {
    whereClause.deletedAt = { not: null };
  }

  const [guestsFromDb, totalItems, overallCount] = await Promise.all([
    prisma.guest.findMany({
      where: whereClause,
      include: {
        _count: {
          select: {
            staysAsPrimary: true,
            bookings: true,
          },
        },
      },
      take: limit,
      skip: skip,
      orderBy: { createdAt: "desc" },
    }),
    prisma.guest.count({
      where: whereClause,
    }),
    prisma.guest.count(),
  ]);

  const initialGuests: SerializedGuest[] = guestsFromDb.map((g) => ({
    id: g.id,
    documentType: g.documentType as DocumentType,
    documentNumber: g.documentNumber,
    firstName: g.firstName,
    lastName: g.lastName,
    fullName: `${g.firstName} ${g.lastName}`,
    email: g.email,
    phone: g.phone,
    nationality: g.nationality,
    originCity: g.originCity,
    businessName: g.businessName,
    fiscalAddress: g.fiscalAddress,
    notes: g.notes,
    isActive: g.deletedAt === null,
    createdAt: g.createdAt.toISOString(),
    updatedAt: g.updatedAt.toISOString(),
    deletedAt: g.deletedAt ? g.deletedAt.toISOString() : null,
    totalStays: g._count.staysAsPrimary,
    totalBookings: g._count.bookings,
  }));

  const totalPages = Math.ceil(totalItems / limit) || 1;

  return (
    <Guests
      initialGuests={initialGuests}
      overallCount={overallCount}
      totalItems={totalItems}
      totalPages={totalPages}
      currentPage={page}
      itemsPerPage={limit}
      search={search}
      docTypeFilter={docTypeFilter}
      statusFilter={statusFilter}
      permissions={permissions}
      userRole={session?.user?.role}
    />
  );
}
