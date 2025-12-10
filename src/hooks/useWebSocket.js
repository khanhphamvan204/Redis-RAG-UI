// Custom React Hook for WebSocket Connection
// Manages WebSocket state, auto-reconnect, and message handling

import { useState, useEffect, useRef, useCallback } from 'react';

const useWebSocket = (url) => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const [error, setError] = useState(null);
  
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const pingIntervalRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const isUnmountedRef = useRef(false);
  
  const MAX_RECONNECT_ATTEMPTS = 5;
  const INITIAL_RECONNECT_DELAY = 3000; // Start with 3 seconds
  const PING_INTERVAL = 25000; // Send ping every 25 seconds
  
  const cleanup = useCallback(() => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);
  
  const connect = useCallback(() => {
    // Don't connect if already connected or unmounted
    if (isUnmountedRef.current) return;
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return;
    
    try {
      // Close existing connection if any
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      
      cleanup();
      
      const ws = new WebSocket(url);
      
      ws.onopen = () => {
        if (isUnmountedRef.current) {
          ws.close();
          return;
        }
        
        console.log('WebSocket connected');
        setIsConnected(true);
        setError(null);
        reconnectAttemptsRef.current = 0;
        
        // Start ping interval to keep connection alive
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, PING_INTERVAL);
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          // Ignore pong responses
          if (data.type === 'pong') return;
          setLastMessage(data);
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      };
      
      ws.onerror = (event) => {
        console.error('WebSocket error:', event);
        setError('WebSocket connection error');
      };
      
      ws.onclose = (event) => {
        console.log('WebSocket disconnected', event.code, event.reason);
        setIsConnected(false);
        cleanup();
        
        // Don't reconnect if unmounted or closed intentionally
        if (isUnmountedRef.current) return;
        if (event.code === 1000) return; // Normal closure
        
        // Attempt to reconnect with exponential backoff
        if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          const delay = INITIAL_RECONNECT_DELAY * Math.pow(2, reconnectAttemptsRef.current);
          console.log(`Reconnecting in ${delay}ms... (attempt ${reconnectAttemptsRef.current + 1}/${MAX_RECONNECT_ATTEMPTS})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current += 1;
            connect();
          }, delay);
        } else {
          setError('Max reconnection attempts reached');
        }
      };
      
      wsRef.current = ws;
    } catch (err) {
      console.error('Error creating WebSocket:', err);
      setError(err.message);
    }
  }, [url, cleanup]);
  
  const sendMessage = useCallback((message) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected');
    }
  }, []);
  
  const disconnect = useCallback(() => {
    cleanup();
    if (wsRef.current) {
      wsRef.current.close(1000, 'Client closing');
      wsRef.current = null;
    }
  }, [cleanup]);
  
  useEffect(() => {
    isUnmountedRef.current = false;
    connect();
    
    return () => {
      isUnmountedRef.current = true;
      cleanup();
      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmounting');
        wsRef.current = null;
      }
    };
  }, [connect, cleanup]);
  
  return {
    isConnected,
    lastMessage,
    error,
    sendMessage,
    disconnect,
    reconnect: connect
  };
};

export default useWebSocket;
