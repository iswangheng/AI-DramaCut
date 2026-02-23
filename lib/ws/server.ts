// ============================================
// DramaCut AI WebSocket 服务器
// 用于实时推送任务进度到前端
// ============================================

import { WebSocketServer, WebSocket } from 'ws';
import { wsConfig } from '../config';

// ============================================
// 类型定义
// ============================================

export type WSMessageType =
  | 'progress'
  | 'status'
  | 'error'
  | 'complete'
  | 'warning'
  | 'success'
  | 'batch_error';

export interface WSMessage {
  type: WSMessageType;
  data: {
    jobId?: string;
    progress?: number; // 0-100
    message?: string;
    error?: string;
    [key: string]: unknown;
  };
}

export type WSMessageHandler = (message: WSMessage) => void;

// ============================================
// WebSocket 服务器类
// ============================================

export class WSServer {
  private wss: WebSocketServer | null = null;
  private clients: Map<WebSocket, Set<string>> = new Map(); // client -> subscribed job IDs
  private jobHandlers: Map<string, Set<WSMessageHandler>> = new Map(); // job ID -> handlers

  /**
   * 启动 WebSocket 服务器
   */
  start() {
    if (this.wss) {
      console.warn('⚠️  WebSocket 服务器已在运行');
      return;
    }

    this.wss = new WebSocketServer({ port: wsConfig.port });

    this.wss.on('listening', () => {
      console.log(`🔌 WebSocket 服务器已启动: ws://localhost:${wsConfig.port}`);
    });

    this.wss.on('connection', (ws, req) => {
      const clientIp = req.socket.remoteAddress;
      console.log(`🔗 新客户端连接: ${clientIp}`);

      // 初始化客户端的订阅集合
      this.clients.set(ws, new Set());

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString()) as WSMessage;
          this.handleClientMessage(ws, message);
        } catch (error) {
          console.error('❌ 无法解析客户端消息:', error);
        }
      });

      ws.on('close', () => {
        console.log(`🔌 客户端断开连接: ${clientIp}`);
        this.clients.delete(ws);
      });

      ws.on('error', (error) => {
        console.error('❌ WebSocket 错误:', error);
      });

      // 发送欢迎消息
      this.sendToClient(ws, {
        type: 'status',
        data: { message: '已连接到 DramaCut AI 服务器' },
      });
    });

    this.wss.on('error', (error) => {
      console.error('❌ WebSocket 服务器错误:', error);
    });
  }

  /**
   * 处理客户端消息
   */
  private handleClientMessage(ws: WebSocket, message: WSMessage) {
    const { type, data } = message;

    switch (type) {
      case 'progress':
        // 客户端请求订阅某个任务的进度
        if (data.jobId) {
          this.subscribeToJob(ws, data.jobId);
        }
        break;

      default:
        console.warn(`⚠️  未知消息类型: ${type}`);
    }
  }

  /**
   * 订阅任务进度
   */
  subscribeToJob(ws: WebSocket, jobId: string) {
    const subscriptions = this.clients.get(ws);
    if (subscriptions) {
      subscriptions.add(jobId);
      console.log(`📝 客户端订阅任务: ${jobId}`);
    }
  }

  /**
   * 取消订阅任务进度
   */
  unsubscribeFromJob(ws: WebSocket, jobId: string) {
    const subscriptions = this.clients.get(ws);
    if (subscriptions) {
      subscriptions.delete(jobId);
      console.log(`📝 客户端取消订阅任务: ${jobId}`);
    }
  }

  /**
   * 发送消息到指定客户端
   */
  private sendToClient(ws: WebSocket, message: WSMessage) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  /**
   * 广播消息到所有订阅了某个任务的客户端
   */
  broadcast(jobId: string, message: WSMessage) {
    for (const [ws, subscriptions] of this.clients) {
      if (subscriptions.has(jobId)) {
        this.sendToClient(ws, message);
      }
    }

    // 调用注册的处理器
    const handlers = this.jobHandlers.get(jobId);
    if (handlers) {
      handlers.forEach((handler) => handler(message));
    }
  }

  /**
   * 发送进度更新
   */
  sendProgress(jobId: string, progress: number, message?: string) {
    this.broadcast(jobId, {
      type: 'progress',
      data: {
        jobId,
        progress,
        message,
      },
    });
  }

  /**
   * 发送状态更新
   */
  sendStatus(jobId: string, status: string, message?: string) {
    this.broadcast(jobId, {
      type: 'status',
      data: {
        jobId,
        status,
        message,
      },
    });
  }

  /**
   * 发送错误
   */
  sendError(jobId: string, error: string) {
    this.broadcast(jobId, {
      type: 'error',
      data: {
        jobId,
        error,
      },
    });
  }

  /**
   * 发送完成通知
   */
  sendComplete(jobId: string, result?: Record<string, unknown>) {
    this.broadcast(jobId, {
      type: 'complete',
      data: {
        jobId,
        ...result,
      },
    });
  }

  /**
   * 注册任务完成处理器
   */
  onJobComplete(jobId: string, handler: WSMessageHandler) {
    if (!this.jobHandlers.has(jobId)) {
      this.jobHandlers.set(jobId, new Set());
    }
    this.jobHandlers.get(jobId)!.add(handler);
  }

  /**
   * 移除任务处理器
   */
  removeJobHandlers(jobId: string) {
    this.jobHandlers.delete(jobId);
  }

  /**
   * 获取连接的客户端数量
   */
  getClientCount(): number {
    return this.clients.size;
  }

  /**
   * 关闭服务器
   */
  close() {
    if (this.wss) {
      this.wss.close(() => {
        console.log('🔌 WebSocket 服务器已关闭');
      });
      this.wss = null;
    }
  }
}

// ============================================
// 导出单例实例
// ============================================

export const wsServer = new WSServer();

export default wsServer;
