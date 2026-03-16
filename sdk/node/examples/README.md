# FxTunnel SDK Examples

This directory contains example scripts demonstrating how to use the FxTunnel Node.js SDK.

## Prerequisites

1. Build the SDK:
   ```bash
   cd ..
   npm install
   npm run build
   ```

2. Set up environment variables:
   ```bash
   export FXTUNNEL_SERVER="tunnel.example.com:4443"
   export FXTUNNEL_TOKEN="sk_your_token_here"
   ```

## Examples

### HTTP Tunnel

Expose a local web server through an HTTP tunnel:

```bash
node http-tunnel.js
```

Environment variables:
- `FXTUNNEL_SERVER` - Server address (default: tunnel.example.com:4443)
- `FXTUNNEL_TOKEN` - Your API token
- `LOCAL_PORT` - Local port to forward (default: 3000)
- `SUBDOMAIN` - Desired subdomain (optional, random if not specified)

### TCP Tunnel

Expose a local TCP service (e.g., SSH):

```bash
node tcp-tunnel.js
```

Environment variables:
- `FXTUNNEL_SERVER` - Server address
- `FXTUNNEL_TOKEN` - Your API token
- `LOCAL_PORT` - Local port to forward (default: 22)
- `REMOTE_PORT` - Remote port (optional, auto-assigned if not specified)

### Multiple Tunnels

Create multiple tunnels simultaneously:

```bash
node multiple-tunnels.js
```

This example creates:
- HTTP tunnel for a web app (port 3000)
- HTTP tunnel for an API server (port 3001)
- TCP tunnel for SSH (port 22)

### TypeScript Example

Full TypeScript example with type safety:

```bash
# Compile TypeScript
npx tsc typescript-example.ts

# Run
node typescript-example.js
```

Or use ts-node:
```bash
npx ts-node typescript-example.ts
```

## Getting an API Token

1. Deploy your own fxTunnel server (see main README)
2. Access the web admin panel (default: http://localhost:3000)
3. Register an account
4. Create an API token in the Tokens section
5. Use the token in your SDK configuration

## Common Use Cases

### Webhook Development

Expose a local webhook endpoint for testing:

```bash
export LOCAL_PORT=4000
node http-tunnel.js
```

### SSH Access

Create a tunnel for remote SSH access:

```bash
export LOCAL_PORT=22
node tcp-tunnel.js
```

### Development Server

Expose a development server with a custom subdomain:

```bash
export LOCAL_PORT=3000
export SUBDOMAIN=myapp
node http-tunnel.js
```

## Troubleshooting

### Connection Refused

Make sure your local service is running on the specified port before starting the tunnel.

### Authentication Failed

Verify that your API token is correct and hasn't been revoked.

### Subdomain Taken

If a subdomain is already in use, try a different one or omit the subdomain to get a random one.

### Port Already in Use

For TCP/UDP tunnels, if the requested remote port is taken, set `REMOTE_PORT=0` to auto-assign an available port.
