"use client";
import { useState, FormEvent, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Typography, Spin } from "antd";
import { EyeInvisibleOutlined, EyeOutlined, LoadingOutlined, RocketOutlined, SafetyOutlined, ThunderboltOutlined } from "@ant-design/icons";
import { showToast } from "@/components/Toast";
import { GlassCard } from "@/components/ui/GlassCard";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { dt } from "@/lib/design-tokens";
import { getValidToken } from "@/lib/auth";
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
    if (getValidToken()) {
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
      // Usar la función de la API que maneja correctamente los errores
      const { loginUser, checkAuthMe } = await import('@/lib/api');
      
      const data = await loginUser(email, password);

      // Guardar token en localStorage
      localStorage.setItem('access_token', data.access_token);

      // Disparar evento para que el WorkspaceContext cargue los datos
      window.dispatchEvent(new Event('loginSuccess'));

      // Obtener información del usuario
      try {
        const userData = await checkAuthMe();
        const firstName = userData.full_name?.split(' ')[0] || userData.email.split('@')[0];
        showToast(`¡Bienvenido ${firstName}!`, "welcome");
      } catch {
        showToast("¡Bienvenido!", "welcome");
      }

      // Redirigir al dashboard
      setTimeout(() => {
        router.push('/');
      }, 800);

    } catch (error: any) {
      console.error('Error en login:', error);
      
      // MOCK AUTH: Try mock authentication as fallback (remove these lines to disable)
      const mockResult = getMockToken(email, password);
      if (mockResult) {
        localStorage.setItem('access_token', mockResult.access_token);
        window.dispatchEvent(new Event('loginSuccess'));
        showToast(`¡Bienvenido ${mockResult.full_name}! (Datos Mock)`, "welcome");
        setTimeout(() => router.push('/'), 800);
        return;
      }

      // Extraer mensaje de error más específico
      let errorMessage = "Error al iniciar sesión";
      
      if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      showToast(errorMessage, "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      className="bg-gradient-animated"
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: dt.spacing.md,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Partículas de fondo decorativas */}
      <div style={{ position: 'absolute', top: '10%', left: '10%', width: '4px', height: '4px' }} className="particle" />
      <div style={{ position: 'absolute', top: '20%', right: '15%', width: '3px', height: '3px', animationDelay: '2s' }} className="particle" />
      <div style={{ position: 'absolute', bottom: '30%', left: '20%', width: '5px', height: '5px', animationDelay: '4s' }} className="particle" />
      <div style={{ position: 'absolute', bottom: '15%', right: '10%', width: '3px', height: '3px', animationDelay: '6s' }} className="particle" />
      
      {/* Gradiente radial de acento */}
      <div className="bg-radial-glow" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: '480px', position: 'relative', zIndex: 1 }}>
        {/* Logo y título */}
        <div style={{ textAlign: 'center', marginBottom: dt.spacing.xl }} className="animate-fade-in-up">
          <div 
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '80px',
              height: '80px',
              background: 'linear-gradient(135deg, #E31837 0%, #FF6B00 100%)',
              borderRadius: '20px',
              marginBottom: dt.spacing.lg,
              boxShadow: '0 8px 32px rgba(227, 24, 55, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)',
              position: 'relative',
            }}
            className="hover-lift"
          >
            <RocketOutlined style={{ fontSize: '40px', color: '#FFFFFF' }} />
            <div style={{ 
              position: 'absolute', 
              inset: '-2px', 
              background: 'linear-gradient(135deg, #E31837, #FF6B00)',
              borderRadius: '20px',
              opacity: 0.3,
              filter: 'blur(10px)',
              zIndex: -1,
            }} />
          </div>
          
          <Title 
            level={1} 
            className="text-gradient-animated"
            style={{ 
              margin: `0 0 ${dt.spacing.sm} 0`,
              fontSize: '36px',
              fontWeight: 800,
              letterSpacing: '-0.5px',
            }}
          >
            Tivit AI
          </Title>
          
          <Text style={{ color: dt.colors.dark.textSubtle, fontSize: '16px', display: 'block', marginBottom: dt.spacing.md }}>
            Gestor Inteligente de Propuestas
          </Text>

          {/* Características destacadas */}
          <div style={{ 
            display: 'flex', 
            gap: dt.spacing.md, 
            justifyContent: 'center',
            marginTop: dt.spacing.lg,
          }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px',
              padding: '8px 16px',
              background: 'rgba(227, 24, 55, 0.1)',
              borderRadius: '20px',
              border: '1px solid rgba(227, 24, 55, 0.2)',
            }}>
              <ThunderboltOutlined style={{ color: '#E31837' }} />
              <Text style={{ color: dt.colors.dark.textSubtle, fontSize: '12px' }}>Rápido</Text>
            </div>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px',
              padding: '8px 16px',
              background: 'rgba(59, 130, 246, 0.1)',
              borderRadius: '20px',
              border: '1px solid rgba(59, 130, 246, 0.2)',
            }}>
              <SafetyOutlined style={{ color: '#3B82F6' }} />
              <Text style={{ color: dt.colors.dark.textSubtle, fontSize: '12px' }}>Seguro</Text>
            </div>
          </div>
        </div>

        {/* Formulario de login con glassmorphism mejorado */}
        <div
          className="glass-card hover-lift"
          style={{
            padding: '40px',
            borderRadius: '24px',
          }}
        >
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Email */}
            <div className="transition-smooth">
              <Text style={{ 
                color: dt.colors.dark.text, 
                display: 'block', 
                marginBottom: dt.spacing.sm,
                fontSize: '14px',
                fontWeight: 600,
              }}>
                Correo Electrónico
              </Text>
              <Input
                type="email"
                placeholder="tu@empresa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                required
                className="input-enhanced transition-smooth"
                style={{
                  background: 'rgba(26, 26, 28, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  padding: '14px 18px',
                  color: dt.colors.dark.text,
                  fontSize: '15px',
                  backdropFilter: 'blur(10px)',
                }}
              />
            </div>

            {/* Password */}
            <div className="transition-smooth">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: dt.spacing.sm }}>
                <Text style={{ 
                  color: dt.colors.dark.text,
                  fontSize: '14px',
                  fontWeight: 600,
                }}>
                  Contraseña
                </Text>
                <Text style={{ 
                  color: '#3B82F6', 
                  fontSize: '12px',
                  cursor: 'pointer',
                  transition: 'color 0.2s',
                }}
                  onMouseEnter={(e) => e.currentTarget.style.color = '#60A5FA'}
                  onMouseLeave={(e) => e.currentTarget.style.color = '#3B82F6'}
                >
                  ¿Olvidaste tu contraseña?
                </Text>
              </div>
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                required
                className="input-enhanced transition-smooth"
                suffix={
                  <span 
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ 
                      cursor: 'pointer', 
                      color: dt.colors.dark.textSubtle,
                      transition: 'color 0.2s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#E31837'}
                    onMouseLeave={(e) => e.currentTarget.style.color = dt.colors.dark.textSubtle}
                  >
                    {showPassword ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                  </span>
                }
                style={{
                  background: 'rgba(26, 26, 28, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  padding: '14px 18px',
                  color: dt.colors.dark.text,
                  fontSize: '15px',
                  backdropFilter: 'blur(10px)',
                }}
              />
            </div>

            {/* Botón de login con gradiente y efecto hover */}
            <Button
              type="primary"
              htmlType="submit"
              disabled={isLoading}
              className="hover-shine transition-smooth"
              style={{
                width: '100%',
                height: '56px',
                background: 'linear-gradient(135deg, #E31837 0%, #C41530 100%)',
                border: 'none',
                borderRadius: '14px',
                fontWeight: 700,
                fontSize: '16px',
                marginTop: '8px',
                boxShadow: '0 4px 20px rgba(227, 24, 55, 0.3)',
                cursor: isLoading ? 'not-allowed' : 'pointer',
              }}
            >
              {isLoading ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                  <Spin indicator={<LoadingOutlined style={{ fontSize: 18, color: '#FFFFFF' }} spin />} />
                  Iniciando sesión...
                </span>
              ) : (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <RocketOutlined style={{ fontSize: '18px' }} />
                  Iniciar Sesión
                </span>
              )}
            </Button>
          </form>

          {/* Divider */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '16px', 
            margin: '32px 0 24px 0' 
          }}>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255, 255, 255, 0.1)' }} />
            <Text style={{ color: dt.colors.dark.textSubtle, fontSize: '12px' }}>o</Text>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255, 255, 255, 0.1)' }} />
          </div>

          {/* Link a registro */}
          <div style={{ textAlign: 'center' }}>
            <Text style={{ color: dt.colors.dark.textSubtle }}>
              ¿No tienes una cuenta?{' '}
              <span
                onClick={() => router.push('/register')}
                className="transition-smooth"
                style={{ 
                  color: '#3B82F6', 
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#60A5FA';
                  e.currentTarget.style.textDecoration = 'underline';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#3B82F6';
                  e.currentTarget.style.textDecoration = 'none';
                }}
              >
                Regístrate gratis
              </span>
            </Text>
          </div>
        </div>

        {/* Footer mejorado */}
        <div style={{ marginTop: '32px', textAlign: 'center' }} className="animate-fade-in-up">
          <Text style={{ 
            color: '#6B7280', 
            fontSize: '13px',
            display: 'block',
            marginBottom: '12px',
          }}>
            Al iniciar sesión, aceptas nuestros{' '}
            <span style={{ color: '#3B82F6', cursor: 'pointer' }}>términos y condiciones</span>
          </Text>
          <Text style={{ color: '#4B5563', fontSize: '12px' }}>
            © 2025 Tivit AI. Todos los derechos reservados.
          </Text>
        </div>
      </div>
    </div>
  );
}
