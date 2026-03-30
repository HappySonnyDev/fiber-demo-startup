/**
 * 日志管理 Hook
 */

import { useState, useRef, useCallback, useSyncExternalStore } from 'react';
import type { LogEntry, RpcTrace, RpcTraceEntry } from '@/types';

// 空订阅，用于 useSyncExternalStore
const emptySubscribe = () => () => {};

function getInitialLogs(): LogEntry[] {
  if (typeof window === 'undefined') return [];
  const now = new Date().toTimeString().split(' ')[0];
  return [{ time: now, type: 'sys', node: 'System', method: 'init', payload: 'Fiber Network UI initialized' }];
}

export function useLogs() {
  const isClient = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
  const [logs, setLogs] = useState<LogEntry[]>(getInitialLogs);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const addLog = useCallback((type: string, node: string, method: string, payload: string | Record<string, unknown>) => {
    const time = new Date().toTimeString().split(' ')[0];
    setLogs(prev => [...prev, { time, type, node, method, payload }]);
  }, []);

  return {
    logs,
    isClient,
    logsEndRef,
    addLog,
  };
}

export function useRpcHistory() {
  const [rpcHistory, setRpcHistory] = useState<RpcTraceEntry[]>([]);
  const [selectedRpcEntry, setSelectedRpcEntry] = useState<string | null>(null);
  const [expandedTraces, setExpandedTraces] = useState<Record<string, boolean>>({});

  const addRpcEntry = useCallback((operation: string, traces: RpcTrace[], status: 'success' | 'error') => {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const timestamp = new Date().toTimeString().split(' ')[0];
    const entry: RpcTraceEntry = { id, timestamp, operation, traces, status };
    setRpcHistory(prev => [entry, ...prev].slice(0, 50));
    setSelectedRpcEntry(id);
    // 默认展开第一个 trace
    if (traces.length > 0) {
      setExpandedTraces(prev => ({ ...prev, [`${id}-0`]: true }));
    }
  }, []);

  const toggleTrace = useCallback((traceKey: string) => {
    setExpandedTraces(prev => ({ ...prev, [traceKey]: !prev[traceKey] }));
  }, []);

  return {
    rpcHistory,
    selectedRpcEntry,
    expandedTraces,
    setSelectedRpcEntry,
    addRpcEntry,
    toggleTrace,
  };
}
