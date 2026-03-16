/**
 * Multiple Tunnels Example
 *
 * This example demonstrates creating multiple tunnels
 * of different types simultaneously.
 */

const { FxTunnelClient, TunnelType } = require('../dist');

async function main() {
  // Get configuration from environment variables
  const serverAddress = process.env.FXTUNNEL_SERVER || 'tunnel.example.com:4443';
  const token = process.env.FXTUNNEL_TOKEN || 'sk_your_token_here';

  console.log('FxTunnel Multiple Tunnels Example');
  console.log('=================================\n');

  // Create client with multiple tunnels configured
  const client = new FxTunnelClient({
    server: {
      address: serverAddress,
      token: token,
    },
    tunnels: [
      {
        type: TunnelType.HTTP,
        localPort: 3000,
        subdomain: 'webapp',
        name: 'Web Application',
      },
      {
        type: TunnelType.HTTP,
        localPort: 3001,
        subdomain: 'api',
        name: 'API Server',
      },
      {
        type: TunnelType.TCP,
        localPort: 22,
        name: 'SSH',
      },
    ],
    reconnect: {
      enabled: true,
      interval: 5000,
      maxAttempts: 10,
    },
  });

  // Event handlers
  client.on('connecting', () => {
    console.log('Connecting to server...');
  });

  client.on('connected', ({ clientId, server }) => {
    console.log(`✓ Connected to ${server}`);
    console.log(`  Client ID: ${clientId}\n`);
  });

  client.on('tunnelCreated', (tunnel) => {
    console.log(`✓ Tunnel created: ${tunnel.config.name}`);
    const address = tunnel.url || tunnel.remoteAddr;
    console.log(`  ${address}\n`);
  });

  client.on('reconnecting', ({ attempt }) => {
    console.log(`Reconnecting... (attempt ${attempt})`);
  });

  client.on('tunnelError', ({ tunnelId, error, code }) => {
    console.error(`Tunnel error: ${error} (${code})`);
  });

  client.on('error', (error) => {
    console.error('Error:', error.message);
  });

  client.on('disconnected', ({ reason }) => {
    console.log(`Disconnected${reason ? `: ${reason}` : ''}`);
  });

  try {
    // Connect to server (tunnels will be created automatically)
    await client.connect();

    console.log('All tunnels are now active!');
    console.log('\nPress Ctrl+C to stop...\n');

    // Display active tunnels
    displayTunnels(client);

    // Update tunnel list periodically
    setInterval(() => {
      displayTunnels(client);
    }, 10000);
  } catch (error) {
    console.error('Failed to start tunnels:', error.message);
    process.exit(1);
  }

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n\nShutting down...');

    // Close all tunnels
    for (const tunnel of client.getTunnels()) {
      console.log(`Closing tunnel: ${tunnel.config.name}`);
      try {
        await client.closeTunnel(tunnel.id);
      } catch (error) {
        console.error(`Failed to close tunnel: ${error.message}`);
      }
    }

    client.disconnect();
    process.exit(0);
  });
}

function displayTunnels(client) {
  const tunnels = client.getTunnels();

  console.log('\n=== Active Tunnels ===');
  for (const tunnel of tunnels) {
    const address = tunnel.url || tunnel.remoteAddr;
    const uptime = Math.floor((Date.now() - tunnel.connectedAt.getTime()) / 1000);
    console.log(`  ${tunnel.config.name}: ${address}`);
    console.log(
      `    Uptime: ${formatDuration(uptime)} | ↑ ${formatBytes(tunnel.bytesSent)} ↓ ${formatBytes(tunnel.bytesReceived)}`
    );
  }
  console.log('');
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

function formatDuration(seconds) {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
