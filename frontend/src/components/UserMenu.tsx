"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar } from "@/components/ui/avatar";
import { LogOut, User, Trash2 } from "lucide-react";
import { jwtDecode } from "jwt-decode";

interface JWTPayload {
  sub: string; // email
  user_id: string;
  first_name?: string;
  exp: number;
}

interface UserMenuProps {
  size?: "sm" | "md" | "lg";
  showName?: boolean;
  showClearHistory?: boolean;
  onClearHistory?: () => void;
  disableClearHistory?: boolean;
}

export function UserMenu({ 
  size = "md", 
  showName = false,
  showClearHistory = false,
  onClearHistory,
  disableClearHistory = false
}: UserMenuProps) {
  const router = useRouter();
  const [userName, setUserName] = useState<string>("Usuario");
  const [userEmail, setUserEmail] = useState<string>("");

  useEffect(() => {
    // Obtener información del token
    const token = localStorage.getItem("access_token");
    if (token) {
      try {
        const decoded = jwtDecode<JWTPayload>(token);
        setUserName(decoded.first_name || "Usuario");
        setUserEmail(decoded.sub || "");
      } catch (error) {
        console.error("Error decodificando token:", error);
      }
    }
  }, []);

  const handleLogout = () => {
    // Limpiar token
    localStorage.removeItem("access_token");
    // Redirigir a login
    router.push("/login");
  };

  const sizeClasses = {
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-12 w-12 text-base",
  };

  // Obtener iniciales del nombre
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-lg hover:bg-gray-800 p-2 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-red">
          <Avatar className={`${sizeClasses[size]} bg-gradient-to-br from-brand-red to-pink-600 flex items-center justify-center cursor-pointer`}>
            <span className="text-white font-semibold">
              {getInitials(userName)}
            </span>
          </Avatar>
          {showName && (
            <div className="flex flex-col items-start">
              <span className="text-sm font-medium text-white">{userName}</span>
              <span className="text-xs text-gray-400">{userEmail}</span>
            </div>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 bg-brand-dark-secondary border-gray-700" align="end">
        <DropdownMenuLabel className="text-brand-light">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium">{userName}</p>
            <p className="text-xs text-gray-400">{userEmail}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-gray-700" />
        <DropdownMenuItem
          className="text-brand-light hover:bg-gray-800 cursor-pointer focus:bg-gray-800"
          onClick={() => router.push("/profile")}
          disabled
        >
          <User className="mr-2 h-4 w-4" />
          <span>Mi Perfil</span>
        </DropdownMenuItem>
        {showClearHistory && (
          <>
            <DropdownMenuSeparator className="bg-gray-700" />
            <DropdownMenuItem
              className="text-orange-400 hover:bg-gray-800 hover:text-orange-300 cursor-pointer focus:bg-gray-800 focus:text-orange-300"
              onClick={onClearHistory}
              disabled={disableClearHistory}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              <span>Limpiar Historial</span>
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator className="bg-gray-700" />
        <DropdownMenuItem
          className="text-red-400 hover:bg-gray-800 hover:text-red-300 cursor-pointer focus:bg-gray-800 focus:text-red-300"
          onClick={handleLogout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Cerrar Sesión</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
