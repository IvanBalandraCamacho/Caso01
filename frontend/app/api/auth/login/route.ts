import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log("[LOGIN] Received body:", body);

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
    });

    console.log("[LOGIN] Response status:", response.status);

    const responseText = await response.text();
    console.log("[LOGIN] Response text:", responseText);

    if (!response.ok) {
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
  } catch (error) {
    console.error("[LOGIN] Error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Internal server error", message: errorMessage },
      { status: 500 }
    );
  }
}

