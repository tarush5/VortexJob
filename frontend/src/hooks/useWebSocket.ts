import { useState, useEffect, useRef } from 'react';

export type WsStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';

export function useWebSocket() {
  const [wsStatus, setWsStatus] = useState<WsStatus>('connecting');
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('vortexjob_token');
    if (!token) return;

    let wsUrl = import.meta.env.VITE_WS_URL;
    if (!wsUrl) {
      const apiUrl = import.meta.env.VITE_API_URL;
      if (apiUrl) {
        try {
          const url = new URL(apiUrl, window.location.origin);
          const wsProtocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
          wsUrl = `${wsProtocol}//${url.host}/ws`;
        } catch {
          const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
          wsUrl = `${protocol}//${window.location.host}/ws`;
        }
      } else {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        wsUrl = `${protocol}//${window.location.host}/ws`;
      }
    }

    function connect(isReconnect = false) {
      if (isReconnect) {
        setWsStatus('reconnecting');
      }
      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          setWsStatus('connected');
          ws.send(JSON.stringify({ type: 'auth', token }));
        };

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            window.dispatchEvent(new CustomEvent('ws-message', { detail: msg }));
          } catch {
            // ignore non-JSON messages
          }
        };

        ws.onclose = () => {
          setWsStatus('disconnected');
          wsRef.current = null;
          reconnectTimerRef.current = window.setTimeout(() => connect(true), 3000);
        };

        ws.onerror = () => {
          ws.close();
        };
      } catch {
        setWsStatus('disconnected');
        reconnectTimerRef.current = window.setTimeout(() => connect(true), 3000);
      }
    }

    connect();

    return () => {
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  return { wsStatus, wsConnected: wsStatus === 'connected' };
}
