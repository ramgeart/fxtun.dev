/**
 * TCP Tunnel Example
 *
 * This example demonstrates creating a TCP tunnel
 * to expose a local TCP service (e.g., SSH, database).
 */

const { FxTunnelClient, TunnelType } = require('../dist');

async function main() {
  // Get configuration from environment variables
  const serverAddress = process.env.FXTUNNEL_SERVER || 'tunnel.example.com:4443';
  const token = process.env.FXTUNNEL_TOKEN || 'sk_your_token_here';
  const localPort = parseInt(process.env.LOCAL_PORT || '22', 10);
  const remotePort = process.env.REMOTE_PORT
    ? parseInt(process.env.REMOTE_PORT, 10)
    : 0; // 0 = auto-assign

  console.log('FxTunnel TCP Tunnel Example');
  console.log('===========================\n');

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

  client.on('connected', ({ clientId }) => {
    console.log(`✓ Connected!`);
    console.log(`  Client ID: ${clientId}\n`);
  });

  client.on('tunnelCreated', (tunnel) => {
    console.log(`✓ TCP Tunnel created!`);
    console.log(`  Remote Address: ${tunnel.remoteAddr}`);
    console.log(`  Local Port: ${tunnel.config.localPort}`);
    console.log(
      `\nYour local service is now accessible at: ${tunnel.remoteAddr}`
    );
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

    // Create TCP tunnel
    await client.createTunnel({
      type: TunnelType.TCP,
      localPort: localPort,
      remotePort: remotePort,
      name: 'TCP Service',
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

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
