import { NextRequest, NextResponse } from 'next/server';

/**
 * Proxy para CopilotKit - maneja las llamadas desde el servidor Next.js
 * hacia el backend FastAPI dentro de Docker
 */

// URL del backend desde dentro de Docker (usando el nombre del servicio)
// No incluir la ruta /copilot aquí ya que la construimos dinámicamente
const BACKEND_BASE_URL = process.env.BACKEND_INTERNAL_URL || 'http://backend:8000/api/v1';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug?: string[] }> }
) {
  try {
    const params = await context.params;
    const slug = params.slug || [];
    // Construir la ruta: /api/copilot/info -> /api/v1/copilot/info
    const path = slug.length > 0 ? `/copilot/${slug.join('/')}` : '/copilot';
    const url = `${BACKEND_BASE_URL}${path}${request.nextUrl.search}`;

    console.log('[Copilot Proxy] GET:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('[Copilot Proxy] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch from backend' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ slug?: string[] }> }
) {
  try {
    const params = await context.params;
    const slug = params.slug || [];
    // Construir la ruta: /api/copilot -> /api/v1/copilot
    const path = slug.length > 0 ? `/copilot/${slug.join('/')}` : '/copilot';
    const url = `${BACKEND_BASE_URL}${path}`;

    console.log('[Copilot Proxy] POST:', url);

    const body = await request.text();
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body,
    });

    // Para streaming (SSE)
    if (response.headers.get('content-type')?.includes('text/event-stream')) {
      return new NextResponse(response.body, {
        status: response.status,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('[Copilot Proxy] Error:', error);
    return NextResponse.json(
      { error: 'Failed to post to backend' },
      { status: 500 }
    );
  }
}
