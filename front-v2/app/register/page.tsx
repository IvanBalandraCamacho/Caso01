"use client";
import { useState, FormEvent, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Typography, Spin } from "antd";
import { EyeInvisibleOutlined, EyeOutlined, LoadingOutlined, ArrowLeftOutlined } from "@ant-design/icons";
import { showToast } from "@/components/Toast";

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
        {/* Botón volver */}
        <div
          onClick={() => router.push('/login')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: '#9CA3AF',
            cursor: 'pointer',
            marginBottom: '24px',
          }}
        >
          <ArrowLeftOutlined />
          <span style={{ fontSize: '14px' }}>Volver al login</span>
        </div>

        {/* Logo y título */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div 
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '64px',
              height: '64px',
              background: 'linear-gradient(135deg, #3B82F6 0%, #4F46E5 100%)',
              borderRadius: '16px',
              marginBottom: '16px',
            }}
          >
            <span style={{ fontSize: '32px' }}>✨</span>
          </div>
          <Title level={2} style={{ color: '#FFFFFF', margin: '0 0 8px 0' }}>
            Crear una cuenta
          </Title>
          <Text style={{ color: '#9CA3AF' }}>
            Únete al Gestor de Propuestas Inteligente
          </Text>
        </div>

        {/* Formulario de registro */}
        <div 
          style={{
            background: '#1A1A1A',
            borderRadius: '16px',
            padding: '32px',
            border: '1px solid #333333',
          }}
        >
          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Nombre completo */}
            <div>
              <Text style={{ color: '#9CA3AF', display: 'block', marginBottom: '8px' }}>
                Nombre completo
              </Text>
              <Input
                type="text"
                placeholder="Juan Pérez"
                value={formData.full_name}
                onChange={(e) => handleChange('full_name', e.target.value)}
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

            {/* Email */}
            <div>
              <Text style={{ color: '#9CA3AF', display: 'block', marginBottom: '8px' }}>
                Email
              </Text>
              <Input
                type="email"
                placeholder="tu@email.com"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
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
                placeholder="Mínimo 8 caracteres"
                value={formData.password}
                onChange={(e) => handleChange('password', e.target.value)}
                disabled={isLoading}
                required
                minLength={8}
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

            {/* Confirmar Password */}
            <div>
              <Text style={{ color: '#9CA3AF', display: 'block', marginBottom: '8px' }}>
                Confirmar contraseña
              </Text>
              <Input
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Repite tu contraseña"
                value={formData.confirmPassword}
                onChange={(e) => handleChange('confirmPassword', e.target.value)}
                disabled={isLoading}
                required
                suffix={
                  <span 
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={{ cursor: 'pointer', color: '#9CA3AF' }}
                  >
                    {showConfirmPassword ? <EyeInvisibleOutlined /> : <EyeOutlined />}
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

            {/* Botón de registro */}
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
                marginTop: '8px',
              }}
            >
              {isLoading ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <Spin indicator={<LoadingOutlined style={{ fontSize: 16, color: '#FFFFFF' }} spin />} />
                  Creando cuenta...
                </span>
              ) : (
                'Crear Cuenta'
              )}
            </Button>
          </form>

          {/* Link a login */}
          <div style={{ marginTop: '24px', textAlign: 'center' }}>
            <Text style={{ color: '#9CA3AF' }}>
              ¿Ya tienes una cuenta?{' '}
              <span
                onClick={() => router.push('/login')}
                style={{ 
                  color: '#3B82F6', 
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                Inicia sesión
              </span>
            </Text>
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: '32px', textAlign: 'center' }}>
          <Text style={{ color: '#6B7280', fontSize: '12px' }}>
            Al crear una cuenta, aceptas nuestros términos y condiciones
          </Text>
        </div>
      </div>
    </div>
  );
}
