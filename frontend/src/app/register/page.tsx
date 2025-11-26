"use client";
import { useState, FormEvent, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, Loader2, Sparkles, ArrowLeft } from "lucide-react";
import { showToast } from "@/components/Toast";

export default function RegisterPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    full_name: "",
  });

  // Si ya está logueado, redirigir al dashboard
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      router.push('/');
    }
  }, [router]);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    
    // Validaciones
    if (!formData.email || !formData.password || !formData.full_name) {
      showToast("Por favor, completa todos los campos", "error");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      showToast("Las contraseñas no coinciden", "error");
      return;
    }

    if (formData.password.length < 8) {
      showToast("La contraseña debe tener al menos 8 caracteres", "error");
      return;
    }

    setIsLoading(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1';
      const response = await fetch(`${apiUrl}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          full_name: formData.full_name,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Error al registrarse');
      }

      showToast("¡Cuenta creada exitosamente! Redirigiendo al login...", "success");
      
      // Redirigir al login
      setTimeout(() => {
        router.push('/login');
      }, 1500);

    } catch (error: any) {
      console.error('Error en registro:', error);
      showToast(error.message || "Error al crear la cuenta", "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#000000' }}>
      <div className="w-full max-w-md">
        {/* Botón volver */}
        <button
          onClick={() => router.push('/login')}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6"
          disabled={isLoading}
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm">Volver al login</span>
        </button>

        {/* Logo y título */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl mb-4">
            <Sparkles className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Crear una cuenta
          </h1>
          <p className="text-gray-400">
            Únete al Gestor de Propuestas Inteligente
          </p>
        </div>

        {/* Formulario de registro */}
        <div className="bg-gray-900 rounded-2xl shadow-2xl p-8 border border-gray-800">
          <form onSubmit={handleRegister} className="space-y-5">
            {/* Nombre completo */}
            <div>
              <label htmlFor="full_name" className="block text-sm font-medium text-gray-300 mb-2">
                Nombre completo
              </label>
              <Input
                id="full_name"
                type="text"
                placeholder="Juan Pérez"
                value={formData.full_name}
                onChange={(e) => handleChange('full_name', e.target.value)}
                className="w-full bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 focus:border-blue-500 focus:ring-blue-500"
                disabled={isLoading}
                required
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="tu@email.com"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
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
                  placeholder="Mínimo 8 caracteres"
                  value={formData.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  className="w-full bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 focus:border-blue-500 focus:ring-blue-500 pr-10"
                  disabled={isLoading}
                  required
                  minLength={8}
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

            {/* Confirmar Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">
                Confirmar contraseña
              </label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Repite tu contraseña"
                  value={formData.confirmPassword}
                  onChange={(e) => handleChange('confirmPassword', e.target.value)}
                  className="w-full bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 focus:border-blue-500 focus:ring-blue-500 pr-10"
                  disabled={isLoading}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors"
                  disabled={isLoading}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Botón de registro */}
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-6 rounded-xl transition-all shadow-lg hover:shadow-xl mt-6"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creando cuenta...
                </>
              ) : (
                'Crear Cuenta'
              )}
            </Button>
          </form>

          {/* Link a login */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-400">
              ¿Ya tienes una cuenta?{' '}
              <button
                onClick={() => router.push('/login')}
                className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
                disabled={isLoading}
              >
                Inicia sesión
              </button>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-500">
            Al crear una cuenta, aceptas nuestros términos y condiciones
          </p>
        </div>
      </div>
    </div>
  );
}
