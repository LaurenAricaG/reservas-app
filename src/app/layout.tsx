import "../styles/globals.css";
import { Toaster } from "sonner";

export const metadata = {
  title: "Hotel Party - Sistema de Gestión Hotelera",
  description: "Sistema integral de reservas y administración hotelera PMS",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="font-sans antialiased">
        {children}
        <Toaster richColors position="top-right" closeButton />
      </body>
    </html>
  );
}
