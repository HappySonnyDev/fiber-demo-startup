/**
 * 输出面板组件
 */

import React, { useEffect } from 'react';
import { RpcInspector } from './RpcInspector';
import type { LogEntry, RpcTraceEntry } from '@/types';
import { useI18n } from '@/lib/i18n';

interface OutputPanelProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  
  // Output tab
  logs: LogEntry[];
  isClient: boolean;
  logsEndRef: React.RefObject<HTMLDivElement | null>;
  
  // RPC Inspector tab
  rpcHistory: RpcTraceEntry[];
  selectedRpcEntry: string | null;
  expandedTraces: Record<string, boolean>;
  onSelectRpcEntry: (id: string) => void;
  onToggleTrace: (traceKey: string) => void;
}

export function OutputPanel({
  activeTab,
  setActiveTab,
  logs,
  isClient,
  logsEndRef,
  rpcHistory,
  selectedRpcEntry,
  expandedTraces,
  onSelectRpcEntry,
  onToggleTrace,
}: OutputPanelProps) {
  const { t } = useI18n();

  // 滚动到最新日志
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs, activeTab, logsEndRef]);

  return (
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
                  <LogLine key={i} log={log} />
                ))
              )}
              <div ref={logsEndRef} />
            </div>
          </div>
        )}

        {activeTab === 'RPC Inspector' && (
          <div className="h-full flex flex-col font-mono text-xs">
            <RpcInspector
              rpcHistory={rpcHistory}
              selectedRpcEntry={selectedRpcEntry}
              expandedTraces={expandedTraces}
              onSelectEntry={onSelectRpcEntry}
              onToggleTrace={onToggleTrace}
            />
          </div>
        )}
      </div>
    </aside>
  );
}

function LogLine({ log }: { log: LogEntry }) {
  const { t } = useI18n();

  return (
    <div className="flex hover:bg-[#252526] px-1 py-0.5 rounded -mx-1 transition-all">
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
  );
}
