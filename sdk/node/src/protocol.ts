/**
 * Protocol types and message definitions for fxTunnel
 */

/**
 * Message types used in the fxTunnel protocol
 */
export enum MessageType {
  // Authentication
  AUTH = 'auth',
  AUTH_RESULT = 'auth_result',

  // Tunnel management
  TUNNEL_REQUEST = 'tunnel_request',
  TUNNEL_CREATED = 'tunnel_created',
  TUNNEL_CLOSE = 'tunnel_close',
  TUNNEL_CLOSED = 'tunnel_closed',
  TUNNEL_ERROR = 'tunnel_error',

  // Connection notifications
  NEW_CONNECTION = 'new_connection',
  CONNECTION_ACCEPT = 'connection_accept',
  CONNECTION_CLOSE = 'connection_close',

  // Keepalive
  PING = 'ping',
  PONG = 'pong',

  // Server lifecycle
  SERVER_SHUTDOWN = 'server_shutdown',

  // Session pooling
  JOIN_SESSION = 'join_session',
  JOIN_SESSION_RESULT = 'join_session_result',

  // Errors
  ERROR = 'error',
}

/**
 * Tunnel types supported by fxTunnel
 */
export enum TunnelType {
  HTTP = 'http',
  TCP = 'tcp',
  UDP = 'udp',
}

/**
 * Error codes used in the protocol
 */
export enum ErrorCode {
  AUTH_FAILED = 'AUTH_FAILED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TUNNEL_LIMIT = 'TUNNEL_LIMIT',
  SUBDOMAIN_TAKEN = 'SUBDOMAIN_TAKEN',
  SUBDOMAIN_INVALID = 'SUBDOMAIN_INVALID',
  PORT_UNAVAILABLE = 'PORT_UNAVAILABLE',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  PROTOCOL_ERROR = 'PROTOCOL_ERROR',
}

/**
 * Base message structure
 */
export interface Message {
  type: MessageType;
  request_id?: string;
  timestamp: number;
}

/**
 * Authentication message sent by client
 */
export interface AuthMessage extends Message {
  type: MessageType.AUTH;
  token: string;
  client_id?: string;
  user_agent?: string;
}

/**
 * Client capabilities based on user's plan
 */
export interface ClientCapabilities {
  inspector_enabled: boolean;
  max_body_size?: number;
  max_buffer_entries?: number;
}

/**
 * Authentication result from server
 */
export interface AuthResultMessage extends Message {
  type: MessageType.AUTH_RESULT;
  success: boolean;
  client_id?: string;
  error?: string;
  code?: string;
  max_tunnels?: number;
  server_name?: string;
  session_id?: string;
  session_secret?: string;
  min_version?: string;
  capabilities?: ClientCapabilities;
}

/**
 * Tunnel request message
 */
export interface TunnelRequestMessage extends Message {
  type: MessageType.TUNNEL_REQUEST;
  tunnel_type: TunnelType;
  name?: string;

  // For HTTP tunnels
  subdomain?: string;

  // For TCP/UDP tunnels
  local_port: number;
  remote_port?: number; // 0 = auto-assign
}

/**
 * Tunnel created confirmation
 */
export interface TunnelCreatedMessage extends Message {
  type: MessageType.TUNNEL_CREATED;
  tunnel_id: string;
  tunnel_type: TunnelType;
  name?: string;

  // For HTTP tunnels
  url?: string;
  subdomain?: string;

  // For TCP/UDP tunnels
  remote_port?: number;
  remote_addr?: string;
}

/**
 * Tunnel close request
 */
export interface TunnelCloseMessage extends Message {
  type: MessageType.TUNNEL_CLOSE;
  tunnel_id: string;
}

/**
 * Tunnel closed confirmation
 */
export interface TunnelClosedMessage extends Message {
  type: MessageType.TUNNEL_CLOSED;
  tunnel_id: string;
}

/**
 * Tunnel error message
 */
export interface TunnelErrorMessage extends Message {
  type: MessageType.TUNNEL_ERROR;
  tunnel_id?: string;
  error: string;
  code?: string;
}

/**
 * New connection notification
 */
export interface NewConnectionMessage extends Message {
  type: MessageType.NEW_CONNECTION;
  tunnel_id: string;
  connection_id: string;
  remote_addr: string;

  // For HTTP connections
  host?: string;
  method?: string;
  path?: string;
}

/**
 * Connection accept message
 */
export interface ConnectionAcceptMessage extends Message {
  type: MessageType.CONNECTION_ACCEPT;
  connection_id: string;
}

/**
 * Connection close notification
 */
export interface ConnectionCloseMessage extends Message {
  type: MessageType.CONNECTION_CLOSE;
  connection_id: string;
  error?: string;
}

/**
 * Ping message for keepalive
 */
export interface PingMessage extends Message {
  type: MessageType.PING;
}

/**
 * Pong message for keepalive response
 */
export interface PongMessage extends Message {
  type: MessageType.PONG;
}

/**
 * General error message
 */
export interface ErrorMessage extends Message {
  type: MessageType.ERROR;
  error: string;
  code?: string;
  fatal?: boolean;
}

/**
 * Server shutdown notification
 */
export interface ServerShutdownMessage extends Message {
  type: MessageType.SERVER_SHUTDOWN;
  reason?: string;
}

/**
 * Join session message for additional data connections
 */
export interface JoinSessionMessage extends Message {
  type: MessageType.JOIN_SESSION;
  client_id: string;
  secret: string;
}

/**
 * Join session result
 */
export interface JoinSessionResultMessage extends Message {
  type: MessageType.JOIN_SESSION_RESULT;
  success: boolean;
  error?: string;
}

/**
 * Union type of all possible messages
 */
export type AnyMessage =
  | AuthMessage
  | AuthResultMessage
  | TunnelRequestMessage
  | TunnelCreatedMessage
  | TunnelCloseMessage
  | TunnelClosedMessage
  | TunnelErrorMessage
  | NewConnectionMessage
  | ConnectionAcceptMessage
  | ConnectionCloseMessage
  | PingMessage
  | PongMessage
  | ErrorMessage
  | ServerShutdownMessage
  | JoinSessionMessage
  | JoinSessionResultMessage;
