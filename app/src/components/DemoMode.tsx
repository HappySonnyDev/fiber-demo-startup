/**
 * Demo 模式组件
 */

"use client";

import React, { useState, useCallback, useEffect } from 'react';
import { Plus, Box, Zap, Play, Activity } from 'lucide-react';
import type { NodesState, Node, ApiNodeInfo, ChannelInfo, ChannelLineInfo, AssetType, PaymentState } from '@/types';
import { INITIAL_NODES, FIBER_NODES, NODE_POSITIONS, CHANNEL_CHECK_DELAYS } from '@/constants';
import { useI18n } from '@/lib/i18n';
import { useNodeStatus } from '@/hooks/useNodeStatus';
import { useChannels } from '@/hooks/useChannels';
import { useLogs, useRpcHistory } from '@/hooks/useLogs';
import { NodeCard, SidePanel, OutputPanel } from '@/components/demo';

export function DemoMode() {
  const { t } = useI18n();
  
  // 状态
  const [hasNetwork, setHasNetwork] = useState(false);
  const [nodes, setNodes] = useState<NodesState>({});
  const [isRunning, setIsRunning] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  
  // 节点状态
  const { nodeStatus, nodeIdMap, fetchNodeStatus, startPolling, stopPolling } = useNodeStatus();
  
  // 通道状态
  const { channels, fetchChannels, getChannelsBetween } = useChannels();
  
  // 日志
  const { logs, isClient, logsEndRef, addLog } = useLogs();
  
  // RPC 历史
  const { rpcHistory, selectedRpcEntry, expandedTraces, setSelectedRpcEntry, addRpcEntry, toggleTrace } = useRpcHistory();
  
  // 选中的节点
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  
  // 通道操作状态
  const [openChannelTarget, setOpenChannelTarget] = useState<string>('');
  const [openChannelAmount, setOpenChannelAmount] = useState<string>('100000000000');
  const [openChannelAssetType, setOpenChannelAssetType] = useState<AssetType>('CKB');
  const [isOpeningChannel, setIsOpeningChannel] = useState(false);
  const [pendingChannels, setPendingChannels] = useState<Set<string>>(new Set());
  
  // 支付状态
  const [paymentState, setPaymentState] = useState<PaymentState>('idle');
  const [invoice, setInvoice] = useState('');
  const [assetType, setAssetType] = useState<AssetType>('CKB');
  const [payAmount, setPayAmount] = useState(100);
  const [payTarget, setPayTarget] = useState<string>('');
  
  // 输出面板
  const [activeTab, setActiveTab] = useState('Output');
  
  // 初始化连接
  useEffect(() => {
    setHasNetwork(true);
    setNodes(INITIAL_NODES);
    setIsConnecting(true);
    addLog('sys', 'System', 'connect', 'Connecting to Fiber nodes...');
    
    fetch('/api/nodes').then(r => r.json()).then(data => {
      const allOnline = data.nodes?.every((n: ApiNodeInfo) => n.isOnline) ?? false;
      const statusMap: Record<string, ApiNodeInfo> = {};
      data.nodes?.forEach((n: ApiNodeInfo) => { statusMap[n.name] = n; });
      
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
  }, [addLog, fetchNodeStatus, fetchChannels, startPolling]);

  // 打开通道
  const handleOpenChannel = useCallback(async (fromNode: string, toNode: string, amount: string, assetType: AssetType) => {
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
        setPendingChannels(prev => new Set(prev).add(channelKey));
        
        CHANNEL_CHECK_DELAYS.forEach((delay) => {
          setTimeout(async () => {
            await fetchChannels();
            await fetchNodeStatus();
            
            const channels = getChannelsBetween(fromNode, toNode, nodeIdMap);
            const readyChannel = channels.find(ch => ch.isReady);
            if (readyChannel) {
              setPendingChannels(prev => {
                const next = new Set(prev);
                next.delete(channelKey);
                return next;
              });
              addLog('sys', 'System', 'channel_ready', `${fromNode} → ${toNode} 通道已就绪`);
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
  }, [addLog, addRpcEntry, fetchChannels, fetchNodeStatus, getChannelsBetween, nodeIdMap]);

  // 关闭通道
  const handleCloseChannel = useCallback(async (nodeName: string, channelId: string) => {
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
  }, [addLog, addRpcEntry, fetchChannels, fetchNodeStatus]);

  // 创建发票
  const handleCreateInvoice = useCallback(async () => {
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
          assetType
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
  }, [isRunning, payTarget, payAmount, assetType, addLog, addRpcEntry]);

  // 发起支付
  const handlePayInvoice = useCallback(async () => {
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
  }, [isRunning, invoice, selectedNode, payTarget, assetType, payAmount, addLog, addRpcEntry, fetchChannels]);

  // 根据 peer_id 查找节点名称
  const findNodeNameByPeerId = useCallback((peerId: string): string => {
    for (const [name, id] of Object.entries(nodeIdMap)) {
      if (id === peerId) return name;
    }
    for (const name of FIBER_NODES) {
      if (nodeStatus[name]?.info?.node_id === peerId) return name;
    }
    return peerId.substring(0, 12) + '...';
  }, [nodeIdMap, nodeStatus]);

  // 选择节点
  const handleSelectNode = useCallback((key: string) => {
    if (selectedNode === key) {
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
  }, [selectedNode]);

  if (!hasNetwork) {
    return (
      <div className="flex flex-col items-center text-center z-10">
        <div className="w-20 h-20 bg-[#252526] rounded-full flex items-center justify-center border border-[#3e3e42] mb-6 shadow-xl">
          <Box className="w-10 h-10 text-[#444]" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">{t('demo.init.title')}</h2>
        <p className="text-[#888] mb-6 max-w-sm">{t('demo.init.desc')}</p>
        <button
          onClick={() => { setHasNetwork(true); setNodes(INITIAL_NODES); }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-full font-medium transition-colors shadow-lg shadow-blue-900/20 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> {t('demo.init.button')}
        </button>
      </div>
    );
  }

  return (
    <>
      {/* 左侧边栏 */}
      <SidePanel
        isRunning={isRunning}
        hasNetwork={hasNetwork}
        selectedNode={selectedNode}
        nodeStatus={nodeStatus}
        channels={channels}
        nodeIdMap={nodeIdMap}
        pendingChannels={pendingChannels}
        openChannelTarget={openChannelTarget}
        setOpenChannelTarget={setOpenChannelTarget}
        openChannelAmount={openChannelAmount}
        setOpenChannelAmount={setOpenChannelAmount}
        openChannelAssetType={openChannelAssetType}
        setOpenChannelAssetType={setOpenChannelAssetType}
        isOpeningChannel={isOpeningChannel}
        onOpenChannel={handleOpenChannel}
        onCloseChannel={handleCloseChannel}
        paymentState={paymentState}
        invoice={invoice}
        assetType={assetType}
        setAssetType={setAssetType}
        payAmount={payAmount}
        setPayAmount={setPayAmount}
        payTarget={payTarget}
        setPayTarget={setPayTarget}
        onCreateInvoice={handleCreateInvoice}
        onPayInvoice={handlePayInvoice}
        onDeselectNode={() => { setSelectedNode(null); setPaymentState('idle'); setInvoice(''); }}
        findNodeNameByPeerId={findNodeNameByPeerId}
      />

      {/* 画布 */}
      <main className="flex-1 relative bg-[#191919] overflow-hidden flex items-center justify-center">
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
              {selectedNode && payTarget && NODE_POSITIONS[selectedNode] && NODE_POSITIONS[payTarget] && (
                <path
                  id="payPath"
                  d={`M ${NODE_POSITIONS[selectedNode].x} ${NODE_POSITIONS[selectedNode].y} L ${NODE_POSITIONS[payTarget].x} ${NODE_POSITIONS[payTarget].y}`}
                  fill="none"
                />
              )}
            </defs>

            {/* L1 到节点的虚线 */}
            {isRunning && (
              <>
                <line x1="400" y1="100" x2="200" y2="300" stroke="#333" strokeWidth="1.5" strokeDasharray="5 5" />
                <line x1="400" y1="100" x2="600" y2="300" stroke="#333" strokeWidth="1.5" strokeDasharray="5 5" />
                <line x1="400" y1="100" x2="400" y2="500" stroke="#333" strokeWidth="1.5" strokeDasharray="5 5" />
              </>
            )}

            {/* L2 通道连线 */}
            {[
              ['alice', 'bob'],
              ['bob', 'charlie'],
              ['alice', 'charlie'],
            ].map(([a, b]) => {
              const channelInfos = getChannelsBetween(a, b, nodeIdMap);
              if (channelInfos.length === 0) return null;
              const posA = NODE_POSITIONS[a];
              const posB = NODE_POSITIONS[b];
              
              // 为同一对节点之间的多条通道画多条线（使用曲线偏移区分）
              return channelInfos.map((info, idx) => {
                // 使用二次贝塞尔曲线实现平行偏移
                const midX = (posA.x + posB.x) / 2;
                const midY = (posA.y + posB.y) / 2;
                const dx = posB.y - posA.y;
                const dy = posA.x - posB.x;
                const len = Math.sqrt(dx * dx + dy * dy);
                const offset = idx === 0 ? 0 : (idx === 1 ? 15 : -15); // 偏移量
                const controlX = midX + (dx / len) * offset;
                const controlY = midY + (dy / len) * offset;
                
                return (
                  <g key={`${a}-${b}-${idx}`}>
                    <path
                      d={`M ${posA.x} ${posA.y} Q ${controlX} ${controlY} ${posB.x} ${posB.y}`}
                      fill="none"
                      stroke={info.isUdt ? "#a855f7" : "#f97316"}
                      strokeWidth="3"
                    />
                    <path
                      d={`M ${posA.x} ${posA.y} Q ${controlX} ${controlY} ${posB.x} ${posB.y}`}
                      fill="none"
                      stroke={info.isUdt ? "#c084fc" : "#fb923c"}
                      strokeWidth="1"
                      strokeDasharray={info.isReady ? "0" : "4 4"}
                      opacity="0.6"
                    />
                  </g>
                );
              });
            })}

            {/* 支付动画 */}
            {paymentState === 'paying' && selectedNode && payTarget && (
              <circle r="6" fill="#fbbf24" filter="url(#glow)">
                <animateMotion dur="1.5s" repeatCount="indefinite">
                  <mpath href="#payPath" />
                </animateMotion>
              </circle>
            )}
          </svg>

          {/* 节点卡片 */}
          {Object.entries(nodes).map(([key, node]) => {
            if (!node) return null;
            return (
              <NodeCard
                key={key}
                nodeKey={key}
                node={node}
                isRunning={isRunning}
                isSelected={selectedNode === key}
                nodeStatus={nodeStatus}
                channels={channels}
                onSelect={handleSelectNode}
              />
            );
          })}
        </div>

        {/* 状态栏 */}
        <div className="absolute bottom-4 right-4 bg-[#252526] border border-[#3e3e42] rounded px-3 py-1.5 flex gap-4 text-xs text-[#666]">
          <span>{t('demo.zoom')}: 100%</span>
          <span>{selectedNode ? `${t('demo.selected')}: ${selectedNode}` : t('demo.clickToSelect')}</span>
        </div>
      </main>

      {/* 输出面板 */}
      <OutputPanel
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        logs={logs}
        isClient={isClient}
        logsEndRef={logsEndRef}
        rpcHistory={rpcHistory}
        selectedRpcEntry={selectedRpcEntry}
        expandedTraces={expandedTraces}
        onSelectRpcEntry={setSelectedRpcEntry}
        onToggleTrace={toggleTrace}
      />
    </>
  );
}
