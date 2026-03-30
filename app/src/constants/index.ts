/**
 * 应用常量定义
 */

import type { NodesState, ColorMap, ColorType } from '@/types';

// ─── 节点初始配置 ────────────────────────────────────────────────────────────

export const INITIAL_NODES: NodesState = {
  ckb:     { id: 'ckb-devnet', name: 'CKB Layer 1', type: 'l1', color: 'orange', x: 400, y: 100, version: 'v0.113.0', height: '-' },
  alice:   { id: 'fiber-node1', name: 'alice', type: 'user', color: 'purple', x: 200, y: 300, version: 'fnn v0.1.0', ckb: 0, udt: 0 },
  bob:     { id: 'fiber-node2', name: 'bob', type: 'router', color: 'purple', x: 600, y: 300, version: 'fnn v0.1.0', ckb: 0, udt: 0 },
  charlie: { id: 'fiber-node3', name: 'charlie', type: 'merchant', color: 'green', x: 400, y: 500, version: 'fnn v0.1.0', ckb: 0, udt: 0 },
};

export const FIBER_NODES = ['alice', 'bob', 'charlie'];

// ─── 节点位置映射 ────────────────────────────────────────────────────────────

export const NODE_POSITIONS: Record<string, { x: number; y: number }> = {
  alice:   { x: 200, y: 300 },
  bob:     { x: 600, y: 300 },
  charlie: { x: 400, y: 500 },
};

// ─── 颜色映射 ────────────────────────────────────────────────────────────────

export const COLORS: ColorMap = {
  orange: { border: 'border-orange-500', bg: 'bg-orange-500', text: 'text-orange-500' },
  purple: { border: 'border-purple-500', bg: 'bg-purple-500', text: 'text-purple-500' },
  green:  { border: 'border-green-500',  bg: 'bg-green-500',  text: 'text-green-500' },
};

export const getColorClasses = (color: ColorType): ColorMap[ColorType] => COLORS[color];

// ─── UDT 配置 ─────────────────────────────────────────────────────────────────

export const UDT_TYPE_SCRIPT = {
  code_hash: '0xe1e354d6d643ad42724d40967e334984534e0367405c5ae42a9d7d63d77df419',
  hash_type: 'data' as const,
  args: '0xc219351b150b900e50a7039f1e448b844110927e5fd9bd30425806cb8ddff1fd',
};

// ─── 网络配置 ────────────────────────────────────────────────────────────────

export const CURRENCY = {
  devnet: 'Fibd',
  testnet: 'Fibt',
  mainnet: 'Fiber',
};

export const NETWORK_CURRENCY = CURRENCY.devnet;

// ─── 通道确认延迟 ────────────────────────────────────────────────────────────

export const CHANNEL_CHECK_DELAYS = [3000, 6000, 10000, 15000, 22000, 30000];

// ─── 轮询间隔 ────────────────────────────────────────────────────────────────

export const POLL_INTERVAL = 3000;
