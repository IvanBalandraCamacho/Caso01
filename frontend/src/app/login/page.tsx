"use client";
import { useState, FormEvent, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, Loader2, Sparkles } from "lucide-react";
import { showToast } from "@/components/Toast";

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Si ya está logueado, redirigir al dashboard
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      router.push('/');
    }
  }, [router]);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      showToast("Por favor, completa todos los campos", "error");
      return;
    }

    setIsLoading(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1';
      
      // Crear FormData para OAuth2PasswordRequestForm
      const formData = new URLSearchParams();
      formData.append('username', email); // OAuth2 usa 'username' pero enviamos el email
      formData.append('password', password);

      const response = await fetch(`${apiUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Error al iniciar sesión');
      }

      const data = await response.json();
      
      // Guardar token en localStorage
      localStorage.setItem('access_token', data.access_token);
      
      // Disparar evento para que el WorkspaceContext cargue los datos
      window.dispatchEvent(new Event('loginSuccess'));
      
      // Obtener información del usuario
      const userResponse = await fetch(`${apiUrl}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${data.access_token}`,
        },
      });

      if (userResponse.ok) {
        const userData = await userResponse.json();
        const firstName = userData.full_name?.split(' ')[0] || userData.email.split('@')[0];
        showToast(`¡Bienvenido ${firstName}!`, "welcome");
      } else {
        showToast("¡Bienvenido!", "welcome");
      }
      
      // Redirigir al dashboard
      setTimeout(() => {
        router.push('/');
      }, 800);

    } catch (error: unknown) {
      console.error('Error en login:', error as Error);
      showToast((error as Error).message || "Error al iniciar sesión", "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#000000' }}>
      <div className="w-full max-w-md">
        {/* Logo y título */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl mb-4">
            <Sparkles className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Bienvenido a Tivit
          </h1>
          <p className="text-gray-400">
            Gestor de Propuestas Inteligente
          </p>
        </div>

        {/* Formulario de login */}
        <div className="bg-gray-900 rounded-2xl shadow-2xl p-8 border border-gray-800">
          <form onSubmit={handleLogin} className="space-y-6">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 focus:border-blue-500 focus:ring-blue-500"
                disabled={isLoading}
                required
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                Contraseña
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 focus:border-blue-500 focus:ring-blue-500 pr-10"
                  disabled={isLoading}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors"
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Botón de login */}
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-6 rounded-xl transition-all shadow-lg hover:shadow-xl"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Iniciando sesión...
                </>
              ) : (
                'Iniciar Sesión'
              )}
            </Button>
          </form>

          {/* Link a registro */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-400">
              ¿No tienes una cuenta?{' '}
              <button
                onClick={() => router.push('/register')}
                className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
                disabled={isLoading}
              >
                Regístrate aquí
              </button>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-500">
            Al iniciar sesión, aceptas nuestros términos y condiciones
          </p>
        </div>
      </div>
    </div>
  );
}
