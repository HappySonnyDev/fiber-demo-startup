/**
 * Fiber Network RPC Client — SDK Layer
 *
 * 本文件是对 Fiber 节点 JSON-RPC 接口的标准封装，可作为学习 Fiber API 的参考样板。
 * 每个导出函数均附有完整的参数说明、返回字段说明和使用示例。
 *
 * Fiber RPC 规范要点：
 *  - 所有数值类参数（金额、过期时间等）必须以十六进制字符串传递，如 '0x' + n.toString(16)
 *  - list_channels 必须传 [{}]，不能传空数组 []
 *  - new_invoice 必须包含 currency 字段，devnet 环境值为 'Fibd'
 */

export interface NodeConfig {
  name: string;
  rpcUrl: string;
  p2pAddr?: string;
  role: 'user' | 'router' | 'merchant';
}

// ─── RPC 调用追踪 ─────────────────────────────────────────────────────────────

/**
 * 单次 RPC 调用的完整追踪记录。
 * API 路由会将此结构透传给前端，供 RPC Inspector 面板展示。
 */
export interface RpcTrace {
  /** JSON-RPC 方法名，如 'open_channel' */
  method: string;
  /** 实际发送的请求参数（params[0]），原始对象 */
  params: unknown;
  /** RPC 返回的 result 字段，若调用失败则为 null */
  result: unknown;
  /** 若调用发生错误，此处为错误信息 */
  error?: string;
  /** 本次调用耗时（毫秒） */
  durationMs: number;
}

// ─── 节点配置 ─────────────────────────────────────────────────────────────────

/** 节点配置映射 */
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

// ─── 底层 RPC 调用 ────────────────────────────────────────────────────────────

/**
 * 基础 RPC 请求函数（不带追踪）。
 * 内部使用，业务代码应优先使用 rpcCallWithTrace。
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
 * 返回 result 及完整的 RpcTrace 记录，供 API 路由透传给前端 Inspector 面板。
 *
 * @param rpcUrl  - 目标节点 RPC 地址
 * @param method  - JSON-RPC 方法名
 * @param params  - 参数数组（Fiber 接口通常只有一个对象参数）
 * @returns       - { result, trace }
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

// ─── UDT 配置 ─────────────────────────────────────────────────────────────────

/**
 * simple_udt token 的 Type Script。
 * 用于 open_channel 和 new_invoice 中指定 UDT 资产类型。
 */
export const UDT_TYPE_SCRIPT = {
  code_hash: '0xe1e354d6d643ad42724d40967e334984534e0367405c5ae42a9d7d63d77df419',
  hash_type: 'data' as const,
  args: '0xc219351b150b900e50a7039f1e448b844110927e5fd9bd30425806cb8ddff1fd',
};

// ─── node_info ────────────────────────────────────────────────────────────────

/**
 * 获取节点基本信息。
 *
 * RPC Method: `node_info`
 * Params: 无
 *
 * @returns node_id        - 节点公钥（hex），可用于识别节点身份
 * @returns version        - Fiber 节点版本号
 * @returns addresses      - P2P 监听地址列表，格式 `/dns4/<host>/tcp/<port>/p2p/<peerId>`
 * @returns chain_hash     - 所在链的 genesis block hash
 * @returns default_funding_lock_script - 节点默认的链上 funding lock script（含 args 即链上地址）
 */
export async function getNodeInfo(nodeName: string) {
  const node = NODES[nodeName];
  if (!node) throw new Error(`Unknown node: ${nodeName}`);
  return rpcCall(node.rpcUrl, 'node_info');
}

/**
 * 批量获取所有节点信息（并发执行）。
 */
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

/**
 * 获取节点的通道列表。
 *
 * RPC Method: `list_channels`
 *
 * @param peer_id  - (可选) 过滤：只返回与指定 peer_id 的通道
 *
 * @returns channels[]            - 通道数组
 * @returns channels[].channel_id - 通道唯一 ID（hex）
 * @returns channels[].peer_id    - 对端节点 ID
 * @returns channels[].local_balance  - 本地余额（十六进制 shannon）
 * @returns channels[].remote_balance - 远端余额（十六进制 shannon）
 * @returns channels[].state.state_name - 通道状态，如 CHANNEL_READY / NEGOTIATING_FUNDING
 *
 * @note 必须传 [{}] 而非 []，否则返回 Invalid params 错误
 */
export async function getChannels(nodeName: string) {
  const node = NODES[nodeName];
  if (!node) throw new Error(`Unknown node: ${nodeName}`);
  return rpcCall(node.rpcUrl, 'list_channels', [{}]);
}

/**
 * 批量获取所有节点通道（并发执行）。
 */
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
  public?: boolean;
  assetType?: 'CKB' | 'UDT';
}

/**
 * 开启一条支付通道（需要链上 funding 交易确认后才变为 CHANNEL_READY）。
 *
 * RPC Method: `open_channel`
 *
 * @param peer_id     - 对端节点 Peer ID，从 node_info.addresses 的 `/p2p/<id>` 部分提取
 * @param funding_amount - 注资金额，十六进制字符串，单位 shannon（1 CKB = 10^8 shannon）
 *                         示例：100 CKB → '0x' + BigInt(100_0000_0000).toString(16) = '0x2540be400'
 * @param funding_udt_type_script - (可选) UDT 通道专用：指定 UDT token 的 type script
 *                                   包含 code_hash / hash_type / args 三个字段
 *
 * @returns channel_id - 新建通道的唯一 ID（hex），可用于后续关闭通道
 *
 * @note 调用前需确保已通过 connect_peer 建立 P2P 连接
 * @note 通道开启后需等待 CKB 出块确认（约 10-20 秒），state 变为 CHANNEL_READY 后才可支付
 */
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

/**
 * 带追踪版本的 open_channel，供 API 路由使用。
 */
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
  expiry?: number; // seconds
  assetType?: 'CKB' | 'UDT';
}

/**
 * 创建一张支付发票（由收款方生成，付款方扫码后调用 send_payment）。
 *
 * RPC Method: `new_invoice`
 *
 * @param amount      - 金额，十六进制字符串，单位同通道资产
 *                      CKB：shannon，UDT：token 基本单位
 * @param description - 发票描述文字（可选，默认 'Payment'）
 * @param expiry      - 发票有效期，十六进制秒数（可选，默认 0xe10 = 3600 秒）
 * @param currency    - 网络标识，devnet 必须填 'Fibd'（Fiber Dev）
 *                      mainnet='Fiber' / testnet='Fibt' / devnet='Fibd'
 * @param udt_type_script - (可选) UDT 发票专用：同 open_channel 中的 type script
 *
 * @returns invoice_address - 以 'fibd' 开头的发票字符串，付款方通过此字符串发起支付
 * @returns invoice         - 发票详细信息对象（含 amount、expiry、payment_hash 等）
 *
 * @note currency 字段不可省略，否则返回 Invalid params 错误
 * @note 同一笔发票只能被支付一次（payment_hash 唯一性）
 */
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
    currency: 'Fibd',
  };

  if (params.assetType === 'UDT') {
    rpcParams.udt_type_script = UDT_TYPE_SCRIPT;
  }

  return rpcCall(node.rpcUrl, 'new_invoice', [rpcParams]);
}

/**
 * 带追踪版本的 new_invoice，供 API 路由使用。
 */
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
    currency: 'Fibd',
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

/**
 * 发起链下支付（由付款方调用，通过发票字符串自动寻路）。
 *
 * RPC Method: `send_payment`
 *
 * @param invoice - 目标发票字符串（由收款方通过 new_invoice 生成）
 *                  格式：'fibd1...'（devnet）
 *
 * @returns payment_hash   - 支付哈希，唯一标识本次支付
 * @returns status         - 支付状态：'Success' / 'Pending' / 'Failed'
 * @returns fee            - 实际扣除的路由手续费（shannon）
 * @returns failed_error   - 若失败，此处包含失败原因
 *
 * @note 支付是纯链下操作，不需要链上交易，通常在毫秒至秒级完成
 * @note 若发送方与收款方之间没有直接通道，Fiber 会自动多跳路由
 * @note 同一张发票只能成功支付一次
 */
export async function payInvoice(
  nodeName: string,
  params: PayInvoiceParams
): Promise<unknown> {
  const node = NODES[nodeName];
  if (!node) throw new Error(`Unknown node: ${nodeName}`);

  return rpcCall(node.rpcUrl, 'send_payment', [{ invoice: params.invoice }]);
}

/**
 * 带追踪版本的 send_payment，供 API 路由使用。
 */
export async function payInvoiceWithTrace(
  nodeName: string,
  params: PayInvoiceParams
): Promise<{ result: unknown; trace: RpcTrace }> {
  const node = NODES[nodeName];
  if (!node) throw new Error(`Unknown node: ${nodeName}`);

  return rpcCallWithTrace(node.rpcUrl, 'send_payment', [{ invoice: params.invoice }]);
}

// ─── shutdown_channel ─────────────────────────────────────────────────────────

/**
 * 关闭通道并将资金结算回链上。
 *
 * RPC Method: `shutdown_channel`
 *
 * @param channel_id  - 要关闭的通道 ID（hex），从 list_channels 获取
 * @param close_script - 资金结算目标 lock script（决定链上资金归属地址）
 * @param fee_rate    - 链上结算交易的手续费率（十六进制 shannons/KB，最低 0x400）
 *
 * @returns 无（成功则通道进入关闭流程，双方余额按最新状态结算到链上）
 *
 * @note 关闭通道需要双方协同，单方面关闭会触发超时机制
 * @note 结算交易上链后，通道内的 local/remote 余额分别返还给各方的 close_script 地址
 */
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

/**
 * 带追踪版本的 shutdown_channel，供 API 路由使用。
 */
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

/**
 * 建立与对端节点的 P2P 连接（open_channel 前必须先调用）。
 *
 * RPC Method: `connect_peer`
 *
 * @param address - 对端节点的完整多地址字符串
 *                  格式：`/dns4/<host>/tcp/<port>/p2p/<peerId>`
 *                  或   `/ip4/<ip>/tcp/<port>/p2p/<peerId>`
 *                  peerId 从目标节点的 node_info.addresses 中提取
 *
 * @returns null（成功则静默返回，已连接时调用幂等）
 *
 * @note 若节点已连接，重复调用不会报错（幂等操作）
 * @note connect_peer 成功后建议等待约 1-2 秒再调用 open_channel，确保握手完成
 */
export async function connectPeer(
  nodeName: string,
  params: ConnectPeerParams
): Promise<unknown> {
  const node = NODES[nodeName];
  if (!node) throw new Error(`Unknown node: ${nodeName}`);

  return rpcCall(node.rpcUrl, 'connect_peer', [{ address: params.address }]);
}

/**
 * 带追踪版本的 connect_peer，供 API 路由使用。
 */
export async function connectPeerWithTrace(
  nodeName: string,
  params: ConnectPeerParams
): Promise<{ result: unknown; trace: RpcTrace }> {
  const node = NODES[nodeName];
  if (!node) throw new Error(`Unknown node: ${nodeName}`);

  return rpcCallWithTrace(node.rpcUrl, 'connect_peer', [{ address: params.address }]);
}

// ─── 工具函数 ─────────────────────────────────────────────────────────────────

/**
 * 获取节点的第一个 P2P 地址（用于 connect_peer / open_channel）。
 */
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

/** 检查指定节点是否在线 */
export async function checkNodeHealth(nodeName: string): Promise<boolean> {
  try {
    await getNodeInfo(nodeName);
    return true;
  } catch {
    return false;
  }
}

/** 批量检查所有节点健康状态 */
export async function checkAllNodesHealth() {
  const results: Record<string, boolean> = {};
  await Promise.all(Object.keys(NODES).map(async (name) => {
    results[name] = await checkNodeHealth(name);
  }));
  return results;
}

/** 批量获取所有节点链下通道余额（合计） */
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

/**
 * 获取节点链上 CKB 余额（通过 CKB RPC get_cells_capacity 查询）。
 * @returns bigint 余额（shannon 单位）
 */
export async function getOnChainBalance(nodeName: string): Promise<bigint> {
  const node = NODES[nodeName];
  if (!node) throw new Error(`Unknown node: ${nodeName}`);

  const info = await rpcCall(node.rpcUrl, 'node_info');
  const lockScript = (info as {
    default_funding_lock_script?: { code_hash: string; hash_type: string; args: string };
  }).default_funding_lock_script;
  if (!lockScript) return BigInt(0);

  const result = await ckbRpcCall('get_cells_capacity', [{
    script: { code_hash: lockScript.code_hash, hash_type: lockScript.hash_type, args: lockScript.args },
    script_type: 'lock',
  }]);

  return BigInt(result?.capacity || '0x0');
}

/** 批量获取所有节点链上余额 */
export async function getAllOnChainBalances(): Promise<Record<string, bigint>> {
  const results: Record<string, bigint> = {};
  await Promise.all(Object.keys(NODES).map(async (name) => {
    try { results[name] = await getOnChainBalance(name); }
    catch { results[name] = BigInt(0); }
  }));
  return results;
}

/**
 * 获取节点链上 UDT 余额（通过 CKB RPC get_cells 查询指定 type script 的 cells）。
 * @returns bigint 余额（UDT 基本单位）
 */
export async function getOnChainUdtBalance(nodeName: string): Promise<bigint> {
  const node = NODES[nodeName];
  if (!node) throw new Error(`Unknown node: ${nodeName}`);

  const info = await rpcCall(node.rpcUrl, 'node_info');
  const lockScript = (info as {
    default_funding_lock_script?: { code_hash: string; hash_type: string; args: string };
  }).default_funding_lock_script;
  if (!lockScript) return BigInt(0);

  // 使用 get_cells 查询带有 UDT type script 的 cells
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
    // UDT 金额存储在 output_data 的前 16 个字节（128 位），小端序
    const data = cell.output_data || '0x';
    if (data.length >= 34) { // '0x' + 32 个十六进制字符（16 字节）
      // 移除 0x 前缀，解析小端序十六进制
      const hexData = data.slice(2, 34);
      // 小端序：将字节对反转
      const bytes: number[] = [];
      for (let i = 0; i < hexData.length; i += 2) {
        bytes.push(parseInt(hexData.slice(i, i + 2), 16));
      }
      // 小端序转大数
      let amount = BigInt(0);
      for (let i = bytes.length - 1; i >= 0; i--) {
        amount = (amount << BigInt(8)) | BigInt(bytes[i]);
      }
      totalUdt += amount;
    }
  }
  return totalUdt;
}

/** 批量获取所有节点链上 UDT 余额 */
export async function getAllOnChainUdtBalances(): Promise<Record<string, bigint>> {
  const results: Record<string, bigint> = {};
  await Promise.all(Object.keys(NODES).map(async (name) => {
    try { results[name] = await getOnChainUdtBalance(name); }
    catch { results[name] = BigInt(0); }
  }));
  return results;
}
