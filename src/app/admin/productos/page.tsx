import Products from "@/components/products";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { hasPermission } from "@/utils/permissions.utils";
import { SerializedProduct, SerializedCategoryOption } from "@/types/products";

interface ProductosPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ProductosPage(props: ProductosPageProps) {
  const session = await auth();
  const permissions = session?.user?.permissions ?? [];

  // Validar permisos de acceso al módulo (granular o maestro)
  if (
    !hasPermission(
      permissions,
      ["products:read", "products:manage"],
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
  const categoryFilter =
    typeof searchParams.category === "string" ? searchParams.category : "all";

  const limit = 10;
  const skip = (page - 1) * limit;

  // Cláusula de filtros
  const whereClause: any = {};

  if (search) {
    whereClause.name = { contains: search, mode: "insensitive" };
  }

  if (categoryFilter !== "all" && !isNaN(Number(categoryFilter))) {
    whereClause.categoryId = Number(categoryFilter);
  }

  if (statusFilter === "active") {
    whereClause.isActive = true;
    whereClause.deletedAt = null;
  } else if (statusFilter === "inactive") {
    whereClause.OR = [
      { isActive: false },
      { deletedAt: { not: null } },
    ];
  }

  const [productsFromDb, categoriesFromDb, totalItems, overallCount] =
    await Promise.all([
      prisma.product.findMany({
        where: whereClause,
        include: {
          category: {
            select: { id: true, name: true },
          },
        },
        take: limit,
        skip: skip,
        orderBy: { name: "asc" },
      }),
      prisma.category.findMany({
        where: { deletedAt: null },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      prisma.product.count({
        where: whereClause,
      }),
      prisma.product.count(),
    ]);

  const initialProducts: SerializedProduct[] = productsFromDb.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    categoryId: p.categoryId,
    categoryName: p.category.name,
    price: Number(p.price),
    stock: p.stock,
    isActive: p.isActive && p.deletedAt === null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    deletedAt: p.deletedAt ? p.deletedAt.toISOString() : null,
  }));

  const categories: SerializedCategoryOption[] = categoriesFromDb.map((c) => ({
    id: c.id,
    name: c.name,
  }));

  const totalPages = Math.ceil(totalItems / limit) || 1;

  return (
    <Products
      initialProducts={initialProducts}
      categories={categories}
      overallCount={overallCount}
      totalItems={totalItems}
      totalPages={totalPages}
      currentPage={page}
      itemsPerPage={limit}
      search={search}
      categoryFilter={categoryFilter}
      statusFilter={statusFilter}
      permissions={permissions}
      userRole={session?.user?.role}
    />
  );
}
