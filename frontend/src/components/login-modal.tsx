"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, LogIn } from "lucide-react";

interface LoginModalProps {
  onLoginSuccess: (token: string) => void;
}

export function LoginModal({ onLoginSuccess }: LoginModalProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // Usar el endpoint proxy de Next.js en lugar de conectar directamente al backend
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem("access_token", data.access_token);
        localStorage.setItem("user_id", data.user_id);
        onLoginSuccess(data.access_token);
      } else if (response.status === 401) {
        setError("Usuario o contraseña incorrectos");
      } else {
        setError("Error al iniciar sesión. Intenta nuevamente.");
      }
    } catch (error) {
      console.error("Login error:", error);
      setError("No se pudo conectar con el servidor. Verifica la conexión.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[hsl(var(--primary))]/10 mb-4">
            <LogIn className="h-6 w-6 text-[hsl(var(--primary))]" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Velvet AI</h1>
          <p className="text-sm text-gray-500 mt-2">Sistema RAG Empresarial</p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          {/* Error Alert */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex gap-2">
              <span className="text-red-600 text-sm">⚠️</span>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Username */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Usuario
            </label>
            <Input
              type="text"
              placeholder="admin"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isLoading}
              className="h-11"
              required
            />
          </div>

          {/* Password */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Contraseña
            </label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className="h-11 pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 disabled:opacity-50"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isLoading || !username.trim() || !password.trim()}
            className="w-full h-11 bg-[hsl(var(--primary))] hover:bg-[hsl(0_85%_45%)] text-white font-medium"
          >
            {isLoading ? (
              <span className="inline-flex items-center gap-2">
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                Iniciando sesión...
              </span>
            ) : (
              <span className="inline-flex items-center gap-2">
                <LogIn className="h-4 w-4" />
                Iniciar sesión
              </span>
            )}
          </Button>
        </form>

        {/* Footer */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-xs text-center text-gray-500">
            Para pruebas usa: <strong>admin</strong> / <strong>admin</strong>
          </p>
        </div>
      </div>
    </div>
  );
}
