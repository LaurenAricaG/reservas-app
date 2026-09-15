import React from "react";

export const metadata = {
  title: "Demo UI & Tokens - Hotel Party",
  description: "Catálogo de componentes y tokens de diseño",
};

export default function DemoUILayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
