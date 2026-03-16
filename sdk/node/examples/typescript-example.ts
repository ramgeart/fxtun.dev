/**
 * TypeScript Example
 *
 * This example demonstrates using the SDK with TypeScript
 * and proper type definitions.
 */

import {
  FxTunnelClient,
  ClientConfig,
  TunnelType,
  ActiveTunnel,
  TunnelConfig,
} from '../dist';

async function main(): Promise<void> {
  // Configuration with full type safety
  const config: ClientConfig = {
    server: {
      address: process.env.FXTUNNEL_SERVER || 'tunnel.example.com:4443',
      token: process.env.FXTUNNEL_TOKEN || 'sk_your_token_here',
    },
    reconnect: {
      enabled: true,
      interval: 5000,
      maxAttempts: 0, // infinite
    },
  };

  console.log('FxTunnel TypeScript Example');
  console.log('===========================\n');

  // Create client with type-safe configuration
  const client = new FxTunnelClient(config);

  // Type-safe event handlers
  client.on('connecting', () => {
    console.log('Connecting to server...');
  });

  client.on('connected', ({ clientId, sessionId, server }) => {
    console.log(`✓ Connected to ${server}`);
    console.log(`  Client ID: ${clientId}`);
    console.log(`  Session ID: ${sessionId}\n`);
  });

  client.on('tunnelCreated', (tunnel: ActiveTunnel) => {
    console.log(`✓ Tunnel created: ${tunnel.config.name || 'Unnamed'}`);
    console.log(`  ${tunnel.url || tunnel.remoteAddr}\n`);
  });

  client.on('tunnelClosed', ({ tunnelId, bytesSent, bytesReceived }) => {
    console.log(`Tunnel ${tunnelId} closed`);
    console.log(`  Sent: ${formatBytes(bytesSent)}`);
    console.log(`  Received: ${formatBytes(bytesReceived)}\n`);
  });

  client.on('tunnelError', ({ tunnelId, error, code }) => {
    console.error(`Tunnel error [${tunnelId}]: ${error} (${code})`);
  });

  client.on('error', (error: Error) => {
    console.error('Error:', error.message);
  });

  client.on('disconnected', ({ reason }) => {
    console.log(`Disconnected${reason ? `: ${reason}` : ''}`);
  });

  client.on('reconnecting', ({ attempt }) => {
    console.log(`Reconnecting... (attempt ${attempt})`);
  });

  try {
    // Connect to server
    await client.connect();

    // Define tunnels with type safety
    const tunnelConfigs: TunnelConfig[] = [
      {
        type: TunnelType.HTTP,
        localPort: 3000,
        subdomain: 'webapp',
        name: 'Web Application',
      },
      {
        type: TunnelType.TCP,
        localPort: 22,
        name: 'SSH Server',
      },
    ];

    // Create tunnels
    const tunnels: ActiveTunnel[] = [];
    for (const tunnelConfig of tunnelConfigs) {
      try {
        const tunnel = await client.createTunnel(tunnelConfig);
        tunnels.push(tunnel);
      } catch (error) {
        console.error(
          `Failed to create tunnel ${tunnelConfig.name}:`,
          error instanceof Error ? error.message : String(error)
        );
      }
    }

    console.log('All tunnels are now active!');
    console.log('\nPress Ctrl+C to stop...\n');

    // Display tunnel information
    displayTunnelInfo(tunnels);
  } catch (error) {
    console.error(
      'Failed to start:',
      error instanceof Error ? error.message : String(error)
    );
    process.exit(1);
  }

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n\nShutting down...');

    // Get and close all tunnels with type safety
    const tunnels: ActiveTunnel[] = client.getTunnels();
    for (const tunnel of tunnels) {
      console.log(`Closing tunnel: ${tunnel.config.name || tunnel.id}`);
      try {
        await client.closeTunnel(tunnel.id);
      } catch (error) {
        console.error(
          `Failed to close tunnel:`,
          error instanceof Error ? error.message : String(error)
        );
      }
    }

    client.disconnect();
    process.exit(0);
  });
}

function displayTunnelInfo(tunnels: ActiveTunnel[]): void {
  console.log('=== Active Tunnels ===\n');

  for (const tunnel of tunnels) {
    console.log(`Tunnel: ${tunnel.config.name || 'Unnamed'}`);
    console.log(`  ID: ${tunnel.id}`);
    console.log(`  Type: ${tunnel.config.type}`);
    console.log(`  Local Port: ${tunnel.config.localPort}`);

    if (tunnel.url) {
      console.log(`  Public URL: ${tunnel.url}`);
    }

    if (tunnel.remoteAddr) {
      console.log(`  Remote Address: ${tunnel.remoteAddr}`);
    }

    console.log(
      `  Connected: ${tunnel.connectedAt.toLocaleString()}`
    );
    console.log('');
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// Run the example
main().catch((error: Error) => {
  console.error('Fatal error:', error.message);
  process.exit(1);
});
