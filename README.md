# Fiber Demo Startup

This repository provides a complete local development and demonstration environment for [Fiber Network](https://github.com/nervosnetwork/fiber), including:

1. **Docker Infrastructure** - CKB development chain + multiple Fiber nodes (bootnode + 3 regular nodes)
2. **Interactive Demo App** - A Next.js-based web application for learning and demonstrating Fiber Network features

## Purpose

This project is designed for:

- **Learning** - Interactive tutorials to understand Fiber Network concepts
- **Demonstration** - Visual interface to explore payment channels and transactions
- **Development** - Local testing environment for Fiber-based applications
- **Experimentation** - Test Lightning Network-style payments with CKB native tokens and sUDT tokens

## Project Structure

```
.
├── docker-compose.yml      # Docker infrastructure (CKB + Fiber nodes)
├── app/                    # Next.js demo application
│   ├── src/
│   │   ├── app/            # App Router pages
│   │   │   ├── page.tsx    # Home (choose Quick Start or Demo)
│   │   │   ├── quickstart/ # Interactive tutorial
│   │   │   ├── demo/       # Full demo interface
│   │   │   └── docs/       # SDK documentation
│   │   ├── components/     # React components
│   │   └── lib/            # Utilities and Fiber client
│   └── package.json
├── ckb/                    # CKB node configuration
├── fiber/                  # Fiber node configurations
└── fiber-web/              # Legacy web monitoring panel
```

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 18+ (for the demo app)
- pnpm/npm/yarn

### 1. Start the Infrastructure (Docker)

Launch the CKB development chain and Fiber nodes:

```bash
docker compose up --build
```

The first build requires compiling CKB and Fiber from source, which may take a considerable amount of time.

### 2. Start the Demo App

In a separate terminal:

```bash
cd app
pnpm install
pnpm dev
```

Open http://localhost:3002 to access the demo application.

### Service Ports

| Service | Port | Description |
|---------|------|-------------|
| Demo App | 3002 | Interactive demo and tutorial |
| CKB RPC | 8114 | CKB development chain |
| fiber-bootnode | 10000 | Bootstrap node RPC |
| fiber-node1 | 10001 | Node 1 RPC |
| fiber-node2 | 10002 | Node 2 RPC |
| fiber-node3 | 10003 | Node 3 RPC |
| fiber-web | 3000 | Legacy monitoring panel |

### Clean Up Environment

To reset the Fiber nodes' state (e.g., channels, payment history):

```bash
docker compose down
rm -rf fiber/nodes/*/store
```

Then restart with `docker compose up` to start fresh.

### Calling Fiber RPC

```bash
# Query node info
curl -X POST http://127.0.0.1:10001 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"node_info","params":[],"id":1}'
```

## Docker Images

This project contains 7 Docker images:

### 1. ckb

**Purpose**: Runs the CKB development chain node

- Based on Debian 12, compiles CKB from source
- Configured in development mode with built-in miner
- Pre-deployed with smart contracts required by Fiber (FundingLock, CommitmentLock, simple_udt, etc.)
- sUDT tokens are pre-minted in the genesis block, owned by a pre-configured source account
- Exposes RPC port 8114

### 2. fiber-bootnode

**Purpose**: Bootstrap node for the Fiber network

- Other Fiber nodes discover peers through this node
- Runs the Fiber daemon (fnn)
- Configured as the entry point for the gossip network
- RPC port: 10000, P2P port: 8230

### 3. fiber-node1 / fiber-node2 / fiber-node3

**Purpose**: Regular Fiber nodes

- Three independent Fiber nodes for testing payment channels
- Automatically connect to bootnode on startup
- Each node has independent keys and wallet
- Can establish payment channels between nodes and send CKB and sUDT payments

### 4. transfer

**Purpose**: Initial fund distribution tool

- One-time container that runs and exits
- Since sUDT tokens are pre-minted in the genesis block (owned by a source account), this tool transfers both CKB and sUDT from the source account to each Fiber node for testing purposes
- Transfers 1 billion CKB to each node (bootnode, node1, node2, node3)
- Transfers 1 billion sUDT to node1, node2, and node3
- After distribution, each Fiber node has sufficient funds to open payment channels and perform test transactions

### 5. fiber-web (Legacy)

**Purpose**: Legacy web-based monitoring panel ([fiber-nodes-monit](https://github.com/gpBlockchain/fiber-nodes-monit))

- Provides a basic web UI for monitoring Fiber nodes
- Accessible at http://127.0.0.1:3000 after startup
- **Note**: The new interactive demo app (`app/`) on port 3002 is now the recommended interface

## Demo Application Features

The demo app (`app/`) provides an interactive learning and demonstration environment:

### Quick Start (`/quickstart`)

Step-by-step interactive tutorial covering:
- Connecting to Fiber nodes
- Opening payment channels
- Making payments (CKB and sUDT)
- Closing channels

Each step includes code examples with syntax highlighting and copy-to-clipboard functionality.

### Full Demo (`/demo`)

Visual interface for exploring Fiber Network:
- **Node Cards** - View status of all 4 Fiber nodes (bootnode + 3 regular nodes)
- **Channel Management** - Open, monitor, and close payment channels
- **Payment Interface** - Send CKB and sUDT payments through channels
- **RPC Inspector** - Browse and test Fiber JSON-RPC methods
- **Real-time Logs** - View node activity and debug information

### SDK Documentation (`/docs`)

Comprehensive documentation for the Fiber SDK including:
- API reference
- Type definitions
- Usage examples

## Directory Structure

### Demo Application (`app/`)

The interactive demo app built with Next.js + TypeScript + Tailwind CSS:

```
app/
├── src/
│   ├── app/                # Next.js App Router
│   │   ├── page.tsx        # Home page - choose Quick Start or Demo
│   │   ├── quickstart/     # Step-by-step interactive tutorial
│   │   ├── demo/           # Full demo with visual interface
│   │   ├── docs/           # SDK documentation
│   │   └── api/            # API routes for Fiber RPC proxy
│   ├── components/         # React components
│   │   ├── demo/           # Demo page components (NodeCard, RpcInspector, etc.)
│   │   ├── quickstart/     # Quick start components
│   │   ├── DemoMode.tsx    # Main demo interface
│   │   └── LanguageSwitcher.tsx
│   ├── hooks/              # Custom React hooks
│   │   ├── useChannels.ts  # Channel management
│   │   ├── useNodeStatus.ts# Node status monitoring
│   │   └── useLogs.ts      # Log streaming
│   ├── lib/                # Utilities
│   │   ├── fiber/          # Fiber client and types
│   │   ├── i18n/           # Internationalization
│   │   └── fiber-client.ts # Fiber RPC client
│   └── types/              # TypeScript type definitions
├── package.json
└── next.config.ts
```

### Docker Infrastructure

```
├── docker-compose.yml      # Docker Compose configuration
├── ckb/                    # CKB node configuration
│   ├── Dockerfile          # CKB image build file
│   ├── dev.toml            # CKB dev chain configuration
│   ├── contracts/          # Pre-deployed smart contracts
│   └── run.sh              # CKB startup script
├── fiber/                  # Fiber node configuration
│   ├── Dockerfile          # Fiber image build file
│   ├── Dockerfile.transfer # Transfer tool image build file
│   ├── contracts/          # Fiber contracts
│   ├── start.sh            # Fiber node startup script
│   ├── transfer/           # Fund distribution tool source code
│   └── nodes/              # Per-node configuration directories
│       ├── bootnode/       # Bootstrap node
│       ├── node1/          # Regular node 1
│       ├── node2/          # Regular node 2
│       └── node3/          # Regular node 3
└── fiber-web/              # Legacy web monitoring panel
```

## Startup Order

### Infrastructure (Docker Compose)

1. **ckb** - Starts the CKB development chain first
2. **transfer** - Runs fund distribution after CKB is ready
3. **fiber-bootnode** - Starts the bootstrap node after CKB is ready
4. **fiber-node1/2/3** - Start regular nodes after bootnode is ready
5. **fiber-web** - Starts the legacy web monitoring panel

### Demo Application

The demo app should be started after the Docker infrastructure is ready:

```bash
# 1. Start infrastructure
docker compose up

# 2. In another terminal, start the demo app
cd app
pnpm install  # First time only
pnpm dev
```

## Development Workflow

### Making Changes to the Demo App

The demo app supports hot reloading during development:

```bash
cd app
pnpm dev
```

Changes to React components, styles, or API routes will be reflected immediately.

### Rebuilding Docker Images

If you modify the Docker configuration or need to rebuild:

```bash
docker compose down
docker compose up --build
```

## Notes

- All data is ephemeral and will be lost when containers restart; suitable for development and testing
- Private keys are for testing purposes only; do not use in production
- First-time Docker image build takes a long time; please be patient
- The demo app requires the Docker infrastructure to be running (CKB + Fiber nodes)
