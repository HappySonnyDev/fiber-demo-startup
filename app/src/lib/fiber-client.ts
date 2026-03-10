/**
 * Fiber Network RPC Client
 * 封装对 Fiber 节点 JSON-RPC 接口的调用
 */

export interface NodeConfig {
  name: string;
  rpcUrl: string;
  p2pAddr?: string;
  role: 'user' | 'router' | 'merchant';
}

// 节点配置映射
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

// RPC 请求基础函数
async function rpcCall(rpcUrl: string, method: string, params: unknown[] = []) {
  const response = await fetch(rpcUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method,
      params,
      id: Date.now(),
    }),
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

// 获取节点信息
export async function getNodeInfo(nodeName: string) {
  const node = NODES[nodeName];
  if (!node) throw new Error(`Unknown node: ${nodeName}`);
  
  return rpcCall(node.rpcUrl, 'node_info');
}

// 获取所有节点信息
export async function getAllNodesInfo() {
  const results: Record<string, { info: unknown; error?: string }> = {};
  
  await Promise.all(
    Object.keys(NODES).map(async (name) => {
      try {
        const info = await getNodeInfo(name);
        results[name] = { info };
      } catch (error) {
        results[name] = { 
          info: null, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        };
      }
    })
  );
  
  return results;
}

// 获取通道列表
export async function getChannels(nodeName: string) {
  const node = NODES[nodeName];
  if (!node) throw new Error(`Unknown node: ${nodeName}`);
  
  return rpcCall(node.rpcUrl, 'list_channels', [{}]);
}

// 获取所有节点的通道
export async function getAllChannels() {
  const results: Record<string, { channels: unknown[]; error?: string }> = {};
  
  await Promise.all(
    Object.keys(NODES).map(async (name) => {
      try {
        const channels = await getChannels(name);
        results[name] = { channels: channels.channels || [] };
      } catch (error) {
        results[name] = { 
          channels: [], 
          error: error instanceof Error ? error.message : 'Unknown error' 
        };
      }
    })
  );
  
  return results;
}

// 开通通道
export interface OpenChannelParams {
  peerId: string;
  fundingAmount: string;
  public?: boolean;
}

export async function openChannel(
  nodeName: string, 
  params: OpenChannelParams
) {
  const node = NODES[nodeName];
  if (!node) throw new Error(`Unknown node: ${nodeName}`);
  
  // funding_amount 需要是十六进制字符串
  const fundingHex = params.fundingAmount.startsWith('0x') 
    ? params.fundingAmount 
    : '0x' + BigInt(params.fundingAmount).toString(16);
  
  return rpcCall(node.rpcUrl, 'open_channel', [
    {
      peer_id: params.peerId,
      funding_amount: fundingHex,
    }
  ]);
}

// 创建发票
export interface CreateInvoiceParams {
  amount: string;
  description?: string;
  expiry?: number; // seconds
}

export async function createInvoice(
  nodeName: string,
  params: CreateInvoiceParams
) {
  const node = NODES[nodeName];
  if (!node) throw new Error(`Unknown node: ${nodeName}`);
  
  // 金额转换为十六进制字符串 (CKB 使用 shannon 单位)
  const amountHex = '0x' + BigInt(params.amount).toString(16);
  // expiry 也需要是十六进制字符串
  const expiryHex = '0x' + (params.expiry || 3600).toString(16);
  
  return rpcCall(node.rpcUrl, 'new_invoice', [
    {
      amount: amountHex,
      description: params.description || 'Payment',
      expiry: expiryHex,
      currency: 'Fibd',  // Fiber Dev = CKB devnet
    }
  ]);
}

// 支付发票
export interface PayInvoiceParams {
  invoice: string;
}

export async function payInvoice(
  nodeName: string,
  params: PayInvoiceParams
) {
  const node = NODES[nodeName];
  if (!node) throw new Error(`Unknown node: ${nodeName}`);
  
  return rpcCall(node.rpcUrl, 'send_payment', [
    {
      invoice: params.invoice,
    }
  ]);
}

// 获取节点余额
export async function getBalance(nodeName: string) {
  const node = NODES[nodeName];
  if (!node) throw new Error(`Unknown node: ${nodeName}`);
  
  // 通过 list_channels 计算余额
  const result = await rpcCall(node.rpcUrl, 'list_channels');
  const channels = result.channels || [];
  
  let localBalance = 0;
  let remoteBalance = 0;
  
  for (const ch of channels) {
    localBalance += parseInt(ch.local_balance || '0');
    remoteBalance += parseInt(ch.remote_balance || '0');
  }
  
  return {
    localBalance,
    remoteBalance,
    channels: channels.length,
  };
}

// 通过 CKB RPC 获取链上余额
const CKB_RPC_URL = 'http://127.0.0.1:8114';

async function ckbRpcCall(method: string, params: unknown[] = []) {
  const response = await fetch(CKB_RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', method, params, id: Date.now() }),
  });
  const data = await response.json();
  if (data.error) throw new Error(data.error.message);
  return data.result;
}

export async function getOnChainBalance(nodeName: string): Promise<bigint> {
  const node = NODES[nodeName];
  if (!node) throw new Error(`Unknown node: ${nodeName}`);

  // 先通过 fiber node_info 拿到 lock script args
  const info = await rpcCall(node.rpcUrl, 'node_info');
  const lockScript = (info as { default_funding_lock_script?: { code_hash: string; hash_type: string; args: string } }).default_funding_lock_script;
  if (!lockScript) return BigInt(0);

  const result = await ckbRpcCall('get_cells_capacity', [{
    script: {
      code_hash: lockScript.code_hash,
      hash_type: lockScript.hash_type,
      args: lockScript.args,
    },
    script_type: 'lock',
  }]);

  return BigInt(result?.capacity || '0x0');
}

// 批量获取所有节点链上余额
export async function getAllOnChainBalances(): Promise<Record<string, bigint>> {
  const results: Record<string, bigint> = {};
  await Promise.all(
    Object.keys(NODES).map(async (name) => {
      try {
        results[name] = await getOnChainBalance(name);
      } catch {
        results[name] = BigInt(0);
      }
    })
  );
  return results;
}

// 检查节点是否在线
export async function checkNodeHealth(nodeName: string): Promise<boolean> {
  try {
    await getNodeInfo(nodeName);
    return true;
  } catch {
    return false;
  }
}

// 检查所有节点健康状态
export async function checkAllNodesHealth() {
  const results: Record<string, boolean> = {};
  
  await Promise.all(
    Object.keys(NODES).map(async (name) => {
      results[name] = await checkNodeHealth(name);
    })
  );
  
  return results;
}

// 关闭通道
export async function closeChannel(nodeName: string, channelId: string) {
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
    }
  ]);
}

// 连接 P2P 节点
export interface ConnectPeerParams {
  address: string; // 例如: /dns4/fiber-node2/tcp/8228/p2p/Qmcb7wrGe9QxzTpipFCRJc4fMhfr8mogPGao7EsjeVzEmP
}

export async function connectPeer(
  nodeName: string,
  params: ConnectPeerParams
) {
  const node = NODES[nodeName];
  if (!node) throw new Error(`Unknown node: ${nodeName}`);
  
  return rpcCall(node.rpcUrl, 'connect_peer', [
    {
      address: params.address,
    }
  ]);
}

// 获取节点的 P2P 地址
export async function getNodeP2PAddress(nodeName: string): Promise<string | null> {
  try {
    const info = await getNodeInfo(nodeName);
    const addresses = (info as { addresses?: string[] }).addresses;
    if (addresses && addresses.length > 0) {
      return addresses[0];
    }
    return null;
  } catch {
    return null;
  }
}
