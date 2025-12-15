import { useEffect, useRef, useCallback } from "react";

export interface NotificationMessage {
    type: string;
    document_id?: string;
    workspace_id?: string;
    status?: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
    message?: string;
    error?: string;
}

interface UseNotificationsWSOptions {
    /** Filter notifications by workspace ID */
    workspaceId?: string;
    /** Filter notifications by document ID */
    documentId?: string;
    /** Called when a filtered notification is received */
    onMessage: (msg: NotificationMessage) => void;
    /** Whether to enable the WebSocket connection */
    enabled?: boolean;
}

/**
 * Hook to listen for real-time notifications via WebSocket.
 * Useful for tracking document processing status.
 */
export function useNotificationsWS({
    workspaceId,
    documentId,
    onMessage,
    enabled = true,
}: UseNotificationsWSOptions) {
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const onMessageRef = useRef(onMessage);

    // Keep callback ref updated
    useEffect(() => {
        onMessageRef.current = onMessage;
    }, [onMessage]);

    const connect = useCallback(() => {
        if (!enabled) return;

        // Derive WS URL from API Base URL or default
        const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";
        // Replace http/https with ws/wss and append /ws/notifications
        // Note: The backend endpoint seems to be /ws/notifications at the root router or api router level.
        // Assuming relative to API base: 
        // If apiBase is http://localhost:8000/api/v1 -> ws://localhost:8000/api/v1/ws/notifications

        let wsUrl = apiBaseUrl.replace(/^http/, 'ws');
        if (!wsUrl.endsWith('/')) wsUrl += '/';
        wsUrl += 'ws/notifications';

        console.log("🔌 Conectando WebSocket de notificaciones...", wsUrl);

        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
            console.log("✅ WebSocket de notificaciones conectado");
        };

        ws.onmessage = (event) => {
            try {
                const data: NotificationMessage = JSON.parse(event.data);
                console.log("📩 Notificación WS recibida:", data);

                // Filter by workspace if specified
                if (workspaceId && data.workspace_id && data.workspace_id !== workspaceId) {
                    // console.log("⏭️ Ignorando notificación de otro workspace");
                    return;
                }

                // Filter by document if specified
                if (documentId && data.document_id && data.document_id !== documentId) {
                    // console.log("⏭️ Ignorando notificación de otro documento");
                    return;
                }

                // Pass filtered message to callback
                onMessageRef.current(data);
            } catch (err) {
                console.error("❌ Error parseando mensaje WS:", err);
            }
        };

        ws.onerror = (err) => {
            console.error("❌ Error en WebSocket:", err);
        };

        ws.onclose = (event) => {
            console.log("🔌 WebSocket cerrado:", event.code, event.reason);
            wsRef.current = null;

            // Reconnect after 3 seconds if still enabled
            if (enabled) {
                reconnectTimeoutRef.current = setTimeout(() => {
                    console.log("🔄 Intentando reconectar WebSocket...");
                    connect();
                }, 3000);
            }
        };
    }, [enabled, workspaceId, documentId]);

    useEffect(() => {
        if (enabled) {
            connect();
        }

        return () => {
            // Cleanup on unmount or when disabled
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }
        };
    }, [connect, enabled]);

    // Return a function to manually close the connection
    const disconnect = useCallback(() => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
        }
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
    }, []);

    return { disconnect };
}
