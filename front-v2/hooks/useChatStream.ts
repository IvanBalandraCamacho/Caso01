import { useRef, useCallback } from 'react';
import { ChatStreamEvent, DocumentChunk } from '@/types/api';
import { sendChatMessageStream } from '@/lib/api';
import type { ChatRequest } from '@/types/api';

/**
 * State for managing a streaming chat operation
 */
export interface ChatStreamState {
  isStreaming: boolean;
  contentBuffer: string;
  sources: DocumentChunk[];
  conversationId: string | null;
  error: Error | null;
}

/**
 * Callbacks for streaming chat lifecycle
 */
export interface ChatStreamCallbacks {
  onContentUpdate?: (content: string) => void;
  onSourcesUpdate?: (sources: DocumentChunk[]) => void;
  onIntentDetected?: (intent: string) => void;
  onError?: (error: Error) => void;
  onComplete?: (conversationId: string) => void;
}

/**
 * Hook for managing optimized chat streaming with batching and proper event handling
 *
 * Features:
 * - Batches content updates using requestAnimationFrame to prevent UI freezing
 * - Separates sources from message content for efficient rendering
 * - Properly handles all streaming event types (content, sources, intent)
 * - Type-safe event handling with ChatStreamEvent union types
 */
export const useChatStream = () => {
  // Refs for buffering and scheduling
  const streamBufferRef = useRef<string>('');
  const rafIdRef = useRef<number | null>(null);
  const sourceBufferRef = useRef<DocumentChunk[]>([]);
  const lastFlushTimeRef = useRef<number>(0);

  /**
   * Flush accumulated content buffer to callback
   */
  const flushContentBuffer = useCallback(
    (callback: ChatStreamCallbacks) => {
      if (streamBufferRef.current && callback.onContentUpdate) {
        callback.onContentUpdate(streamBufferRef.current);
      }
      rafIdRef.current = null;
    },
    []
  );

  /**
   * Flush accumulated sources to callback
   */
  const flushSourcesBuffer = useCallback(
    (callback: ChatStreamCallbacks) => {
      if (sourceBufferRef.current.length > 0 && callback.onSourcesUpdate) {
        callback.onSourcesUpdate(sourceBufferRef.current);
      }
    },
    []
  );

  /**
   * Schedule a UI update for content using requestAnimationFrame
   * This prevents excessive renders (50-100+ per second) by batching updates
   */
  const scheduleContentUpdate = useCallback(
    (callback: ChatStreamCallbacks) => {
      if (!rafIdRef.current) {
        rafIdRef.current = requestAnimationFrame(() => {
          flushContentBuffer(callback);
        });
      }
    },
    [flushContentBuffer]
  );

  /**
   * Handle a single streaming event from the backend
   */
  const handleStreamEvent = useCallback(
    (event: ChatStreamEvent, callback: ChatStreamCallbacks) => {
      // Handle content events
      if (event.type === 'content' && 'text' in event) {
        streamBufferRef.current += event.text;
        scheduleContentUpdate(callback);
        return;
      }

      // Handle sources events
      if (event.type === 'sources' && 'relevant_chunks' in event) {
        sourceBufferRef.current = event.relevant_chunks;
        flushSourcesBuffer(callback);
        return;
      }

      // Handle intent events
      if (event.type === 'intent' && 'intent' in event) {
        if (callback.onIntentDetected) {
          callback.onIntentDetected(event.intent);
        }
        return;
      }
    },
    [scheduleContentUpdate, flushSourcesBuffer]
  );

  /**
   * Initialize a new streaming operation
   * Clears buffers and prepares for incoming events
   */
  const startStreaming = useCallback(() => {
    streamBufferRef.current = '';
    sourceBufferRef.current = [];
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
  }, []);

  /**
   * Finalize streaming and ensure all buffered data is flushed
   */
  const finishStreaming = useCallback(
    (callback: ChatStreamCallbacks) => {
      // Cancel any pending RAF
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }

      // Flush any remaining content
      flushContentBuffer(callback);
      flushSourcesBuffer(callback);

      // Clear buffers
      streamBufferRef.current = '';
      sourceBufferRef.current = [];
    },
    [flushContentBuffer, flushSourcesBuffer]
  );

  /**
   * Send a chat message with streaming and handle all events
   */
  const sendMessage = useCallback(
    async (
      workspaceId: string,
      request: ChatRequest,
      callbacks: ChatStreamCallbacks
    ): Promise<void> => {
      startStreaming();

      return new Promise((resolve, reject) => {
        sendChatMessageStream(
          workspaceId,
          request,
          (event: ChatStreamEvent) => {
            handleStreamEvent(event, callbacks);
          },
          (conversationId: string) => {
            finishStreaming(callbacks);
            if (callbacks.onComplete) {
              callbacks.onComplete(conversationId);
            }
            resolve();
          },
          (error: Error) => {
            finishStreaming(callbacks);
            if (callbacks.onError) {
              callbacks.onError(error);
            }
            reject(error);
          }
        );
      });
    },
    [startStreaming, finishStreaming, handleStreamEvent]
  );

  return {
    sendMessage,
    startStreaming,
    finishStreaming,
  };
};
