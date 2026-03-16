/**
 * FxTunnel Client SDK
 * Main client class for connecting to fxTunnel server
 */

import { EventEmitter } from 'events';
import { Socket, createConnection } from 'net';
import { randomBytes } from 'crypto';
import { Codec, MessageReader } from './codec';
import {
  MessageType,
  TunnelType,
  AuthMessage,
  AuthResultMessage,
  TunnelRequestMessage,
  TunnelCreatedMessage,
  TunnelCloseMessage,
  PingMessage,
  PongMessage,
  AnyMessage,
  ErrorCode,
} from './protocol';
import {
  ClientConfig,
  TunnelConfig,
  ActiveTunnel,
  ClientEvents,
  AuthResult,
} from './types';

/**
 * Default configuration values
 */
const DEFAULTS = {
  DIAL_TIMEOUT: 30000,
  AUTH_RESPONSE_TIMEOUT: 30000,
  TUNNEL_RESPONSE_TIMEOUT: 30000,
  KEEPALIVE_INTERVAL: 30000,
  RECONNECT_INTERVAL: 5000,
  RECONNECT_MAX_BACKOFF: 120000,
  TRAFFIC_STATS_INTERVAL: 2000,
};

/**
 * FxTunnel Client
 */
export class FxTunnelClient extends EventEmitter {
  private config: ClientConfig;
  private socket: Socket | null = null;
  private messageReader: MessageReader = new MessageReader();
  private connected: boolean = false;
  private reconnecting: boolean = false;

  private clientId: string = '';
  private sessionId: string = '';
  private sessionSecret: string = '';

  private tunnels: Map<string, ActiveTunnel> = new Map();
  private pendingRequests: Map<
    string,
    { resolve: (msg: TunnelCreatedMessage) => void; reject: (err: Error) => void }
  > = new Map();

  private keepaliveTimer: NodeJS.Timeout | null = null;
  private trafficTimers: Map<string, NodeJS.Timeout> = new Map();

  private reconnectAttempts: number = 0;
  private shouldReconnect: boolean = true;

  /**
   * Create a new FxTunnel client
   * @param config Client configuration
   */
  constructor(config: ClientConfig) {
    super();
    this.config = {
      ...config,
      reconnect: {
        enabled: true,
        interval: DEFAULTS.RECONNECT_INTERVAL,
        maxAttempts: 0, // infinite
        ...config.reconnect,
      },
    };
  }

  /**
   * Connect to the fxTunnel server
   */
  async connect(): Promise<void> {
    if (this.connected) {
      throw new Error('Client already connected');
    }

    this.emit('connecting');

    try {
      // Parse server address
      const [host, portStr] = this.config.server.address.split(':');
      const port = parseInt(portStr, 10);

      if (!host || !port) {
        throw new Error('Invalid server address format. Expected: host:port');
      }

      // Create TCP connection
      this.socket = await this.createConnection(host, port);

      // Setup message reader
      this.messageReader.reset();
      this.socket.on('data', (data: Buffer) => {
        try {
          const messages = this.messageReader.feed(data);
          for (const message of messages) {
            this.handleMessage(message);
          }
        } catch (err) {
          this.emit('error', err instanceof Error ? err : new Error(String(err)));
        }
      });

      this.socket.on('error', (err) => {
        this.emit('error', err);
      });

      this.socket.on('close', () => {
        this.handleDisconnect();
      });

      // Authenticate
      const authResult = await this.authenticate();

      if (!authResult.success) {
        throw new Error(`Authentication failed: ${authResult.error}`);
      }

      this.clientId = authResult.clientId || '';
      this.sessionId = authResult.sessionId || '';
      this.sessionSecret = authResult.sessionSecret || '';
      this.connected = true;
      this.reconnectAttempts = 0;

      this.emit('connected', {
        clientId: this.clientId,
        sessionId: this.sessionId,
        server: this.config.server.address,
      });

      // Start keepalive
      this.startKeepalive();

      // Create configured tunnels
      if (this.config.tunnels) {
        for (const tunnelConfig of this.config.tunnels) {
          try {
            await this.createTunnel(tunnelConfig);
          } catch (err) {
            this.emit('error', err instanceof Error ? err : new Error(String(err)));
          }
        }
      }
    } catch (err) {
      if (this.socket) {
        this.socket.destroy();
        this.socket = null;
      }
      throw err;
    }
  }

  /**
   * Create TCP connection to server
   */
  private createConnection(host: string, port: number): Promise<Socket> {
    return new Promise((resolve, reject) => {
      const socket = createConnection({ host, port });

      const timeout = setTimeout(() => {
        socket.destroy();
        reject(new Error('Connection timeout'));
      }, DEFAULTS.DIAL_TIMEOUT);

      socket.once('connect', () => {
        clearTimeout(timeout);
        socket.setKeepAlive(true);
        socket.setNoDelay(true);
        resolve(socket);
      });

      socket.once('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });
  }

  /**
   * Authenticate with the server
   */
  private async authenticate(): Promise<AuthResult> {
    const requestId = this.generateId();
    const authMsg: AuthMessage = {
      type: MessageType.AUTH,
      timestamp: Date.now(),
      token: this.config.server.token,
      client_id: this.generateId(),
      user_agent: 'fxtunnel-node-sdk/1.0.0',
      request_id: requestId,
    };

    this.sendMessage(authMsg);

    // Wait for auth result
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Authentication timeout'));
      }, DEFAULTS.AUTH_RESPONSE_TIMEOUT);

      const handler = (message: AnyMessage) => {
        if (message.type === MessageType.AUTH_RESULT) {
          clearTimeout(timeout);
          const result = message as AuthResultMessage;
          resolve({
            success: result.success,
            clientId: result.client_id,
            sessionId: result.session_id,
            sessionSecret: result.session_secret,
            maxTunnels: result.max_tunnels,
            serverName: result.server_name,
            capabilities: result.capabilities,
            error: result.error,
            code: result.code,
          });
        }
      };

      // Use internal event for message handling
      super.once('_internal:auth_result', handler);
    });
  }

  /**
   * Create a new tunnel
   * @param config Tunnel configuration
   * @returns Active tunnel information
   */
  async createTunnel(config: TunnelConfig): Promise<ActiveTunnel> {
    if (!this.connected) {
      throw new Error('Client not connected');
    }

    const requestId = this.generateId();
    const request: TunnelRequestMessage = {
      type: MessageType.TUNNEL_REQUEST,
      timestamp: Date.now(),
      tunnel_type: config.type,
      name: config.name,
      local_port: config.localPort,
      remote_port: config.remotePort || 0,
      subdomain: config.subdomain,
      request_id: requestId,
    };

    this.sendMessage(request);

    // Wait for tunnel created response
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error('Tunnel creation timeout'));
      }, DEFAULTS.TUNNEL_RESPONSE_TIMEOUT);

      this.pendingRequests.set(requestId, {
        resolve: (msg: TunnelCreatedMessage) => {
          clearTimeout(timeout);

          const tunnel: ActiveTunnel = {
            id: msg.tunnel_id,
            config,
            url: msg.url,
            remoteAddr: msg.remote_addr,
            connectedAt: new Date(),
            bytesSent: 0,
            bytesReceived: 0,
          };

          this.tunnels.set(tunnel.id, tunnel);
          this.emit('tunnelCreated', tunnel);

          // Start traffic stats timer
          this.startTrafficStats(tunnel.id);

          resolve(tunnel);
        },
        reject: (err: Error) => {
          clearTimeout(timeout);
          reject(err);
        },
      });
    });
  }

  /**
   * Close a specific tunnel
   * @param tunnelId Tunnel ID
   */
  async closeTunnel(tunnelId: string): Promise<void> {
    const tunnel = this.tunnels.get(tunnelId);
    if (!tunnel) {
      throw new Error(`Tunnel not found: ${tunnelId}`);
    }

    const msg: TunnelCloseMessage = {
      type: MessageType.TUNNEL_CLOSE,
      timestamp: Date.now(),
      tunnel_id: tunnelId,
    };

    this.sendMessage(msg);
  }

  /**
   * Get all active tunnels
   * @returns Array of active tunnels
   */
  getTunnels(): ActiveTunnel[] {
    return Array.from(this.tunnels.values());
  }

  /**
   * Get a specific tunnel by ID
   * @param tunnelId Tunnel ID
   * @returns Active tunnel or undefined
   */
  getTunnel(tunnelId: string): ActiveTunnel | undefined {
    return this.tunnels.get(tunnelId);
  }

  /**
   * Disconnect from the server
   */
  disconnect(): void {
    this.shouldReconnect = false;
    this.cleanup();
  }

  /**
   * Send a message to the server
   */
  private sendMessage(message: AnyMessage): void {
    if (!this.socket || this.socket.destroyed) {
      throw new Error('Socket not connected');
    }

    const buffer = Codec.encode(message);
    this.socket.write(buffer);
  }

  /**
   * Handle incoming messages
   */
  private handleMessage(message: AnyMessage): void {
    // Emit internal event for auth handler
    if (message.type === MessageType.AUTH_RESULT) {
      super.emit('_internal:auth_result', message);
    }

    switch (message.type) {
      case MessageType.TUNNEL_CREATED:
        this.handleTunnelCreated(message);
        break;

      case MessageType.TUNNEL_CLOSED:
        this.handleTunnelClosed(message);
        break;

      case MessageType.TUNNEL_ERROR:
        this.handleTunnelError(message);
        break;

      case MessageType.PING:
        this.handlePing();
        break;

      case MessageType.PONG:
        // Keepalive pong received
        break;

      case MessageType.SERVER_SHUTDOWN:
        this.handleServerShutdown(message);
        break;

      case MessageType.ERROR:
        this.handleError(message);
        break;
    }
  }

  /**
   * Handle tunnel created message
   */
  private handleTunnelCreated(message: TunnelCreatedMessage): void {
    const pending = this.pendingRequests.get(message.request_id || '');
    if (pending) {
      this.pendingRequests.delete(message.request_id || '');
      pending.resolve(message);
    }
  }

  /**
   * Handle tunnel closed message
   */
  private handleTunnelClosed(message: any): void {
    const tunnel = this.tunnels.get(message.tunnel_id);
    if (tunnel) {
      // Stop traffic stats
      const timer = this.trafficTimers.get(message.tunnel_id);
      if (timer) {
        clearInterval(timer);
        this.trafficTimers.delete(message.tunnel_id);
      }

      this.emit('tunnelClosed', {
        tunnelId: message.tunnel_id,
        bytesSent: tunnel.bytesSent,
        bytesReceived: tunnel.bytesReceived,
      });

      this.tunnels.delete(message.tunnel_id);
    }
  }

  /**
   * Handle tunnel error message
   */
  private handleTunnelError(message: any): void {
    const pending = this.pendingRequests.get(message.request_id || '');
    if (pending) {
      this.pendingRequests.delete(message.request_id || '');
      pending.reject(new Error(`${message.error} (${message.code})`));
    }

    this.emit('tunnelError', {
      tunnelId: message.tunnel_id,
      error: message.error,
      code: message.code,
    });
  }

  /**
   * Handle ping message
   */
  private handlePing(): void {
    const pong: PongMessage = {
      type: MessageType.PONG,
      timestamp: Date.now(),
    };
    this.sendMessage(pong);
  }

  /**
   * Handle server shutdown message
   */
  private handleServerShutdown(message: any): void {
    this.emit('disconnected', { reason: 'server_shutdown' });
    this.handleDisconnect();
  }

  /**
   * Handle error message
   */
  private handleError(message: any): void {
    const err = new Error(`Server error: ${message.error} (${message.code})`);
    this.emit('error', err);

    if (message.fatal) {
      this.cleanup();
    }
  }

  /**
   * Handle disconnection
   */
  private handleDisconnect(): void {
    if (this.reconnecting) {
      return;
    }

    this.connected = false;
    this.emit('disconnected');

    if (
      this.shouldReconnect &&
      this.config.reconnect?.enabled !== false
    ) {
      this.reconnecting = true;
      this.reconnect();
    } else {
      this.cleanup();
    }
  }

  /**
   * Attempt to reconnect to the server
   */
  private async reconnect(): Promise<void> {
    const maxAttempts = this.config.reconnect?.maxAttempts || 0;
    const baseInterval = this.config.reconnect?.interval || DEFAULTS.RECONNECT_INTERVAL;

    while (this.shouldReconnect) {
      this.reconnectAttempts++;

      if (maxAttempts > 0 && this.reconnectAttempts > maxAttempts) {
        this.emit('error', new Error('Max reconnection attempts reached'));
        this.cleanup();
        return;
      }

      this.emit('reconnecting', { attempt: this.reconnectAttempts });

      // Exponential backoff with jitter
      const backoff = Math.min(
        baseInterval * Math.pow(2, this.reconnectAttempts - 1),
        DEFAULTS.RECONNECT_MAX_BACKOFF
      );
      const jitter = backoff * (0.8 + Math.random() * 0.4);

      await this.sleep(jitter);

      try {
        this.cleanup(false);
        await this.connect();
        this.reconnecting = false;
        return;
      } catch (err) {
        // Continue reconnecting
      }
    }
  }

  /**
   * Start keepalive timer
   */
  private startKeepalive(): void {
    this.keepaliveTimer = setInterval(() => {
      try {
        const ping: PingMessage = {
          type: MessageType.PING,
          timestamp: Date.now(),
        };
        this.sendMessage(ping);
      } catch (err) {
        // Ignore errors, will be handled by socket close
      }
    }, DEFAULTS.KEEPALIVE_INTERVAL);
  }

  /**
   * Start traffic stats timer for a tunnel
   */
  private startTrafficStats(tunnelId: string): void {
    const timer = setInterval(() => {
      const tunnel = this.tunnels.get(tunnelId);
      if (tunnel) {
        this.emit('trafficUpdate', {
          tunnelId: tunnel.id,
          bytesSent: tunnel.bytesSent,
          bytesReceived: tunnel.bytesReceived,
        });
      }
    }, DEFAULTS.TRAFFIC_STATS_INTERVAL);

    this.trafficTimers.set(tunnelId, timer);
  }

  /**
   * Cleanup resources
   */
  private cleanup(emitDisconnect: boolean = true): void {
    if (this.keepaliveTimer) {
      clearInterval(this.keepaliveTimer);
      this.keepaliveTimer = null;
    }

    for (const timer of this.trafficTimers.values()) {
      clearInterval(timer);
    }
    this.trafficTimers.clear();

    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.destroy();
      this.socket = null;
    }

    this.tunnels.clear();
    this.pendingRequests.clear();
    this.messageReader.reset();
    this.connected = false;

    if (emitDisconnect) {
      this.emit('disconnected');
    }
  }

  /**
   * Generate a random ID
   */
  private generateId(): string {
    return randomBytes(16).toString('hex');
  }

  /**
   * Sleep for a specified duration
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Type-safe event emitter methods
   */
  on<K extends keyof ClientEvents>(event: K, listener: ClientEvents[K]): this {
    return super.on(event, listener as any);
  }

  once<K extends keyof ClientEvents>(event: K, listener: ClientEvents[K]): this {
    return super.once(event, listener as any);
  }

  emit<K extends keyof ClientEvents>(
    event: K,
    ...args: Parameters<ClientEvents[K]>
  ): boolean {
    return super.emit(event, ...args);
  }
}
