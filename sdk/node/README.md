# FxTunnel Node.js SDK

Official Node.js SDK for [fxTunnel](https://fxtun.dev) - a self-hosted reverse tunneling solution.

## Installation

```bash
npm install @fxtunnel/sdk
```

## Quick Start

```javascript
const { FxTunnelClient, TunnelType } = require('@fxtunnel/sdk');

// Create a client
const client = new FxTunnelClient({
  server: {
    address: 'tunnel.example.com:4443',
    token: 'sk_your_token_here',
  },
});

// Listen for events
client.on('connected', ({ clientId, sessionId }) => {
  console.log(`Connected! Client ID: ${clientId}`);
});

client.on('tunnelCreated', (tunnel) => {
  console.log(`Tunnel created: ${tunnel.url || tunnel.remoteAddr}`);
});

client.on('error', (error) => {
  console.error('Error:', error);
});

// Connect to the server
await client.connect();

// Create an HTTP tunnel
const httpTunnel = await client.createTunnel({
  type: TunnelType.HTTP,
  localPort: 3000,
  subdomain: 'myapp', // optional, random if not specified
});

console.log(`HTTP tunnel available at: ${httpTunnel.url}`);

// Create a TCP tunnel
const tcpTunnel = await client.createTunnel({
  type: TunnelType.TCP,
  localPort: 22,
  name: 'ssh',
});

console.log(`TCP tunnel available at: ${tcpTunnel.remoteAddr}`);

// Create a UDP tunnel
const udpTunnel = await client.createTunnel({
  type: TunnelType.UDP,
  localPort: 53,
  name: 'dns',
});

console.log(`UDP tunnel available at: ${udpTunnel.remoteAddr}`);
```

## TypeScript Support

The SDK is written in TypeScript and includes full type definitions:

```typescript
import {
  FxTunnelClient,
  ClientConfig,
  TunnelType,
  ActiveTunnel
} from '@fxtunnel/sdk';

const config: ClientConfig = {
  server: {
    address: 'tunnel.example.com:4443',
    token: 'sk_your_token_here',
  },
  reconnect: {
    enabled: true,
    interval: 5000,
    maxAttempts: 0, // infinite
  },
};

const client = new FxTunnelClient(config);

client.on('tunnelCreated', (tunnel: ActiveTunnel) => {
  console.log(`Tunnel ${tunnel.id} created`);
});

await client.connect();
```

## Configuration

### Client Configuration

```typescript
interface ClientConfig {
  server: ServerConfig;
  tunnels?: TunnelConfig[];
  reconnect?: ReconnectConfig;
}
```

### Server Configuration

```typescript
interface ServerConfig {
  /** Server address (host:port) */
  address: string;

  /** API token for authentication */
  token: string;

  /** Enable compression (default: false) */
  compression?: boolean;
}
```

### Tunnel Configuration

```typescript
interface TunnelConfig {
  /** Tunnel name (optional) */
  name?: string;

  /** Tunnel type */
  type: TunnelType; // 'http' | 'tcp' | 'udp'

  /** Local port to forward */
  localPort: number;

  /** Local address to forward to (default: 'localhost') */
  localAddress?: string;

  /** Remote port (for TCP/UDP tunnels, 0 = auto-assign) */
  remotePort?: number;

  /** Subdomain (for HTTP tunnels) */
  subdomain?: string;
}
```

### Reconnection Configuration

```typescript
interface ReconnectConfig {
  /** Enable automatic reconnection (default: true) */
  enabled?: boolean;

  /** Base interval between reconnection attempts in ms (default: 5000) */
  interval?: number;

  /** Maximum number of reconnection attempts (0 = infinite) */
  maxAttempts?: number;
}
```

## API Reference

### FxTunnelClient

#### Constructor

```typescript
new FxTunnelClient(config: ClientConfig)
```

#### Methods

##### `connect(): Promise<void>`

Connect to the fxTunnel server and authenticate.

```javascript
await client.connect();
```

##### `createTunnel(config: TunnelConfig): Promise<ActiveTunnel>`

Create a new tunnel.

```javascript
const tunnel = await client.createTunnel({
  type: TunnelType.HTTP,
  localPort: 3000,
  subdomain: 'myapp',
});
```

##### `closeTunnel(tunnelId: string): Promise<void>`

Close a specific tunnel.

```javascript
await client.closeTunnel(tunnel.id);
```

##### `getTunnels(): ActiveTunnel[]`

Get all active tunnels.

```javascript
const tunnels = client.getTunnels();
```

##### `getTunnel(tunnelId: string): ActiveTunnel | undefined`

Get a specific tunnel by ID.

```javascript
const tunnel = client.getTunnel('tunnel-id');
```

##### `disconnect(): void`

Disconnect from the server.

```javascript
client.disconnect();
```

#### Events

##### `connecting`

Emitted when the client is connecting to the server.

```javascript
client.on('connecting', () => {
  console.log('Connecting to server...');
});
```

##### `connected`

Emitted when the client successfully connects to the server.

```javascript
client.on('connected', ({ clientId, sessionId, server }) => {
  console.log(`Connected to ${server}`);
});
```

##### `disconnected`

Emitted when the client disconnects from the server.

```javascript
client.on('disconnected', ({ reason }) => {
  console.log(`Disconnected: ${reason || 'unknown'}`);
});
```

##### `reconnecting`

Emitted when the client is attempting to reconnect.

```javascript
client.on('reconnecting', ({ attempt }) => {
  console.log(`Reconnection attempt ${attempt}...`);
});
```

##### `tunnelCreated`

Emitted when a tunnel is successfully created.

```javascript
client.on('tunnelCreated', (tunnel) => {
  console.log(`Tunnel created: ${tunnel.url || tunnel.remoteAddr}`);
});
```

##### `tunnelClosed`

Emitted when a tunnel is closed.

```javascript
client.on('tunnelClosed', ({ tunnelId, bytesSent, bytesReceived }) => {
  console.log(`Tunnel ${tunnelId} closed`);
  console.log(`Sent: ${bytesSent} bytes, Received: ${bytesReceived} bytes`);
});
```

##### `tunnelError`

Emitted when a tunnel encounters an error.

```javascript
client.on('tunnelError', ({ tunnelId, error, code }) => {
  console.error(`Tunnel error: ${error} (${code})`);
});
```

##### `trafficUpdate`

Emitted periodically with traffic statistics.

```javascript
client.on('trafficUpdate', ({ tunnelId, bytesSent, bytesReceived }) => {
  console.log(`Traffic: ${bytesSent} sent, ${bytesReceived} received`);
});
```

##### `error`

Emitted when an error occurs.

```javascript
client.on('error', (error) => {
  console.error('Error:', error);
});
```

## Examples

### Create Multiple Tunnels

```javascript
const { FxTunnelClient, TunnelType } = require('@fxtunnel/sdk');

const client = new FxTunnelClient({
  server: {
    address: 'tunnel.example.com:4443',
    token: 'sk_your_token',
  },
  tunnels: [
    {
      type: TunnelType.HTTP,
      localPort: 3000,
      subdomain: 'webapp',
      name: 'Web Application',
    },
    {
      type: TunnelType.TCP,
      localPort: 22,
      name: 'SSH',
    },
    {
      type: TunnelType.UDP,
      localPort: 53,
      name: 'DNS Server',
    },
  ],
});

client.on('connected', () => {
  console.log('Connected!');
});

client.on('tunnelCreated', (tunnel) => {
  console.log(`${tunnel.config.name}: ${tunnel.url || tunnel.remoteAddr}`);
});

await client.connect();
```

### Handle Reconnection

```javascript
const client = new FxTunnelClient({
  server: {
    address: 'tunnel.example.com:4443',
    token: 'sk_your_token',
  },
  reconnect: {
    enabled: true,
    interval: 5000,
    maxAttempts: 10,
  },
});

client.on('reconnecting', ({ attempt }) => {
  console.log(`Reconnecting... (attempt ${attempt})`);
});

client.on('connected', () => {
  console.log('Connected successfully!');
});

await client.connect();
```

### Monitor Traffic

```javascript
client.on('trafficUpdate', ({ tunnelId, bytesSent, bytesReceived }) => {
  const tunnel = client.getTunnel(tunnelId);
  if (tunnel) {
    console.log(`[${tunnel.config.name}] Sent: ${formatBytes(bytesSent)}, Received: ${formatBytes(bytesReceived)}`);
  }
});

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}
```

### Graceful Shutdown

```javascript
process.on('SIGINT', async () => {
  console.log('Shutting down...');

  // Close all tunnels
  for (const tunnel of client.getTunnels()) {
    await client.closeTunnel(tunnel.id);
  }

  // Disconnect
  client.disconnect();

  process.exit(0);
});
```

## Protocol

The SDK implements the fxTunnel protocol, which uses length-prefixed JSON messages over TCP:

```
┌──────────────┬──────────────────────────────┐
│ Length (4B)   │ JSON Payload                 │
│ big-endian    │                              │
└──────────────┴──────────────────────────────┘
```

## License

MIT with Attribution Requirement

## Links

- [fxTunnel Website](https://fxtun.dev)
- [GitHub Repository](https://github.com/mephistofox/fxtun.dev)
- [Documentation](https://github.com/mephistofox/fxtun.dev)
- [Issues](https://github.com/mephistofox/fxtun.dev/issues)
