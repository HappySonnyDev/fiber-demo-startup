"use client"
import React, { useState, useEffect, useRef, useCallback } from 'react';
import NextLink from 'next/link';
import { 
  Zap, Play,
  Plus, Box, Activity,
  Store, RefreshCw, X, Link, Unlink, ChevronDown, ChevronRight
} from 'lucide-react';
import { RPC_SCHEMA } from '@/lib/fiber-rpc-schema';
import type { RpcTrace } from '@/lib/fiber-client';
import QuickStart from '@/components/QuickStart';
import { useI18n } from '@/lib/i18n';
import LanguageSwitcher from '@/components/LanguageSwitcher';

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

// RPC Inspector 数据结构
interface RpcTraceEntry {
  id: string;
  timestamp: string;
  operation: string;
  traces: RpcTrace[];
  status: 'success' | 'error';
}

interface ApiNodeInfo {
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

interface ChannelInfo {
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

// 通道连线信息
interface ChannelLineInfo {
  hasChannel: boolean;
  isUdt: boolean;
  isReady: boolean;
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

type AppMode = 'home' | 'quickstart' | 'demo';

export default function App() {
  const { t } = useI18n();
  const [mode, setMode] = useState<AppMode>('home');
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
  const [openChannelAssetType, setOpenChannelAssetType] = useState<'CKB' | 'UDT'>('CKB');
  const [isOpeningChannel, setIsOpeningChannel] = useState(false);
  
  // 正在等待确认的通道（格式：`${fromNode}-${toNode}`）
  const [pendingChannels, setPendingChannels] = useState<Set<string>>(new Set());

  // 支付相关
  const [paymentState, setPaymentState] = useState('idle');
  const [invoice, setInvoice] = useState('');
  const [assetType, setAssetType] = useState<'CKB' | 'UDT'>('CKB');
  const [payAmount, setPayAmount] = useState(100);
  const [payTarget, setPayTarget] = useState<string>('');

  const [activeTab, setActiveTab] = useState('Output');
  
  // RPC Inspector 状态
  const [rpcHistory, setRpcHistory] = useState<RpcTraceEntry[]>([]);
  const [selectedRpcEntry, setSelectedRpcEntry] = useState<string | null>(null);
  const [expandedTraces, setExpandedTraces] = useState<Record<string, boolean>>({});
  
  const logsEndRef = useRef<HTMLDivElement>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setIsClient(true);
    const now = new Date().toTimeString().split(' ')[0];
    setLogs([
      { time: now, type: 'sys', node: 'System', method: 'init', payload: t('log.init') },
    ])
  }, [t]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs, activeTab]);

  const addLog = (type: string, node: string, method: string, payload: string | Record<string, unknown>) => {
    const time = new Date().toTimeString().split(' ')[0];
    setLogs(prev => [...prev, { time, type, node, method, payload }]);
  };

  const addRpcEntry = (operation: string, traces: RpcTrace[], status: 'success' | 'error') => {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const timestamp = new Date().toTimeString().split(' ')[0];
    const entry: RpcTraceEntry = { id, timestamp, operation, traces, status };
    setRpcHistory(prev => [entry, ...prev].slice(0, 50));
    setSelectedRpcEntry(id);
    // 默认展开第一个 trace
    if (traces.length > 0) {
      setExpandedTraces(prev => ({ ...prev, [`${id}-0`]: true }));
    }
  };

  // 获取两节点之间的通道信息
  const getChannelInfoBetween = useCallback((nodeA: string, nodeB: string): ChannelLineInfo => {
    const aChannels = channels[nodeA] || [];
    const bChannels = channels[nodeB] || [];
    if (aChannels.length === 0 || bChannels.length === 0) return { hasChannel: false, isUdt: false, isReady: false };

    // 精确匹配：nodeA 的通道 peer_id === nodeB 的 peer_id
    const bId = nodeIdMap[nodeB];
    const aId = nodeIdMap[nodeA];
    
    // 查找 nodeA 的通道中与 nodeB 相连的
    let targetChannel: ChannelInfo | null = null;
    if (bId) {
      targetChannel = aChannels.find(ch => ch.peer_id === bId) || null;
    }
    if (!targetChannel && aId) {
      targetChannel = bChannels.find(ch => ch.peer_id === aId) || null;
    }
    
    if (!targetChannel) return { hasChannel: false, isUdt: false, isReady: false };
    
    const isUdt = !!targetChannel.funding_udt_type_script;
    const stateName = targetChannel.state?.state_name;
    const isReady = stateName === 'CHANNEL_READY';
    
    return { hasChannel: true, isUdt, isReady };
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
                udt: status.udtBalance ?? updated[nodeKey]!.udt,
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
  };

  const handleEnterDemo = () => {
    setMode('demo');
    setHasNetwork(true);
    setNodes(INITIAL_NODES);
    // 自动启动连接
    setIsConnecting(true);
    addLog('sys', 'System', 'connect', 'Connecting to Fiber nodes...');
    fetch('/api/nodes').then(r => r.json()).then(data => {
      const allOnline = data.nodes?.every((n: ApiNodeInfo) => n.isOnline) ?? false;
      const statusMap: Record<string, ApiNodeInfo> = {};
      data.nodes?.forEach((n: ApiNodeInfo) => { statusMap[n.name] = n; });
      setNodeStatus(statusMap);
      if (allOnline) {
        setIsRunning(true);
        startPolling();
        fetchChannels();
        addLog('sys', 'System', 'ready', 'All nodes connected. Channels loaded.');
      } else {
        addLog('sys', 'System', 'error', 'Some nodes are offline. Please check Docker.');
      }
    }).catch((error: unknown) => {
      addLog('sys', 'System', 'error', error instanceof Error ? error.message : 'Connection failed');
    }).finally(() => {
      setIsConnecting(false);
    });
  };

  const handleEnterQuickStart = () => {
    setMode('quickstart');
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
  const handleOpenChannel = async (fromNode: string, toNode: string, amount: string, assetType: 'CKB' | 'UDT' = 'CKB') => {
    addLog('req', fromNode, 'open_channel', { to: toNode, amount, assetType });
    setIsOpeningChannel(true);
    const channelKey = `${fromNode}-${toNode}`;
    
    try {
      const response = await fetch('/api/channels/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromNode, toNode, fundingAmount: amount, assetType }),
      });
      const data = await response.json();
      if (data.rpcTrace) {
        addRpcEntry(`建立通道 ${fromNode} → ${toNode} [${assetType}]`, data.rpcTrace, data.success ? 'success' : 'error');
      }
      if (data.success) {
        addLog('res', fromNode, 'open_channel', { success: true, peerId: data.peerId, assetType: data.assetType });
        // 标记通道为等待确认状态
        setPendingChannels(prev => new Set(prev).add(channelKey));
        
        // 通道需要等 CKB 出块才会 CHANNEL_READY，轮询多次刷新
        const checkDelays = [3000, 6000, 10000, 15000, 22000, 30000];
        checkDelays.forEach((delay, idx) => {
          setTimeout(async () => {
            await fetchChannels();
            await fetchNodeStatus();
            
            // 检查通道是否已就绪
            const info = getChannelInfoBetween(fromNode, toNode);
            if (info.hasChannel && info.isReady) {
              // 通道已就绪，移除等待状态
              setPendingChannels(prev => {
                const next = new Set(prev);
                next.delete(channelKey);
                return next;
              });
              addLog('sys', 'System', 'channel_ready', `${fromNode} → ${toNode} 通道已就绪`);
            } else if (idx === checkDelays.length - 1) {
              // 最后一次检查仍未就绪，也移除等待状态（可能需要更长时间）
              setPendingChannels(prev => {
                const next = new Set(prev);
                next.delete(channelKey);
                return next;
              });
            }
          }, delay);
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
      if (data.rpcTrace) {
        addRpcEntry(`关闭通道 ${nodeName} [${channelId.substring(0, 10)}...]`, data.rpcTrace, data.success ? 'success' : 'error');
      }
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
        body: JSON.stringify({ 
          nodeName: payTarget, 
          amount: payAmount.toString(), 
          description: '支付请求',
          assetType: assetType // 传递资产类型
        }),
      });
      const data = await response.json();
      if (data.success) {
        setInvoice(data.invoice);
        addLog('res', payTarget, 'new_invoice', { invoice: data.invoice.substring(0, 50) + '...', assetType: data.assetType });
        if (data.rpcTrace) {
          addRpcEntry(`生成发票 ${payTarget} [${assetType}] ${payAmount}`, data.rpcTrace, 'success');
        }
        setPaymentState('created');
      } else {
        if (data.rpcTrace) {
          addRpcEntry(`生成发票 ${payTarget} [${assetType}]`, data.rpcTrace, 'error');
        }
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
        if (data.rpcTrace) {
          addRpcEntry(`支付 ${selectedNode} → ${payTarget} [${assetType}] ${payAmount}`, data.rpcTrace, 'success');
        }
        setPaymentState('success');
        // 刷新通道余额 - 支付是链下操作，只更新通道内余额
        setTimeout(() => { 
          fetchChannels(); 
          addLog('sys', 'System', 'info', `通道余额已更新 - 支付方(${selectedNode})余额减少，收款方(${payTarget})余额增加`);
        }, 1000);
        setTimeout(() => { setPaymentState('idle'); setInvoice(''); }, 3000);
      } else {
        if (data.rpcTrace) {
          addRpcEntry(`支付 ${selectedNode} → ${payTarget}`, data.rpcTrace, 'error');
        }
        throw new Error(data.error || 'Payment failed');
      }
    } catch (error) {
      addLog('sys', selectedNode, 'error', error instanceof Error ? error.message : 'Payment failed');
      setPaymentState('created');
    }
  };

  // 根据 peer_id 查找节点名称
  const findNodeNameByPeerId = (peerId: string): string => {
    // 优先从 nodeIdMap 查找（从 addresses 提取的 multihash）
    for (const [name, id] of Object.entries(nodeIdMap)) {
      if (id === peerId) return name;
    }
    // fallback: 从 nodeStatus 的 node_id 查找
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
          {t('demo.sidebar.selectNodeHint')}
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
            <Link className="w-3 h-3" /> {t('channel.open.title')}
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
          {/* 资产类型选择 */}
          <div className="flex gap-1 mb-2">
            <button
              onClick={() => { setOpenChannelAssetType('CKB'); setOpenChannelAmount('100000000000'); }}
              className={`flex-1 py-1 text-[10px] rounded border ${openChannelAssetType === 'CKB' ? 'border-orange-500 text-orange-400 bg-orange-500/10' : 'border-[#3e3e42] text-[#888] hover:bg-[#2d2d2d]'}`}
            >
              {t('channel.asset.ckb')}
            </button>
            <button
              onClick={() => { setOpenChannelAssetType('UDT'); setOpenChannelAmount('100000000'); }}
              className={`flex-1 py-1 text-[10px] rounded border ${openChannelAssetType === 'UDT' ? 'border-purple-500 text-purple-400 bg-purple-500/10' : 'border-[#3e3e42] text-[#888] hover:bg-[#2d2d2d]'}`}
            >
              {t('channel.asset.udt')}
            </button>
          </div>
          <div className="mb-2">
            <label className="text-[10px] text-[#666] block mb-1">
              {t('channel.open.amount')} ({openChannelAssetType === 'CKB' ? t('channel.open.amount.ckb') : t('channel.open.amount.udt')})
            </label>
            <input
              type="number"
              value={openChannelAmount}
              onChange={e => setOpenChannelAmount(e.target.value)}
              className="w-full bg-[#1e1e1e] border border-[#3e3e42] rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-500"
            />
            <div className="text-[9px] text-[#555] mt-0.5">
              {openChannelAssetType === 'CKB'
                ? `≈ ${(Number(openChannelAmount) / 1e8).toFixed(2)} ${t('channel.asset.ckb')}`
                : t('channel.open.amount.udtHint')
              }
            </div>
          </div>
          <button
            onClick={() => openChannelTarget && !isOpeningChannel && !pendingChannels.has(`${selectedNode}-${openChannelTarget}`) && handleOpenChannel(selectedNode, openChannelTarget, openChannelAmount, openChannelAssetType)}
            disabled={!openChannelTarget || isOpeningChannel || pendingChannels.has(`${selectedNode}-${openChannelTarget}`)}
            className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs rounded transition-colors flex items-center justify-center gap-1.5"
          >
            {pendingChannels.has(`${selectedNode}-${openChannelTarget}`) ? (
              <><RefreshCw className="w-3 h-3 animate-spin" /> {t('channel.open.confirming')}</>
            ) : isOpeningChannel ? (
              <><RefreshCw className="w-3 h-3 animate-spin" /> {t('channel.open.opening')}</>
            ) : (
              <>{t('channel.open.button')} ({selectedNode} → {openChannelTarget || '?'}) [{openChannelAssetType}]</>
            )}
          </button>
        </div>

        {/* 关闭通道 / 结算 */}
        {selectedChannels.length > 0 && (
          <div className="bg-[#252526] p-3 rounded-lg border border-[#3e3e42]">
            <label className="text-xs text-[#888] block mb-2 flex items-center gap-1">
              <Unlink className="w-3 h-3" /> {t('channel.close.title')} <span className="text-[9px] text-[#555]">({t('channel.close.hint')})</span>
            </label>
            <div className="space-y-2">
              {selectedChannels.map((ch, i) => {
                const peerName = ch.peer_id ? findNodeNameByPeerId(ch.peer_id) : '?';
                const isUdtChannel = !!ch.funding_udt_type_script;
                const assetSymbol = isUdtChannel ? t('channel.asset.udt') : t('channel.asset.ckb');
                const assetColor = isUdtChannel ? 'text-purple-400' : 'text-orange-400';
                const divisor = isUdtChannel ? 1 : 1e8;
                const localBal = Math.floor(Number(ch.local_balance || 0) / divisor);
                const remoteBal = Math.floor(Number(ch.remote_balance || 0) / divisor);
                const totalBal = localBal + remoteBal;
                const stateName = ch.state?.state_name || 'Unknown';
                const isReady = stateName === 'CHANNEL_READY';
                return (
                  <div key={ch.channel_id || i} className="bg-[#1e1e1e] rounded px-2 py-2 border border-[#2d2d2d]">
                    {/* 通道标题行：资产类型 → 对端节点 */}
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <span className={`font-medium ${assetColor}`}>{assetSymbol}</span>
                        <span className="text-[#666]">→</span>
                        <span className="text-white capitalize font-medium">{peerName}</span>
                      </div>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded ${isReady ? 'bg-green-900/30 text-green-400' : 'bg-yellow-900/30 text-yellow-400'}`}>
                        {isReady ? t('channel.status.ready') : stateName}
                      </span>
                    </div>
                    {/* 通道 ID */}
                    {ch.channel_id && (
                      <div className="text-[9px] text-[#555] mb-2 font-mono break-all" title={ch.channel_id}>
                        ID: {ch.channel_id}
                      </div>
                    )}

                    {/* 通道内余额 - Layer 2 */}
                    <div className="mb-2">
                      <div className="text-[9px] text-[#666] mb-1 flex items-center gap-1">
                        <Zap className="w-3 h-3" /> {t('channel.close.title')} (L2)
                      </div>
                      <div className="flex justify-between text-[9px] text-[#666] mb-1">
                        <span>{t('channel.close.totalLocked')}</span>
                        <span className="text-[#888]">{totalBal.toLocaleString()} {assetSymbol}</span>
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
                        <span className="text-blue-400">{t('channel.close.myBalance')}: {localBal.toLocaleString()} {assetSymbol}</span>
                        <span className="text-purple-400">{t('channel.close.peerBalance')}: {remoteBal.toLocaleString()} {assetSymbol}</span>
                      </div>
                    </div>

                    {/* 结算按钮 */}
                    <button
                      onClick={() => ch.channel_id && handleCloseChannel(selectedNode, ch.channel_id)}
                      disabled={!isReady}
                      className="w-full text-[10px] text-red-400 hover:text-red-300 border border-red-800 hover:border-red-600 disabled:opacity-40 disabled:cursor-not-allowed px-2 py-1 rounded transition-colors flex items-center justify-center gap-1"
                    >
                      <span>{t('channel.close.button')}</span>
                      <span className="text-[8px] text-[#666]">({t('channel.close.buttonHint')})</span>
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
            <Zap className="w-3 h-3" /> {t('payment.title')}
          </label>
          <div className="flex gap-1 mb-2">
            <button onClick={() => setAssetType('CKB')} className={`flex-1 py-1 text-[10px] rounded border ${assetType === 'CKB' ? 'border-orange-500 text-orange-400 bg-orange-500/10' : 'border-[#3e3e42] text-[#888] hover:bg-[#2d2d2d]'}`}>{t('channel.asset.ckb')}</button>
            <button onClick={() => setAssetType('UDT')} className={`flex-1 py-1 text-[10px] rounded border ${assetType === 'UDT' ? 'border-purple-500 text-purple-400 bg-purple-500/10' : 'border-[#3e3e42] text-[#888] hover:bg-[#2d2d2d]'}`}>{t('channel.asset.udt')}</button>
          </div>
          <div className="mb-2">
            <label className="text-[10px] text-[#666] block mb-1">{t('payment.amount')}</label>
            <input
              type="number"
              value={payAmount}
              onChange={e => setPayAmount(Number(e.target.value))}
              className="w-full bg-[#1e1e1e] border border-[#3e3e42] rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="mb-2">
            <label className="text-[10px] text-[#666] block mb-1">{t('payment.target')}</label>
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
              {t('payment.createInvoice')} ({payTarget || t('payment.selectTarget')})
            </button>
            <button
              onClick={handlePayInvoice}
              disabled={paymentState !== 'created'}
              className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:bg-[#2d2d2d] text-white text-xs rounded flex items-center justify-center gap-1.5 transition-colors"
            >
              {paymentState === 'paying' ? <Activity className="w-3 h-3 animate-pulse" /> : <Zap className="w-3 h-3" />}
              {paymentState === 'paying' ? t('payment.paying') : paymentState === 'success' ? t('payment.success') : t('payment.pay')}
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
          {/* Logo 和标题 */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-white fill-white" />
            </div>
            <span className="font-bold text-white text-lg tracking-wide">Fiber</span>
            {mode !== 'home' && (
              <span className="text-[#666] text-sm ml-2">
                {mode === 'quickstart' ? `/ ${t('home.quickStart.title')}` : `/ ${t('home.fullDemo.title')}`}
              </span>
            )}
          </div>
          
          {/* Demo 模式的 Start/Stop 控制 - 已移除 */}
        </div>

        <div className="flex items-center gap-3">
          {/* 语言切换 */}
          <LanguageSwitcher />
          
          {/* 返回首页按钮 */}
          {mode !== 'home' && (
            <button
              onClick={() => setMode('home')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#888] hover:text-white border border-[#3e3e42] hover:border-[#555] rounded transition-colors"
            >
              {t('nav.backToHome')}
            </button>
          )}
          
          <NextLink
            href="/docs"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#888] hover:text-white border border-[#3e3e42] hover:border-[#555] rounded transition-colors"
          >
            <Zap className="w-3 h-3" /> {t('nav.sdkDocs')}
          </NextLink>
        </div>
      </header>

      {/* 主体工作区 */}
      <div className="flex-1 flex flex-col overflow-hidden">
      {/* 中间行：左侧边栏 + 画布 + 右侧面板 */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        
        {/* 左侧边栏 - 仅 Demo 模式显示 */}
        {mode === 'demo' && (
        <aside className="w-64 bg-[#1e1e1e] border-r border-[#2d2d2d] flex flex-col shrink-0 overflow-y-auto z-10" style={{ scrollbarGutter: 'stable' }}>
          <div className="p-4 flex-1">
            <h3 className="text-xs font-bold text-[#666] tracking-widest mb-3 uppercase">{t('demo.sidebar.networkAction')}</h3>
            
            {!hasNetwork ? (
              <div className="text-center py-8 text-sm text-[#888]">
                {t('demo.sidebar.createNetworkFirst')}
              </div>
            ) : (
              <div className={`transition-opacity duration-300 ${isRunning ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                {renderSidePanelContent()}

                {/* 通道状态（始终显示） */}
                {isRunning && (
                  <div className="mt-3 bg-[#252526] p-3 rounded-lg border border-[#3e3e42]">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs text-[#888]">{t('demo.sidebar.channelStatus')}</label>
                    </div>
                    {FIBER_NODES.map(name => {
                      const chs = channels[name] || [];
                      const totalChannels = chs.length;
                      return (
                        <div key={name} className="mb-2 last:mb-0">
                          {/* 节点标题行 */}
                          <div className="flex justify-between text-[10px] py-0.5 mb-1">
                            <span className="text-[#aaa] font-medium capitalize">{name}</span>
                            <span className={totalChannels > 0 ? 'text-blue-400' : 'text-gray-500'}>
                              {totalChannels} {t('demo.sidebar.channels')}
                            </span>
                          </div>
                          {/* 通道列表 */}
                          {chs.length > 0 && (
                            <div className="space-y-1 pl-2 border-l border-[#3e3e42] ml-1">
                              {chs.map((ch, idx) => {
                                const peerName = ch.peer_id ? findNodeNameByPeerId(ch.peer_id) : '未知';
                                const isUdt = !!ch.funding_udt_type_script;
                                const assetType = isUdt ? 'sUDT' : 'CKB';
                                const stateName = ch.state?.state_name || 'Unknown';
                                const isReady = stateName === 'CHANNEL_READY';
                                const channelKey = `${name}-${peerName.toLowerCase()}`;
                                const isPending = pendingChannels.has(channelKey);
                                
                                return (
                                  <div key={ch.channel_id || idx} className="flex items-center gap-1.5 text-[9px] py-0.5">
                                    {/* 通道类型标签 */}
                                    <span className={`px-1.5 py-0.5 rounded ${isUdt ? 'bg-purple-500/20 text-purple-400' : 'bg-orange-500/20 text-orange-400'}`}>
                                      {isUdt ? t('channel.asset.udt') : t('channel.asset.ckb')}
                                    </span>
                                    {/* 对端节点 */}
                                    <span className="text-[#888]">→</span>
                                    <span className="text-[#ccc] capitalize">{peerName}</span>
                                    {/* 状态标签 */}
                                    {isPending ? (
                                      <span className="ml-auto flex items-center gap-0.5 text-yellow-400">
                                        <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                                        {t('channel.status.confirming')}
                                      </span>
                                    ) : isReady ? (
                                      <span className="ml-auto text-green-400">✓ {t('channel.status.ready')}</span>
                                    ) : (
                                      <span className="ml-auto text-yellow-400">{t('channel.status.waiting')}</span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="mt-auto p-3 border-t border-[#2d2d2d]">
            <div className="text-[10px] text-[#666] uppercase tracking-wider mb-2">{t('demo.sidebar.nodeStatus')}</div>
            <div className="space-y-1.5">
              {FIBER_NODES.map(name => {
                const online = nodeStatus[name]?.isOnline ?? false;
                return (
                  <div key={name} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs ${
                    online ? 'text-[#3fb950]' : 'text-[#f85149]'
                  }`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${online ? 'bg-[#3fb950]' : 'bg-[#f85149]'}`} />
                    <span className="capitalize font-medium">{name}</span>
                    <span className="ml-auto text-[10px] opacity-60">{online ? t('demo.sidebar.online') : t('demo.sidebar.offline')}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>
        )}

        {/* 右侧画布 */}
        <main className="flex-1 relative bg-[#191919] overflow-hidden flex items-center justify-center">
          
          {/* 首页：双入口选择 */}
          {mode === 'home' && (
            <div className="flex flex-col items-center text-center z-10">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mb-6 shadow-xl shadow-blue-900/30">
                <Zap className="w-10 h-10 text-white fill-white" />
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">{t('app.title')}</h1>
              <p className="text-[#888] mb-10 max-w-md">{t('app.description')}</p>
              
              <div className="flex gap-6">
                {/* 快速入门卡片 */}
                <div className="w-72 bg-[#1e1e1e] rounded-xl border border-[#3e3e42] p-6 hover:border-blue-500/50 transition-all group cursor-pointer"
                     onClick={handleEnterQuickStart}>
                  <div className="w-12 h-12 bg-blue-600/20 rounded-lg flex items-center justify-center mb-4 group-hover:bg-blue-600/30 transition-colors">
                    <Play className="w-6 h-6 text-blue-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">{t('home.quickStart.title')}</h3>
                  <p className="text-[#888] text-sm mb-4">{t('home.quickStart.desc')}</p>
                  
                  {/* 简化拓扑图示意 */}
                  <div className="bg-[#252526] rounded-lg p-4 mb-4 h-[140px] flex flex-col items-center justify-center">
                    <div className="flex items-center justify-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-purple-600/20 border border-purple-500/30 flex items-center justify-center">
                        <span className="text-purple-400 font-bold text-sm">A</span>
                      </div>
                      <div className="flex-1 h-0.5 bg-gradient-to-r from-purple-500/50 via-blue-500 to-purple-500/50 relative">
                        <div className="absolute inset-0 bg-blue-400/50 animate-pulse"></div>
                      </div>
                      <div className="w-12 h-12 rounded-lg bg-purple-600/20 border border-purple-500/30 flex items-center justify-center">
                        <span className="text-purple-400 font-bold text-sm">B</span>
                      </div>
                    </div>
                    <p className="text-[#666] text-xs mt-3 text-center">{t('home.quickStart.step1')} → {t('home.quickStart.step2')} → {t('home.quickStart.step3')}</p>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[#666]">{t('home.quickStart.requireDocker')}</span>
                    <span className="text-blue-400 group-hover:translate-x-1 transition-transform">{t('home.quickStart.startLearning')} →</span>
                  </div>
                </div>
                
                {/* 完整演示卡片 */}
                <div className="w-72 bg-[#1e1e1e] rounded-xl border border-[#3e3e42] p-6 hover:border-green-500/50 transition-all group cursor-pointer"
                     onClick={handleEnterDemo}>
                  <div className="w-12 h-12 bg-green-600/20 rounded-lg flex items-center justify-center mb-4 group-hover:bg-green-600/30 transition-colors">
                    <Activity className="w-6 h-6 text-green-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">{t('home.fullDemo.title')}</h3>
                  <p className="text-[#888] text-sm mb-4">{t('home.fullDemo.desc')}</p>
                  
                  {/* 多跳拓扑图示意 */}
                  <div className="bg-[#252526] rounded-lg p-4 mb-4 h-[140px] flex flex-col items-center justify-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex items-center gap-8">
                        <div className="w-12 h-12 rounded-lg bg-purple-600/20 border border-purple-500/30 flex items-center justify-center">
                          <span className="text-purple-400 font-bold text-sm">A</span>
                        </div>
                        <div className="w-12 h-12 rounded-lg bg-purple-600/20 border border-purple-500/30 flex items-center justify-center">
                          <span className="text-purple-400 font-bold text-sm">B</span>
                        </div>
                      </div>
                      <div className="w-12 h-12 rounded-lg bg-green-600/20 border border-green-500/30 flex items-center justify-center">
                        <span className="text-green-400 font-bold text-sm">C</span>
                      </div>
                    </div>
                    <p className="text-[#666] text-xs mt-3 text-center">{t('home.fullDemo.route')}</p>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[#666]">{t('home.quickStart.requireDocker')}</span>
                    <span className="text-green-400 group-hover:translate-x-1 transition-transform">{t('home.fullDemo.enterDemo')} →</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Quick Start 模式 */}
          {mode === 'quickstart' && (
            <QuickStart onBack={() => setMode('home')} />
          )}
          
          {/* Demo 模式：原有拓扑图 */}
          {mode === 'demo' && (
            !hasNetwork ? (
              <div className="flex flex-col items-center text-center z-10">
                <div className="w-20 h-20 bg-[#252526] rounded-full flex items-center justify-center border border-[#3e3e42] mb-6 shadow-xl">
                  <Box className="w-10 h-10 text-[#444]" />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">{t('demo.init.title')}</h2>
                <p className="text-[#888] mb-6 max-w-sm">{t('demo.init.desc')}</p>
                <button 
                  onClick={handleCreateNetwork}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-full font-medium transition-colors shadow-lg shadow-blue-900/20 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" /> {t('demo.init.button')}
                </button>
              </div>
            ) :
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

                {/* L2 通道连线：动态判断，有通道才画，根据类型显示不同颜色 */}
                {(() => {
                  const ab = getChannelInfoBetween('alice', 'bob');
                  const bc = getChannelInfoBetween('bob', 'charlie');
                  const ac = getChannelInfoBetween('alice', 'charlie');
                  
                  return (
                    <>
                      {/* Alice - Bob */}
                      {ab.hasChannel && (
                        <>
                          <line 
                            x1="200" y1="300" x2="600" y2="300" 
                            stroke={ab.isUdt ? "#a855f7" : "#f97316"} 
                            strokeWidth="3" 
                          />
                          <line 
                            x1="200" y1="300" x2="600" y2="300" 
                            stroke={ab.isUdt ? "#c084fc" : "#fb923c"} 
                            strokeWidth="1" 
                            strokeDasharray={ab.isReady ? "0" : "4 4"} 
                            opacity="0.6" 
                          />
                        </>
                      )}
                      {/* Bob - Charlie */}
                      {bc.hasChannel && (
                        <>
                          <line 
                            x1="600" y1="300" x2="400" y2="500" 
                            stroke={bc.isUdt ? "#a855f7" : "#f97316"} 
                            strokeWidth="3" 
                          />
                          <line 
                            x1="600" y1="300" x2="400" y2="500" 
                            stroke={bc.isUdt ? "#c084fc" : "#fb923c"} 
                            strokeWidth="1" 
                            strokeDasharray={bc.isReady ? "0" : "4 4"} 
                            opacity="0.6" 
                          />
                        </>
                      )}
                      {/* Alice - Charlie */}
                      {ac.hasChannel && (
                        <>
                          <line 
                            x1="200" y1="300" x2="400" y2="500" 
                            stroke={ac.isUdt ? "#a855f7" : "#f97316"} 
                            strokeWidth="3" 
                          />
                          <line 
                            x1="200" y1="300" x2="400" y2="500" 
                            stroke={ac.isUdt ? "#c084fc" : "#fb923c"} 
                            strokeWidth="1" 
                            strokeDasharray={ac.isReady ? "0" : "4 4"} 
                            opacity="0.6" 
                          />
                        </>
                      )}
                    </>
                  );
                })()}

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
                              <span>{t('demo.node.l1.height')}</span><span className="text-[#ccc]">{isRunning ? node.height : '-'}</span>
                            </div>
                            <div className="flex justify-between text-[11px] text-[#888]">
                              <span>{t('demo.node.l1.version')}</span><span className="text-[#ccc]">{node.version}</span>
                            </div>
                          </>
                        ) : (
                          <>
                            {/* 链上余额 - Layer 1 */}
                            <div className="mb-2 pb-2 border-b border-[#2d2d2d]">
                              <div className="text-[9px] text-[#666] mb-1 flex items-center gap-1">
                                <Box className="w-3 h-3" /> {t('demo.node.l1.balance')}
                              </div>
                              <div className="flex justify-between text-[11px] text-[#888] mb-0.5">
                                <span>{t('channel.asset.ckb')}</span>
                                <span className="text-orange-400 font-mono">
                                  {isRunning ? (nodeStatus[node.name]?.ckbBalance || 0).toLocaleString() : '-'}
                                </span>
                              </div>
                              <div className="flex justify-between text-[11px] text-[#888]">
                                <span>{t('channel.asset.udt')}</span>
                                <span className="text-purple-400 font-mono">
                                  {isRunning ? (nodeStatus[node.name]?.udtBalance || 0).toLocaleString() : '-'}
                                </span>
                              </div>
                            </div>
                            {/* 通道统计 */}
                            <div className="flex justify-between text-[11px] text-[#888]">
                              <span className="flex items-center gap-1"><Link className="w-3 h-3" /> {t('demo.node.l2.channels')}</span>
                              <span className="text-blue-400 font-mono">{(channels[node.name] || []).length}</span>
                            </div>
                          </>
                        )}
                      </div>

                      {isSelected && (
                        <div className="mt-2 text-[9px] text-blue-400 text-center">{t('demo.node.selected')}</div>
                      )}
                    </div>
                  </div>
                );
              })}

            </div>
          )}
          
          {mode === 'demo' && hasNetwork && (
          <div className="absolute bottom-4 right-4 bg-[#252526] border border-[#3e3e42] rounded px-3 py-1.5 flex gap-4 text-xs text-[#666]">
            <span>{t('demo.zoom')}: 100%</span>
            <span>{selectedNode ? `${t('demo.selected')}: ${selectedNode}` : t('demo.clickToSelect')}</span>
          </div>
          )}
        </main>

        {/* 右侧面板：Output + RPC Inspector - 仅 Demo 模式显示 */}
        {mode === 'demo' && (
        <aside className="w-96 bg-[#1e1e1e] border-l border-[#2d2d2d] flex flex-col shrink-0">
          {/* Tab 栏 */}
          <div className="flex items-center gap-1 px-2 border-b border-[#2d2d2d] pt-1 shrink-0">
            {['output', 'rpcInspector'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab === 'output' ? 'Output' : 'RPC Inspector')}
                className={`px-4 py-2 text-xs border-b-2 transition-colors ${activeTab === (tab === 'output' ? 'Output' : 'RPC Inspector') ? 'border-blue-500 text-white' : 'border-transparent text-[#888] hover:text-white'}`}
              >
                {t(tab === 'output' ? 'output.title' : 'output.rpcInspector')}
                {tab === 'rpcInspector' && rpcHistory.length > 0 && (
                  <span className="ml-1.5 text-[9px] bg-blue-600 text-white rounded-full px-1.5 py-0.5">{rpcHistory.length}</span>
                )}
              </button>
            ))}
          </div>

          {/* 内容区 */}
          <div className="flex-1 overflow-hidden">
            {activeTab === 'Output' && (
              <div className="h-full overflow-y-auto p-3 font-mono text-xs leading-5">
                <div className="space-y-1">
                  {!isClient ? (
                    <div className="text-[#666] p-2">Loading...</div>
                  ) : (
                    logs.map((log, i) => (
                      <div key={i} className="flex hover:bg-[#252526] px-1 py-0.5 rounded -mx-1 transition-all">
                        <span className="text-[#666] shrink-0 w-16">{log.time}</span>
                        {log.type === 'sys' ? (
                          <>
                            <span className={`shrink-0 w-14 ${log.method === 'error' ? 'text-red-400' : 'text-yellow-500'}`}>{t('log.system')}</span>
                            <span className="text-[#cccccc] whitespace-pre-wrap break-all">
                              {typeof log.payload === 'string' ? log.payload : JSON.stringify(log.payload)}
                            </span>
                          </>
                        ) : (
                          <>
                            <span className={`shrink-0 w-14 ${log.type === 'req' ? 'text-blue-400' : 'text-green-400'}`}>
                              {log.type === 'req' ? t('log.request') : t('log.response')}
                            </span>
                            <span className="text-purple-400 shrink-0 w-28 truncate">{log.method}</span>
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
              </div>
            )}

            {activeTab === 'RPC Inspector' && (
              <div className="h-full flex flex-col font-mono text-xs">
                {/* 操作历史列表 */}
                <div className="border-b border-[#2d2d2d] overflow-y-auto shrink-0" style={{ maxHeight: '35%' }}>
                  {rpcHistory.length === 0 ? (
                    <div className="p-4 text-[#555] text-center">
                      <div className="text-xl mb-1 opacity-30">⬡</div>
                      {t('output.rpcHint')}
                    </div>
                  ) : (
                    rpcHistory.map(entry => (
                      <button
                        key={entry.id}
                        onClick={() => setSelectedRpcEntry(entry.id)}
                        className={`w-full text-left px-3 py-2 border-b border-[#252526] hover:bg-[#252526] transition-colors ${selectedRpcEntry === entry.id ? 'bg-[#252526] border-l-2 border-l-blue-500' : ''}`}
                      >
                        <div className="flex items-center gap-1.5">
                          <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${entry.status === 'success' ? 'bg-green-500' : 'bg-red-500'}`} />
                          <span className="text-white text-[11px] truncate flex-1">{entry.operation}</span>
                          <span className="text-[#555] text-[10px] shrink-0">{entry.timestamp}</span>
                          <span className="text-[#555] text-[10px] shrink-0">{entry.traces.length}×</span>
                        </div>
                      </button>
                    ))
                  )}
                </div>

                {/* 调用详情 */}
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                  {!selectedRpcEntry ? (
                    <div className="text-[#555] text-center pt-6">↑ {t('output.clickToView')}</div>
                  ) : (() => {
                    const entry = rpcHistory.find(e => e.id === selectedRpcEntry);
                    if (!entry) return null;
                    return entry.traces.map((trace, idx) => {
                      const traceKey = `${entry.id}-${idx}`;
                      const isExpanded = expandedTraces[traceKey] !== false;
                      const methodSchema = RPC_SCHEMA[trace.method];
                      return (
                        <div key={traceKey} className="bg-[#252526] rounded border border-[#3e3e42] overflow-hidden">
                          <button
                            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[#2d2d2d] transition-colors"
                            onClick={() => setExpandedTraces(prev => ({ ...prev, [traceKey]: !isExpanded }))}
                          >
                            {isExpanded ? <ChevronDown className="w-3 h-3 text-[#666] shrink-0" /> : <ChevronRight className="w-3 h-3 text-[#666] shrink-0" />}
                            <span className="text-blue-400 font-bold">{trace.method}</span>
                            {trace.error ? (
                              <span className="ml-auto text-red-400 text-[10px]">ERROR · {trace.durationMs}ms</span>
                            ) : (
                              <span className="ml-auto text-green-500 text-[10px]">OK · {trace.durationMs}ms</span>
                            )}
                          </button>

                          {isExpanded && (
                            <div className="px-3 pb-3 space-y-2">
                              {methodSchema && (
                                <div className="text-[10px] text-[#888] bg-[#1e1e1e] rounded px-2 py-1.5 border border-[#2d2d2d]">
                                  {methodSchema.description}
                                </div>
                              )}

                              <div>
                                <div className="text-[10px] text-yellow-500 mb-1 flex items-center gap-1">
                                  <span className="font-bold">{t('output.request')}</span>
                                  <span className="text-[#555]">params[0]</span>
                                </div>
                                <pre className="text-[10px] text-[#cccccc] bg-[#1a1a1a] rounded p-2 overflow-x-auto border border-[#2d2d2d] whitespace-pre-wrap break-all">
                                  {trace.params === null || trace.params === undefined
                                    ? <span className="text-[#555]">(no params)</span>
                                    : JSON.stringify(trace.params, null, 2)}
                                </pre>
                              </div>

                              {methodSchema && methodSchema.params.length > 0 && (
                                <div className="border border-[#2d2d2d] rounded overflow-hidden">
                                  <div className="text-[9px] text-[#666] px-2 py-1 bg-[#1a1a1a] border-b border-[#2d2d2d] font-bold uppercase tracking-wider">{t('output.paramDesc')}</div>
                                  {methodSchema.params.map(p => (
                                    <div key={p.field} className="flex gap-2 px-2 py-1 text-[10px] border-b border-[#1e1e1e] last:border-0">
                                      <span className="text-purple-400 shrink-0 w-28 font-mono truncate" title={p.field}>{p.field}</span>
                                      <span className="text-orange-300 shrink-0 w-16 opacity-70 truncate">{p.type}</span>
                                      <span className={`shrink-0 text-[9px] w-12 ${p.required ? 'text-red-400' : 'text-[#555]'}`}>{p.required ? 'required' : 'optional'}</span>
                                      <span className="text-[#888] flex-1 leading-relaxed">{p.desc}</span>
                                    </div>
                                  ))}
                                </div>
                              )}

                              <div>
                                <div className={`text-[10px] mb-1 font-bold ${trace.error ? 'text-red-400' : 'text-green-400'}`}>
                                  {trace.error ? t('output.error') : t('output.response')}
                                </div>
                                {trace.error ? (
                                  <pre className="text-[10px] text-red-300 bg-[#1a1a1a] rounded p-2 overflow-x-auto border border-red-900/30 whitespace-pre-wrap break-all">
                                    {trace.error}
                                  </pre>
                                ) : (
                                  <pre className="text-[10px] text-[#cccccc] bg-[#1a1a1a] rounded p-2 overflow-x-auto border border-[#2d2d2d] whitespace-pre-wrap break-all">
                                    {trace.result === null || trace.result === undefined
                                      ? <span className="text-[#555]">null</span>
                                      : JSON.stringify(trace.result, null, 2)}
                                  </pre>
                                )}
                              </div>

                              {methodSchema && methodSchema.returns.length > 0 && (
                                <div className="border border-[#2d2d2d] rounded overflow-hidden">
                                  <div className="text-[9px] text-[#666] px-2 py-1 bg-[#1a1a1a] border-b border-[#2d2d2d] font-bold uppercase tracking-wider">{t('output.returnDesc')}</div>
                                  {methodSchema.returns.map(r => (
                                    <div key={r.field} className="flex gap-2 px-2 py-1 text-[10px] border-b border-[#1e1e1e] last:border-0">
                                      <span className="text-green-400 shrink-0 w-28 font-mono truncate" title={r.field}>{r.field}</span>
                                      <span className="text-orange-300 shrink-0 w-16 opacity-70 truncate">{r.type}</span>
                                      <span className="text-[#888] flex-1 leading-relaxed">{r.desc}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            )}
          </div>
        </aside>
        )}
      </div>
      </div>
    </div>
  );
}
