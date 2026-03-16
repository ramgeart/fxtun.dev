/**
 * Type definitions for the fxTunnel client SDK
 */

import { TunnelType, ClientCapabilities } from './protocol';

/**
 * Tunnel configuration
 */
export interface TunnelConfig {
  /** Tunnel name (optional) */
  name?: string;

  /** Tunnel type */
  type: TunnelType;

  /** Local port to forward */
  localPort: number;

  /** Local address to forward to (default: 'localhost') */
  localAddress?: string;

  /** Remote port (for TCP/UDP tunnels, 0 = auto-assign) */
  remotePort?: number;

  /** Subdomain (for HTTP tunnels) */
  subdomain?: string;
}

/**
 * Server connection configuration
 */
export interface ServerConfig {
  /** Server address (host:port) */
  address: string;

  /** API token for authentication */
  token: string;

  /** Enable compression (default: false) */
  compression?: boolean;
}

/**
 * Reconnection configuration
 */
export interface ReconnectConfig {
  /** Enable automatic reconnection (default: true) */
  enabled?: boolean;

  /** Base interval between reconnection attempts in ms (default: 5000) */
  interval?: number;

  /** Maximum number of reconnection attempts (0 = infinite) */
  maxAttempts?: number;
}

/**
 * Client configuration
 */
export interface ClientConfig {
  /** Server connection settings */
  server: ServerConfig;

  /** List of tunnels to create */
  tunnels?: TunnelConfig[];

  /** Reconnection settings */
  reconnect?: ReconnectConfig;
}

/**
 * Active tunnel information
 */
export interface ActiveTunnel {
  /** Tunnel ID */
  id: string;

  /** Tunnel configuration */
  config: TunnelConfig;

  /** Public URL (for HTTP tunnels) */
  url?: string;

  /** Remote address (for TCP/UDP tunnels) */
  remoteAddr?: string;

  /** Connection timestamp */
  connectedAt: Date;

  /** Bytes sent */
  bytesSent: number;

  /** Bytes received */
  bytesReceived: number;
}

/**
 * Client events
 */
export interface ClientEvents {
  /** Emitted when client is connecting to server */
  connecting: () => void;

  /** Emitted when client successfully connects to server */
  connected: (data: { clientId: string; sessionId: string; server: string }) => void;

  /** Emitted when client disconnects from server */
  disconnected: (data?: { reason?: string }) => void;

  /** Emitted when client is attempting to reconnect */
  reconnecting: (data: { attempt: number }) => void;

  /** Emitted when a tunnel is created */
  tunnelCreated: (tunnel: ActiveTunnel) => void;

  /** Emitted when a tunnel is closed */
  tunnelClosed: (data: { tunnelId: string; bytesSent: number; bytesReceived: number }) => void;

  /** Emitted when a tunnel encounters an error */
  tunnelError: (data: { tunnelId?: string; error: string; code?: string }) => void;

  /** Emitted periodically with traffic statistics */
  trafficUpdate: (data: { tunnelId: string; bytesSent: number; bytesReceived: number }) => void;

  /** Emitted on general errors */
  error: (error: Error) => void;
}

/**
 * Authentication result
 */
export interface AuthResult {
  success: boolean;
  clientId?: string;
  sessionId?: string;
  sessionSecret?: string;
  maxTunnels?: number;
  serverName?: string;
  capabilities?: ClientCapabilities;
  error?: string;
  code?: string;
}

/**
 * Connection information
 */
export interface ConnectionInfo {
  id: string;
  tunnelId: string;
  remoteAddr: string;
  host?: string;
  method?: string;
  path?: string;
}
