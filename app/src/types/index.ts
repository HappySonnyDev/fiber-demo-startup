/**
 * 统一类型定义
 * 所有公共类型统一放在此文件中导出
 */

// ─── 节点相关类型 ─────────────────────────────────────────────────────────────

export type NodeType = 'l1' | 'user' | 'router' | 'merchant';
export type ColorType = 'orange' | 'purple' | 'green';

export interface Node {
  id: string;
  name: string;
  type: NodeType;
  color: ColorType;
  x: number;
  y: number;
  version: string;
  height?: string;
  ckb?: number;
  udt?: number;
  isOnline?: boolean;
}

export interface NodesState {
  ckb?: Node;
  alice?: Node;
  bob?: Node;
  charlie?: Node;
}

export interface NodeConfig {
  name: string;
  rpcUrl: string;
  p2pAddr?: string;
  role: 'user' | 'router' | 'merchant';
}

// ─── 通道相关类型 ────────────────────────────────────────────────────────────

export interface ChannelInfo {
  channel_id?: string;
  peer_id?: string;
  local_balance?: string;
  remote_balance?: string;
  state?: { state_name?: string };
  funding_udt_type_script?: {
    code_hash: string;
    hash_type: string;
    args: string;
  } | null;
}

export interface ChannelLineInfo {
  hasChannel: boolean;
  isUdt: boolean;
  isReady: boolean;
}

// ─── API 响应类型 ────────────────────────────────────────────────────────────

export interface ApiNodeInfo {
  name: string;
  role: string;
  rpcUrl: string;
  isOnline: boolean;
  ckbBalance: number;
  udtBalance: number;
  info: {
    node_id?: string;
    version?: string;
    commit_hash?: string;
    public_key?: string;
  } | null;
  error?: string;
}

// ─── 日志相关类型 ────────────────────────────────────────────────────────────

export interface LogEntry {
  time: string;
  type: string;
  node: string;
  method: string;
  payload: string | Record<string, unknown>;
}

// ─── RPC Inspector 类型 ──────────────────────────────────────────────────────

export interface RpcTrace {
  method: string;
  params: unknown;
  result: unknown;
  error?: string;
  durationMs: number;
}

export interface RpcTraceEntry {
  id: string;
  timestamp: string;
  operation: string;
  traces: RpcTrace[];
  status: 'success' | 'error';
}

// ─── 支付相关类型 ────────────────────────────────────────────────────────────

export type AssetType = 'CKB' | 'UDT';
export type PaymentState = 'idle' | 'creating' | 'created' | 'paying' | 'success';

export interface OpenChannelParams {
  peerId: string;
  fundingAmount: string;
  assetType?: AssetType;
}

export interface CreateInvoiceParams {
  amount: string;
  description?: string;
  expiry?: number;
  assetType?: AssetType;
}

export interface PayInvoiceParams {
  invoice: string;
}

// ─── 应用模式类型 ────────────────────────────────────────────────────────────

export type AppMode = 'home' | 'quickstart' | 'demo';

// ─── 颜色映射类型 ────────────────────────────────────────────────────────────

export interface ColorMapping {
  border: string;
  bg: string;
  text: string;
}

export type ColorMap = Record<ColorType, ColorMapping>;
