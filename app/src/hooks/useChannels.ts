/**
 * 通道状态管理 Hook
 */

import { useState, useCallback } from 'react';
import type { ChannelInfo, ChannelLineInfo } from '@/types';

export function useChannels() {
  const [channels, setChannels] = useState<Record<string, ChannelInfo[]>>({});

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

  // 获取两节点之间的所有通道信息（支持同一对节点间的多条通道）
  const getChannelsBetween = useCallback((nodeA: string, nodeB: string, nodeIdMap: Record<string, string>): ChannelLineInfo[] => {
    const aChannels = channels[nodeA] || [];
    const bChannels = channels[nodeB] || [];
    if (aChannels.length === 0 || bChannels.length === 0) return [];

    const bId = nodeIdMap[nodeB];
    const aId = nodeIdMap[nodeA];
    
    // 从 A 的通道中找所有与 B 的通道
    const results: ChannelLineInfo[] = [];
    const seenChannelIds = new Set<string>();
    
    if (bId) {
      aChannels.forEach(ch => {
        if (ch.peer_id === bId && ch.channel_id && !seenChannelIds.has(ch.channel_id)) {
          seenChannelIds.add(ch.channel_id);
          const isUdt = !!ch.funding_udt_type_script;
          const stateName = ch.state?.state_name;
          const isReady = stateName === 'CHANNEL_READY';
          results.push({ hasChannel: true, isUdt, isReady });
        }
      });
    }
    
    // 从 B 的通道中找所有与 A 的通道
    if (aId) {
      bChannels.forEach(ch => {
        if (ch.peer_id === aId && ch.channel_id && !seenChannelIds.has(ch.channel_id)) {
          seenChannelIds.add(ch.channel_id);
          const isUdt = !!ch.funding_udt_type_script;
          const stateName = ch.state?.state_name;
          const isReady = stateName === 'CHANNEL_READY';
          results.push({ hasChannel: true, isUdt, isReady });
        }
      });
    }
    
    return results;
  }, [channels]);

  // 兼容旧接口：获取两节点之间的通道信息（返回第一条）
  const getChannelInfoBetween = useCallback((nodeA: string, nodeB: string, nodeIdMap: Record<string, string>): ChannelLineInfo => {
    const allChannels = getChannelsBetween(nodeA, nodeB, nodeIdMap);
    return allChannels[0] || { hasChannel: false, isUdt: false, isReady: false };
  }, [getChannelsBetween]);

  return {
    channels,
    setChannels,
    fetchChannels,
    getChannelInfoBetween,
    getChannelsBetween,
  };
}
