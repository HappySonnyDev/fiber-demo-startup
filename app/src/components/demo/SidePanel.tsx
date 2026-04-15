/**
 * 左侧边栏组件
 */

import React from 'react';
import { Zap, RefreshCw, X, Link, Unlink, Store, Activity } from 'lucide-react';
import type { ApiNodeInfo, ChannelInfo, AssetType } from '@/types';
import { FIBER_NODES } from '@/constants';
import { useI18n } from '@/lib/i18n';

interface SidePanelProps {
  isRunning: boolean;
  hasNetwork: boolean;
  selectedNode: string | null;
  nodeStatus: Record<string, ApiNodeInfo>;
  channels: Record<string, ChannelInfo[]>;
  nodeIdMap: Record<string, string>;
  pendingChannels: Set<string>;
  
  // 通道操作
  openChannelTarget: string;
  setOpenChannelTarget: (target: string) => void;
  openChannelAmount: string;
  setOpenChannelAmount: (amount: string) => void;
  openChannelAssetType: AssetType;
  setOpenChannelAssetType: (type: AssetType) => void;
  isOpeningChannel: boolean;
  onOpenChannel: (fromNode: string, toNode: string, amount: string, assetType: AssetType) => void;
  onCloseChannel: (nodeName: string, channelId: string) => void;
  
  // 支付操作
  paymentState: string;
  invoice: string;
  assetType: AssetType;
  setAssetType: (type: AssetType) => void;
  payAmount: number;
  setPayAmount: (amount: number) => void;
  payTarget: string;
  setPayTarget: (target: string) => void;
  onCreateInvoice: () => void;
  onPayInvoice: () => void;
  
  // 选择操作
  onDeselectNode: () => void;
  
  // 工具函数
  findNodeNameByPubkey: (pubkey: string) => string;
}

export function SidePanel({
  isRunning,
  hasNetwork,
  selectedNode,
  nodeStatus,
  channels,
  nodeIdMap,
  pendingChannels,
  openChannelTarget,
  setOpenChannelTarget,
  openChannelAmount,
  setOpenChannelAmount,
  openChannelAssetType,
  setOpenChannelAssetType,
  isOpeningChannel,
  onOpenChannel,
  onCloseChannel,
  paymentState,
  invoice,
  assetType,
  setAssetType,
  payAmount,
  setPayAmount,
  payTarget,
  setPayTarget,
  onCreateInvoice,
  onPayInvoice,
  onDeselectNode,
  findNodeNameByPubkey,
}: SidePanelProps) {
  const { t } = useI18n();

  if (!isRunning) return null;

  const selectedChannels: ChannelInfo[] = selectedNode ? (channels[selectedNode] || []) : [];

  return (
    <aside className="w-64 bg-[#1e1e1e] border-r border-[#2d2d2d] flex flex-col shrink-0 overflow-y-auto z-10" style={{ scrollbarGutter: 'stable' }}>
      <div className="p-4 flex-1">
        <h3 className="text-xs font-bold text-[#666] tracking-widest mb-3 uppercase">{t('demo.sidebar.networkAction')}</h3>
        
        {!hasNetwork ? (
          <div className="text-center py-8 text-sm text-[#888]">
            {t('demo.sidebar.createNetworkFirst')}
          </div>
        ) : (
          <div className={`transition-opacity duration-300 ${isRunning ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
            <SidePanelContent
              selectedNode={selectedNode}
              selectedChannels={selectedChannels}
              channels={channels}
              nodeStatus={nodeStatus}
              nodeIdMap={nodeIdMap}
              pendingChannels={pendingChannels}
              openChannelTarget={openChannelTarget}
              setOpenChannelTarget={setOpenChannelTarget}
              openChannelAmount={openChannelAmount}
              setOpenChannelAmount={setOpenChannelAmount}
              openChannelAssetType={openChannelAssetType}
              setOpenChannelAssetType={setOpenChannelAssetType}
              isOpeningChannel={isOpeningChannel}
              onOpenChannel={onOpenChannel}
              onCloseChannel={onCloseChannel}
              paymentState={paymentState}
              invoice={invoice}
              assetType={assetType}
              setAssetType={setAssetType}
              payAmount={payAmount}
              setPayAmount={setPayAmount}
              payTarget={payTarget}
              setPayTarget={setPayTarget}
              onCreateInvoice={onCreateInvoice}
              onPayInvoice={onPayInvoice}
              onDeselectNode={onDeselectNode}
              findNodeNameByPubkey={findNodeNameByPubkey}
            />

            {/* 通道状态 */}
            <ChannelStatusSection channels={channels} nodeIdMap={nodeIdMap} pendingChannels={pendingChannels} findNodeNameByPubkey={findNodeNameByPubkey} />
          </div>
        )}
      </div>

      <NodeStatusSection nodeStatus={nodeStatus} />
    </aside>
  );
}

function SidePanelContent({
  selectedNode,
  selectedChannels,
  channels,
  nodeStatus,
  nodeIdMap,
  pendingChannels,
  openChannelTarget,
  setOpenChannelTarget,
  openChannelAmount,
  setOpenChannelAmount,
  openChannelAssetType,
  setOpenChannelAssetType,
  isOpeningChannel,
  onOpenChannel,
  onCloseChannel,
  paymentState,
  invoice,
  assetType,
  setAssetType,
  payAmount,
  setPayAmount,
  payTarget,
  setPayTarget,
  onCreateInvoice,
  onPayInvoice,
  onDeselectNode,
  findNodeNameByPubkey,
}: {
  selectedNode: string | null;
  selectedChannels: ChannelInfo[];
  channels: Record<string, ChannelInfo[]>;
  nodeStatus: Record<string, ApiNodeInfo>;
  nodeIdMap: Record<string, string>;
  pendingChannels: Set<string>;
  openChannelTarget: string;
  setOpenChannelTarget: (target: string) => void;
  openChannelAmount: string;
  setOpenChannelAmount: (amount: string) => void;
  openChannelAssetType: AssetType;
  setOpenChannelAssetType: (type: AssetType) => void;
  isOpeningChannel: boolean;
  onOpenChannel: (fromNode: string, toNode: string, amount: string, assetType: AssetType) => void;
  onCloseChannel: (nodeName: string, channelId: string) => void;
  paymentState: string;
  invoice: string;
  assetType: AssetType;
  setAssetType: (type: AssetType) => void;
  payAmount: number;
  setPayAmount: (amount: number) => void;
  payTarget: string;
  setPayTarget: (target: string) => void;
  onCreateInvoice: () => void;
  onPayInvoice: () => void;
  onDeselectNode: () => void;
  findNodeNameByPubkey: (pubkey: string) => string;
}) {
  const { t } = useI18n();

  if (!selectedNode) {
    return (
      <div className="text-center py-8 text-sm text-[#666]">
        <div className="mb-2 text-[#444]">
          <Link className="w-8 h-8 mx-auto mb-3 opacity-40" />
        </div>
        {t('demo.sidebar.selectNodeHint')}
      </div>
    );
  }

  const others = FIBER_NODES.filter(n => n !== selectedNode);
  const defaultTarget = others[0] || '';

  return (
    <div className="space-y-3">
      {/* 节点标题 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-blue-400" />
          <span className="text-white font-semibold capitalize">{selectedNode}</span>
        </div>
        <button onClick={onDeselectNode} className="text-[#666] hover:text-white">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 建立通道 */}
      <OpenChannelSection
        selectedNode={selectedNode}
        others={others}
        openChannelTarget={openChannelTarget || defaultTarget}
        setOpenChannelTarget={setOpenChannelTarget}
        openChannelAmount={openChannelAmount}
        setOpenChannelAmount={setOpenChannelAmount}
        openChannelAssetType={openChannelAssetType}
        setOpenChannelAssetType={setOpenChannelAssetType}
        isOpeningChannel={isOpeningChannel}
        pendingChannels={pendingChannels}
        onOpenChannel={onOpenChannel}
      />

      {/* 关闭通道 */}
      {selectedChannels.length > 0 && (
        <CloseChannelSection
          selectedNode={selectedNode}
          channels={selectedChannels}
          onCloseChannel={onCloseChannel}
          findNodeNameByPubkey={findNodeNameByPubkey}
        />
      )}

      {/* 发起支付 */}
      <PaymentSection
        selectedNode={selectedNode}
        others={others}
        paymentState={paymentState}
        invoice={invoice}
        assetType={assetType}
        setAssetType={setAssetType}
        payAmount={payAmount}
        setPayAmount={setPayAmount}
        payTarget={payTarget}
        setPayTarget={setPayTarget}
        onCreateInvoice={onCreateInvoice}
        onPayInvoice={onPayInvoice}
      />
    </div>
  );
}

// 继续下一部分...

function OpenChannelSection({
  selectedNode,
  others,
  openChannelTarget,
  setOpenChannelTarget,
  openChannelAmount,
  setOpenChannelAmount,
  openChannelAssetType,
  setOpenChannelAssetType,
  isOpeningChannel,
  pendingChannels,
  onOpenChannel,
}: {
  selectedNode: string;
  others: string[];
  openChannelTarget: string;
  setOpenChannelTarget: (target: string) => void;
  openChannelAmount: string;
  setOpenChannelAmount: (amount: string) => void;
  openChannelAssetType: AssetType;
  setOpenChannelAssetType: (type: AssetType) => void;
  isOpeningChannel: boolean;
  pendingChannels: Set<string>;
  onOpenChannel: (fromNode: string, toNode: string, amount: string, assetType: AssetType) => void;
}) {
  const { t } = useI18n();

  return (
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
      </div>
      <button
        onClick={() => openChannelTarget && !isOpeningChannel && !pendingChannels.has(`${selectedNode.toLowerCase()}-${openChannelTarget.toLowerCase()}`) && onOpenChannel(selectedNode, openChannelTarget, openChannelAmount, openChannelAssetType)}
        disabled={!openChannelTarget || isOpeningChannel || pendingChannels.has(`${selectedNode.toLowerCase()}-${openChannelTarget.toLowerCase()}`)}
        className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs rounded transition-colors flex items-center justify-center gap-1.5"
      >
        {pendingChannels.has(`${selectedNode.toLowerCase()}-${openChannelTarget.toLowerCase()}`) ? (
          <><RefreshCw className="w-3 h-3 animate-spin" /> {t('channel.open.confirming')}</>
        ) : isOpeningChannel ? (
          <><RefreshCw className="w-3 h-3 animate-spin" /> {t('channel.open.opening')}</>
        ) : (
          <>{t('channel.open.button')} ({selectedNode} → {openChannelTarget || '?'}) [{openChannelAssetType}]</>
        )}
      </button>
    </div>
  );
}

function CloseChannelSection({
  selectedNode,
  channels,
  onCloseChannel,
  findNodeNameByPubkey,
}: {
  selectedNode: string;
  channels: ChannelInfo[];
  onCloseChannel: (nodeName: string, channelId: string) => void;
  findNodeNameByPubkey: (pubkey: string) => string;
}) {
  const { t } = useI18n();

  return (
    <div className="bg-[#252526] p-3 rounded-lg border border-[#3e3e42]">
      <label className="text-xs text-[#888] block mb-2 flex items-center gap-1">
        <Unlink className="w-3 h-3" /> {t('channel.close.title')} <span className="text-[9px] text-[#555]">({t('channel.close.hint')})</span>
      </label>
      <div className="space-y-2">
        {channels.map((ch, i) => {
          const peerName = ch.pubkey ? findNodeNameByPubkey(ch.pubkey) : '?';
          const isUdtChannel = !!ch.funding_udt_type_script;
          const assetSymbol = isUdtChannel ? t('channel.asset.udt') : t('channel.asset.ckb');
          const divisor = isUdtChannel ? 1 : 1e8;
          const localBal = Math.floor(Number(ch.local_balance || 0) / divisor);
          const remoteBal = Math.floor(Number(ch.remote_balance || 0) / divisor);
          const totalBal = localBal + remoteBal;
          const stateName = ch.state?.state_name || 'Unknown';
          const isReady = stateName === 'ChannelReady';
          // 使用 channel_id + 索引确保 key 唯一，避免同一 peer 的多条通道冲突
          const uniqueKey = ch.channel_id ? `${ch.channel_id}-${i}` : `channel-${i}`;
          
          return (
            <div key={uniqueKey} className="bg-[#1e1e1e] rounded px-2 py-2 border border-[#2d2d2d]">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5 text-[11px]">
                  <span className={`font-medium ${isUdtChannel ? 'text-purple-400' : 'text-orange-400'}`}>{assetSymbol}</span>
                  <span className="text-[#666]">→</span>
                  <span className="text-white capitalize font-medium">{peerName}</span>
                </div>
                <span className={`text-[9px] px-1.5 py-0.5 rounded truncate max-w-[100px] ${isReady ? 'bg-green-900/30 text-green-400' : 'bg-yellow-900/30 text-yellow-400'}`}>
                  {isReady ? t('channel.status.ready') : stateName}
                </span>
              </div>
              {ch.channel_id && (
                <div className="text-[9px] text-[#555] mb-2 font-mono break-all" title={ch.channel_id}>
                  ID: {ch.channel_id}
                </div>
              )}
              <div className="mb-2">
                <div className="text-[9px] text-[#666] mb-1 flex items-center gap-1">
                  <Zap className="w-3 h-3" /> {t('channel.close.title')} (L2)
                </div>
                <div className="flex justify-between text-[9px] text-[#666] mb-1">
                  <span>{t('channel.close.totalLocked')}</span>
                  <span className="text-[#888]">{totalBal.toLocaleString()} {assetSymbol}</span>
                </div>
                <div className="h-4 bg-[#252526] rounded overflow-hidden flex">
                  {totalBal > 0 && (
                    <>
                      <div className="h-full bg-blue-600 flex items-center justify-center text-[8px] text-white" style={{ width: `${(localBal / totalBal) * 100}%` }}>
                        {localBal > totalBal * 0.15 && `${localBal}`}
                      </div>
                      <div className="h-full bg-purple-600 flex items-center justify-center text-[8px] text-white" style={{ width: `${(remoteBal / totalBal) * 100}%` }}>
                        {remoteBal > totalBal * 0.15 && `${remoteBal}`}
                      </div>
                    </>
                  )}
                </div>
              </div>
              <button
                onClick={() => ch.channel_id && onCloseChannel(selectedNode, ch.channel_id)}
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
  );
}

function PaymentSection({
  selectedNode,
  others,
  paymentState,
  invoice,
  assetType,
  setAssetType,
  payAmount,
  setPayAmount,
  payTarget,
  setPayTarget,
  onCreateInvoice,
  onPayInvoice,
}: {
  selectedNode: string;
  others: string[];
  paymentState: string;
  invoice: string;
  assetType: AssetType;
  setAssetType: (type: AssetType) => void;
  payAmount: number;
  setPayAmount: (amount: number) => void;
  payTarget: string;
  setPayTarget: (target: string) => void;
  onCreateInvoice: () => void;
  onPayInvoice: () => void;
}) {
  const { t } = useI18n();

  return (
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
              onClick={() => { setPayTarget(n); }}
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
          onClick={onCreateInvoice}
          disabled={paymentState !== 'idle' || !payTarget}
          className="w-full py-1.5 bg-[#2d2d2d] hover:bg-[#3e3e42] disabled:opacity-40 text-white text-xs rounded border border-[#3e3e42] flex items-center justify-center gap-1.5"
        >
          <Store className="w-3 h-3 text-green-400" />
          {t('payment.createInvoice')} ({payTarget || t('payment.selectTarget')})
        </button>
        <button
          onClick={onPayInvoice}
          disabled={paymentState !== 'created'}
          className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:bg-[#2d2d2d] text-white text-xs rounded flex items-center justify-center gap-1.5 transition-colors"
        >
          {paymentState === 'paying' ? <Activity className="w-3 h-3 animate-pulse" /> : <Zap className="w-3 h-3" />}
          {paymentState === 'paying' ? t('payment.paying') : paymentState === 'success' ? t('payment.success') : t('payment.pay')}
        </button>
      </div>
    </div>
  );
}

function ChannelStatusSection({
  channels,
  nodeIdMap,
  pendingChannels,
  findNodeNameByPubkey,
}: {
  channels: Record<string, ChannelInfo[]>;
  nodeIdMap: Record<string, string>;
  pendingChannels: Set<string>;
  findNodeNameByPubkey: (pubkey: string) => string;
}) {
  const { t } = useI18n();

  return (
    <div className="mt-3 bg-[#252526] p-3 rounded-lg border border-[#3e3e42]">
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs text-[#888]">{t('demo.sidebar.channelStatus')}</label>
      </div>
      {FIBER_NODES.map(name => {
        const chs = channels[name] || [];
        const totalChannels = chs.length;
        return (
          <div key={name} className="mb-2 last:mb-0">
            <div className="flex justify-between text-[10px] py-0.5 mb-1">
              <span className="text-[#aaa] font-medium capitalize">{name}</span>
              <span className={totalChannels > 0 ? 'text-blue-400' : 'text-gray-500'}>
                {totalChannels} {t('demo.sidebar.channels')}
              </span>
            </div>
            {chs.length > 0 && (
              <div className="space-y-1 pl-2 border-l border-[#3e3e42] ml-1">
                {chs.map((ch, idx) => {
                  const peerName = ch.pubkey ? findNodeNameByPubkey(ch.pubkey) : '未知';
                  const isUdt = !!ch.funding_udt_type_script;
                  const stateName = ch.state?.state_name || 'Unknown';
                  const isReady = stateName === 'ChannelReady';
                  const channelKey = `${name.toLowerCase()}-${peerName.toLowerCase()}`;
                  const isPending = pendingChannels.has(channelKey);
                  
                  return (
                    <div key={ch.channel_id || idx} className="flex items-center gap-1.5 text-[9px] py-0.5">
                      <span className={`px-1.5 py-0.5 rounded ${isUdt ? 'bg-purple-500/20 text-purple-400' : 'bg-orange-500/20 text-orange-400'}`}>
                        {isUdt ? t('channel.asset.udt') : t('channel.asset.ckb')}
                      </span>
                      <span className="text-[#888]">→</span>
                      <span className="text-[#ccc] capitalize">{peerName}</span>
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
  );
}

function NodeStatusSection({ nodeStatus }: { nodeStatus: Record<string, ApiNodeInfo> }) {
  const { t } = useI18n();

  return (
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
  );
}
