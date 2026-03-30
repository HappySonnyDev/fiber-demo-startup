/**
 * Fiber SDK 统一入口
 * 重新导出所有模块以保持向后兼容
 */

// 导出节点配置
export { NODES, CKB_RPC_URL } from './config';

// 导出 RPC 函数
export {
  // 类型
  type RpcTrace,
  type OpenChannelParams,
  type CreateInvoiceParams,
  type PayInvoiceParams,
  type ConnectPeerParams,
  
  // RPC 调用
  rpcCallWithTrace,
  
  // 节点信息
  getNodeInfo,
  getAllNodesInfo,
  
  // 通道
  getChannels,
  getAllChannels,
  openChannel,
  openChannelWithTrace,
  closeChannel,
  closeChannelWithTrace,
  
  // 支付
  createInvoice,
  createInvoiceWithTrace,
  payInvoice,
  payInvoiceWithTrace,
  
  // 连接
  connectPeer,
  connectPeerWithTrace,
  
  // 工具函数
  getNodeP2PAddress,
  checkNodeHealth,
  checkAllNodesHealth,
  getBalance,
  
  // 余额查询
  getOnChainBalance,
  getAllOnChainBalances,
  getOnChainUdtBalance,
  getAllOnChainUdtBalances,
} from './rpc';
