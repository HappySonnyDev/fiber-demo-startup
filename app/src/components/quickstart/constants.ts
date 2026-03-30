/**
 * QuickStart 代码示例和常量
 */

export const SDK_EXAMPLES = {
  step1: {
    title: 'Step 1: P2P 连接',
    subtitle: '让 Alice 连接 Bob 的 P2P 网络',
    code: `import { connectPeer, getNodeP2PAddress } from '@/lib/fiber-client';

// 1. 获取 Bob 的 P2P 地址
const bobAddress = await getNodeP2PAddress('bob');
// 返回: "/dns4/node2/tcp/10002/p2p/QmXxx..."

// 2. Alice 连接 Bob
await connectPeer('alice', { address: bobAddress });
// RPC: connect_peer { address: "..." }`,
  },
  step2: {
    title: 'Step 2: 建立通道',
    subtitle: 'Alice 向 Bob 开启支付通道（100 CKB）',
    code: `import { openChannel, getNodeP2PAddress } from '@/lib/fiber-client';

// 1. 获取 Bob 的 Peer ID
const bobAddress = await getNodeP2PAddress('bob');
const peerId = bobAddress.split('/p2p/')[1];

// 2. Alice 开启通道（100 CKB = 10^10 shannon）
const result = await openChannel('alice', {
  peerId,
  fundingAmount: '10000000000',
  assetType: 'CKB'
});
// 返回: { channel_id: "0x..." }`,
  },
  step3: {
    title: 'Step 3: 链下支付',
    subtitle: 'Alice 向 Bob 发送 10 CKB',
    code: `import { createInvoice, payInvoice } from '@/lib/fiber-client';

// 1. Bob 生成发票（收款方）
const invoiceResult = await createInvoice('bob', {
  amount: '1000000000', // 10 CKB
  description: 'Quick Start Demo',
  assetType: 'CKB'
});
const invoice = invoiceResult.invoice_address;

// 2. Alice 支付（付款方）
await payInvoice('alice', { invoice });
// 支付成功！余额实时更新`,
  },
};

// 自定义代码主题 - GitHub Dark 风格
export const customTheme = {
  plain: {
    color: '#e6edf3',
    backgroundColor: '#0d1117',
  },
  styles: [
    { types: ['comment'], style: { color: '#8b949e', fontStyle: 'italic' as const } },
    { types: ['string'], style: { color: '#a5d6ff' } },
    { types: ['keyword'], style: { color: '#ff7b72' } },
    { types: ['function'], style: { color: '#d2a8ff' } },
    { types: ['number'], style: { color: '#79c0ff' } },
    { types: ['operator'], style: { color: '#79c0ff' } },
    { types: ['punctuation'], style: { color: '#8b949e' } },
    { types: ['constant'], style: { color: '#79c0ff' } },
    { types: ['import'], style: { color: '#ff7b72' } },
  ],
};
