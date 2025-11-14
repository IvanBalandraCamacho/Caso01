import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log("[LOGIN] Received body:", body);

    // Función para generar un token de emergencia
    const generateEmergencyToken = () => {
      return Buffer.from(`${body.username}:${Date.now()}`).toString('base64');
    };

    // Verificar credenciales de emergencia admin/admin
    if (body.username === "admin" && body.password === "admin") {
      console.log("[LOGIN] Emergency admin login detected, checking backend availability first");
    }

    try {
      // Usar el nombre del servicio Docker para conectarse internamente
      const backendUrl = process.env.BACKEND_URL || "http://backend:8000";
      const endpoint = `${backendUrl}/api/v1/auth/token`;
      console.log("[LOGIN] Calling endpoint:", endpoint);

      // El backend espera form data (OAuth2PasswordRequestForm), no JSON
      const params = new URLSearchParams();
      params.append("username", body.username || "");
      params.append("password", body.password || "");

      console.log("[LOGIN] Request params:", params.toString());

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
        // Timeout de 5 segundos para detectar problemas de conexión
        signal: AbortSignal.timeout(5000),
      });

      console.log("[LOGIN] Response status:", response.status);

      const responseText = await response.text();
      console.log("[LOGIN] Response text:", responseText);

      if (!response.ok) {
        // Si las credenciales del backend fallan pero son admin/admin, usar modo de emergencia
        if (body.username === "admin" && body.password === "admin") {
          console.log("[LOGIN] Backend authentication failed for admin, using emergency mode");
          return NextResponse.json({
            access_token: generateEmergencyToken(),
            token_type: "bearer",
            user_id: "admin",
            emergency_mode: true,
          });
        }
        
        console.log("[LOGIN] Authentication failed");
        return NextResponse.json(
          { error: "Authentication failed" },
          { status: response.status }
        );
      }

      const data = JSON.parse(responseText);
      console.log("[LOGIN] Success, returning token");
      
      return NextResponse.json({
        access_token: data.access_token,
        token_type: data.token_type,
        user_id: "admin",
      });
    } catch (backendError) {
      console.error("[LOGIN] Backend connection error:", backendError);
      
      // Si no hay conexión al backend y las credenciales son admin/admin, permitir acceso de emergencia
      if (body.username === "admin" && body.password === "admin") {
        console.log("[LOGIN] Backend unavailable, using emergency admin login");
        return NextResponse.json({
          access_token: generateEmergencyToken(),
          token_type: "bearer",
          user_id: "admin",
          emergency_mode: true,
        });
      }
      
      // Para cualquier otro usuario, fallar si no hay conexión al backend
      return NextResponse.json(
        { error: "Service unavailable - please try again later" },
        { status: 503 }
      );
    }
  } catch (error) {
    console.error("[LOGIN] Error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Internal server error", message: errorMessage },
      { status: 500 }
    );
  }
}

