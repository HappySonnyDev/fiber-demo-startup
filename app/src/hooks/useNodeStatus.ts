/**
 * 节点状态管理 Hook
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import type { ApiNodeInfo } from '@/types';
import { POLL_INTERVAL } from '@/constants';

export function useNodeStatus() {
  const [nodeStatus, setNodeStatus] = useState<Record<string, ApiNodeInfo>>({});
  const [nodeIdMap, setNodeIdMap] = useState<Record<string, string>>({});
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

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

        // 提取 pubkey (v0.8.0+)
        const idMap: Record<string, string> = {};
        data.nodes.forEach((node: ApiNodeInfo) => {
          const info = node.info as Record<string, unknown> | null;
          if (info) {
            // 优先使用 pubkey 字段 (v0.8.0+)
            const pubkey = (info['pubkey'] || info['public_key'] || '') as string;
            if (pubkey) idMap[node.name] = pubkey;
          }
        });
        if (Object.keys(idMap).length > 0) {
          setNodeIdMap(idMap);
        }
      }
    } catch (error) {
      console.error('Failed to fetch node status:', error);
    }
  }, []);

  const startPolling = useCallback(() => {
    if (pollIntervalRef.current) return;
    pollIntervalRef.current = setInterval(fetchNodeStatus, POLL_INTERVAL);
  }, [fetchNodeStatus]);

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  return {
    nodeStatus,
    nodeIdMap,
    fetchNodeStatus,
    startPolling,
    stopPolling,
  };
}
