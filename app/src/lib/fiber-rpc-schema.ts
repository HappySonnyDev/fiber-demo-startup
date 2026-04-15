/**
 * Fiber RPC 方法静态元数据
 *
 * 为每个 RPC 方法提供结构化的参数说明和返回字段说明，
 * 供 RPC Inspector 面板在调用详情旁展示字段文档。
 */

export type LocalizedText = string | { zh: string; en: string };

export interface RpcFieldDef {
  field: string;
  type: string;
  required?: boolean;
  desc: LocalizedText;
}

export interface RpcMethodSchema {
  description: LocalizedText;
  docsUrl?: string;
  params: RpcFieldDef[];
  returns: RpcFieldDef[];
  /** SDK 代码示例 */
  sdkExample?: string;
}

/** 获取本地化文本 */
export function getLocalizedText(text: LocalizedText, lang: 'zh' | 'en'): string {
  if (typeof text === 'string') return text;
  return text[lang] ?? text.zh;
}

export const RPC_SCHEMA: Record<string, RpcMethodSchema> = {
  node_info: {
    description: { zh: '获取节点自身信息，包括 Peer ID、版本、P2P 地址和链上 lock script。', en: 'Get node self information, including Peer ID, version, P2P addresses and on-chain lock script.' },
    params: [],
    returns: [
      { field: 'pubkey', type: 'hex string', desc: { zh: '节点公钥（hex-encoded secp256k1，用于识别节点身份）', en: 'Node public key (hex-encoded secp256k1, used to identify node identity)' } },
      { field: 'version', type: 'string', desc: { zh: 'Fiber 节点版本号，如 "0.1.0"', en: 'Fiber node version, e.g. "0.1.0"' } },
      { field: 'addresses', type: 'string[]', desc: { zh: 'P2P 监听地址列表，格式 /dns4/<host>/tcp/<port>/p2p/<peerId>，peerId 用于 connect_peer 和 open_channel', en: 'P2P listening address list, format /dns4/<host>/tcp/<port>/p2p/<peerId>, peerId used for connect_peer and open_channel' } },
      { field: 'chain_hash', type: 'hex string', desc: { zh: '所在链的 genesis block hash，用于区分 mainnet / testnet / devnet', en: 'Genesis block hash of the chain, used to distinguish mainnet / testnet / devnet' } },
      { field: 'default_funding_lock_script', type: 'Script', desc: { zh: '节点默认的链上 funding lock script，其中 args 字段即节点链上地址', en: 'Default on-chain funding lock script of the node, where args field is the node on-chain address' } },
    ],
    sdkExample: `import { getNodeInfo } from '@/lib/fiber-client';

// 获取节点信息
const info = await getNodeInfo('alice');
console.log('Pubkey:', info.pubkey);
console.log('P2P Address:', info.addresses[0]);`,
  },

  connect_peer: {
    description: { zh: '建立与对端节点的 P2P 连接。open_channel 前必须先调用此接口，已连接时重复调用幂等。', en: 'Establish P2P connection with peer node. Must call this before open_channel. Idempotent when already connected.' },
    params: [
      {
        field: 'pubkey',
        type: 'string',
        required: false,
        desc: { zh: '对端节点公钥（hex-encoded secp256k1），与 address 至少提供一个', en: 'Peer node public key (hex-encoded secp256k1), at least one of pubkey or address must be provided' },
      },
      {
        field: 'address',
        type: 'string',
        required: false,
        desc: { zh: '对端节点的 P2P 地址字符串，与 pubkey 至少提供一个', en: 'Peer node P2P address string, at least one of address or pubkey must be provided' },
      },
    ],
    returns: [
      { field: '(null)', type: 'null', desc: { zh: '成功时静默返回 null，无返回值', en: 'Returns null silently on success, no return value' } },
    ],
    sdkExample: `import { connectPeer, getNodeP2PAddress } from '@/lib/fiber-client';

// 获取目标节点的 P2P 地址
const address = await getNodeP2PAddress('bob');
// 返回: "/dns4/node2/tcp/10002/p2p/QmXxx..."

// 建立连接
await connectPeer('alice', { address });`,
  },

  open_channel: {
    description: { zh: '开启一条支付通道。调用后 Fiber 会自动构建并广播链上 funding 交易，等待 CKB 出块确认（约 10-20 秒）后通道变为 ChannelReady 状态才可收发支付。', en: 'Open a payment channel. Fiber will automatically build and broadcast on-chain funding transaction. Channel becomes ChannelReady after CKB block confirmation (~10-20s).' },
    params: [
      {
        field: 'pubkey',
        type: 'string',
        required: true,
        desc: { zh: '对端节点公钥（hex-encoded secp256k1），从目标节点 node_info.pubkey 获取', en: 'Peer node public key (hex-encoded secp256k1), obtained from node_info.pubkey' },
      },
      {
        field: 'funding_amount',
        type: 'hex string',
        required: true,
        desc: { zh: '注资金额，十六进制字符串，单位 shannon（1 CKB = 10^8 shannon）。示例：100 CKB → "0x2540be400"', en: 'Funding amount, hex string, unit is shannon (1 CKB = 10^8 shannon). Example: 100 CKB → "0x2540be400"' },
      },
      {
        field: 'funding_udt_type_script',
        type: 'Script',
        required: false,
        desc: { zh: 'UDT 通道专用：指定 UDT token 的 type script（含 code_hash / hash_type / args）。CKB 通道无需此字段', en: 'UDT channel only: specify UDT token type script (contains code_hash / hash_type / args). Not needed for CKB channels' },
      },
    ],
    returns: [
      { field: 'channel_id', type: 'hex string', desc: { zh: '新建通道的唯一 ID，用于后续 shutdown_channel 关闭', en: 'Unique ID of the new channel, used for subsequent shutdown_channel' } },
    ],
    sdkExample: `import { openChannel, getNodeP2PAddress } from '@/lib/fiber-client';

// 获取对端公钥
const info = await getNodeInfo('bob');
const pubkey = info.pubkey;

// 开启通道（100 CKB）
const result = await openChannel('alice', {
  pubkey,
  fundingAmount: '10000000000', // 100 CKB = 10^10 shannon
  assetType: 'CKB'
});
console.log('Channel ID:', result.channel_id);`,
  },

  list_channels: {
    description: { zh: '获取节点的通道列表，可按 pubkey 过滤。注意：必须传 [{}] 参数，传空数组 [] 会返回 Invalid params 错误。', en: 'Get node channel list, filterable by pubkey. Note: must pass [{}] as parameter, empty array [] returns Invalid params error.' },
    params: [
      {
        field: 'pubkey',
        type: 'string',
        required: false,
        desc: { zh: '(可选) 只返回与指定 pubkey 建立的通道；省略则返回所有通道', en: '(Optional) Only return channels with specified pubkey; omit to return all channels' },
      },
    ],
    returns: [
      { field: 'channels', type: 'Channel[]', desc: { zh: '通道数组', en: 'Channel array' } },
      { field: 'channels[].channel_id', type: 'hex string', desc: { zh: '通道唯一 ID', en: 'Channel unique ID' } },
      { field: 'channels[].pubkey', type: 'string', desc: { zh: '对端节点公钥（hex-encoded secp256k1）', en: 'Counterparty node public key (hex-encoded secp256k1)' } },
      { field: 'channels[].local_balance', type: 'hex string', desc: { zh: '本地余额（shannon），支付后减少', en: 'Local balance (shannon), decreases after payment' } },
      { field: 'channels[].remote_balance', type: 'hex string', desc: { zh: '对端余额（shannon），收款后增加', en: 'Remote balance (shannon), increases after receiving' } },
      { field: 'channels[].state.state_name', type: 'string', desc: { zh: '通道状态：ChannelReady（可用）/ AwaitingTxSignatures（等待链上确认）/ ChannelClosed（已关闭）', en: 'Channel state: ChannelReady (available) / AwaitingTxSignatures (waiting on-chain confirmation) / ChannelClosed (closed)' } },
    ],
    sdkExample: `import { getChannels } from '@/lib/fiber-client';

// 获取所有通道
const result = await getChannels('alice');
result.channels.forEach(ch => {
  console.log('Channel:', ch.channel_id, 'Balance:', ch.local_balance);
});`,
  },

  new_invoice: {
    description: { zh: '由收款方生成支付发票字符串。付款方拿到发票字符串后调用 send_payment 完成支付。同一张发票只能被成功支付一次。', en: 'Generate payment invoice string by payee. Payer calls send_payment with this string to complete payment. Same invoice can only be paid once successfully.' },
    params: [
      {
        field: 'amount',
        type: 'hex string',
        required: true,
        desc: { zh: '收款金额，十六进制字符串。CKB 单位为 shannon（1 CKB = 10^8），UDT 为 token 基本单位', en: 'Payment amount, hex string. CKB unit is shannon (1 CKB = 10^8), UDT is token base unit' },
      },
      {
        field: 'currency',
        type: 'string',
        required: true,
        desc: { zh: '网络标识，必填。devnet = "Fibd"，testnet = "Fibt"，mainnet = "Fiber"', en: 'Network identifier, required. devnet = "Fibd", testnet = "Fibt", mainnet = "Fiber"' },
      },
      {
        field: 'description',
        type: 'string',
        required: false,
        desc: { zh: '发票描述（可选），如订单号或备注', en: 'Invoice description (optional), e.g. order number or note' },
      },
      {
        field: 'expiry',
        type: 'hex string',
        required: false,
        desc: { zh: '发票有效期，十六进制秒数，默认 3600 秒（0xe10）', en: 'Invoice expiry time, hex seconds, default 3600 seconds (0xe10)' },
      },
      {
        field: 'udt_type_script',
        type: 'Script',
        required: false,
        desc: { zh: 'UDT 发票专用：指定 UDT token 的 type script，与通道中的 funding_udt_type_script 一致', en: 'UDT invoice only: specify UDT token type script, same as funding_udt_type_script in channel' },
      },
    ],
    returns: [
      { field: 'invoice_address', type: 'string', desc: { zh: '发票字符串（如 "fibd1..."），付款方通过此字符串调用 send_payment', en: 'Invoice string (e.g. "fibd1..."), payer calls send_payment with this string' } },
      { field: 'invoice', type: 'object', desc: { zh: '发票详细信息，含 payment_hash（支付标识）、amount、expiry 等字段', en: 'Invoice details, contains payment_hash (payment identifier), amount, expiry, etc.' } },
    ],
    sdkExample: `import { createInvoice } from '@/lib/fiber-client';

// Bob 生成发票（收款方）
const result = await createInvoice('bob', {
  amount: '1000000000', // 10 CKB
  description: 'Payment for order #123',
  assetType: 'CKB'
});
console.log('Invoice:', result.invoice_address);`,
  },

  send_payment: {
    description: { zh: '由付款方发起链下支付。Fiber 自动寻路（支持多跳），无需链上交易，通常毫秒至秒级完成。', en: 'Initiate off-chain payment by payer. Fiber auto-routes (supports multi-hop), no on-chain transaction needed, typically completes in milliseconds to seconds.' },
    params: [
      {
        field: 'invoice',
        type: 'string',
        required: true,
        desc: { zh: '目标发票字符串，由收款方通过 new_invoice 生成（如 "fibd1..."）', en: 'Target invoice string, generated by payee via new_invoice (e.g. "fibd1...")' },
      },
    ],
    returns: [
      { field: 'payment_hash', type: 'hex string', desc: { zh: '支付哈希，唯一标识本次支付', en: 'Payment hash, unique identifier for this payment' } },
      { field: 'status', type: 'string', desc: { zh: '支付状态：Success / Pending / Failed', en: 'Payment status: Success / Pending / Failed' } },
      { field: 'fee', type: 'hex string', desc: { zh: '实际扣除的路由手续费（shannon）', en: 'Actual routing fee deducted (shannon)' } },
      { field: 'failed_error', type: 'string', desc: { zh: '若支付失败，此处包含失败原因（如余额不足、无可用路由）', en: 'If payment fails, contains failure reason (e.g. insufficient balance, no available route)' } },
    ],
    sdkExample: `import { payInvoice } from '@/lib/fiber-client';

// Alice 支付（付款方）
const result = await payInvoice('alice', { 
  invoice: 'fibd1...' // 从收款方获取的发票
});
console.log('Payment status:', result.status);`,
  },

  shutdown_channel: {
    description: { zh: '发起通道关闭流程，将通道内双方余额按最新状态结算回链上。需要双方协同，结算后资金归还各自 close_script 地址。', en: 'Initiate channel closing process, settle both parties balances back on-chain according to latest state. Requires both parties coordination, funds return to respective close_script addresses after settlement.' },
    params: [
      {
        field: 'channel_id',
        type: 'hex string',
        required: true,
        desc: { zh: '要关闭的通道 ID，从 list_channels 获取', en: 'Channel ID to close, obtained from list_channels' },
      },
      {
        field: 'close_script',
        type: 'Script',
        required: true,
        desc: { zh: '资金结算目标 lock script，决定链上结算资金的归属地址', en: 'Target lock script for fund settlement, determines on-chain settlement fund recipient address' },
      },
      {
        field: 'fee_rate',
        type: 'hex string',
        required: true,
        desc: { zh: '链上结算交易的手续费率（shannons/KB），最低值约 0x400', en: 'On-chain settlement transaction fee rate (shannons/KB), minimum value approx 0x400' },
      },
    ],
    returns: [
      { field: '(null)', type: 'null', desc: { zh: '成功则通道进入关闭协商流程，资金最终结算到链上', en: 'On success, channel enters closing negotiation process, funds eventually settle on-chain' } },
    ],
    sdkExample: `import { closeChannel, getChannels } from '@/lib/fiber-client';

// 获取通道列表
const channels = await getChannels('alice');
const channelId = channels.channels[0].channel_id;

// 关闭通道
await closeChannel('alice', channelId);`,
  },
};
