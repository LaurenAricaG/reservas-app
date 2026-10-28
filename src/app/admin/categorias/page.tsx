import Categories from "@/components/categories";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

interface CategoriasPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function CategoriasPage(props: CategoriasPageProps) {
  const session = await auth();
  const permissions = session?.user?.permissions ?? [];

  // Validar permiso de lectura
  if (!permissions.includes("categories:read")) {
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

  const [categories, totalItems, overallCount] = await Promise.all([
    prisma.category.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        description: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: { products: true },
        },
      },
      take: limit,
      skip: skip,
      orderBy: { name: "asc" },
    }),
    prisma.category.count({
      where: whereClause,
    }),
    prisma.category.count({
      where: { deletedAt: null },
    }),
  ]);

  const totalPages = Math.ceil(totalItems / limit);

  return (
    <Categories
      initialCategories={JSON.parse(JSON.stringify(categories))}
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
