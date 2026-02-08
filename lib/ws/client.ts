// ============================================
// WebSocket 客户端
// 前端用于接收实时进度更新
// ============================================

interface WSMessage {
  type: 'progress' | 'status' | 'error' | 'complete';
  data: {
    jobId: string;
    progress?: number;
    status?: string;
    error?: string;
    message?: string;
    timestamp: string;
    [key: string]: unknown;
  };
}

export interface WSClientConfig {
  url?: string;
  autoReconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

type MessageHandler = (message: WSMessage) => void;

/**
 * WebSocket 客户端类
 */
export class WSClient {
  private ws: WebSocket | null = null;
  private url: string;
  private config: Required<WSClientConfig>;
  private handlers: Map<string, Set<MessageHandler>> = new Map();
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isManualClose = false;

  constructor(config: WSClientConfig = {}) {
    this.url = config.url || this.getDefaultUrl();
    this.config = {
      url: this.url, // 确保 url 存在
      autoReconnect: true,
      reconnectInterval: 3000,
      maxReconnectAttempts: 10,
      ...config,
    };
  }

  /**
   * 获取默认 WebSocket URL
   */
  private getDefaultUrl(): string {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    return `${protocol}//${host}/ws`;
  }

  /**
   * 连接 WebSocket
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          console.log('✅ WebSocket 已连接');
          this.reconnectAttempts = 0;
          this.isManualClose = false;
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: WSMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('解析 WebSocket 消息失败:', error);
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket 错误:', error);
          reject(error);
        };

        this.ws.onclose = () => {
          console.log('🔌 WebSocket 已断开');

          // 自动重连
          if (!this.isManualClose && this.config.autoReconnect) {
            this.scheduleReconnect();
          }
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    this.isManualClose = true;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * 调度重连
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      console.error('❌ WebSocket 重连次数已达上限');
      return;
    }

    this.reconnectAttempts++;
    console.log(`🔄 WebSocket 将在 ${this.config.reconnectInterval}ms 后重连 (${this.reconnectAttempts}/${this.config.maxReconnectAttempts})`);

    this.reconnectTimer = setTimeout(() => {
      this.connect().catch((error) => {
        console.error('WebSocket 重连失败:', error);
      });
    }, this.config.reconnectInterval);
  }

  /**
   * 处理接收到的消息
   */
  private handleMessage(message: WSMessage): void {
    const { type } = message;

    // 触发特定类型的处理器
    const typeHandlers = this.handlers.get(type);
    if (typeHandlers) {
      typeHandlers.forEach((handler) => {
        try {
          handler(message);
        } catch (error) {
          console.error(`消息处理器错误 (${type}):`, error);
        }
      });
    }

    // 触发全局处理器
    const allHandlers = this.handlers.get('*');
    if (allHandlers) {
      allHandlers.forEach((handler) => {
        try {
          handler(message);
        } catch (error) {
          console.error('全局消息处理器错误:', error);
        }
      });
    }
  }

  /**
   * 注册消息处理器
   */
  on(type: string, handler: MessageHandler): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }

    this.handlers.get(type)!.add(handler);

    // 返回取消订阅函数
    return () => {
      this.off(type, handler);
    };
  }

  /**
   * 取消消息处理器
   */
  off(type: string, handler: MessageHandler): void {
    const typeHandlers = this.handlers.get(type);
    if (typeHandlers) {
      typeHandlers.delete(handler);

      if (typeHandlers.size === 0) {
        this.handlers.delete(type);
      }
    }
  }

  /**
   * 获取连接状态
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

// ============================================
// 全局 WebSocket 客户端实例
// ============================================

let globalWSClient: WSClient | null = null;

/**
 * 获取全局 WebSocket 客户端实例
 */
export function getWSClient(config?: WSClientConfig): WSClient {
  if (!globalWSClient) {
    globalWSClient = new WSClient(config);

    // 自动连接
    if (typeof window !== 'undefined') {
      globalWSClient.connect().catch((error) => {
        console.error('WebSocket 自动连接失败:', error);
      });
    }
  }

  return globalWSClient;
}

/**
 * 关闭全局 WebSocket 客户端
 */
export function closeWSClient(): void {
  if (globalWSClient) {
    globalWSClient.disconnect();
    globalWSClient = null;
  }
}

// ============================================
// React Hook
// ============================================

import { useEffect, useState, useCallback } from 'react';

interface UseWSOptions {
  enabled?: boolean;
  onProgress?: (jobId: string, progress: number, message?: string) => void;
  onStatus?: (jobId: string, status: string, message?: string) => void;
  onError?: (jobId: string, error: string) => void;
  onComplete?: (jobId: string, data: unknown) => void;
}

/**
 * WebSocket React Hook
 * 用于在 React 组件中监听任务进度
 */
export function useWS(options: UseWSOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [client, setClient] = useState<WSClient | null>(null);

  const {
    enabled = true,
    onProgress,
    onStatus,
    onError,
    onComplete,
  } = options;

  useEffect(() => {
    if (!enabled) return;

    const wsClient = getWSClient();
    setClient(wsClient);

    // 监听连接状态
    const checkConnection = setInterval(() => {
      setIsConnected(wsClient.isConnected());
    }, 1000);

    // 注册消息处理器
    const unsubscribers: Array<() => void> = [];

    if (onProgress) {
      unsubscribers.push(
        wsClient.on('progress', (message) => {
          const { jobId, progress, message: msg } = message.data;
          onProgress(jobId, progress || 0, msg);
        })
      );
    }

    if (onStatus) {
      unsubscribers.push(
        wsClient.on('status', (message) => {
          const { jobId, status, message: msg } = message.data;
          onStatus(jobId, status || '', msg);
        })
      );
    }

    if (onError) {
      unsubscribers.push(
        wsClient.on('error', (message) => {
          const { jobId, error } = message.data;
          onError(jobId, error || '');
        })
      );
    }

    if (onComplete) {
      unsubscribers.push(
        wsClient.on('complete', (message) => {
          const { jobId, data } = message.data;
          onComplete(jobId, data);
        })
      );
    }

    // 清理函数
    return () => {
      clearInterval(checkConnection);
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [enabled, onProgress, onStatus, onError, onComplete]);

  return {
    client,
    isConnected,
  };
}

// ============================================
// 导出
// ============================================

export default WSClient;
