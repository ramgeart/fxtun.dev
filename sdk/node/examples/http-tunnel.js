/**
 * Basic HTTP Tunnel Example
 *
 * This example demonstrates creating a simple HTTP tunnel
 * to expose a local web server.
 */

const { FxTunnelClient, TunnelType } = require('../dist');

async function main() {
  // Get configuration from environment variables
  const serverAddress = process.env.FXTUNNEL_SERVER || 'tunnel.example.com:4443';
  const token = process.env.FXTUNNEL_TOKEN || 'sk_your_token_here';
  const localPort = parseInt(process.env.LOCAL_PORT || '3000', 10);
  const subdomain = process.env.SUBDOMAIN; // optional

  console.log('FxTunnel HTTP Tunnel Example');
  console.log('============================\n');

  // Create client
  const client = new FxTunnelClient({
    server: {
      address: serverAddress,
      token: token,
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
    console.log(`✓ HTTP Tunnel created!`);
    console.log(`  Public URL: ${tunnel.url}`);
    console.log(`  Local Port: ${tunnel.config.localPort}`);
    console.log(`\nYour local server is now accessible at: ${tunnel.url}`);
  });

  client.on('trafficUpdate', ({ tunnelId, bytesSent, bytesReceived }) => {
    const tunnel = client.getTunnel(tunnelId);
    if (tunnel) {
      console.log(
        `  Traffic: ↑ ${formatBytes(bytesSent)} ↓ ${formatBytes(bytesReceived)}`
      );
    }
  });

  client.on('error', (error) => {
    console.error('Error:', error.message);
  });

  client.on('disconnected', ({ reason }) => {
    console.log(`Disconnected${reason ? `: ${reason}` : ''}`);
  });

  try {
    // Connect to server
    await client.connect();

    // Create HTTP tunnel
    await client.createTunnel({
      type: TunnelType.HTTP,
      localPort: localPort,
      subdomain: subdomain,
      name: 'Web Server',
    });

    console.log('\nPress Ctrl+C to stop...\n');
  } catch (error) {
    console.error('Failed to start tunnel:', error.message);
    process.exit(1);
  }

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n\nShutting down...');
    client.disconnect();
    process.exit(0);
  });
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
