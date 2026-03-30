import { NextResponse } from 'next/server';
import {
  connectPeerWithTrace,
  openChannelWithTrace,
  getNodeP2PAddress,
  NODES,
  type RpcTrace,
} from '@/lib/fiber-client';

export async function POST(request: Request) {
  const traces: RpcTrace[] = [];

  try {
    const body = await request.json();
    const { fromNode, toNode, fundingAmount, assetType = 'CKB' } = body;

    if (!fromNode || !toNode || !fundingAmount) {
      return NextResponse.json(
        { error: 'Missing required fields: fromNode, toNode, fundingAmount' },
        { status: 400 }
      );
    }

    const targetNode = NODES[toNode];
    if (!targetNode) {
      return NextResponse.json(
        { error: `Unknown target node: ${toNode}` },
        { status: 400 }
      );
    }

    // Step 1: 获取目标节点 P2P 地址
    const p2pAddress = await getNodeP2PAddress(toNode);
    if (!p2pAddress) {
      return NextResponse.json(
        { error: 'Could not get P2P address from target node' },
        { status: 500 }
      );
    }

    // Step 2: connect_peer（确保 P2P 已连接）
    try {
      const { trace: connectTrace } = await connectPeerWithTrace(fromNode, { address: p2pAddress });
      traces.push(connectTrace);
      // 等待握手完成
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch {
      // 可能已经连接，忽略错误继续
    }

    // 从 P2P 地址提取 Peer ID
    const peerIdMatch = p2pAddress.match(/p2p\/(.+)$/);
    const peerId = peerIdMatch ? peerIdMatch[1] : p2pAddress;

    // Step 3: open_channel
    const { result, trace: openTrace } = await openChannelWithTrace(fromNode, {
      peerId,
      fundingAmount: fundingAmount.toString(),
      assetType: assetType as 'CKB' | 'UDT',
    });
    traces.push(openTrace);

    if (openTrace.error) {
      throw new Error(openTrace.error);
    }

    return NextResponse.json({
      success: true,
      fromNode,
      toNode,
      peerId,
      assetType,
      result,
      rpcTrace: traces,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        rpcTrace: traces,
      },
      { status: 500 }
    );
  }
}
