"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dropdown, Avatar, Button, Space, Typography, App } from "antd";
import type { MenuProps } from "antd";
import {
  UserOutlined,
  LogoutOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";

const { Text } = Typography;

interface UserMenuProps {
  user?: {
    email: string;
    full_name?: string | null;
  } | null;
}

export function UserMenu({ user }: UserMenuProps) {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { modal, message } = App.useApp();

  const handleLogout = () => {
    modal.confirm({
      title: "Cerrar sesión",
      icon: <ExclamationCircleOutlined style={{ color: "#ff4d4f" }} />,
      content: "¿Estás seguro de que deseas cerrar sesión?",
      okText: "Sí, cerrar sesión",
      cancelText: "Cancelar",
      okType: "danger",
      centered: true,
      styles: {
        content: {
          background: "#1A1A1A",
          borderRadius: "12px",
          border: "none",
        },
        header: {
          background: "#1A1A1A",
          color: "#FFFFFF",
        },
        body: {
          background: "#1A1A1A",
          color: "#CCCCCC",
        },
        mask: {
          background: "rgba(0, 0, 0, 0.75)",
        },
      } as any,
      onOk: async () => {
        setIsLoggingOut(true);
        try {
          // Limpiar tokens del localStorage
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");

          message.success("Sesión cerrada correctamente");

          // Redirigir al login
          router.push("/login");
        } catch (error) {
          console.error("Error al cerrar sesión:", error);
          message.error("Error al cerrar sesión");
        } finally {
          setIsLoggingOut(false);
        }
      },
    });
  };

  const items: MenuProps["items"] = [
    {
      key: "user-info",
      label: (
        <div style={{ padding: "8px 0" }}>
          <Text strong>{user?.full_name || "Usuario"}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: "12px" }}>
            {user?.email || "sin@email.com"}
          </Text>
        </div>
      ),
      disabled: true,
    },
    {
      type: "divider",
    },
    {
      key: "profile",
      icon: <UserOutlined />,
      label: "Mi Perfil",
      onClick: () => router.push("/profile"),
    },
    {
      type: "divider",
    },
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: "Cerrar sesión",
      danger: true,
      onClick: handleLogout,
    },
  ];

  const displayName = user?.full_name || user?.email?.split("@")[0] || "U";
  const initials = displayName.charAt(0).toUpperCase();

  return (
    <Dropdown
      menu={{ items }}
      trigger={["click"]}
      placement="bottomRight"
      disabled={isLoggingOut}
    >
      <Button
        type="text"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "4px 8px",
          height: "auto",
        }}
      >
        <Avatar
          size="small"
          style={{ backgroundColor: "#1890ff" }}
          icon={<UserOutlined />}
        >
          {initials}
        </Avatar>
        <Space orientation="vertical" size={0} style={{ textAlign: "left" }}>
          <Text ellipsis style={{ maxWidth: 150, fontSize: "14px", fontWeight: 600, color: "#FFFFFF" }}>
            {displayName}
          </Text>
        </Space>
      </Button>
    </Dropdown>
  );
}
