/**
 * RPC Inspector 组件
 */

import React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { RpcTraceEntry, RpcTrace } from '@/types';
import { RPC_SCHEMA, getLocalizedText } from '@/lib/fiber-rpc-schema';
import { useI18n } from '@/lib/i18n';

interface RpcInspectorProps {
  rpcHistory: RpcTraceEntry[];
  selectedRpcEntry: string | null;
  expandedTraces: Record<string, boolean>;
  onSelectEntry: (id: string) => void;
  onToggleTrace: (traceKey: string) => void;
}

export function RpcInspector({
  rpcHistory,
  selectedRpcEntry,
  expandedTraces,
  onSelectEntry,
  onToggleTrace,
}: RpcInspectorProps) {
  const { t } = useI18n();

  if (rpcHistory.length === 0) {
    return (
      <div className="p-4 text-[#555] text-center">
        <div className="text-xl mb-1 opacity-30">⬡</div>
        {t('output.rpcHint')}
      </div>
    );
  }

  return (
    <>
      {/* 操作历史列表 */}
      <div className="border-b border-[#2d2d2d] overflow-y-auto shrink-0" style={{ maxHeight: '35%' }}>
        {rpcHistory.map(entry => (
          <button
            key={entry.id}
            onClick={() => onSelectEntry(entry.id)}
            className={`w-full text-left px-3 py-2 border-b border-[#252526] hover:bg-[#252526] transition-colors ${selectedRpcEntry === entry.id ? 'bg-[#252526] border-l-2 border-l-blue-500' : ''}`}
          >
            <div className="flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${entry.status === 'success' ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-white text-[11px] truncate flex-1">{entry.operation}</span>
              <span className="text-[#555] text-[10px] shrink-0">{entry.timestamp}</span>
              <span className="text-[#555] text-[10px] shrink-0">{entry.traces.length}×</span>
            </div>
          </button>
        ))}
      </div>

      {/* 调用详情 */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {!selectedRpcEntry ? (
          <div className="text-[#555] text-center pt-6">↑ {t('output.clickToView')}</div>
        ) : (
          (() => {
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
                    onClick={() => onToggleTrace(traceKey)}
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
                    <TraceDetail trace={trace} methodSchema={methodSchema} />
                  )}
                </div>
              );
            });
          })()
        )}
      </div>
    </>
  );
}

function TraceDetail({ trace, methodSchema }: { trace: RpcTrace; methodSchema?: typeof RPC_SCHEMA[string] }) {
  const { t, lang } = useI18n();

  return (
    <div className="px-3 pb-3 space-y-2">
      {methodSchema && (
        <div className="text-[10px] text-[#888] bg-[#1e1e1e] rounded px-2 py-1.5 border border-[#2d2d2d]">
          {getLocalizedText(methodSchema.description, lang)}
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
        <FieldTable title={t('output.paramDesc')} fields={methodSchema.params} lang={lang} />
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
        <FieldTable title={t('output.returnDesc')} fields={methodSchema.returns} lang={lang} />
      )}
    </div>
  );
}

function FieldTable({ title, fields, lang }: { title: string; fields: import('@/lib/fiber-rpc-schema').RpcFieldDef[]; lang: 'zh' | 'en' }) {
  return (
    <div className="border border-[#2d2d2d] rounded overflow-hidden">
      <div className="text-[9px] text-[#666] px-2 py-1 bg-[#1a1a1a] border-b border-[#2d2d2d] font-bold uppercase tracking-wider">{title}</div>
      {fields.map(f => (
        <div key={f.field} className="flex gap-2 px-2 py-1 text-[10px] border-b border-[#1e1e1e] last:border-0">
          <span className="text-purple-400 shrink-0 w-28 font-mono truncate" title={f.field}>{f.field}</span>
          <span className="text-orange-300 shrink-0 w-16 opacity-70 truncate">{f.type}</span>
          <span className={`shrink-0 text-[9px] w-12 ${f.required ? 'text-red-400' : 'text-[#555]'}`}>{f.required ? 'required' : 'optional'}</span>
          <span className="text-[#888] flex-1 leading-relaxed">{getLocalizedText(f.desc, lang)}</span>
        </div>
      ))}
    </div>
  );
}
