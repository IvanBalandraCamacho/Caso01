"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AlertCircle, Loader2 } from "lucide-react";

interface Props {
  onLogin?: () => void;
}

export function Login({ onLogin }: Props) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  const doLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!username.trim() || !password.trim()) {
      setError("Usuario y contraseña son requeridos");
      return;
    }

    setLoading(true);
    try {
      const form = new URLSearchParams();
      form.append("username", username);
      form.append("password", password);

      const resp = await fetch(`${API_URL}/api/v1/auth/token`, {
        method: "POST",
        body: form,
      });

      if (resp.ok) {
        const j = await resp.json();
        if (j.access_token) {
          localStorage.setItem("access_token", j.access_token);
          if (onLogin) onLogin();
          window.location.href = "/";
        }
      } else {
        setError("Usuario o contraseña incorrectos");
      }
    } catch (err) {
      console.error("Login error", err);
      setError("Error al conectar con el servidor. Intenta más tarde.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-white via-slate-50 to-slate-100 p-4">
      <div className="w-full max-w-md">
        {/* Card Container */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header with TIVIT Red */}
          <div className="bg-[hsl(var(--primary))] px-6 py-8 text-white">
            <h1 className="text-3xl font-bold mb-2">Velvet AI</h1>
            <p className="text-white/90 text-sm">Sistema RAG Empresarial - TIVIT</p>
          </div>

          {/* Content */}
          <div className="px-6 py-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Bienvenido</h2>
            <p className="text-sm text-gray-600 mb-6">Inicia sesión para acceder al sistema</p>

            {/* Error Alert */}
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={doLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Usuario
                </label>
                <Input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="ejemplo@usuario.com"
                  disabled={loading}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Contraseña
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    disabled={loading}
                    className="w-full pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 text-sm"
                  >
                    {showPassword ? "Ocultar" : "Mostrar"}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-[hsl(var(--primary))] hover:bg-[hsl(0_85%_45%)] text-white font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Iniciando sesión...
                  </>
                ) : (
                  "Iniciar Sesión"
                )}
              </Button>
            </form>

            {/* Footer Info */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-xs text-gray-500 text-center">
                Credenciales de demo: usuario: <code className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-700">admin</code> / contraseña: <code className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-700">admin</code>
              </p>
            </div>
          </div>
        </div>

        {/* Security Notice */}
        <p className="text-xs text-gray-500 text-center mt-6">
          Plataforma segura de análisis de documentos con IA
        </p>
      </div>
    </div>
  );
}

export default Login;
