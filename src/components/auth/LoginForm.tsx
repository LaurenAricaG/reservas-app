"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import { FiUser, FiLock, FiEye, FiEyeOff, FiArrowRight } from "react-icons/fi";
import { Button, Input, Label } from "@/components/ui";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/admin";

  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    if (!usernameOrEmail.trim()) {
      newErrors.usernameOrEmail = "El usuario o correo es obligatorio.";
    }
    if (!password) {
      newErrors.password = "La contraseña es obligatoria.";
    } else if (password.length < 6) {
      newErrors.password = "Debe tener al menos 6 caracteres.";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);

    try {
      const result = await signIn("credentials", {
        usernameOrEmail,
        password,
        redirect: false,
      });

      if (result?.error) {
        toast.error("Credenciales incorrectas", {
          description: "Verifica tu usuario y contraseña ingresados.",
        });
        setLoading(false);
      } else {
        toast.success("Bienvenido al sistema", {
          description: "Redirigiendo al panel de control...",
        });
        router.refresh();
        router.push(callbackUrl);
      }
    } catch {
      toast.error("Error de conexión", {
        description: "No se pudo iniciar sesión. Inténtalo de nuevo.",
      });
      setLoading(false);
    }
  };

  return (
    <div className="w-full bg-white border border-slate-200/90 rounded-2xl shadow-xl shadow-slate-900/4 p-8 sm:p-10 space-y-7">
      {/* Cabecera integrada dentro del Card */}
      <div className="flex flex-col items-center text-center space-y-3">
        <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xl shadow-sm">
          P
        </div>
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Hotel Party
          </h1>
          <p className="text-xs text-slate-500">
            Ingresa tus credenciales para acceder al sistema
          </p>
        </div>
      </div>

      <div className="border-t border-slate-100" />

      {/* Formulario */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Campo: Usuario / Correo */}
        <div className="space-y-1.5">
          <Label
            htmlFor="usernameOrEmail"
            className="text-xs font-semibold text-slate-700"
          >
            Usuario o correo electrónico
          </Label>
          <Input
            id="usernameOrEmail"
            name="usernameOrEmail"
            type="text"
            placeholder="admin o usuario@hotel.com"
            value={usernameOrEmail}
            onChange={(e) => {
              setUsernameOrEmail(e.target.value);
              if (errors.usernameOrEmail) {
                setErrors((prev) => ({ ...prev, usernameOrEmail: "" }));
              }
            }}
            error={errors.usernameOrEmail}
            icon={<FiUser className="w-4 h-4 text-slate-400" />}
            autoComplete="username"
            className="h-11 text-sm bg-white border-slate-200 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 rounded-xl"
          />
        </div>

        {/* Campo: Contraseña */}
        <div className="space-y-1.5">
          <Label
            htmlFor="password"
            className="text-xs font-semibold text-slate-700"
          >
            Contraseña
          </Label>
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••••••"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (errors.password) {
                setErrors((prev) => ({ ...prev, password: "" }));
              }
            }}
            error={errors.password}
            icon={<FiLock className="w-4 h-4 text-slate-400" />}
            autoComplete="current-password"
            className="h-11 text-sm bg-white border-slate-200 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 rounded-xl"
            endIcon={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer focus:outline-none p-1"
                title={showPassword ? "Ocultar" : "Mostrar"}
                tabIndex={-1}
              >
                {showPassword ? (
                  <FiEyeOff className="w-4 h-4" />
                ) : (
                  <FiEye className="w-4 h-4" />
                )}
              </button>
            }
          />
        </div>

        {/* Botón Ingresar */}
        <div className="pt-2">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={loading}
            className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-xl shadow-sm transition-all duration-150 cursor-pointer flex items-center justify-center gap-2"
          >
            <span>Ingresar al sistema</span>
            <FiArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}
