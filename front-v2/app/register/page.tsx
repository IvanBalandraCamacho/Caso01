"use client";
import { useState, FormEvent, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Typography, Spin } from "antd";
import { EyeInvisibleOutlined, EyeOutlined, LoadingOutlined, ArrowLeftOutlined, UserAddOutlined, SafetyOutlined, ThunderboltOutlined } from "@ant-design/icons";
import { showToast } from "@/components/Toast";
import { dt } from "@/lib/design-tokens";

const { Text, Title } = Typography;

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

    } catch (error: unknown) {
      console.error('Error en registro:', error as Error);
      showToast((error as Error).message || "Error al crear la cuenta", "error");
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

      <div style={{ width: '100%', maxWidth: '520px', position: 'relative', zIndex: 1 }}>
        {/* Botón volver mejorado */}
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => router.push('/login')}
          className="transition-smooth"
          style={{
            color: dt.colors.dark.textSubtle,
            padding: '8px 16px',
            marginBottom: '24px',
            height: 'auto',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
            e.currentTarget.style.color = '#E31837';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = dt.colors.dark.textSubtle;
          }}
        >
          Volver al login
        </Button>

        {/* Logo y título */}
        <div style={{ textAlign: 'center', marginBottom: dt.spacing.xl }} className="animate-fade-in-up">
          <div 
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '80px',
              height: '80px',
              background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
              borderRadius: '20px',
              marginBottom: dt.spacing.lg,
              boxShadow: '0 8px 32px rgba(16, 185, 129, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)',
              position: 'relative',
            }}
            className="hover-lift"
          >
            <UserAddOutlined style={{ fontSize: '40px', color: '#FFFFFF' }} />
            <div style={{ 
              position: 'absolute', 
              inset: '-2px', 
              background: 'linear-gradient(135deg, #10B981, #059669)',
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
            Crear Cuenta
          </Title>
          
          <Text style={{ color: dt.colors.dark.textSubtle, fontSize: '16px', display: 'block', marginBottom: dt.spacing.md }}>
            Únete a la plataforma de análisis de RFPs
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
              background: 'rgba(16, 185, 129, 0.1)',
              borderRadius: '20px',
              border: '1px solid rgba(16, 185, 129, 0.2)',
            }}>
              <ThunderboltOutlined style={{ color: '#10B981' }} />
              <Text style={{ color: dt.colors.dark.textSubtle, fontSize: '12px' }}>Gratis</Text>
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
              <Text style={{ color: dt.colors.dark.textSubtle, fontSize: '12px' }}>Sin tarjeta</Text>
            </div>
          </div>
        </div>

        {/* Formulario de registro con glassmorphism */}
        <div 
          className="glass-card hover-lift"
          style={{
            padding: '40px',
            borderRadius: '24px',
          }}
        >
          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Nombre completo */}
            <div className="transition-smooth">
              <Text style={{ 
                color: dt.colors.dark.text, 
                display: 'block', 
                marginBottom: dt.spacing.sm,
                fontSize: '14px',
                fontWeight: 600,
              }}>
                Nombre completo
              </Text>
              <Input
                type="text"
                placeholder="Juan Pérez"
                value={formData.full_name}
                onChange={(e) => handleChange('full_name', e.target.value)}
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

            {/* Email */}
            <div className="transition-smooth">
              <Text style={{ 
                color: dt.colors.dark.text, 
                display: 'block', 
                marginBottom: dt.spacing.sm,
                fontSize: '14px',
                fontWeight: 600,
              }}>
                Email corporativo
              </Text>
              <Input
                type="email"
                placeholder="tu@empresa.com"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
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
              <Text style={{ 
                color: dt.colors.dark.text, 
                display: 'block', 
                marginBottom: dt.spacing.sm,
                fontSize: '14px',
                fontWeight: 600,
              }}>
                Contraseña
              </Text>
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Mínimo 8 caracteres"
                value={formData.password}
                onChange={(e) => handleChange('password', e.target.value)}
                disabled={isLoading}
                required
                minLength={8}
                className="input-enhanced transition-smooth"
                suffix={
                  <span 
                    onClick={() => setShowPassword(!showPassword)}
                    className="transition-smooth"
                    style={{ 
                      cursor: 'pointer', 
                      color: dt.colors.dark.textSubtle,
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#10B981'}
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

            {/* Confirmar Password */}
            <div className="transition-smooth">
              <Text style={{ 
                color: dt.colors.dark.text, 
                display: 'block', 
                marginBottom: dt.spacing.sm,
                fontSize: '14px',
                fontWeight: 600,
              }}>
                Confirmar contraseña
              </Text>
              <Input
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Repite tu contraseña"
                value={formData.confirmPassword}
                onChange={(e) => handleChange('confirmPassword', e.target.value)}
                disabled={isLoading}
                required
                className="input-enhanced transition-smooth"
                suffix={
                  <span 
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="transition-smooth"
                    style={{ 
                      cursor: 'pointer', 
                      color: dt.colors.dark.textSubtle,
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#10B981'}
                    onMouseLeave={(e) => e.currentTarget.style.color = dt.colors.dark.textSubtle}
                  >
                    {showConfirmPassword ? <EyeInvisibleOutlined /> : <EyeOutlined />}
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

            {/* Botón de registro */}
            <Button
              type="primary"
              htmlType="submit"
              disabled={isLoading}
              className="hover-shine transition-smooth"
              style={{
                width: '100%',
                height: '56px',
                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                border: 'none',
                borderRadius: '14px',
                fontWeight: 700,
                fontSize: '16px',
                marginTop: '8px',
                boxShadow: '0 4px 20px rgba(16, 185, 129, 0.3)',
              }}
            >
              {isLoading ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                  <Spin indicator={<LoadingOutlined style={{ fontSize: 18, color: '#FFFFFF' }} spin />} />
                  Creando cuenta...
                </span>
              ) : (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <UserAddOutlined style={{ fontSize: '18px' }} />
                  Crear Cuenta Gratis
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

          {/* Link a login */}
          <div style={{ textAlign: 'center' }}>
            <Text style={{ color: dt.colors.dark.textSubtle }}>
              ¿Ya tienes una cuenta?{' '}
              <span
                onClick={() => router.push('/login')}
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
                Inicia sesión
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
            Al crear una cuenta, aceptas nuestros{' '}
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
