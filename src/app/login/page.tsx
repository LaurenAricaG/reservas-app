"use client";

import { Suspense } from "react";
import LoginForm from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-slate-50/70 flex flex-col items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-105 space-y-4">
        <Suspense
          fallback={
            <div className="w-full h-100 bg-white border border-slate-200/90 rounded-2xl shadow-xl shadow-slate-900/4 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
            </div>
          }
        >
          <LoginForm />
        </Suspense>

        {/* Nota legal discreta al pie */}
        <p className="text-center text-xs text-slate-400">
          Hotel Party PMS • Acceso restringido a personal autorizado
        </p>
      </div>
    </main>
  );
}
