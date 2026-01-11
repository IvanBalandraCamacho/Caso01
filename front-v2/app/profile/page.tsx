"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Avatar, Spin, Modal } from "antd";
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
import { showToast } from "@/components/Toast";
import { useUser } from "@/hooks/useUser";

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
      window.location.reload();
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
      <div className="min-h-screen flex items-center justify-center bg-[#131314]">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#131314] p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 text-zinc-400 hover:text-[#E31837] transition-colors px-3 py-2 rounded-lg hover:bg-zinc-800/50"
          >
            <ArrowLeftOutlined />
            <span>Volver al inicio</span>
          </button>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Tarjeta de Perfil */}
          <div className="bg-[#1E1F20] rounded-2xl border border-zinc-800 p-8 text-center">
            {/* Avatar */}
            <div className="relative inline-block mb-6">
              <input
                type="file"
                id="profile-picture-input"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUploadPhoto(file);
                }}
              />
              <Avatar 
                size={120}
                icon={!user?.profile_picture ? <UserOutlined /> : undefined}
                src={user?.profile_picture ? `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}${user.profile_picture}` : undefined}
                className="cursor-pointer"
                style={{
                  background: (user as any)?.profile_picture ? 'transparent' : 'linear-gradient(135deg, #E31837 0%, #FF6B00 100%)',
                  fontSize: '48px',
                }}
                onClick={() => document.getElementById('profile-picture-input')?.click()}
              />
              <div 
                className={`absolute bottom-0 right-0 w-10 h-10 rounded-full flex items-center justify-center border-[3px] border-[#131314] cursor-pointer transition-all hover:scale-110 ${
                  isUploadingPhoto 
                    ? 'bg-zinc-600 cursor-not-allowed' 
                    : 'bg-gradient-to-br from-emerald-500 to-emerald-600'
                }`}
                onClick={() => {
                  if (!isUploadingPhoto) {
                    document.getElementById('profile-picture-input')?.click();
                  }
                }}
              >
                {isUploadingPhoto ? (
                  <Spin size="small" />
                ) : (
                  <CameraOutlined className="text-white text-lg" />
                )}
              </div>
            </div>

            <h2 className="text-2xl font-bold text-white mb-1">
              {user?.full_name || 'Usuario'}
            </h2>
            <p className="text-zinc-400 mb-8">{user?.email}</p>

            {/* Botones de acción */}
            <div className="space-y-3">
              <Button
                icon={isEditing ? <SaveOutlined /> : <EditOutlined />}
                onClick={() => isEditing ? handleSaveProfile() : setIsEditing(true)}
                loading={isSaving}
                className="w-full h-12 rounded-xl font-semibold border-0"
                style={{
                  background: isEditing 
                    ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
                    : 'linear-gradient(135deg, #E31837 0%, #C41530 100%)',
                  color: '#FFFFFF',
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
                  className="w-full h-12 rounded-xl bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700 hover:border-zinc-600"
                >
                  Cancelar
                </Button>
              )}

              <Button
                icon={<LockOutlined />}
                onClick={() => setShowPasswordModal(true)}
                className="w-full h-12 rounded-xl bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700 hover:border-zinc-600"
              >
                Cambiar Contraseña
              </Button>

              <Button
                icon={<LogoutOutlined />}
                onClick={handleLogout}
                danger
                className="w-full h-12 rounded-xl"
              >
                Cerrar Sesión
              </Button>
            </div>
          </div>

          {/* Información del perfil */}
          <div className="space-y-6">
            {/* Formulario */}
            <div className="bg-[#1E1F20] rounded-2xl border border-zinc-800 p-8">
              <h3 className="text-lg font-bold text-white mb-6">Información Personal</h3>

              <div className="space-y-5">
                {/* Nombre */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-zinc-300 mb-2">
                    <UserOutlined />
                    Nombre completo
                  </label>
                  <Input
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    disabled={!isEditing}
                    className={`h-12 rounded-xl ${isEditing ? 'bg-zinc-900' : 'bg-zinc-900/50'} border-zinc-700 text-white`}
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-zinc-300 mb-2">
                    <MailOutlined />
                    Email
                  </label>
                  <Input
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    disabled={!isEditing}
                    className={`h-12 rounded-xl ${isEditing ? 'bg-zinc-900' : 'bg-zinc-900/50'} border-zinc-700 text-white`}
                  />
                </div>

                {/* Fecha de registro */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-zinc-300 mb-2">
                    <ClockCircleOutlined />
                    Miembro desde
                  </label>
                  <Input
                    value={user?.created_at ? new Date(user.created_at).toLocaleDateString('es-ES', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    }) : 'N/A'}
                    disabled
                    className="h-12 rounded-xl bg-zinc-900/50 border-zinc-700 text-zinc-400"
                  />
                </div>
              </div>
            </div>

            {/* Estadísticas */}
            <div className="bg-[#1E1F20] rounded-2xl border border-zinc-800 p-8">
              <h3 className="text-lg font-bold text-white mb-6">Estadísticas</h3>

              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br from-[#E31837] to-[#C41530] flex items-center justify-center">
                    <FileTextOutlined className="text-xl text-white" />
                  </div>
                  <p className="text-2xl font-bold text-white">0</p>
                  <p className="text-xs text-zinc-500">Workspaces</p>
                </div>

                <div className="text-center">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
                    <FileTextOutlined className="text-xl text-white" />
                  </div>
                  <p className="text-2xl font-bold text-white">0</p>
                  <p className="text-xs text-zinc-500">Documentos</p>
                </div>

                <div className="text-center">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center">
                    <TrophyOutlined className="text-xl text-white" />
                  </div>
                  <p className="text-2xl font-bold text-white">0</p>
                  <p className="text-xs text-zinc-500">RFPs</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de cambio de contraseña */}
      <Modal
        title={<span className="text-white">Cambiar Contraseña</span>}
        open={showPasswordModal}
        onCancel={() => setShowPasswordModal(false)}
        footer={null}
        className="dark-modal"
        styles={{
          body: {
            background: '#1E1F20',
          },
          header: {
            background: '#1E1F20',
            borderBottom: '1px solid #27272a',
          },
          mask: {
            backdropFilter: 'blur(4px)',
          },
        }}
      >
        <div className="py-4 space-y-5">
          <div>
            <label className="text-sm text-zinc-300 block mb-2">Contraseña actual</label>
            <Input.Password
              value={passwordData.current_password}
              onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
              placeholder="Tu contraseña actual"
              className="h-12 rounded-xl bg-zinc-900 border-zinc-700 text-white"
            />
          </div>

          <div>
            <label className="text-sm text-zinc-300 block mb-2">Nueva contraseña</label>
            <Input.Password
              value={passwordData.new_password}
              onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
              placeholder="Mínimo 8 caracteres"
              className="h-12 rounded-xl bg-zinc-900 border-zinc-700 text-white"
            />
          </div>

          <div>
            <label className="text-sm text-zinc-300 block mb-2">Confirmar nueva contraseña</label>
            <Input.Password
              value={passwordData.confirm_password}
              onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
              placeholder="Repite la nueva contraseña"
              className="h-12 rounded-xl bg-zinc-900 border-zinc-700 text-white"
            />
          </div>

          <Button
            type="primary"
            onClick={handleChangePassword}
            loading={isSaving}
            className="w-full h-12 rounded-xl border-0 mt-2"
            style={{
              background: 'linear-gradient(135deg, #E31837 0%, #C41530 100%)',
            }}
          >
            Cambiar Contraseña
          </Button>
        </div>
      </Modal>
    </div>
  );
}
