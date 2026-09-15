import { cookies } from "next/headers";
import DashboardLayoutClient from "@/components/layout/DashboardLayoutClient";
import ErrorBoundary from "@/components/error/ErrorBoundary";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const initialCollapsed =
    cookieStore.get("sidebar_collapsed")?.value === "true";

  return (
    <ErrorBoundary variant="full" title="Error en el Panel de Administración">
      <DashboardLayoutClient initialCollapsed={initialCollapsed}>
        {children}
      </DashboardLayoutClient>
    </ErrorBoundary>
  );
}
