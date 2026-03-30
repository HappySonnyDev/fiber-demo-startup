/**
 * Fiber 节点配置
 */

import type { NodeConfig } from '@/types';

export const NODES: Record<string, NodeConfig> = {
  alice: {
    name: 'alice',
    rpcUrl: 'http://127.0.0.1:10001',
    role: 'user',
  },
  bob: {
    name: 'bob',
    rpcUrl: 'http://127.0.0.1:10002',
    role: 'router',
  },
  charlie: {
    name: 'charlie',
    rpcUrl: 'http://127.0.0.1:10003',
    role: 'merchant',
  },
};

export const CKB_RPC_URL = 'http://127.0.0.1:8114';
