"use client";
import { useState, FormEvent, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Typography, Spin } from "antd";
import { EyeInvisibleOutlined, EyeOutlined, LoadingOutlined } from "@ant-design/icons";
import { showToast } from "@/components/Toast";
// MOCK AUTH: Remove this import and the fallback logic below to disable mock authentication
import { getMockToken } from "@/lib/mockAuth";

const { Text, Title } = Typography;

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
        // MOCK AUTH: Try mock authentication as fallback (remove these 8 lines to disable)
        const mockResult = getMockToken(email, password);
        if (mockResult) {
          const data = mockResult;
          localStorage.setItem('access_token', data.access_token);
          window.dispatchEvent(new Event('loginSuccess'));
          showToast(`¡Bienvenido ${data.full_name}! (Datos Mock)`, "welcome");
          setTimeout(() => router.push('/'), 800);
          return;
        }

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
    <div 
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        backgroundColor: '#000000',
      }}
    >
      <div style={{ width: '100%', maxWidth: '400px' }}>
        {/* Logo y título */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div 
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '64px',
              height: '64px',
              background: 'linear-gradient(135deg, #E53935 0%, #D32F2F 100%)',
              borderRadius: '16px',
              marginBottom: '16px',
            }}
          >
            <span style={{ fontSize: '32px' }}>✨</span>
          </div>
          <Title level={2} style={{ color: '#FFFFFF', margin: '0 0 8px 0' }}>
            Bienvenido a Tivit
          </Title>
          <Text style={{ color: '#9CA3AF' }}>
            Gestor de Propuestas Inteligente
          </Text>
        </div>

        {/* Formulario de login */}
        <div 
          style={{
            background: '#1A1A1A',
            borderRadius: '16px',
            padding: '32px',
            border: '1px solid #333333',
          }}
        >
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Email */}
            <div>
              <Text style={{ color: '#9CA3AF', display: 'block', marginBottom: '8px' }}>
                Email
              </Text>
              <Input
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                required
                style={{
                  background: '#2A2A2D',
                  border: '1px solid #3A3A3D',
                  borderRadius: '8px',
                  padding: '12px 16px',
                  color: '#FFFFFF',
                  fontSize: '14px',
                }}
              />
            </div>

            {/* Password */}
            <div>
              <Text style={{ color: '#9CA3AF', display: 'block', marginBottom: '8px' }}>
                Contraseña
              </Text>
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                required
                suffix={
                  <span 
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ cursor: 'pointer', color: '#9CA3AF' }}
                  >
                    {showPassword ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                  </span>
                }
                style={{
                  background: '#2A2A2D',
                  border: '1px solid #3A3A3D',
                  borderRadius: '8px',
                  padding: '12px 16px',
                  color: '#FFFFFF',
                  fontSize: '14px',
                }}
              />
            </div>

            {/* Botón de login */}
            <Button
              type="primary"
              htmlType="submit"
              disabled={isLoading}
              style={{
                width: '100%',
                height: '48px',
                background: 'linear-gradient(135deg, #3B82F6 0%, #4F46E5 100%)',
                border: 'none',
                borderRadius: '12px',
                fontWeight: 600,
                fontSize: '16px',
              }}
            >
              {isLoading ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <Spin indicator={<LoadingOutlined style={{ fontSize: 16, color: '#FFFFFF' }} spin />} />
                  Iniciando sesión...
                </span>
              ) : (
                'Iniciar Sesión'
              )}
            </Button>
          </form>

          {/* Link a registro */}
          <div style={{ marginTop: '24px', textAlign: 'center' }}>
            <Text style={{ color: '#9CA3AF' }}>
              ¿No tienes una cuenta?{' '}
              <span
                onClick={() => router.push('/register')}
                style={{ 
                  color: '#3B82F6', 
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                Regístrate aquí
              </span>
            </Text>
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: '32px', textAlign: 'center' }}>
          <Text style={{ color: '#6B7280', fontSize: '12px' }}>
            Al iniciar sesión, aceptas nuestros términos y condiciones
          </Text>
        </div>
      </div>
    </div>
  );
}
