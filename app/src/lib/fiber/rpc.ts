/**
 * Fiber RPC 调用封装
 */

import type { RpcTrace, AssetType } from '@/types';
import { NODES, CKB_RPC_URL } from './config';
import { UDT_TYPE_SCRIPT, NETWORK_CURRENCY } from '@/constants';

// Re-export NODES for backward compatibility
export { NODES } from './config';

// ─── RPC 调用追踪 ─────────────────────────────────────────────────────────────

/**
 * 基础 RPC 请求函数（不带追踪）。
 */
async function rpcCall(rpcUrl: string, method: string, params: unknown[] = []) {
  const response = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', method, params, id: Date.now() }),
  });

  if (!response.ok) {
    throw new Error(`RPC call failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(`RPC error: ${data.error.message || JSON.stringify(data.error)}`);
  }

  return data.result;
}

/**
 * 带追踪的 RPC 请求函数。
 */
export async function rpcCallWithTrace(
  rpcUrl: string,
  method: string,
  params: unknown[] = []
): Promise<{ result: unknown; trace: RpcTrace }> {
  const start = Date.now();
  const traceParams = params[0] ?? null;

  try {
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method, params, id: Date.now() }),
    });

    if (!response.ok) {
      const err = `HTTP ${response.status} ${response.statusText}`;
      return {
        result: null,
        trace: { method, params: traceParams, result: null, error: err, durationMs: Date.now() - start },
      };
    }

    const data = await response.json();

    if (data.error) {
      const err = data.error.message || JSON.stringify(data.error);
      return {
        result: null,
        trace: { method, params: traceParams, result: null, error: err, durationMs: Date.now() - start },
      };
    }

    return {
      result: data.result,
      trace: { method, params: traceParams, result: data.result, durationMs: Date.now() - start },
    };
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e);
    return {
      result: null,
      trace: { method, params: traceParams, result: null, error: err, durationMs: Date.now() - start },
    };
  }
}

// ─── node_info ────────────────────────────────────────────────────────────────

export async function getNodeInfo(nodeName: string) {
  const node = NODES[nodeName];
  if (!node) throw new Error(`Unknown node: ${nodeName}`);
  return rpcCall(node.rpcUrl, 'node_info');
}

export async function getAllNodesInfo() {
  const results: Record<string, { info: unknown; error?: string }> = {};
  await Promise.all(
    Object.keys(NODES).map(async (name) => {
      try {
        results[name] = { info: await getNodeInfo(name) };
      } catch (error) {
        results[name] = { info: null, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    })
  );
  return results;
}

// ─── list_channels ────────────────────────────────────────────────────────────

export async function getChannels(nodeName: string) {
  const node = NODES[nodeName];
  if (!node) throw new Error(`Unknown node: ${nodeName}`);
  return rpcCall(node.rpcUrl, 'list_channels', [{}]);
}

export async function getAllChannels() {
  const results: Record<string, { channels: unknown[]; error?: string }> = {};
  await Promise.all(
    Object.keys(NODES).map(async (name) => {
      try {
        const channels = await getChannels(name);
        results[name] = { channels: channels.channels || [] };
      } catch (error) {
        results[name] = { channels: [], error: error instanceof Error ? error.message : 'Unknown error' };
      }
    })
  );
  return results;
}

// ─── open_channel ─────────────────────────────────────────────────────────────

export interface OpenChannelParams {
  peerId: string;
  fundingAmount: string;
  assetType?: AssetType;
}

export async function openChannel(
  nodeName: string,
  params: OpenChannelParams
): Promise<unknown> {
  const node = NODES[nodeName];
  if (!node) throw new Error(`Unknown node: ${nodeName}`);

  const fundingHex = params.fundingAmount.startsWith('0x')
    ? params.fundingAmount
    : '0x' + BigInt(params.fundingAmount).toString(16);

  const rpcParams: Record<string, unknown> = {
    peer_id: params.peerId,
    funding_amount: fundingHex,
  };

  if (params.assetType === 'UDT') {
    rpcParams.funding_udt_type_script = UDT_TYPE_SCRIPT;
  }

  return rpcCall(node.rpcUrl, 'open_channel', [rpcParams]);
}

export async function openChannelWithTrace(
  nodeName: string,
  params: OpenChannelParams
): Promise<{ result: unknown; trace: RpcTrace }> {
  const node = NODES[nodeName];
  if (!node) throw new Error(`Unknown node: ${nodeName}`);

  const fundingHex = params.fundingAmount.startsWith('0x')
    ? params.fundingAmount
    : '0x' + BigInt(params.fundingAmount).toString(16);

  const rpcParams: Record<string, unknown> = {
    peer_id: params.peerId,
    funding_amount: fundingHex,
  };

  if (params.assetType === 'UDT') {
    rpcParams.funding_udt_type_script = UDT_TYPE_SCRIPT;
  }

  return rpcCallWithTrace(node.rpcUrl, 'open_channel', [rpcParams]);
}

// ─── new_invoice ──────────────────────────────────────────────────────────────

export interface CreateInvoiceParams {
  amount: string;
  description?: string;
  expiry?: number;
  assetType?: AssetType;
}

export async function createInvoice(
  nodeName: string,
  params: CreateInvoiceParams
): Promise<unknown> {
  const node = NODES[nodeName];
  if (!node) throw new Error(`Unknown node: ${nodeName}`);

  const amountHex = '0x' + BigInt(params.amount).toString(16);
  const expiryHex = '0x' + (params.expiry || 3600).toString(16);

  const rpcParams: Record<string, unknown> = {
    amount: amountHex,
    description: params.description || 'Payment',
    expiry: expiryHex,
    currency: NETWORK_CURRENCY,
  };

  if (params.assetType === 'UDT') {
    rpcParams.udt_type_script = UDT_TYPE_SCRIPT;
  }

  return rpcCall(node.rpcUrl, 'new_invoice', [rpcParams]);
}

export async function createInvoiceWithTrace(
  nodeName: string,
  params: CreateInvoiceParams
): Promise<{ result: unknown; trace: RpcTrace }> {
  const node = NODES[nodeName];
  if (!node) throw new Error(`Unknown node: ${nodeName}`);

  const amountHex = '0x' + BigInt(params.amount).toString(16);
  const expiryHex = '0x' + (params.expiry || 3600).toString(16);

  const rpcParams: Record<string, unknown> = {
    amount: amountHex,
    description: params.description || 'Payment',
    expiry: expiryHex,
    currency: NETWORK_CURRENCY,
  };

  if (params.assetType === 'UDT') {
    rpcParams.udt_type_script = UDT_TYPE_SCRIPT;
  }

  return rpcCallWithTrace(node.rpcUrl, 'new_invoice', [rpcParams]);
}

// ─── send_payment ─────────────────────────────────────────────────────────────

export interface PayInvoiceParams {
  invoice: string;
}

export async function payInvoice(
  nodeName: string,
  params: PayInvoiceParams
): Promise<unknown> {
  const node = NODES[nodeName];
  if (!node) throw new Error(`Unknown node: ${nodeName}`);

  return rpcCall(node.rpcUrl, 'send_payment', [{ invoice: params.invoice }]);
}

export async function payInvoiceWithTrace(
  nodeName: string,
  params: PayInvoiceParams
): Promise<{ result: unknown; trace: RpcTrace }> {
  const node = NODES[nodeName];
  if (!node) throw new Error(`Unknown node: ${nodeName}`);

  return rpcCallWithTrace(node.rpcUrl, 'send_payment', [{ invoice: params.invoice }]);
}

// ─── shutdown_channel ─────────────────────────────────────────────────────────

export async function closeChannel(
  nodeName: string,
  channelId: string
): Promise<unknown> {
  const node = NODES[nodeName];
  if (!node) throw new Error(`Unknown node: ${nodeName}`);

  return rpcCall(node.rpcUrl, 'shutdown_channel', [
    {
      channel_id: channelId,
      close_script: {
        code_hash: '0x0000000000000000000000000000000000000000000000000000000000000000',
        hash_type: 'data',
        args: '0x',
      },
      fee_rate: '0xA00',
    },
  ]);
}

export async function closeChannelWithTrace(
  nodeName: string,
  channelId: string
): Promise<{ result: unknown; trace: RpcTrace }> {
  const node = NODES[nodeName];
  if (!node) throw new Error(`Unknown node: ${nodeName}`);

  return rpcCallWithTrace(node.rpcUrl, 'shutdown_channel', [
    {
      channel_id: channelId,
      close_script: {
        code_hash: '0x0000000000000000000000000000000000000000000000000000000000000000',
        hash_type: 'data',
        args: '0x',
      },
      fee_rate: '0xA00',
    },
  ]);
}

// ─── connect_peer ─────────────────────────────────────────────────────────────

export interface ConnectPeerParams {
  address: string;
}

export async function connectPeer(
  nodeName: string,
  params: ConnectPeerParams
): Promise<unknown> {
  const node = NODES[nodeName];
  if (!node) throw new Error(`Unknown node: ${nodeName}`);

  return rpcCall(node.rpcUrl, 'connect_peer', [{ address: params.address }]);
}

export async function connectPeerWithTrace(
  nodeName: string,
  params: ConnectPeerParams
): Promise<{ result: unknown; trace: RpcTrace }> {
  const node = NODES[nodeName];
  if (!node) throw new Error(`Unknown node: ${nodeName}`);

  return rpcCallWithTrace(node.rpcUrl, 'connect_peer', [{ address: params.address }]);
}

// ─── 工具函数 ─────────────────────────────────────────────────────────────────

export async function getNodeP2PAddress(nodeName: string): Promise<string | null> {
  try {
    const info = await getNodeInfo(nodeName);
    const addresses = (info as { addresses?: string[] }).addresses;
    if (addresses && addresses.length > 0) return addresses[0];
    return null;
  } catch {
    return null;
  }
}

export async function checkNodeHealth(nodeName: string): Promise<boolean> {
  try {
    await getNodeInfo(nodeName);
    return true;
  } catch {
    return false;
  }
}

export async function checkAllNodesHealth() {
  const results: Record<string, boolean> = {};
  await Promise.all(Object.keys(NODES).map(async (name) => {
    results[name] = await checkNodeHealth(name);
  }));
  return results;
}

export async function getBalance(nodeName: string) {
  const node = NODES[nodeName];
  if (!node) throw new Error(`Unknown node: ${nodeName}`);

  const result = await rpcCall(node.rpcUrl, 'list_channels', [{}]);
  const channels = result.channels || [];
  let localBalance = 0;
  let remoteBalance = 0;
  for (const ch of channels) {
    localBalance += parseInt(ch.local_balance || '0');
    remoteBalance += parseInt(ch.remote_balance || '0');
  }
  return { localBalance, remoteBalance, channels: channels.length };
}

// ─── CKB RPC ──────────────────────────────────────────────────────────────────

async function ckbRpcCall(method: string, params: unknown[] = []) {
  console.log(`[ckbRpcCall] Calling ${method} with params:`, JSON.stringify(params, null, 2));
  const response = await fetch(CKB_RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', method, params, id: Date.now() }),
  });
  const data = await response.json();
  console.log(`[ckbRpcCall] Response for ${method}:`, JSON.stringify(data, null, 2));
  if (data.error) throw new Error(`CKB RPC error: ${data.error.message || JSON.stringify(data.error)}`);
  return data.result;
}

// ─── 余额查询 ────────────────────────────────────────────────────────────────

export async function getOnChainBalance(nodeName: string): Promise<bigint> {
  const node = NODES[nodeName];
  if (!node) throw new Error(`Unknown node: ${nodeName}`);

  console.log(`[getOnChainBalance] Fetching info for node: ${nodeName}`);
  const info = await rpcCall(node.rpcUrl, 'node_info');
  console.log(`[getOnChainBalance] Node info for ${nodeName}:`, JSON.stringify(info, null, 2));

  const lockScript = (info as {
    default_funding_lock_script?: { code_hash: string; hash_type: string; args: string };
  }).default_funding_lock_script;
  console.log(`[getOnChainBalance] Lock script for ${nodeName}:`, lockScript);

  if (!lockScript) {
    console.warn(`[getOnChainBalance] No lock script found for ${nodeName}`);
    return BigInt(0);
  }

  const result = await ckbRpcCall('get_cells_capacity', [{
    script: { code_hash: lockScript.code_hash, hash_type: lockScript.hash_type, args: lockScript.args },
    script_type: 'lock',
  }]);

  console.log(`[getOnChainBalance] CKB balance result for ${nodeName}:`, result);
  return BigInt(result?.capacity || '0x0');
}

export async function getAllOnChainBalances(): Promise<Record<string, bigint>> {
  const results: Record<string, bigint> = {};
  await Promise.all(Object.keys(NODES).map(async (name) => {
    try {
      results[name] = await getOnChainBalance(name);
    } catch (error) {
      console.error(`[getAllOnChainBalances] Failed to get balance for ${name}:`, error);
      results[name] = BigInt(0);
    }
  }));
  return results;
}

export async function getOnChainUdtBalance(nodeName: string): Promise<bigint> {
  const node = NODES[nodeName];
  if (!node) throw new Error(`Unknown node: ${nodeName}`);

  const info = await rpcCall(node.rpcUrl, 'node_info');
  const lockScript = (info as {
    default_funding_lock_script?: { code_hash: string; hash_type: string; args: string };
  }).default_funding_lock_script;
  if (!lockScript) return BigInt(0);

  const result = await ckbRpcCall('get_cells', [{
    script: { code_hash: lockScript.code_hash, hash_type: lockScript.hash_type, args: lockScript.args },
    script_type: 'lock',
    filter: {
      script: {
        code_hash: UDT_TYPE_SCRIPT.code_hash,
        hash_type: UDT_TYPE_SCRIPT.hash_type,
        args: UDT_TYPE_SCRIPT.args,
      },
    },
  }, 'asc', '0x64']);

  const cells = result?.objects || [];
  let totalUdt = BigInt(0);
  for (const cell of cells) {
    const data = cell.output_data || '0x';
    if (data.length >= 34) {
      const hexData = data.slice(2, 34);
      const bytes: number[] = [];
      for (let i = 0; i < hexData.length; i += 2) {
        bytes.push(parseInt(hexData.slice(i, i + 2), 16));
      }
      let amount = BigInt(0);
      for (let i = bytes.length - 1; i >= 0; i--) {
        amount = (amount << BigInt(8)) | BigInt(bytes[i]);
      }
      totalUdt += amount;
    }
  }
  return totalUdt;
}

export async function getAllOnChainUdtBalances(): Promise<Record<string, bigint>> {
  const results: Record<string, bigint> = {};
  await Promise.all(Object.keys(NODES).map(async (name) => {
    try {
      results[name] = await getOnChainUdtBalance(name);
    } catch (error) {
      console.error(`[getAllOnChainUdtBalances] Failed to get UDT balance for ${name}:`, error);
      results[name] = BigInt(0);
    }
  }));
  return results;
}

// Re-export RpcTrace type
export type { RpcTrace } from '@/types';
