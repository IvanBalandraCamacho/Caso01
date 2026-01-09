"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Typography, Avatar, Spin, Modal, Upload, message as antMessage } from "antd";
import { 
  UserOutlined, 
  MailOutlined, 
  LockOutlined,
  EditOutlined,
  SaveOutlined,
  ArrowLeftOutlined,
  CameraOutlined,
  LogoutOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
  TrophyOutlined
} from "@ant-design/icons";
import type { UploadFile } from "antd";
import { showToast } from "@/components/Toast";
import { useUser } from "@/hooks/useUser";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { dt } from "@/lib/design-tokens";

const { Text, Title } = Typography;

export default function ProfilePage() {
  const router = useRouter();
  const { user, isLoading: userLoading } = useUser();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
  });
  const [passwordData, setPasswordData] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/login');
    }
    if (user) {
      setFormData({
        full_name: user.full_name || "",
        email: user.email || "",
      });
    }
  }, [user, userLoading, router]);

  const handleSaveProfile = async () => {
    if (!formData.full_name || !formData.email) {
      showToast("Por favor, completa todos los campos", "error");
      return;
    }

    setIsSaving(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1';
      const token = localStorage.getItem('access_token');

      const response = await fetch(`${apiUrl}/auth/me`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Error al actualizar perfil');
      }

      showToast("Perfil actualizado exitosamente", "success");
      setIsEditing(false);
      window.location.reload(); // Recargar para actualizar el contexto
    } catch (error) {
      console.error('Error:', error);
      showToast("Error al actualizar perfil", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwordData.current_password || !passwordData.new_password || !passwordData.confirm_password) {
      showToast("Por favor, completa todos los campos", "error");
      return;
    }

    if (passwordData.new_password !== passwordData.confirm_password) {
      showToast("Las contraseñas no coinciden", "error");
      return;
    }

    if (passwordData.new_password.length < 8) {
      showToast("La nueva contraseña debe tener al menos 8 caracteres", "error");
      return;
    }

    setIsSaving(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1';
      const token = localStorage.getItem('access_token');

      const response = await fetch(`${apiUrl}/auth/change-password`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          current_password: passwordData.current_password,
          new_password: passwordData.new_password,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Error al cambiar contraseña');
      }

      showToast("Contraseña cambiada exitosamente", "success");
      setShowPasswordModal(false);
      setPasswordData({ current_password: "", new_password: "", confirm_password: "" });
    } catch (error: any) {
      console.error('Error:', error);
      showToast(error.message || "Error al cambiar contraseña", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    router.push('/login');
  };

  const handleUploadPhoto = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      showToast("Por favor selecciona una imagen válida", "error");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast("La imagen no debe superar 5MB", "error");
      return;
    }

    setIsUploadingPhoto(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1';
      const token = localStorage.getItem('access_token');

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${apiUrl}/auth/upload-profile-picture`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Error al subir foto de perfil');
      }

      showToast("Foto de perfil actualizada exitosamente", "success");
      window.location.reload();
    } catch (error) {
      console.error('Error:', error);
      showToast("Error al subir foto de perfil", "error");
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  if (userLoading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1c 100%)',
      }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div 
      className="bg-gradient-animated"
      style={{
        minHeight: '100vh',
        padding: dt.spacing.xl,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <FloatingParticles />
      
      {/* Gradiente radial */}
      <div className="bg-radial-glow" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />

      <div style={{ maxWidth: '1200px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
        {/* Header con botón volver */}
        <div style={{ marginBottom: dt.spacing.xl }}>
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => router.push('/')}
            className="transition-smooth"
            style={{
              color: dt.colors.dark.textSubtle,
              padding: '8px 16px',
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
            Volver al inicio
          </Button>
        </div>

        {/* Grid con perfil y estadísticas */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: dt.spacing.xl,
        }}>
          {/* Tarjeta de perfil */}
          <div 
            className="glass-card"
            style={{
              padding: '40px',
              borderRadius: '24px',
              textAlign: 'center',
            }}
          >
            {/* Avatar */}
            <div style={{ position: 'relative', display: 'inline-block', marginBottom: dt.spacing.xl }}>
              <input
                type="file"
                id="profile-picture-input"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUploadPhoto(file);
                }}
              />
              <Avatar 
                size={120}
                icon={!(user as any)?.profile_picture ? <UserOutlined /> : undefined}
                src={(user as any)?.profile_picture ? `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}${(user as any).profile_picture}` : undefined}
                style={{
                  background: (user as any)?.profile_picture ? 'transparent' : 'linear-gradient(135deg, #E31837 0%, #FF6B00 100%)',
                  fontSize: '48px',
                  cursor: 'pointer',
                }}
                onClick={() => document.getElementById('profile-picture-input')?.click()}
              />
              <div 
                style={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  width: '40px',
                  height: '40px',
                  background: isUploadingPhoto 
                    ? 'linear-gradient(135deg, #6B7280 0%, #4B5563 100%)'
                    : 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: isUploadingPhoto ? 'not-allowed' : 'pointer',
                  border: '3px solid #0a0a0a',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)',
                  pointerEvents: isUploadingPhoto ? 'none' : 'auto',
                }}
                className="hover-lift transition-smooth"
                onClick={() => {
                  if (!isUploadingPhoto) {
                    document.getElementById('profile-picture-input')?.click();
                  }
                }}
              >
                {isUploadingPhoto ? (
                  <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }} />
                ) : (
                  <CameraOutlined style={{ color: '#FFFFFF', fontSize: '18px' }} />
                )}
              </div>
            </div>

            <Title level={3} style={{ color: '#FFFFFF', margin: `0 0 ${dt.spacing.xs} 0` }}>
              {user?.full_name || 'Usuario'}
            </Title>
            <Text style={{ color: dt.colors.dark.textSubtle, display: 'block', marginBottom: dt.spacing.xl }}>
              {user?.email}
            </Text>

            {/* Botones de acción */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: dt.spacing.md }}>
              <Button
                icon={isEditing ? <SaveOutlined /> : <EditOutlined />}
                onClick={() => isEditing ? handleSaveProfile() : setIsEditing(true)}
                loading={isSaving}
                className="hover-shine transition-smooth"
                style={{
                  width: '100%',
                  height: '48px',
                  background: isEditing 
                    ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
                    : 'linear-gradient(135deg, #E31837 0%, #C41530 100%)',
                  border: 'none',
                  borderRadius: '12px',
                  color: '#FFFFFF',
                  fontWeight: 600,
                }}
              >
                {isEditing ? 'Guardar Cambios' : 'Editar Perfil'}
              </Button>

              {isEditing && (
                <Button
                  onClick={() => {
                    setIsEditing(false);
                    setFormData({
                      full_name: user?.full_name || "",
                      email: user?.email || "",
                    });
                  }}
                  className="transition-smooth"
                  style={{
                    width: '100%',
                    height: '48px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    color: dt.colors.dark.text,
                  }}
                >
                  Cancelar
                </Button>
              )}

              <Button
                icon={<LockOutlined />}
                onClick={() => setShowPasswordModal(true)}
                className="transition-smooth"
                style={{
                  width: '100%',
                  height: '48px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  color: dt.colors.dark.text,
                }}
              >
                Cambiar Contraseña
              </Button>

              <Button
                icon={<LogoutOutlined />}
                onClick={handleLogout}
                danger
                className="transition-smooth"
                style={{
                  width: '100%',
                  height: '48px',
                  borderRadius: '12px',
                }}
              >
                Cerrar Sesión
              </Button>
            </div>
          </div>

          {/* Información del perfil */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: dt.spacing.xl }}>
            {/* Formulario */}
            <div 
              className="glass-card"
              style={{
                padding: '40px',
                borderRadius: '24px',
              }}
            >
              <Title level={4} style={{ color: '#FFFFFF', marginBottom: dt.spacing.xl }}>
                Información Personal
              </Title>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* Nombre */}
                <div>
                  <Text style={{ 
                    color: dt.colors.dark.text, 
                    display: 'block', 
                    marginBottom: dt.spacing.sm,
                    fontSize: '14px',
                    fontWeight: 600,
                  }}>
                    <UserOutlined style={{ marginRight: '8px' }} />
                    Nombre completo
                  </Text>
                  <Input
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    disabled={!isEditing}
                    className="input-enhanced"
                    style={{
                      background: isEditing ? 'rgba(26, 26, 28, 0.6)' : 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '12px',
                      padding: '14px 18px',
                      color: dt.colors.dark.text,
                      fontSize: '15px',
                    }}
                  />
                </div>

                {/* Email */}
                <div>
                  <Text style={{ 
                    color: dt.colors.dark.text, 
                    display: 'block', 
                    marginBottom: dt.spacing.sm,
                    fontSize: '14px',
                    fontWeight: 600,
                  }}>
                    <MailOutlined style={{ marginRight: '8px' }} />
                    Email
                  </Text>
                  <Input
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    disabled={!isEditing}
                    className="input-enhanced"
                    style={{
                      background: isEditing ? 'rgba(26, 26, 28, 0.6)' : 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '12px',
                      padding: '14px 18px',
                      color: dt.colors.dark.text,
                      fontSize: '15px',
                    }}
                  />
                </div>

                {/* Fecha de registro */}
                <div>
                  <Text style={{ 
                    color: dt.colors.dark.text, 
                    display: 'block', 
                    marginBottom: dt.spacing.sm,
                    fontSize: '14px',
                    fontWeight: 600,
                  }}>
                    <ClockCircleOutlined style={{ marginRight: '8px' }} />
                    Miembro desde
                  </Text>
                  <Input
                    value={user?.created_at ? new Date(user.created_at).toLocaleDateString('es-ES', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    }) : 'N/A'}
                    disabled
                    style={{
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '12px',
                      padding: '14px 18px',
                      color: dt.colors.dark.textSubtle,
                      fontSize: '15px',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Estadísticas rápidas */}
            <div 
              className="glass-card"
              style={{
                padding: '40px',
                borderRadius: '24px',
              }}
            >
              <Title level={4} style={{ color: '#FFFFFF', marginBottom: dt.spacing.xl }}>
                Estadísticas
              </Title>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: dt.spacing.lg }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    margin: '0 auto 12px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #E31837 0%, #C41530 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <FileTextOutlined style={{ fontSize: '20px', color: '#FFFFFF' }} />
                  </div>
                  <Title level={3} style={{ color: '#FFFFFF', margin: '0 0 4px 0' }}>
                    0
                  </Title>
                  <Text style={{ color: dt.colors.dark.textSubtle, fontSize: '12px' }}>
                    Workspaces
                  </Text>
                </div>

                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    margin: '0 auto 12px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #3B82F6 0%, #1E40AF 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <FileTextOutlined style={{ fontSize: '20px', color: '#FFFFFF' }} />
                  </div>
                  <Title level={3} style={{ color: '#FFFFFF', margin: '0 0 4px 0' }}>
                    0
                  </Title>
                  <Text style={{ color: dt.colors.dark.textSubtle, fontSize: '12px' }}>
                    Documentos
                  </Text>
                </div>

                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    margin: '0 auto 12px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <TrophyOutlined style={{ fontSize: '20px', color: '#FFFFFF' }} />
                  </div>
                  <Title level={3} style={{ color: '#FFFFFF', margin: '0 0 4px 0' }}>
                    0
                  </Title>
                  <Text style={{ color: dt.colors.dark.textSubtle, fontSize: '12px' }}>
                    RFPs
                  </Text>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de cambio de contraseña */}
      <Modal
        title={<span style={{ color: '#FFFFFF' }}>Cambiar Contraseña</span>}
        open={showPasswordModal}
        onCancel={() => setShowPasswordModal(false)}
        footer={null}
        styles={{
          body: {
            background: 'rgba(26, 26, 28, 0.95)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          },
          header: {
            background: 'transparent',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          },
        }}
      >
        <div style={{ padding: '20px 0', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <Text style={{ color: dt.colors.dark.text, display: 'block', marginBottom: '8px' }}>
              Contraseña actual
            </Text>
            <Input.Password
              value={passwordData.current_password}
              onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
              placeholder="Tu contraseña actual"
              style={{
                background: 'rgba(26, 26, 28, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                padding: '12px 16px',
                color: '#FFFFFF',
              }}
            />
          </div>

          <div>
            <Text style={{ color: dt.colors.dark.text, display: 'block', marginBottom: '8px' }}>
              Nueva contraseña
            </Text>
            <Input.Password
              value={passwordData.new_password}
              onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
              placeholder="Mínimo 8 caracteres"
              style={{
                background: 'rgba(26, 26, 28, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                padding: '12px 16px',
                color: '#FFFFFF',
              }}
            />
          </div>

          <div>
            <Text style={{ color: dt.colors.dark.text, display: 'block', marginBottom: '8px' }}>
              Confirmar nueva contraseña
            </Text>
            <Input.Password
              value={passwordData.confirm_password}
              onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
              placeholder="Repite la nueva contraseña"
              style={{
                background: 'rgba(26, 26, 28, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                padding: '12px 16px',
                color: '#FFFFFF',
              }}
            />
          </div>

          <Button
            type="primary"
            onClick={handleChangePassword}
            loading={isSaving}
            className="hover-shine"
            style={{
              width: '100%',
              height: '48px',
              background: 'linear-gradient(135deg, #E31837 0%, #C41530 100%)',
              border: 'none',
              borderRadius: '12px',
              marginTop: '8px',
            }}
          >
            Cambiar Contraseña
          </Button>
        </div>
      </Modal>
    </div>
  );
}
