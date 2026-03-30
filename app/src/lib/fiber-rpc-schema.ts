/**
 * Fiber RPC 方法静态元数据
 *
 * 为每个 RPC 方法提供结构化的参数说明和返回字段说明，
 * 供 RPC Inspector 面板在调用详情旁展示字段文档。
 */

export interface RpcFieldDef {
  field: string;
  type: string;
  required?: boolean;
  desc: string;
}

export interface RpcMethodSchema {
  description: string;
  docsUrl?: string;
  params: RpcFieldDef[];
  returns: RpcFieldDef[];
  /** SDK 代码示例 */
  sdkExample?: string;
}

export const RPC_SCHEMA: Record<string, RpcMethodSchema> = {
  node_info: {
    description: '获取节点自身信息，包括 Peer ID、版本、P2P 地址和链上 lock script。',
    params: [],
    returns: [
      { field: 'node_id', type: 'hex string', desc: '节点公钥（用于识别节点身份，与 Peer ID 不同）' },
      { field: 'version', type: 'string', desc: 'Fiber 节点版本号，如 "0.1.0"' },
      { field: 'addresses', type: 'string[]', desc: 'P2P 监听地址列表，格式 /dns4/<host>/tcp/<port>/p2p/<peerId>，peerId 用于 connect_peer 和 open_channel' },
      { field: 'chain_hash', type: 'hex string', desc: '所在链的 genesis block hash，用于区分 mainnet / testnet / devnet' },
      { field: 'default_funding_lock_script', type: 'Script', desc: '节点默认的链上 funding lock script，其中 args 字段即节点链上地址' },
    ],
    sdkExample: `import { getNodeInfo } from '@/lib/fiber-client';

// 获取节点信息
const info = await getNodeInfo('alice');
console.log('Peer ID:', info.node_id);
console.log('P2P Address:', info.addresses[0]);`,
  },

  connect_peer: {
    description: '建立与对端节点的 P2P 连接。open_channel 前必须先调用此接口，已连接时重复调用幂等。',
    params: [
      {
        field: 'address',
        type: 'string',
        required: true,
        desc: '对端节点的完整多地址字符串，格式：/dns4/<host>/tcp/<port>/p2p/<peerId> 或 /ip4/<ip>/tcp/<port>/p2p/<peerId>',
      },
    ],
    returns: [
      { field: '(null)', type: 'null', desc: '成功时静默返回 null，无返回值' },
    ],
    sdkExample: `import { connectPeer, getNodeP2PAddress } from '@/lib/fiber-client';

// 获取目标节点的 P2P 地址
const address = await getNodeP2PAddress('bob');
// 返回: "/dns4/node2/tcp/10002/p2p/QmXxx..."

// 建立连接
await connectPeer('alice', { address });`,
  },

  open_channel: {
    description: '开启一条支付通道。调用后 Fiber 会自动构建并广播链上 funding 交易，等待 CKB 出块确认（约 10-20 秒）后通道变为 CHANNEL_READY 状态才可收发支付。',
    params: [
      {
        field: 'peer_id',
        type: 'string',
        required: true,
        desc: '对端节点 Peer ID，从目标节点 node_info.addresses 的 /p2p/<id> 部分提取',
      },
      {
        field: 'funding_amount',
        type: 'hex string',
        required: true,
        desc: '注资金额，十六进制字符串，单位 shannon（1 CKB = 10^8 shannon）。示例：100 CKB → "0x2540be400"',
      },
      {
        field: 'funding_udt_type_script',
        type: 'Script',
        required: false,
        desc: 'UDT 通道专用：指定 UDT token 的 type script（含 code_hash / hash_type / args）。CKB 通道无需此字段',
      },
    ],
    returns: [
      { field: 'channel_id', type: 'hex string', desc: '新建通道的唯一 ID，用于后续 shutdown_channel 关闭' },
    ],
    sdkExample: `import { openChannel, getNodeP2PAddress } from '@/lib/fiber-client';

// 获取对端 Peer ID
const address = await getNodeP2PAddress('bob');
const peerId = address.split('/p2p/')[1];

// 开启通道（100 CKB）
const result = await openChannel('alice', {
  peerId,
  fundingAmount: '10000000000', // 100 CKB = 10^10 shannon
  assetType: 'CKB'
});
console.log('Channel ID:', result.channel_id);`,
  },

  list_channels: {
    description: '获取节点的通道列表，可按 peer_id 过滤。注意：必须传 [{}] 参数，传空数组 [] 会返回 Invalid params 错误。',
    params: [
      {
        field: 'peer_id',
        type: 'string',
        required: false,
        desc: '(可选) 只返回与指定 peer_id 建立的通道；省略则返回所有通道',
      },
    ],
    returns: [
      { field: 'channels', type: 'Channel[]', desc: '通道数组' },
      { field: 'channels[].channel_id', type: 'hex string', desc: '通道唯一 ID' },
      { field: 'channels[].peer_id', type: 'string', desc: '对端节点 Peer ID' },
      { field: 'channels[].local_balance', type: 'hex string', desc: '本地余额（shannon），支付后减少' },
      { field: 'channels[].remote_balance', type: 'hex string', desc: '对端余额（shannon），收款后增加' },
      { field: 'channels[].state.state_name', type: 'string', desc: '通道状态：CHANNEL_READY（可用）/ NEGOTIATING_FUNDING（等待链上确认）/ CLOSED（已关闭）' },
    ],
    sdkExample: `import { getChannels } from '@/lib/fiber-client';

// 获取所有通道
const result = await getChannels('alice');
result.channels.forEach(ch => {
  console.log('Channel:', ch.channel_id, 'Balance:', ch.local_balance);
});`,
  },

  new_invoice: {
    description: '由收款方生成支付发票字符串。付款方拿到发票字符串后调用 send_payment 完成支付。同一张发票只能被成功支付一次。',
    params: [
      {
        field: 'amount',
        type: 'hex string',
        required: true,
        desc: '收款金额，十六进制字符串。CKB 单位为 shannon（1 CKB = 10^8），UDT 为 token 基本单位',
      },
      {
        field: 'currency',
        type: 'string',
        required: true,
        desc: '网络标识，必填。devnet = "Fibd"，testnet = "Fibt"，mainnet = "Fiber"',
      },
      {
        field: 'description',
        type: 'string',
        required: false,
        desc: '发票描述（可选），如订单号或备注',
      },
      {
        field: 'expiry',
        type: 'hex string',
        required: false,
        desc: '发票有效期，十六进制秒数，默认 3600 秒（0xe10）',
      },
      {
        field: 'udt_type_script',
        type: 'Script',
        required: false,
        desc: 'UDT 发票专用：指定 UDT token 的 type script，与通道中的 funding_udt_type_script 一致',
      },
    ],
    returns: [
      { field: 'invoice_address', type: 'string', desc: '发票字符串（如 "fibd1..."），付款方通过此字符串调用 send_payment' },
      { field: 'invoice', type: 'object', desc: '发票详细信息，含 payment_hash（支付标识）、amount、expiry 等字段' },
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
    description: '由付款方发起链下支付。Fiber 自动寻路（支持多跳），无需链上交易，通常毫秒至秒级完成。',
    params: [
      {
        field: 'invoice',
        type: 'string',
        required: true,
        desc: '目标发票字符串，由收款方通过 new_invoice 生成（如 "fibd1..."）',
      },
    ],
    returns: [
      { field: 'payment_hash', type: 'hex string', desc: '支付哈希，唯一标识本次支付' },
      { field: 'status', type: 'string', desc: '支付状态：Success / Pending / Failed' },
      { field: 'fee', type: 'hex string', desc: '实际扣除的路由手续费（shannon）' },
      { field: 'failed_error', type: 'string', desc: '若支付失败，此处包含失败原因（如余额不足、无可用路由）' },
    ],
    sdkExample: `import { payInvoice } from '@/lib/fiber-client';

// Alice 支付（付款方）
const result = await payInvoice('alice', { 
  invoice: 'fibd1...' // 从收款方获取的发票
});
console.log('Payment status:', result.status);`,
  },

  shutdown_channel: {
    description: '发起通道关闭流程，将通道内双方余额按最新状态结算回链上。需要双方协同，结算后资金归还各自 close_script 地址。',
    params: [
      {
        field: 'channel_id',
        type: 'hex string',
        required: true,
        desc: '要关闭的通道 ID，从 list_channels 获取',
      },
      {
        field: 'close_script',
        type: 'Script',
        required: true,
        desc: '资金结算目标 lock script，决定链上结算资金的归属地址',
      },
      {
        field: 'fee_rate',
        type: 'hex string',
        required: true,
        desc: '链上结算交易的手续费率（shannons/KB），最低值约 0x400',
      },
    ],
    returns: [
      { field: '(null)', type: 'null', desc: '成功则通道进入关闭协商流程，资金最终结算到链上' },
    ],
    sdkExample: `import { closeChannel, getChannels } from '@/lib/fiber-client';

// 获取通道列表
const channels = await getChannels('alice');
const channelId = channels.channels[0].channel_id;

// 关闭通道
await closeChannel('alice', channelId);`,
  },
};
