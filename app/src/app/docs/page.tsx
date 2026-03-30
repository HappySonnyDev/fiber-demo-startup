"use client";
import React, { useState } from "react";
import Link from "next/link";
import { Zap, ArrowRight, ChevronRight, ExternalLink, Code2, Layers, Shield, Puzzle } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { getLocalizedText, type LocalizedText } from "@/lib/fiber-rpc-schema";

// ─── 类型 ─────────────────────────────────────────────────────────────────────

interface FieldDef {
  field: string;
  type: string;
  required?: boolean;
  desc: LocalizedText;
}

interface MethodDoc {
  id: string;
  name: string;
  rpcMethod: string;
  category: "channel" | "payment" | "node";
  tagline: LocalizedText;
  description: LocalizedText;
  signature: string;
  params: FieldDef[];
  returns: FieldDef[];
  rpcRaw: {
    request: string;
    response: string;
  };
  sdkExample: string;
  notes?: LocalizedText[];
}

// ─── SDK 方法文档数据 ──────────────────────────────────────────────────────────

const METHODS: MethodDoc[] = [
  {
    id: "getNodeInfo",
    name: "getNodeInfo",
    rpcMethod: "node_info",
    category: "node",
    tagline: { zh: "获取节点身份与网络信息", en: "Get node identity and network info" },
    description: { zh: "获取 Fiber 节点的自身信息，包括节点公钥、版本、P2P 监听地址列表以及链上 funding lock script。是建立连接和开通通道前必须调用的基础方法。", en: "Get Fiber node self information including node public key, version, P2P listening address list and on-chain funding lock script. Essential method before establishing connections and opening channels." },
    signature: "getNodeInfo(nodeName: string): Promise<NodeInfo>",
    params: [
      {
        field: "nodeName",
        type: "string",
        required: true,
        desc: { zh: '节点名称，对应 NODES 配置中的键名，如 "alice" / "bob" / "charlie"', en: 'Node name, corresponding to key in NODES config, e.g. "alice" / "bob" / "charlie"' },
      },
    ],
    returns: [
      { field: "node_id", type: "hex string", desc: { zh: "节点公钥（65 字节，压缩格式），用于节点身份识别，与 Peer ID 不同", en: "Node public key (65 bytes, compressed format), for node identity, different from Peer ID" } },
      { field: "version", type: "string", desc: { zh: 'Fiber 节点版本号，如 "0.1.0"', en: 'Fiber node version, e.g. "0.1.0"' } },
      {
        field: "addresses",
        type: "string[]",
        desc: { zh: "P2P 监听地址列表，格式 /dns4/<host>/tcp/<port>/p2p/<peerId>，peerId 用于 connectPeer 和 openChannel", en: "P2P listening address list, format /dns4/<host>/tcp/<port>/p2p/<peerId>, peerId used for connectPeer and openChannel" },
      },
      { field: "chain_hash", type: "hex string", desc: { zh: "所在链的 genesis block hash，用于区分 mainnet / testnet / devnet", en: "Genesis block hash of the chain, used to distinguish mainnet / testnet / devnet" } },
      {
        field: "default_funding_lock_script",
        type: "Script",
        desc: { zh: "节点默认的链上 lock script，其中 args 字段即节点的链上地址，预充资金时需要用到", en: "Default on-chain lock script of the node, where args field is the node on-chain address, needed for pre-funding" },
      },
    ],
    rpcRaw: {
      request: `{
  "jsonrpc": "2.0",
  "method": "node_info",
  "params": [],
  "id": 1
}`,
      response: `{
  "result": {
    "node_id": "0x02e...",
    "version": "0.1.0",
    "addresses": [
      "/dns4/fiber-node1/tcp/8227/p2p/QmXa..."
    ],
    "chain_hash": "0x92b...",
    "default_funding_lock_script": {
      "code_hash": "0x9b...",
      "hash_type": "type",
      "args": "0x..."
    }
  }
}`,
    },
    sdkExample: `import { getNodeInfo } from "@/lib/fiber-client";

const info = await getNodeInfo("alice");

// 提取 Peer ID（用于 connectPeer / openChannel）
const peerId = info.addresses[0].match(/\\/p2p\\/(.+)$/)?.[1];

// 查看链上地址（用于 CKB 预充资金）
const lockScript = info.default_funding_lock_script;`,
    notes: [
      "addresses 中的 peerId 是 multihash 格式（以 Qm 开头），不同于 node_id（压缩公钥）",
      "同一个 Fiber 节点可以有多个 P2P 地址，通常取第一个即可",
    ],
  },
  {
    id: "connectPeer",
    name: "connectPeer",
    rpcMethod: "connect_peer",
    category: "node",
    tagline: { zh: "建立 P2P 握手连接", en: "Establish P2P handshake connection" },
    description: { zh: "在两个 Fiber 节点之间建立 P2P 握手连接。openChannel 前必须先调用此方法，确保双方已完成网络握手。若节点已连接，重复调用是幂等的，不会报错。", en: "Establish P2P handshake connection between two Fiber nodes. Must call this before openChannel to ensure network handshake is complete. Idempotent if nodes are already connected." },
    signature: "connectPeer(nodeName: string, params: ConnectPeerParams): Promise<null>",
    params: [
      { field: "nodeName", type: "string", required: true, desc: { zh: "发起连接的节点名", en: "Node name initiating the connection" } },
      {
        field: "address",
        type: "string",
        required: true,
        desc: { zh: "对端节点的完整多地址字符串，从目标节点的 node_info.addresses 获取。格式：/dns4/<host>/tcp/<port>/p2p/<peerId>", en: "Full multiaddr string of peer node, obtained from target node node_info.addresses. Format: /dns4/<host>/tcp/<port>/p2p/<peerId>" },
      },
    ],
    returns: [{ field: "(null)", type: "null", desc: { zh: "成功时静默返回 null，无实际返回值", en: "Returns null silently on success, no actual return value" } }],
    rpcRaw: {
      request: `{
  "jsonrpc": "2.0",
  "method": "connect_peer",
  "params": [{
    "address": "/dns4/fiber-node2/tcp/8228/p2p/QmXb..."
  }],
  "id": 1
}`,
      response: `{
  "result": null
}`,
    },
    sdkExample: `import { connectPeer, getNodeP2PAddress } from "@/lib/fiber-client";

// 先获取目标节点的 P2P地址
const address = await getNodeP2PAddress("bob");

// 发起连接（已连接时调用幂等）
await connectPeer("alice", { address });

// 建议等待 1-2 秒再调用 openChannel，确保握手完成
await new Promise(r => setTimeout(r, 2000));`,
    notes: [
      { zh: "已连接时重复调用不会报错（幂等操作）", en: "Repeated calls when already connected will not error (idempotent operation)" },
      { zh: "connect 成功后建议等待 1-2 秒再调用 openChannel，确保 P2P 握手完成", en: "After successful connect, wait 1-2 seconds before calling openChannel to ensure P2P handshake is complete" },
      { zh: "SDK 的 openChannel 内部已自动处理 connectPeer，通常不需要手动调用", en: "SDK's openChannel internally handles connectPeer automatically, usually no need to call manually" },
    ],
  },
  {
    id: "openChannel",
    name: "openChannel",
    rpcMethod: "open_channel",
    category: "channel",
    tagline: { zh: "开启链下支付通道", en: "Open off-chain payment channel" },
    description: { zh: "在两个节点之间开启一条支付通道。调用后 Fiber 会自动构建链上 funding 交易并广播，等待 CKB 出块确认（约 10-20 秒）后通道变为 CHANNEL_READY 状态，此后双方可以进行链下支付。支持 CKB 和任意 UDT 资产。", en: "Open a payment channel between two nodes. Fiber automatically builds and broadcasts on-chain funding transaction. Channel becomes CHANNEL_READY after CKB block confirmation (~10-20s), then both parties can make off-chain payments. Supports CKB and any UDT assets." },
    signature: "openChannel(nodeName: string, params: OpenChannelParams): Promise<{ channel_id: string }>",
    params: [
      { field: "nodeName", type: "string", required: true, desc: { zh: "开通通道的发起方节点名", en: "Node name initiating the channel opening" } },
      {
        field: "peerId",
        type: "string",
        required: true,
        desc: { zh: "对端节点 Peer ID，从 node_info.addresses 的 /p2p/<id> 部分提取", en: "Peer ID of counterparty node, extracted from /p2p/<id> part of node_info.addresses" },
      },
      {
        field: "fundingAmount",
        type: "string | bigint",
        required: true,
        desc: { zh: "注资金额，SDK 自动转换为十六进制 shannon 字符串。1 CKB = 10^8 shannon", en: "Funding amount, SDK auto-converts to hex shannon string. 1 CKB = 10^8 shannon" },
      },
      {
        field: "assetType",
        type: '"CKB" | "UDT"',
        required: false,
        desc: { zh: '资产类型，默认 "CKB"。选择 "UDT" 时 SDK 自动附加 funding_udt_type_script', en: 'Asset type, default "CKB". SDK auto-attaches funding_udt_type_script when "UDT" is selected' },
      },
    ],
    returns: [{ field: "channel_id", type: "hex string", desc: { zh: "新建通道的唯一 ID（临时 ID），用于后续 closeChannel 操作", en: "Unique ID of new channel (temporary ID), used for subsequent closeChannel operations" } }],
    rpcRaw: {
      request: `// 底层 RPC 调用（SDK 自动生成）
{
  "jsonrpc": "2.0",
  "method": "open_channel",
  "params": [{
    "peer_id": "QmXb...",
    "funding_amount": "0x2540be400",
    // UDT 通道额外附加：
    "funding_udt_type_script": {
      "code_hash": "0xe1e3...",
      "hash_type": "data",
      "args": "0xc219..."
    }
  }],
  "id": 1
}`,
      response: `{
  "result": {
    "channel_id": "0x44bf..."
  }
}`,
    },
    sdkExample: `import { openChannel } from "@/lib/fiber-client";

// CKB 通道：注资 100 CKB
const result = await openChannel("alice", {
  peerId: "QmXb...",
  fundingAmount: "10000000000",  // 100 CKB in shannon
  assetType: "CKB",
});
console.log(result.channel_id); // 0x44bf...

// UDT 通道：注资 1000 UDT
await openChannel("alice", {
  peerId: "QmXb...",
  fundingAmount: "1000",
  assetType: "UDT",
});`,
    notes: [
      { zh: "底层 RPC 要求 funding_amount 为十六进制字符串，SDK 已自动处理转换", en: "Underlying RPC requires funding_amount as hex string, SDK handles conversion automatically" },
      { zh: "通道开启后需等待链上确认才变为 CHANNEL_READY，期间无法发起支付", en: "Channel needs on-chain confirmation to become CHANNEL_READY, cannot initiate payments during this period" },
      { zh: "UDT 通道的 type script 已内置在 SDK 中，无需手动传入", en: "UDT channel type script is built into SDK, no need to pass manually" },
      { zh: "通道 ID 在 NEGOTIATING_FUNDING 阶段为临时 ID，确认后可能变更，建议通过 listChannels 重新获取", en: "Channel ID is temporary during NEGOTIATING_FUNDING stage, may change after confirmation, recommend retrieving via listChannels" },
    ],
  },
  {
    id: "getChannels",
    name: "getChannels",
    rpcMethod: "list_channels",
    category: "channel",
    tagline: { zh: "查询节点通道列表", en: "Query node channel list" },
    description: { zh: "获取指定节点的所有通道，包括通道状态、双方余额等信息。是监控通道健康状态、判断是否可以支付的核心查询接口。", en: "Get all channels of specified node, including channel status, both parties balances, etc. Core query interface for monitoring channel health and determining payment capability." },
    signature: "getChannels(nodeName: string): Promise<{ channels: Channel[] }>",
    params: [
      { field: "nodeName", type: "string", required: true, desc: { zh: "要查询的节点名", en: "Node name to query" } },
    ],
    returns: [
      { field: "channels", type: "Channel[]", desc: { zh: "通道数组", en: "Channel array" } },
      { field: "channels[].channel_id", type: "hex string", desc: { zh: "通道唯一 ID", en: "Channel unique ID" } },
      { field: "channels[].peer_id", type: "string", desc: { zh: "对端节点 Peer ID", en: "Counterparty node Peer ID" } },
      { field: "channels[].local_balance", type: "hex string", desc: { zh: "本地余额（shannon），发起支付后减少", en: "Local balance (shannon), decreases after initiating payment" } },
      { field: "channels[].remote_balance", type: "hex string", desc: { zh: "对端余额（shannon），收到支付后增加", en: "Remote balance (shannon), increases after receiving payment" } },
      {
        field: "channels[].state.state_name",
        type: "string",
        desc: { zh: "通道状态：CHANNEL_READY（可用）/ NEGOTIATING_FUNDING（等待链上确认）/ CLOSED（已关闭）", en: "Channel state: CHANNEL_READY (available) / NEGOTIATING_FUNDING (waiting on-chain confirmation) / CLOSED (closed)" },
      },
    ],
    rpcRaw: {
      request: `// 注意：必须传 [{}]，不能传 [] 或省略参数
{
  "jsonrpc": "2.0",
  "method": "list_channels",
  "params": [{}],
  "id": 1
}`,
      response: `{
  "result": {
    "channels": [{
      "channel_id": "0x44bf...",
      "peer_id": "QmXb...",
      "local_balance": "0x3b9aca00",
      "remote_balance": "0x77359400",
      "state": { "state_name": "CHANNEL_READY" }
    }]
  }
}`,
    },
    sdkExample: `import { getChannels } from "@/lib/fiber-client";

const { channels } = await getChannels("alice");

for (const ch of channels) {
  const localCKB = Number(BigInt(ch.local_balance)) / 1e8;
  const isReady = ch.state.state_name === "CHANNEL_READY";
  console.log(\`Channel \${ch.channel_id.slice(0,10)}... Local: \${localCKB} CKB Status: \${isReady ? "Ready" : "Waiting"}\`);
}`,
    notes: [
      { zh: "底层 RPC 必须传 [{}] 参数，直接传 [] 会返回 Invalid params 错误，SDK 已内部处理", en: "Underlying RPC must pass [{}] as parameter, passing [] returns Invalid params error, SDK handles this internally" },
      { zh: "local_balance 和 remote_balance 均为十六进制字符串，需转换：Number(BigInt(hex)) / 1e8 得到 CKB 数量", en: "local_balance and remote_balance are hex strings, convert via: Number(BigInt(hex)) / 1e8 to get CKB amount" },
    ],
  },
  {
    id: "createInvoice",
    name: "createInvoice",
    rpcMethod: "new_invoice",
    category: "payment",
    tagline: { zh: "收款方生成支付发票", en: "Payee generates payment invoice" },
    description: { zh: "由收款方调用，生成一张支付发票字符串（invoice）。付款方拿到发票字符串后调用 payInvoice 即可完成支付。支持设置金额、描述、有效期。同一张发票只能被成功支付一次，payment_hash 保证唯一性。", en: "Called by payee to generate a payment invoice string. Payer calls payInvoice with this string to complete payment. Supports setting amount, description, expiry. Same invoice can only be paid once successfully, payment_hash guarantees uniqueness." },
    signature: "createInvoice(nodeName: string, params: CreateInvoiceParams): Promise<{ invoice_address: string }>",
    params: [
      { field: "nodeName", type: "string", required: true, desc: { zh: "收款方节点名", en: "Payee node name" } },
      {
        field: "amount",
        type: "string | bigint",
        required: true,
        desc: { zh: "收款金额，SDK 自动转换为十六进制。CKB 单位为 shannon，UDT 为 token 基本单位", en: "Payment amount, SDK auto-converts to hex. CKB unit is shannon, UDT is token base unit" },
      },
      { field: "description", type: "string", required: false, desc: { zh: '发票描述，如订单号或备注，默认 "Payment"', en: 'Invoice description, e.g. order number or note, default "Payment"' } },
      { field: "expiry", type: "number", required: false, desc: { zh: "发票有效期（秒），默认 3600 秒", en: "Invoice expiry time (seconds), default 3600 seconds" } },
      { field: "assetType", type: '"CKB" | "UDT"', required: false, desc: { zh: '资产类型，默认 "CKB"', en: 'Asset type, default "CKB"' } },
    ],
    returns: [
      {
        field: "invoice_address",
        type: "string",
        desc: { zh: '发票字符串（devnet 以 "fibd1..." 开头），付款方通过此字符串调用 payInvoice', en: 'Invoice string (devnet starts with "fibd1..."), payer calls payInvoice with this string' },
      },
      { field: "invoice", type: "object", desc: { zh: "发票详细信息对象，含 payment_hash、amount、expiry 等字段", en: "Invoice details object, contains payment_hash, amount, expiry, etc." } },
    ],
    rpcRaw: {
      request: `// 底层 RPC 调用（SDK 自动生成）
{
  "jsonrpc": "2.0",
  "method": "new_invoice",
  "params": [{
    "amount": "0x64",       // SDK 自动转换
    "currency": "Fibd",     // SDK 自动注入，devnet 固定值
    "description": "Order #1001",
    "expiry": "0xe10"       // SDK 自动转换为十六进制
  }],
  "id": 1
}`,
      response: `{
  "result": {
    "invoice_address": "fibd1qp...",
    "invoice": {
      "amount": "0x64",
      "payment_hash": "0xabc...",
      "expiry": "0xe10",
      "currency": "Fibd"
    }
  }
}`,
    },
    sdkExample: `import { createInvoice } from "@/lib/fiber-client";

// 收款方（charlie）生成发票，收取 100 shannon 的 CKB
const result = await createInvoice("charlie", {
  amount: "100",
  description: "Order #1001",
  expiry: 3600,
  assetType: "CKB",
});

const invoiceStr = result.invoice_address; // "fibd1qp..."
// Pass invoiceStr to payer`,
    notes: [
      { zh: 'currency 字段底层 RPC 必填，SDK 已根据 devnet 自动注入 "Fibd"，无需手动传', en: 'currency field is required by underlying RPC, SDK auto-injects "Fibd" for devnet, no need to pass manually' },
      { zh: "amount 和 expiry 底层要求十六进制字符串，SDK 自动处理，传普通数字即可", en: "amount and expiry require hex strings at underlying level, SDK handles automatically, just pass regular numbers" },
      { zh: "同一张发票只能支付一次，需要再次收款请重新生成新发票", en: "Same invoice can only be paid once, generate new invoice for subsequent payments" },
    ],
  },
  {
    id: "payInvoice",
    name: "payInvoice",
    rpcMethod: "send_payment",
    category: "payment",
    tagline: { zh: "付款方发起链下支付", en: "Payer initiates off-chain payment" },
    description: { zh: "由付款方调用，通过发票字符串发起链下支付。Fiber 自动进行多跳路由寻路，无需链上交易，通常在毫秒至秒级内完成。支付成功后，路径上所有通道的余额同步更新。", en: "Called by payer to initiate off-chain payment via invoice string. Fiber auto-routes multi-hop, no on-chain transaction needed, typically completes in milliseconds to seconds. After successful payment, balances on all channels along the path are updated synchronously." },
    signature: "payInvoice(nodeName: string, params: PayInvoiceParams): Promise<PaymentResult>",
    params: [
      { field: "nodeName", type: "string", required: true, desc: { zh: "付款方节点名", en: "Payer node name" } },
      {
        field: "invoice",
        type: "string",
        required: true,
        desc: { zh: '目标发票字符串，由收款方通过 createInvoice 生成（如 "fibd1..."）', en: 'Target invoice string, generated by payee via createInvoice (e.g. "fibd1...")' },
      },
    ],
    returns: [
      { field: "payment_hash", type: "hex string", desc: { zh: "支付哈希，唯一标识本次支付", en: "Payment hash, unique identifier for this payment" } },
      { field: "status", type: "string", desc: { zh: "支付状态：Success / Pending / Failed", en: "Payment status: Success / Pending / Failed" } },
      { field: "fee", type: "hex string", desc: { zh: "实际扣除的路由手续费（shannon）", en: "Actual routing fee deducted (shannon)" } },
      { field: "failed_error", type: "string", desc: { zh: "若支付失败，此处包含失败原因（如余额不足、无可用路由）", en: "If payment fails, contains failure reason (e.g. insufficient balance, no available route)" } },
    ],
    rpcRaw: {
      request: `{
  "jsonrpc": "2.0",
  "method": "send_payment",
  "params": [{
    "invoice": "fibd1qp..."
  }],
  "id": 1
}`,
      response: `{
  "result": {
    "payment_hash": "0xabc...",
    "status": "Success",
    "fee": "0x0",
    "failed_error": null
  }
}`,
    },
    sdkExample: `import { payInvoice } from "@/lib/fiber-client";

// 付款方（alice）支付发票
const result = await payInvoice("alice", {
  invoice: "fibd1qp...",  // Invoice string from payee
});

if (result.status === "Success") {
  console.log("Payment success! payment_hash:", result.payment_hash);
} else {
  console.error("Payment failed:", result.failed_error);
}`,
    notes: [
      { zh: "支付为纯链下操作，不需要链上交易确认，通常毫秒至秒级完成", en: "Payment is pure off-chain operation, no on-chain transaction confirmation needed, typically completes in milliseconds to seconds" },
      { zh: "Fiber 支持多跳路由，alice 和 charlie 之间即使没有直接通道，只要路径连通也可支付", en: "Fiber supports multi-hop routing, even without direct channel between alice and charlie, payment works as long as path is connected" },
      { zh: "同一张发票只能成功支付一次，重复支付会返回错误", en: "Same invoice can only be successfully paid once, repeated payment returns error" },
      { zh: "支付失败时 failed_error 会说明原因：余额不足、无可用路由、发票过期等", en: "When payment fails, failed_error explains reason: insufficient balance, no available route, invoice expired, etc." },
    ],
  },
  {
    id: "closeChannel",
    name: "closeChannel",
    rpcMethod: "shutdown_channel",
    category: "channel",
    tagline: { zh: "关闭通道并结算到链上", en: "Close channel and settle on-chain" },
    description: { zh: "发起通道关闭流程，将通道内双方最新余额结算为链上 CKB/UDT。关闭需要双方协同签名，资金会分别归还到各自的 close_script 地址。结算交易需要链上确认，约需 10-30 秒。", en: "Initiate channel closing process, settle both parties latest balances as on-chain CKB/UDT. Closing requires both parties coordinated signatures, funds return to respective close_script addresses. Settlement transaction needs on-chain confirmation, approx 10-30s." },
    signature: "closeChannel(nodeName: string, channelId: string): Promise<null>",
    params: [
      { field: "nodeName", type: "string", required: true, desc: { zh: "发起关闭的节点名", en: "Node name initiating the close" } },
      {
        field: "channelId",
        type: "hex string",
        required: true,
        desc: { zh: "要关闭的通道 ID，从 getChannels 获取", en: "Channel ID to close, obtained from getChannels" },
      },
    ],
    returns: [{ field: "(null)", type: "null", desc: { zh: "成功则通道进入关闭协商流程，资金最终结算到链上", en: "On success, channel enters closing negotiation process, funds eventually settle on-chain" } }],
    rpcRaw: {
      request: `// 底层 RPC 调用（SDK 自动填充 close_script 和 fee_rate）
{
  "jsonrpc": "2.0",
  "method": "shutdown_channel",
  "params": [{
    "channel_id": "0x44bf...",
    "close_script": {
      "code_hash": "0x0000...0000",
      "hash_type": "data",
      "args": "0x"
    },
    "fee_rate": "0xA00"
  }],
  "id": 1
}`,
      response: `{
  "result": null
}`,
    },
    sdkExample: `import { getChannels, closeChannel } from "@/lib/fiber-client";

// Get channel list first
const { channels } = await getChannels("alice");
const readyChannels = channels.filter(
  ch => ch.state.state_name === "CHANNEL_READY"
);

// Close first ready channel
if (readyChannels.length > 0) {
  await closeChannel("alice", readyChannels[0].channel_id);
  console.log("Channel closing, funds will settle on-chain...");
}`,
    notes: [
      { zh: "只有 CHANNEL_READY 状态的通道才能关闭", en: "Only CHANNEL_READY state channels can be closed" },
      { zh: "底层 RPC 需要 close_script 和 fee_rate，SDK 已内置默认值，无需手动传入", en: "Underlying RPC requires close_script and fee_rate, SDK has built-in defaults, no need to pass manually" },
      { zh: "结算后双方链上余额会增加，可通过 CKB RPC get_cells_capacity 查询", en: "After settlement, both parties on-chain balances increase, can query via CKB RPC get_cells_capacity" },
    ],
  },
];

// ─── 颜色映射 ─────────────────────────────────────────────────────────────────

const CATEGORY_COLOR: Record<string, string> = {
  channel: "text-blue-400 bg-blue-500/10 border-blue-500/30",
  payment: "text-green-400 bg-green-500/10 border-green-500/30",
  node: "text-orange-400 bg-orange-500/10 border-orange-500/30",
};
const CATEGORY_LABEL: Record<string, string> = {
  channel: "Channel",
  payment: "Payment",
  node: "Node",
};

// ─── 代码块 ───────────────────────────────────────────────────────────────────

function CodeBlock({ code, lang = "json" }: { code: string; lang?: string }) {
  return (
    <div className="rounded-lg overflow-hidden border border-[#2d2d2d]">
      <div className="flex items-center gap-2 px-3 py-1.5 bg-[#1a1a1a] border-b border-[#2d2d2d]">
        <Code2 className="w-3 h-3 text-[#555]" />
        <span className="text-[10px] text-[#555] uppercase tracking-wider">{lang}</span>
      </div>
      <pre className="p-3 text-[11px] text-[#cccccc] overflow-x-auto bg-[#141414] leading-relaxed font-mono whitespace-pre">
        {code}
      </pre>
    </div>
  );
}

// ─── 字段表格 ─────────────────────────────────────────────────────────────────

function FieldTable({ fields, title }: { fields: FieldDef[]; title: string }) {
  const { t, lang } = useI18n();
  if (fields.length === 0) return (
    <div>
      <div className="text-xs font-semibold text-[#666] uppercase tracking-wider mb-2">{title}</div>
      <div className="text-xs text-[#555] italic">{t('docs.noParams')}</div>
    </div>
  );
  return (
    <div>
      <div className="text-xs font-semibold text-[#666] uppercase tracking-wider mb-2">{title}</div>
      <div className="border border-[#2d2d2d] rounded-lg overflow-hidden">
        <div className="grid grid-cols-[180px_120px_60px_1fr] text-[10px] font-bold text-[#555] uppercase tracking-wider bg-[#1a1a1a] border-b border-[#2d2d2d] px-3 py-1.5 gap-3">
          <span>{t('docs.field')}</span><span>{t('docs.type')}</span><span>{t('docs.required')}</span><span>{t('docs.desc')}</span>
        </div>
        {fields.map((f, i) => (
          <div
            key={f.field}
            className={`grid grid-cols-[180px_120px_60px_1fr] gap-3 px-3 py-2 text-[11px] ${i % 2 === 0 ? "bg-[#141414]" : "bg-[#161616]"} border-b border-[#1e1e1e] last:border-0`}
          >
            <span className="font-mono text-purple-400 truncate" title={f.field}>{f.field}</span>
            <span className="font-mono text-orange-300 opacity-80 truncate">{f.type}</span>
            <span className={`text-[10px] ${f.required ? "text-red-400" : "text-[#444]"}`}>
              {f.required ? t('docs.required') : "—"}
            </span>
            <span className="text-[#888] leading-relaxed">{getLocalizedText(f.desc, lang)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Why SDK 页面 ─────────────────────────────────────────────────────────────

function WhySDKPage() {
  const { t } = useI18n();
  return (
    <div className="max-w-3xl space-y-10">
      {/* Hero */}
      <div>
        <div className="inline-flex items-center gap-2 text-xs text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded-full px-3 py-1 mb-4">
          <Zap className="w-3 h-3" />
          Fiber JS RPC SDK
        </div>
        <h1 className="text-3xl font-bold text-white mb-3 leading-tight">
          为什么需要 SDK？<br />
          <span className="text-[#888] font-normal text-xl">直接调 RPC 不够用吗</span>
        </h1>
        <p className="text-[#888] text-sm leading-relaxed">
          Fiber 节点暴露的是标准 JSON-RPC 接口，理论上 fetch 一下就能用。但在实际开发中，
          原始 RPC 和业务代码之间存在几层&ldquo;摩擦&rdquo;，SDK 就是为了消除这些摩擦而存在的。
        </p>
      </div>

      {/* 对比：直接 RPC vs SDK */}
      <div className="bg-[#1a1a1a] border border-[#2d2d2d] rounded-xl overflow-hidden">
        <div className="grid grid-cols-2 divide-x divide-[#2d2d2d]">
          <div className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full bg-red-500/70" />
              <span className="text-sm font-semibold text-[#888]">直接调用原始 RPC</span>
            </div>
            <pre className="text-[10px] text-[#666] leading-relaxed font-mono whitespace-pre-wrap">{`// 手动构造请求
const res = await fetch("http://127.0.0.1:10001", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    jsonrpc: "2.0",
    method: "open_channel",
    params: [{
      peer_id: peerId,
      // ⚠️ 必须十六进制，不能直接传数字
      funding_amount: "0x" +
        BigInt(amount).toString(16),
      // ⚠️ UDT 通道需要手动构造 type script
      funding_udt_type_script: {
        code_hash: "0xe1e3...",
        hash_type: "data",
        args: "0xc219..."
      }
    }],
    id: Date.now()
  })
});
const data = await res.json();
// ⚠️ 还要手动判断 data.error
if (data.error) throw new Error(data.error.message);
return data.result;`}</pre>
          </div>
          <div className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-sm font-semibold text-white">使用 Fiber JS SDK</span>
            </div>
            <pre className="text-[10px] text-[#cccccc] leading-relaxed font-mono whitespace-pre-wrap">{`import { openChannel } from "@/lib/fiber-client";

// 直接传人类可读的参数
const result = await openChannel("alice", {
  peerId: "QmXb...",
  // ✅ 传普通数字，SDK 自动转十六进制
  fundingAmount: "10000000000",
  // ✅ 传枚举，SDK 自动附加 type script
  assetType: "UDT",
});

// ✅ 直接得到结果，错误自动抛出
console.log(result.channel_id);`}</pre>
          </div>
        </div>
      </div>

      {/* 四大价值 */}
      <div>
        <h2 className="text-lg font-bold text-white mb-5">SDK 解决了四个核心问题</h2>
        <div className="grid grid-cols-2 gap-4">
          {[
            {
              icon: <Layers className="w-4 h-4 text-blue-400" />,
              title: "格式自动转换",
              color: "border-blue-500/20",
              items: [
                "金额参数（shannon）自动从十进制转为十六进制",
                "expiry 自动从秒数转为十六进制字符串",
                "无需手动拼接 0x 前缀",
              ],
            },
            {
              icon: <Puzzle className="w-4 h-4 text-green-400" />,
              title: "资产类型封装",
              color: "border-green-500/20",
              items: [
                "UDT type script 内置，无需每次手动粘贴 code_hash",
                "currency 字段（Fibd/Fiber）按网络自动注入",
                "CKB 与 UDT 通道逻辑统一入口",
              ],
            },
            {
              icon: <Shield className="w-4 h-4 text-purple-400" />,
              title: "错误处理统一",
              color: "border-purple-500/20",
              items: [
                "HTTP 错误、JSON-RPC error 统一转为 JS 异常",
                "错误信息清晰，无需手动判断 data.error 字段",
                "与 try/catch 模式无缝配合",
              ],
            },
            {
              icon: <Code2 className="w-4 h-4 text-orange-400" />,
              title: "可观测性内置",
              color: "border-orange-500/20",
              items: [
                "rpcCallWithTrace 记录完整请求/响应/耗时",
                "每次操作自动在 RPC Inspector 面板中呈现",
                "新人可以直接看到每个按钮背后调用了什么",
              ],
            },
          ].map((card) => (
            <div key={card.title} className={`bg-[#1a1a1a] border ${card.color} rounded-xl p-4`}>
              <div className="flex items-center gap-2 mb-3">
                {card.icon}
                <span className="text-sm font-semibold text-white">{card.title}</span>
              </div>
              <ul className="space-y-1.5">
                {card.items.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-xs text-[#888]">
                    <ChevronRight className="w-3 h-3 text-[#555] shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* 层次示意图 */}
      <div>
        <h2 className="text-lg font-bold text-white mb-4">架构层次</h2>
        <div className="space-y-1">
          {[
            { label: "你的业务代码", sub: "page.tsx · React 组件 · Next.js API 路由", color: "bg-blue-600", w: "w-full" },
            { label: "Fiber JS SDK", sub: "fiber-client.ts · 格式转换 · 错误处理 · 追踪记录", color: "bg-purple-600", w: "w-5/6" },
            { label: "HTTP JSON-RPC", sub: "POST http://127.0.0.1:1000x · jsonrpc 2.0 协议", color: "bg-[#3e3e42]", w: "w-4/6" },
            { label: "Fiber 节点进程", sub: "fnn 二进制 · P2P 网络 · 链下状态机", color: "bg-[#2d2d2d]", w: "w-3/6" },
            { label: "CKB 链", sub: "funding 交易 · 结算交易 · commitment-lock 合约", color: "bg-orange-700/60", w: "w-2/6" },
          ].map((row, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className={`${row.w} ${row.color} rounded px-3 py-2 transition-all`}>
                <div className="text-xs font-semibold text-white">{row.label}</div>
                <div className="text-[10px] text-white/50 mt-0.5">{row.sub}</div>
              </div>
              {i < 4 && <ArrowRight className="w-3 h-3 text-[#444] shrink-0 rotate-90" />}
            </div>
          ))}
        </div>
        <p className="text-xs text-[#555] mt-3">SDK 层（紫色）是你的代码与底层 RPC 之间的唯一桥梁。</p>
      </div>

      {/* 关键规范速查 */}
      <div>
        <h2 className="text-lg font-bold text-white mb-4">Raw RPC 易错点速查</h2>
        <p className="text-xs text-[#666] mb-4">这些是直接使用原始 RPC 时最常遇到的陷阱，SDK 已全部处理好。</p>
        <div className="space-y-2">
          {[
            { tag: "格式", desc: "所有金额参数必须为十六进制字符串", bad: 'funding_amount: 10000000000', good: 'funding_amount: "0x2540be400"' },
            { tag: "格式", desc: "expiry 必须为十六进制字符串", bad: "expiry: 3600", good: 'expiry: "0xe10"' },
            { tag: "必填", desc: "new_invoice 必须包含 currency 字段", bad: "{ amount, description }", good: '{ amount, currency: "Fibd", description }' },
            { tag: "参数", desc: "list_channels 必须传 [{}]，不能传 []", bad: "params: []", good: "params: [{}]" },
            { tag: "顺序", desc: "open_channel 前必须先 connect_peer", bad: "直接 open_channel", good: "connect_peer → 等待握手 → open_channel" },
          ].map((item) => (
            <div key={item.desc} className="bg-[#1a1a1a] border border-[#2d2d2d] rounded-lg p-3 flex gap-4">
              <div className={`shrink-0 text-[9px] px-1.5 py-0.5 rounded border h-fit mt-0.5 ${
                item.tag === "格式" ? "text-yellow-400 border-yellow-500/30 bg-yellow-500/10" :
                item.tag === "必填" ? "text-red-400 border-red-500/30 bg-red-500/10" :
                "text-purple-400 border-purple-500/30 bg-purple-500/10"
              }`}>{item.tag}</div>
              <div className="flex-1">
                <div className="text-xs text-white mb-1.5">{item.desc}</div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-[9px] text-red-400 mb-0.5">✗ Wrong</div>
                    <code className="text-[10px] text-red-300/70 font-mono">{item.bad}</code>
                  </div>
                  <div>
                    <div className="text-[9px] text-green-400 mb-0.5">✓ Correct</div>
                    <code className="text-[10px] text-green-300/70 font-mono">{item.good}</code>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── 方法详情页 ───────────────────────────────────────────────────────────────

function MethodPage({ method }: { method: MethodDoc }) {
  const { t, lang } = useI18n();
  const [tab, setTab] = useState<"sdk" | "rpc">("sdk");
  const categoryLabels = {
    channel: t('docs.channelCategory'),
    payment: t('docs.paymentCategory'),
    node: t('docs.nodeCategory'),
  };
  return (
    <div className="max-w-3xl space-y-7">
      {/* 标题 */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className={`text-[10px] px-2 py-0.5 rounded border ${CATEGORY_COLOR[method.category]}`}>
            {categoryLabels[method.category]}
          </span>
          <span className="text-[10px] text-[#555]">RPC → <code className="text-[#888]">{method.rpcMethod}</code></span>
        </div>
        <h1 className="text-2xl font-bold text-white font-mono mb-1">{method.name}()</h1>
        <p className="text-[#666] text-sm">{getLocalizedText(method.tagline, lang)}</p>
      </div>

      {/* 描述 */}
      <p className="text-[#888] text-sm leading-relaxed border-l-2 border-[#3e3e42] pl-4">{getLocalizedText(method.description, lang)}</p>

      {/* 签名 */}
      <div>
        <div className="text-xs font-semibold text-[#666] uppercase tracking-wider mb-2">{t('docs.typeSignature')}</div>
        <div className="bg-[#141414] border border-[#2d2d2d] rounded-lg px-4 py-3">
          <code className="text-[11px] text-blue-300 font-mono">{method.signature}</code>
        </div>
      </div>

      {/* 参数 */}
      <FieldTable fields={method.params} title={t('docs.params')} />

      {/* 返回值 */}
      <FieldTable fields={method.returns} title={t('docs.returns')} />

      {/* 代码示例 Tab */}
      <div>
        <div className="flex items-center gap-1 mb-3">
          {(["sdk", "rpc"] as const).map((tabType) => (
            <button
              key={tabType}
              onClick={() => setTab(tabType)}
              className={`px-3 py-1.5 text-xs rounded transition-colors ${
                tab === tabType ? "bg-[#2d2d2d] text-white" : "text-[#666] hover:text-white"
              }`}
            >
              {tabType === "sdk" ? t('docs.sdkExample') : t('docs.rawRpc')}
            </button>
          ))}
        </div>
        {tab === "sdk" ? (
          <CodeBlock code={method.sdkExample} lang="typescript" />
        ) : (
          <div className="space-y-3">
            <CodeBlock code={method.rpcRaw.request} lang="json — request" />
            <CodeBlock code={method.rpcRaw.response} lang="json — response" />
          </div>
        )}
      </div>

      {/* 注意事项 */}
      {method.notes && method.notes.length > 0 && (
        <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-4">
          <div className="text-xs font-semibold text-yellow-400 mb-3 flex items-center gap-1.5">
            <span>⚠</span> {t('docs.notes')}
          </div>
          <ul className="space-y-2">
            {method.notes.map((n, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-[#888]">
                <ChevronRight className="w-3 h-3 text-yellow-500/50 shrink-0 mt-0.5" />
                {getLocalizedText(n, lang)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ─── 主组件 ───────────────────────────────────────────────────────────────────

export default function DocsPage() {
  const { t } = useI18n();
  const [activeId, setActiveId] = useState<string>("__why");
  const categoryLabels = {
    channel: t('docs.channelCategory'),
    payment: t('docs.paymentCategory'),
    node: t('docs.nodeCategory'),
  };

  const grouped = {
    node: METHODS.filter((m) => m.category === "node"),
    channel: METHODS.filter((m) => m.category === "channel"),
    payment: METHODS.filter((m) => m.category === "payment"),
  };

  const currentMethod = METHODS.find((m) => m.id === activeId);

  return (
    <div className="h-screen flex flex-col bg-[#191919] text-[#cccccc] font-sans">
      {/* 顶部导航 */}
      <header className="h-12 bg-[#1e1e1e] border-b border-[#2d2d2d] flex items-center px-5 gap-4 shrink-0">
        <Link href="/" className="flex items-center gap-2 text-[#666] hover:text-white transition-colors">
          <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center">
            <Zap className="w-3.5 h-3.5 text-white fill-white" />
          </div>
          <span className="text-sm font-bold text-white">Fiber</span>
        </Link>
        <span className="text-[#333]">/</span>
        <span className="text-sm text-[#888]">{t('docs.title')}</span>
        <a
          href="https://github.com/nervosnetwork/fiber"
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto flex items-center gap-1 text-xs text-[#555] hover:text-white transition-colors"
        >
          {t('docs.github')} <ExternalLink className="w-3 h-3" />
        </a>
        <LanguageSwitcher />
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* 左侧导航 */}
        <nav className="w-52 bg-[#1e1e1e] border-r border-[#2d2d2d] overflow-y-auto shrink-0 py-4">
          {/* Why SDK */}
          <button
            onClick={() => setActiveId("__why")}
            className={`w-full text-left px-4 py-2 text-xs transition-colors ${
              activeId === "__why"
                ? "text-white bg-[#2d2d2d] border-l-2 border-blue-500"
                : "text-[#888] hover:text-white hover:bg-[#252526]"
            }`}
          >
            {t('docs.whySdk')}
          </button>

          <div className="mt-3 mb-1 px-4 text-[9px] font-bold text-[#444] uppercase tracking-widest">{categoryLabels.node}</div>
          {grouped.node.map((m) => (
            <button
              key={m.id}
              onClick={() => setActiveId(m.id)}
              className={`w-full text-left px-4 py-1.5 text-xs font-mono transition-colors ${
                activeId === m.id
                  ? "text-white bg-[#2d2d2d] border-l-2 border-orange-500"
                  : "text-[#666] hover:text-white hover:bg-[#252526]"
              }`}
            >
              {m.name}
            </button>
          ))}

          <div className="mt-3 mb-1 px-4 text-[9px] font-bold text-[#444] uppercase tracking-widest">{categoryLabels.channel}</div>
          {grouped.channel.map((m) => (
            <button
              key={m.id}
              onClick={() => setActiveId(m.id)}
              className={`w-full text-left px-4 py-1.5 text-xs font-mono transition-colors ${
                activeId === m.id
                  ? "text-white bg-[#2d2d2d] border-l-2 border-blue-500"
                  : "text-[#666] hover:text-white hover:bg-[#252526]"
              }`}
            >
              {m.name}
            </button>
          ))}

          <div className="mt-3 mb-1 px-4 text-[9px] font-bold text-[#444] uppercase tracking-widest">{categoryLabels.payment}</div>
          {grouped.payment.map((m) => (
            <button
              key={m.id}
              onClick={() => setActiveId(m.id)}
              className={`w-full text-left px-4 py-1.5 text-xs font-mono transition-colors ${
                activeId === m.id
                  ? "text-white bg-[#2d2d2d] border-l-2 border-green-500"
                  : "text-[#666] hover:text-white hover:bg-[#252526]"
              }`}
            >
              {m.name}
            </button>
          ))}
        </nav>

        {/* 内容区 */}
        <main className="flex-1 overflow-y-auto px-10 py-8">
          {activeId === "__why" ? (
            <WhySDKPage />
          ) : currentMethod ? (
            <MethodPage method={currentMethod} />
          ) : null}
        </main>
      </div>
    </div>
  );
}
