"use client"
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Zap, Play, Square,
  Plus, Box, Activity,
  Store, RefreshCw, X, Link, Unlink
} from 'lucide-react';

// --- 类型定义 ---
type NodeType = 'l1' | 'user' | 'router' | 'merchant';
type ColorType = 'orange' | 'purple' | 'green';

interface Node {
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

interface NodesState {
  ckb?: Node;
  alice?: Node;
  bob?: Node;
  charlie?: Node;
}

interface LogEntry {
  time: string;
  type: string;
  node: string;
  method: string;
  payload: string | Record<string, unknown>;
}

interface ApiNodeInfo {
  name: string;
  role: string;
  rpcUrl: string;
  isOnline: boolean;
  ckbBalance: number;
  info: {
    node_id?: string;
    version?: string;
    commit_hash?: string;
    public_key?: string;
  } | null;
  error?: string;
}

interface ChannelInfo {
  channel_id?: string;
  peer_id?: string;
  local_balance?: string;
  remote_balance?: string;
  state?: { state_name?: string };
}

// --- 初始节点配置 ---
const INITIAL_NODES: NodesState = {
  ckb:     { id: 'ckb-devnet', name: 'CKB Layer 1', type: 'l1', color: 'orange', x: 400, y: 100, version: 'v0.113.0', height: '-' },
  alice:   { id: 'fiber-node1', name: 'alice', type: 'user', color: 'purple', x: 200, y: 300, version: 'fnn v0.1.0', ckb: 0, udt: 0 },
  bob:     { id: 'fiber-node2', name: 'bob', type: 'router', color: 'purple', x: 600, y: 300, version: 'fnn v0.1.0', ckb: 0, udt: 0 },
  charlie: { id: 'fiber-node3', name: 'charlie', type: 'merchant', color: 'green', x: 400, y: 500, version: 'fnn v0.1.0', ckb: 0, udt: 0 },
};

const FIBER_NODES = ['alice', 'bob', 'charlie'];

// 节点位置映射（用于 SVG 连线）
const NODE_POSITIONS: Record<string, { x: number; y: number }> = {
  alice:   { x: 200, y: 300 },
  bob:     { x: 600, y: 300 },
  charlie: { x: 400, y: 500 },
};

export default function App() {
  const [hasNetwork, setHasNetwork] = useState(false);
  const [nodes, setNodes] = useState<NodesState>({});
  const [isRunning, setIsRunning] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [nodeStatus, setNodeStatus] = useState<Record<string, ApiNodeInfo>>({});
  const [channels, setChannels] = useState<Record<string, ChannelInfo[]>>({});

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isClient, setIsClient] = useState(false);

  // 节点 ID 映射：nodeName -> node_id（用于连线匹配）
  const [nodeIdMap, setNodeIdMap] = useState<Record<string, string>>({});

  // 选中节点 & 操作面板
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [openChannelTarget, setOpenChannelTarget] = useState<string>('');
  const [openChannelAmount, setOpenChannelAmount] = useState<string>('100000000000');
  const [isOpeningChannel, setIsOpeningChannel] = useState(false);

  // 支付相关
  const [paymentState, setPaymentState] = useState('idle');
  const [invoice, setInvoice] = useState('');
  const [assetType, setAssetType] = useState('CKB');
  const [payAmount, setPayAmount] = useState(100);
  const [payTarget, setPayTarget] = useState<string>('');

  const [activeTab, setActiveTab] = useState('Output');
  
  const logsEndRef = useRef<HTMLDivElement>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setIsClient(true);
    const now = new Date().toTimeString().split(' ')[0];
    setLogs([
      { time: now, type: 'sys', node: 'System', method: 'init', payload: 'Fiber Network UI initialized.' },
      { time: now, type: 'sys', node: 'System', method: 'ready', payload: 'Waiting to create a new network workspace...' }
    ]);
  }, []);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs, activeTab]);

  const addLog = (type: string, node: string, method: string, payload: string | Record<string, unknown>) => {
    const time = new Date().toTimeString().split(' ')[0];
    setLogs(prev => [...prev, { time, type, node, method, payload }]);
  };

  // 判断两节点之间是否有通道
  const hasChannelBetween = useCallback((nodeA: string, nodeB: string): boolean => {
    const aChannels = channels[nodeA] || [];
    const bChannels = channels[nodeB] || [];
    if (aChannels.length === 0 || bChannels.length === 0) return false;

    // 精确匹配：nodeA 的通道 peer_id === nodeB 的 peer_id（从 addresses 提取的 multihash）
    const bId = nodeIdMap[nodeB];
    const aId = nodeIdMap[nodeA];
    if (bId && aChannels.some(ch => ch.peer_id === bId)) return true;
    if (aId && bChannels.some(ch => ch.peer_id === aId)) return true;

    return false;
  }, [channels, nodeIdMap]);

  // 获取节点状态
  const fetchNodeStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/nodes');
      const data = await response.json();
      
      if (data.nodes) {
        const statusMap: Record<string, ApiNodeInfo> = {};
        data.nodes.forEach((node: ApiNodeInfo) => {
          statusMap[node.name] = node;
        });
        setNodeStatus(statusMap);

        // 提取 peer_id：从 node_info 的 addresses 中解析 /p2p/<peerId>
        const idMap: Record<string, string> = {};
        data.nodes.forEach((node: ApiNodeInfo) => {
          const info = node.info as Record<string, unknown> | null;
          if (info) {
            // 优先从 addresses 里提取 multihash peer_id
            const addresses = info['addresses'] as string[] | undefined;
            if (addresses && addresses.length > 0) {
              const match = addresses[0].match(/\/p2p\/([^/]+)$/);
              if (match) { idMap[node.name] = match[1]; return; }
            }
            // fallback：直接使用 node_id 字段
            const id = (info['node_id'] || info['public_key'] || '') as string;
            if (id) idMap[node.name] = id;
          }
        });
        if (Object.keys(idMap).length > 0) {
          setNodeIdMap(idMap);
        }
        
        setNodes(prev => {
          const updated = { ...prev };
          Object.keys(statusMap).forEach(name => {
            const status = statusMap[name];
            const nodeKey = name as keyof NodesState;
            if (updated[nodeKey]) {
              updated[nodeKey] = {
                ...updated[nodeKey]!,
                isOnline: status.isOnline,
                version: status.info?.version || updated[nodeKey]!.version,
                ckb: status.ckbBalance ?? updated[nodeKey]!.ckb,
              };
            }
          });
          return updated;
        });
      }
    } catch (error) {
      console.error('Failed to fetch node status:', error);
    }
  }, []);

  // 获取通道信息
  const fetchChannels = useCallback(async () => {
    try {
      const response = await fetch('/api/channels');
      const data = await response.json();
      
      if (data.nodes) {
        const channelMap: Record<string, ChannelInfo[]> = {};
        data.nodes.forEach((node: { name: string; channels: ChannelInfo[] }) => {
          channelMap[node.name] = node.channels || [];
        });
        setChannels(channelMap);
      }
    } catch (error) {
      console.error('Failed to fetch channels:', error);
    }
  }, []);

  const startPolling = useCallback(() => {
    if (pollIntervalRef.current) return;
    pollIntervalRef.current = setInterval(() => {
      fetchNodeStatus();
      fetchChannels();
    }, 3000);
  }, [fetchNodeStatus, fetchChannels]);

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  const handleCreateNetwork = () => {
    addLog('sys', 'System', 'create', 'Initializing new workspace configuration...');
    setHasNetwork(true);
    setNodes(INITIAL_NODES);
    addLog('sys', 'System', 'ready', 'Network topology created. Click "Start" to connect and boot nodes.');
  };

  const handleStartNetwork = async () => {
    if (!hasNetwork || isRunning) return;
    setIsConnecting(true);
    addLog('sys', 'System', 'connect', 'Connecting to Fiber nodes...');
    
    try {
      await fetchNodeStatus();
      const allOnline = Object.values(nodeStatus).every(n => n.isOnline);
      
      if (allOnline) {
        setIsRunning(true);
        startPolling();
        await fetchChannels();
        addLog('sys', 'System', 'ready', 'All nodes connected. Channels loaded.');
      } else {
        const offlineNodes = Object.values(nodeStatus)
          .filter(n => !n.isOnline)
          .map(n => n.name)
          .join(', ');
        addLog('sys', 'System', 'error', `Some nodes are offline: ${offlineNodes}. Please check Docker.`);
      }
    } catch (error) {
      addLog('sys', 'System', 'error', error instanceof Error ? error.message : 'Connection failed');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleStopNetwork = () => {
    if (!isRunning && !isConnecting) return;
    setIsRunning(false);
    setIsConnecting(false);
    stopPolling();
    addLog('sys', 'System', 'disconnect', 'Disconnected from nodes.');
  };

  // 建立通道
  const handleOpenChannel = async (fromNode: string, toNode: string, amount: string) => {
    addLog('req', fromNode, 'open_channel', { to: toNode, amount });
    setIsOpeningChannel(true);
    try {
      const response = await fetch('/api/channels/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromNode, toNode, fundingAmount: amount }),
      });
      const data = await response.json();
      if (data.success) {
        addLog('res', fromNode, 'open_channel', { success: true, peerId: data.peerId });
        // 通道需要等 CKB 出块才会 CHANNEL_READY，轮询多次刷新
        [3000, 8000, 15000, 25000].forEach(delay => {
          setTimeout(() => { fetchChannels(); fetchNodeStatus(); }, delay);
        });
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      addLog('sys', fromNode, 'error', error instanceof Error ? error.message : 'Failed to open channel');
    } finally {
      setIsOpeningChannel(false);
    }
  };

  // 关闭通道
  const handleCloseChannel = async (nodeName: string, channelId: string) => {
    addLog('req', nodeName, 'close_channel', { channelId });
    try {
      const response = await fetch('/api/channels/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodeName, channelId }),
      });
      const data = await response.json();
      if (data.success) {
        addLog('res', nodeName, 'close_channel', { success: true });
        setTimeout(() => { fetchChannels(); fetchNodeStatus(); }, 2000);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      addLog('sys', nodeName, 'error', error instanceof Error ? error.message : 'Failed to close channel');
    }
  };

  // 生成发票
  const handleCreateInvoice = async () => {
    if (!isRunning || !payTarget) return;
    setPaymentState('creating');
    addLog('req', payTarget, 'new_invoice', { amount: payAmount, currency: assetType });
    try {
      const response = await fetch('/api/invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodeName: payTarget, amount: payAmount.toString(), description: '支付请求' }),
      });
      const data = await response.json();
      if (data.success) {
        setInvoice(data.invoice);
        addLog('res', payTarget, 'new_invoice', { invoice: data.invoice.substring(0, 50) + '...' });
        setPaymentState('created');
      } else {
        throw new Error(data.error || 'Failed to create invoice');
      }
    } catch (error) {
      addLog('sys', payTarget, 'error', error instanceof Error ? error.message : 'Unknown error');
      setPaymentState('idle');
    }
  };

  // 发起支付
  const handlePayInvoice = async () => {
    if (!isRunning || !invoice || !selectedNode) return;
    setPaymentState('paying');
    addLog('req', selectedNode, 'send_payment', { invoice });
    if (selectedNode && payTarget) {
      addLog('sys', 'Router', 'calc', `Route: ${selectedNode} -> ... -> ${payTarget}`);
    }
    try {
      const response = await fetch('/api/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodeName: selectedNode, invoice }),
      });
      const data = await response.json();
      if (data.success) {
        addLog('res', selectedNode, 'send_payment', { status: 'success', result: data.result });
        setPaymentState('success');
        // 刷新通道余额 - 支付是链下操作，只更新通道内余额
        setTimeout(() => { 
          fetchChannels(); 
          addLog('sys', 'System', 'info', `通道余额已更新 - 支付方(${selectedNode})余额减少，收款方(${payTarget})余额增加`);
        }, 1000);
        setTimeout(() => { setPaymentState('idle'); setInvoice(''); }, 3000);
      } else {
        throw new Error(data.error || 'Payment failed');
      }
    } catch (error) {
      addLog('sys', selectedNode, 'error', error instanceof Error ? error.message : 'Payment failed');
      setPaymentState('created');
    }
  };

  // 根据 node_id 查找节点名称
  const findNodeNameByPeerId = (peerId: string): string => {
    for (const name of FIBER_NODES) {
      if (nodeStatus[name]?.info?.node_id === peerId) return name;
    }
    return peerId.substring(0, 12) + '...';
  };

  // 颜色映射系统
  const colors = {
    orange: { border: 'border-orange-500', bg: 'bg-orange-500', text: 'text-orange-500' },
    purple: { border: 'border-purple-500', bg: 'bg-purple-500', text: 'text-purple-500' },
    green:  { border: 'border-green-500',  bg: 'bg-green-500',  text: 'text-green-500' },
  };

  // 其他节点（排除自身和 ckb）
  const otherNodes = (self: string) => FIBER_NODES.filter(n => n !== self);

  // 选中节点的通道列表
  const selectedChannels: ChannelInfo[] = selectedNode ? (channels[selectedNode] || []) : [];

  // 左侧面板内容
  const renderSidePanelContent = () => {
    if (!isRunning) return null;

    if (!selectedNode) {
      // 未选中节点：显示提示
      return (
        <div className="text-center py-8 text-sm text-[#666]">
          <div className="mb-2 text-[#444]">
            <Link className="w-8 h-8 mx-auto mb-3 opacity-40" />
          </div>
          点击右侧图中的节点<br/>进行操作
        </div>
      );
    }

    const others = otherNodes(selectedNode);
    const defaultTarget = others[0] || '';
    if (!openChannelTarget && defaultTarget) setOpenChannelTarget(defaultTarget);

    return (
      <div className="space-y-3">
        {/* 节点标题 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-blue-400" />
            <span className="text-white font-semibold capitalize">{selectedNode}</span>
          </div>
          <button 
            onClick={() => { setSelectedNode(null); setPaymentState('idle'); setInvoice(''); }}
            className="text-[#666] hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 建立通道 */}
        <div className="bg-[#252526] p-3 rounded-lg border border-[#3e3e42]">
          <label className="text-xs text-[#888] block mb-2 flex items-center gap-1">
            <Link className="w-3 h-3" /> 建立通道
          </label>
          <div className="flex gap-1 mb-2">
            {others.map(n => (
              <button
                key={n}
                onClick={() => setOpenChannelTarget(n)}
                className={`flex-1 py-1 text-[10px] rounded border capitalize ${
                  openChannelTarget === n 
                    ? 'border-blue-500 text-blue-400 bg-blue-500/10' 
                    : 'border-[#3e3e42] text-[#888] hover:bg-[#2d2d2d]'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
          <div className="mb-2">
            <label className="text-[10px] text-[#666] block mb-1">资金量 (shannon)</label>
            <input
              type="number"
              value={openChannelAmount}
              onChange={e => setOpenChannelAmount(e.target.value)}
              className="w-full bg-[#1e1e1e] border border-[#3e3e42] rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-500"
            />
            <div className="text-[9px] text-[#555] mt-0.5">
              ≈ {(Number(openChannelAmount) / 1e8).toFixed(2)} CKB
            </div>
          </div>
          <button
            onClick={() => openChannelTarget && !isOpeningChannel && handleOpenChannel(selectedNode, openChannelTarget, openChannelAmount)}
            disabled={!openChannelTarget || isOpeningChannel}
            className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs rounded transition-colors flex items-center justify-center gap-1.5"
          >
            {isOpeningChannel ? (
              <><RefreshCw className="w-3 h-3 animate-spin" /> 建立中...</>
            ) : (
              <>建立通道 ({selectedNode} → {openChannelTarget || '?'})</>
            )}
          </button>
        </div>

        {/* 关闭通道 / 结算 */}
        {selectedChannels.length > 0 && (
          <div className="bg-[#252526] p-3 rounded-lg border border-[#3e3e42]">
            <label className="text-xs text-[#888] block mb-2 flex items-center gap-1">
              <Unlink className="w-3 h-3" /> 关闭通道 <span className="text-[9px] text-[#555]">(结算到链上)</span>
            </label>
            <div className="space-y-2">
              {selectedChannels.map((ch, i) => {
                const peerName = ch.peer_id ? findNodeNameByPeerId(ch.peer_id) : '未知';
                const localBal = Math.floor(Number(ch.local_balance || 0) / 1e8);
                const remoteBal = Math.floor(Number(ch.remote_balance || 0) / 1e8);
                const totalBal = localBal + remoteBal;
                const stateName = ch.state?.state_name || 'Unknown';
                const isReady = stateName === 'CHANNEL_READY';
                return (
                  <div key={ch.channel_id || i} className="bg-[#1e1e1e] rounded px-2 py-2 border border-[#2d2d2d]">
                    {/* 通道对端信息 */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-[10px] text-white capitalize">{peerName}</div>
                      <div className={`text-[9px] px-1.5 py-0.5 rounded ${isReady ? 'bg-green-900/30 text-green-400' : 'bg-yellow-900/30 text-yellow-400'}`}>
                        {isReady ? '已就绪' : stateName}
                      </div>
                    </div>
                    
                    {/* 通道余额分布 */}
                    <div className="mb-2">
                      <div className="flex justify-between text-[9px] text-[#666] mb-1">
                        <span>通道余额分布</span>
                        <span className="text-[#888]">总计: {totalBal} CKB</span>
                      </div>
                      {/* 余额进度条 */}
                      <div className="h-4 bg-[#252526] rounded overflow-hidden flex">
                        {totalBal > 0 && (
                          <>
                            <div 
                              className="h-full bg-blue-600 flex items-center justify-center text-[8px] text-white"
                              style={{ width: `${(localBal / totalBal) * 100}%` }}
                            >
                              {localBal > totalBal * 0.15 && `${localBal}`}
                            </div>
                            <div 
                              className="h-full bg-purple-600 flex items-center justify-center text-[8px] text-white"
                              style={{ width: `${(remoteBal / totalBal) * 100}%` }}
                            >
                              {remoteBal > totalBal * 0.15 && `${remoteBal}`}
                            </div>
                          </>
                        )}
                      </div>
                      <div className="flex justify-between text-[9px] mt-1">
                        <span className="text-blue-400">本地: {localBal} CKB</span>
                        <span className="text-purple-400">对端: {remoteBal} CKB</span>
                      </div>
                    </div>

                    {/* 结算按钮 */}
                    <button
                      onClick={() => ch.channel_id && handleCloseChannel(selectedNode, ch.channel_id)}
                      disabled={!isReady}
                      className="w-full text-[10px] text-red-400 hover:text-red-300 border border-red-800 hover:border-red-600 disabled:opacity-40 disabled:cursor-not-allowed px-2 py-1 rounded transition-colors flex items-center justify-center gap-1"
                    >
                      <span>结算并关闭通道</span>
                      <span className="text-[8px] text-[#666]">(资金回归链上)</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 发起支付 */}
        <div className="bg-[#252526] p-3 rounded-lg border border-[#3e3e42]">
          <label className="text-xs text-[#888] block mb-2 flex items-center gap-1">
            <Zap className="w-3 h-3" /> 发起支付
          </label>
          <div className="flex gap-1 mb-2">
            <button onClick={() => setAssetType('CKB')} className={`flex-1 py-1 text-[10px] rounded border ${assetType === 'CKB' ? 'border-orange-500 text-orange-400 bg-orange-500/10' : 'border-[#3e3e42] text-[#888] hover:bg-[#2d2d2d]'}`}>CKB</button>
            <button onClick={() => setAssetType('sUDT')} className={`flex-1 py-1 text-[10px] rounded border ${assetType === 'sUDT' ? 'border-purple-500 text-purple-400 bg-purple-500/10' : 'border-[#3e3e42] text-[#888] hover:bg-[#2d2d2d]'}`}>sUDT</button>
          </div>
          <div className="mb-2">
            <label className="text-[10px] text-[#666] block mb-1">金额</label>
            <input
              type="number"
              value={payAmount}
              onChange={e => setPayAmount(Number(e.target.value))}
              className="w-full bg-[#1e1e1e] border border-[#3e3e42] rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="mb-2">
            <label className="text-[10px] text-[#666] block mb-1">收款节点（支持多跳）</label>
            <div className="flex gap-1">
              {others.map(n => (
                <button
                  key={n}
                  onClick={() => { setPayTarget(n); setPaymentState('idle'); setInvoice(''); }}
                  className={`flex-1 py-1 text-[10px] rounded border capitalize ${
                    payTarget === n
                      ? 'border-green-500 text-green-400 bg-green-500/10'
                      : 'border-[#3e3e42] text-[#888] hover:bg-[#2d2d2d]'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          {invoice && (
            <div className="mb-2 text-[9px] text-gray-400 break-all bg-[#1e1e1e] p-1.5 rounded border border-[#3e3e42]">
              {invoice.substring(0, 60)}...
            </div>
          )}
          <div className="space-y-1.5">
            <button
              onClick={handleCreateInvoice}
              disabled={paymentState !== 'idle' || !payTarget}
              className="w-full py-1.5 bg-[#2d2d2d] hover:bg-[#3e3e42] disabled:opacity-40 text-white text-xs rounded border border-[#3e3e42] flex items-center justify-center gap-1.5"
            >
              <Store className="w-3 h-3 text-green-400" />
              生成发票 ({payTarget || '选择收款节点'})
            </button>
            <button
              onClick={handlePayInvoice}
              disabled={paymentState !== 'created'}
              className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:bg-[#2d2d2d] text-white text-xs rounded flex items-center justify-center gap-1.5 transition-colors"
            >
              {paymentState === 'paying' ? <Activity className="w-3 h-3 animate-pulse" /> : <Zap className="w-3 h-3" />}
              {paymentState === 'paying' ? '路由寻路中...' : paymentState === 'success' ? '支付成功!' : '发起支付'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-screen flex flex-col bg-[#191919] text-[#cccccc] font-sans selection:bg-blue-500/30">
      
      {/* 顶部工具栏 */}
      <header className="h-14 bg-[#1e1e1e] border-b border-[#2d2d2d] flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-white fill-white" />
            </div>
            <span className="font-bold text-white text-lg tracking-wide">Fiber</span>
          </div>
          
          <div className="flex items-center gap-1 bg-[#2d2d2d] rounded-md p-1">
            <button 
              onClick={handleStartNetwork}
              disabled={!hasNetwork || isRunning || isConnecting}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded transition-colors ${!hasNetwork ? 'opacity-50 cursor-not-allowed text-gray-500' : isRunning ? 'bg-[#3e3e42] text-white' : 'text-gray-400 hover:text-white hover:bg-[#3e3e42]'}`}
            >
              {isConnecting ? (
                <RefreshCw className="w-3.5 h-3.5 text-blue-400 animate-spin" />
              ) : (
                <Play className={`w-3.5 h-3.5 ${isRunning ? 'fill-green-500 text-green-500' : 'fill-gray-500 text-gray-500'}`} />
              )}
              {isConnecting ? 'Connecting...' : 'Start'}
            </button>
            <button 
              onClick={handleStopNetwork}
              disabled={!hasNetwork || (!isRunning && !isConnecting)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded transition-colors ${(!isRunning && !isConnecting) ? 'opacity-50 cursor-not-allowed text-gray-500' : 'bg-[#3e3e42] text-white hover:bg-red-900/30'}`}
            >
              <Square className={`w-3.5 h-3.5 ${!isRunning && !isConnecting ? 'fill-gray-500 text-gray-500' : 'fill-red-500 text-red-500'}`} /> Stop
            </button>

          </div>
        </div>


      </header>

      {/* 主体工作区 */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* 左侧边栏 */}
        <aside className="w-64 bg-[#1e1e1e] border-r border-[#2d2d2d] flex flex-col shrink-0 overflow-y-auto z-10" style={{ scrollbarGutter: 'stable' }}>
          <div className="p-4 flex-1">
            <h3 className="text-xs font-bold text-[#666] tracking-widest mb-3 uppercase">Network Action</h3>
            
            {!hasNetwork ? (
              <div className="text-center py-8 text-sm text-[#888]">
                Please create a network first.
              </div>
            ) : (
              <div className={`transition-opacity duration-300 ${isRunning ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                {renderSidePanelContent()}

                {/* 通道状态（始终显示） */}
                {isRunning && (
                  <div className="mt-3 bg-[#252526] p-3 rounded-lg border border-[#3e3e42]">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs text-[#888]">通道状态</label>
                      <button 
                        onClick={() => { fetchChannels(); fetchNodeStatus(); }}
                        className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1"
                      >
                        <RefreshCw className="w-3 h-3" /> 刷新
                      </button>
                    </div>
                    {FIBER_NODES.map(name => {
                      const chs = channels[name] || [];
                      return (
                        <div key={name} className="flex justify-between text-[10px] py-0.5">
                          <span className="text-[#888] capitalize">{name}</span>
                          <span className={chs.length > 0 ? 'text-green-400' : 'text-gray-500'}>
                            {chs.length} 通道
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="mt-auto p-4 border-t border-[#2d2d2d]">
            <h3 className="text-xs font-bold text-[#666] tracking-widest mb-3 uppercase">Networks</h3>
            {hasNetwork ? (
              <div className="bg-[#2d2d2d] px-3 py-2 rounded flex items-center gap-2 text-sm text-white border border-[#3e3e42]">
                <div className={`w-2 h-2 rounded-full ${isRunning ? 'bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.6)]' : 'bg-gray-500'}`}></div>
                Fiber Demo Net
              </div>
            ) : null}
            <button 
              onClick={handleCreateNetwork}
              disabled={hasNetwork}
              className="w-full px-3 py-2 text-sm text-[#888] hover:text-white flex items-center gap-2 mt-2 border border-dashed border-[#3e3e42] hover:border-[#666] rounded disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" /> Create Network
            </button>
          </div>
        </aside>

        {/* 右侧画布 */}
        <main className="flex-1 relative bg-[#191919] overflow-hidden flex items-center justify-center">
          
          {!hasNetwork ? (
            <div className="flex flex-col items-center text-center z-10">
              <div className="w-20 h-20 bg-[#252526] rounded-full flex items-center justify-center border border-[#3e3e42] mb-6 shadow-xl">
                <Box className="w-10 h-10 text-[#444]" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">No Network Active</h2>
              <p className="text-[#888] mb-6 max-w-sm">Create a new network workspace to start visualizing and testing Fiber payment channels.</p>
              <button 
                onClick={handleCreateNetwork}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-full font-medium transition-colors shadow-lg shadow-blue-900/20 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Create Fiber Network
              </button>
            </div>
          ) : (
            <div className="relative w-[800px] h-[600px] scale-90 lg:scale-100">
              
              {/* SVG 连线层 */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
                <defs>
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                  {/* 支付动画路径（动态，连接 selectedNode → payTarget） */}
                  {selectedNode && payTarget && NODE_POSITIONS[selectedNode] && NODE_POSITIONS[payTarget] && (
                    <path 
                      id="payPath" 
                      d={`M ${NODE_POSITIONS[selectedNode].x} ${NODE_POSITIONS[selectedNode].y} L ${NODE_POSITIONS[payTarget].x} ${NODE_POSITIONS[payTarget].y}`}
                      fill="none" 
                    />
                  )}
                </defs>

                {/* L1 到节点的虚线（始终显示，表示链上关系） */}
                {isRunning && (
                  <>
                    <line x1="400" y1="100" x2="200" y2="300" stroke="#333" strokeWidth="1.5" strokeDasharray="5 5" />
                    <line x1="400" y1="100" x2="600" y2="300" stroke="#333" strokeWidth="1.5" strokeDasharray="5 5" />
                    <line x1="400" y1="100" x2="400" y2="500" stroke="#333" strokeWidth="1.5" strokeDasharray="5 5" />
                  </>
                )}

                {/* L2 通道连线：动态判断，有通道才画 */}
                {hasChannelBetween('alice', 'bob') && (
                  <>
                    <line x1="200" y1="300" x2="600" y2="300" stroke="#4a6fa5" strokeWidth="3" />
                    <line x1="200" y1="300" x2="600" y2="300" stroke="#6b9bd2" strokeWidth="1" strokeDasharray="4 4" opacity="0.6" />
                  </>
                )}
                {hasChannelBetween('bob', 'charlie') && (
                  <>
                    <line x1="600" y1="300" x2="400" y2="500" stroke="#4a6fa5" strokeWidth="3" />
                    <line x1="600" y1="300" x2="400" y2="500" stroke="#6b9bd2" strokeWidth="1" strokeDasharray="4 4" opacity="0.6" />
                  </>
                )}
                {hasChannelBetween('alice', 'charlie') && (
                  <>
                    <line x1="200" y1="300" x2="400" y2="500" stroke="#4a6fa5" strokeWidth="3" />
                    <line x1="200" y1="300" x2="400" y2="500" stroke="#6b9bd2" strokeWidth="1" strokeDasharray="4 4" opacity="0.6" />
                  </>
                )}

                {/* 支付动画 */}
                {paymentState === 'paying' && selectedNode && payTarget && (
                  <circle r="6" fill="#fbbf24" filter="url(#glow)">
                    <animateMotion dur="1.5s" repeatCount="indefinite">
                      <mpath href="#payPath" />
                    </animateMotion>
                  </circle>
                )}
              </svg>

              {/* 渲染节点卡片 */}
              {Object.entries(nodes).map(([key, node]) => {
                if (!node) return null;
                const nodeColor = colors[node.color as ColorType];
                const isNodeOnline = node.isOnline ?? isRunning;
                const isFiberNode = node.type !== 'l1';
                const isSelected = selectedNode === key;

                return (
                  <div 
                    key={key} 
                    onClick={() => {
                      if (!isFiberNode || !isRunning) return;
                      if (isSelected) {
                        setSelectedNode(null);
                        setPaymentState('idle');
                        setInvoice('');
                      } else {
                        setSelectedNode(key);
                        setOpenChannelTarget('');
                        setPayTarget('');
                        setPaymentState('idle');
                        setInvoice('');
                      }
                    }}
                    className={`absolute transform -translate-x-1/2 -translate-y-1/2 w-44 bg-[#252526] rounded-lg shadow-2xl border overflow-hidden flex flex-col transition-all duration-300 
                      ${isFiberNode && isRunning ? 'cursor-pointer hover:border-blue-500/50' : ''}
                      ${isSelected ? 'border-blue-500 ring-2 ring-blue-500/30 shadow-blue-900/30' : 'border-[#3e3e42]'}
                      ${!isNodeOnline ? 'grayscale opacity-70' : 'grayscale-0 opacity-100'}`}
                    style={{ left: node.x, top: node.y, zIndex: isSelected ? 20 : 10 }}
                  >
                    <div className={`h-1.5 w-full ${nodeColor.bg}`} />
                    
                    <div className="p-3">
                      <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center gap-1.5 text-white font-semibold text-sm">
                          {node.type === 'l1' ? <Box className={`w-4 h-4 ${nodeColor.text}`} /> : <Zap className={`w-4 h-4 ${nodeColor.text}`} />}
                          {node.name}
                        </div>
                        <div className={`w-2 h-2 rounded-full transition-colors duration-500 ${isNodeOnline ? 'bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.6)]' : 'bg-red-900/50 border border-red-800'}`}></div>
                      </div>

                      <div className="bg-[#1e1e1e] rounded p-2 border border-[#2d2d2d]">
                        {node.type === 'l1' ? (
                          <>
                            <div className="flex justify-between text-[11px] text-[#888] mb-1">
                              <span>Height</span><span className="text-[#ccc]">{isRunning ? node.height : '-'}</span>
                            </div>
                            <div className="flex justify-between text-[11px] text-[#888]">
                              <span>Version</span><span className="text-[#ccc]">{node.version}</span>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="flex justify-between text-[11px] text-[#888] mb-1">
                              <span>CKB Bal</span>
                              <span className="text-orange-400 font-mono">
                                {isRunning ? (nodeStatus[node.name]?.ckbBalance || 0).toLocaleString() : '-'}
                              </span>
                            </div>
                            <div className="flex justify-between text-[11px] text-[#888]">
                              <span>Channels</span>
                              <span className="text-blue-400 font-mono">{(channels[node.name] || []).length}</span>
                            </div>
                          </>
                        )}
                      </div>

                      {isSelected && (
                        <div className="mt-2 text-[9px] text-blue-400 text-center">已选中 · 查看左侧面板</div>
                      )}
                    </div>
                  </div>
                );
              })}

            </div>
          )}
          
          <div className="absolute bottom-4 right-4 bg-[#252526] border border-[#3e3e42] rounded px-3 py-1.5 flex gap-4 text-xs text-[#666]">
            <span>Zoom: 100%</span>
            <span>{selectedNode ? `Selected: ${selectedNode}` : 'Click node to select'}</span>
          </div>
        </main>
      </div>

      {/* 底部终端区 */}
      <footer className="h-64 bg-[#1e1e1e] border-t border-[#2d2d2d] flex flex-col shrink-0">
        <div className="flex items-center gap-1 px-2 border-b border-[#2d2d2d] pt-1">
          {['Output'].map(tab => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-xs border-b-2 transition-colors ${activeTab === tab ? 'border-blue-500 text-white' : 'border-transparent text-[#888] hover:text-white'}`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4 font-mono text-xs leading-5">
          {activeTab === 'Output' && (
            <div className="space-y-1">
              {!isClient ? (
                <div className="text-[#666] p-2">Loading...</div>
              ) : (
                logs.map((log, i) => (
                  <div key={i} className="flex hover:bg-[#252526] px-1 py-0.5 rounded -mx-1 transition-all">
                    <span className="text-[#666] shrink-0 w-20">{log.time}</span>
                    {log.type === 'sys' ? (
                      <>
                        <span className={`shrink-0 w-10 ${log.method === 'error' ? 'text-red-400' : 'text-yellow-500'}`}>SYS</span>
                        <span className="text-[#888] shrink-0 w-32">[{log.node}]</span>
                        <span className="text-[#cccccc] whitespace-pre-wrap">
                          {typeof log.payload === 'string' ? log.payload : JSON.stringify(log.payload)}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className={`shrink-0 w-10 ${log.type === 'req' ? 'text-blue-400' : 'text-green-400'}`}>
                          {log.type === 'req' ? 'REQ' : 'RES'}
                        </span>
                        <span className="text-[#888] shrink-0 w-32">[{log.node}]</span>
                        <span className="text-purple-400 shrink-0 w-36">{log.method}</span>
                        <span className="text-[#aaa] break-all">
                          {typeof log.payload === 'string' ? log.payload : JSON.stringify(log.payload)}
                        </span>
                      </>
                    )}
                  </div>
                ))
              )}
              <div ref={logsEndRef} />
            </div>
          )}
          {activeTab === 'Terminal' && <div className="text-[#666] p-2">Terminal process attached. Waiting for input...</div>}
          {activeTab === 'Debug Console' && <div className="text-[#666] p-2">No active debug session.</div>}
        </div>
      </footer>
    </div>
  );
}
