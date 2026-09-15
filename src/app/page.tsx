import Link from "next/link";
import { FiArrowRight, FiShield, FiSliders } from "react-icons/fi";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-bg-page flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-xl w-full bg-bg-card border border-border-default rounded-3xl p-8 shadow-xs space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-brand-600 text-white flex items-center justify-center font-black text-2xl mx-auto shadow-sm">
          P
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-black text-text-primary">Hotel Party</h1>
          <p className="text-xs text-text-secondary leading-relaxed">
            Portal web público para huéspedes y sistema de reservas online.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            href="/admin"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-text-on-accent text-xs font-bold rounded-xl shadow-xs transition-colors"
          >
            <FiShield className="w-4 h-4" />
            <span>Entrar al Panel (/admin)</span>
            <FiArrowRight className="w-3.5 h-3.5" />
          </Link>

          <Link
            href="/demo-ui"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-bg-surface hover:bg-brand-50 border border-border-default text-text-primary text-xs font-semibold rounded-xl transition-colors"
          >
            <FiSliders className="w-4 h-4 text-brand-600" />
            <span>Ver Catálogo de Tokens</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
