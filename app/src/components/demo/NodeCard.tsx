/**
 * 节点卡片组件
 */

import React from 'react';
import { Box, Zap, Link } from 'lucide-react';
import type { Node, ApiNodeInfo, ChannelInfo, ColorType } from '@/types';
import { COLORS } from '@/constants';
import { useI18n } from '@/lib/i18n';

interface NodeCardProps {
  nodeKey: string;
  node: Node;
  isRunning: boolean;
  isSelected: boolean;
  nodeStatus: Record<string, ApiNodeInfo>;
  channels: Record<string, ChannelInfo[]>;
  onSelect: (key: string) => void;
}

export function NodeCard({
  nodeKey,
  node,
  isRunning,
  isSelected,
  nodeStatus,
  channels,
  onSelect,
}: NodeCardProps) {
  const { t } = useI18n();
  const nodeColor = COLORS[node.color as ColorType];
  const isNodeOnline = node.isOnline ?? isRunning;
  const isFiberNode = node.type !== 'l1';

  return (
    <div 
      onClick={() => {
        if (!isFiberNode || !isRunning) return;
        onSelect(nodeKey);
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
}
