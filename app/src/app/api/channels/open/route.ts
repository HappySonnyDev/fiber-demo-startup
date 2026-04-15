import { NextResponse } from 'next/server';
import {
  connectPeerWithTrace,
  openChannelWithTrace,
  getNodeInfo,
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

    // Step 1: 获取目标节点公钥
    const targetNodeInfo = await getNodeInfo(toNode);
    const pubkey = (targetNodeInfo as { pubkey?: string }).pubkey;
    if (!pubkey) {
      return NextResponse.json(
        { error: 'Could not get pubkey from target node' },
        { status: 500 }
      );
    }

    // Step 2: connect_peer（确保 P2P 已连接）
    try {
      const { trace: connectTrace } = await connectPeerWithTrace(fromNode, { pubkey });
      traces.push(connectTrace);
      // 等待握手完成
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch {
      // 可能已经连接，忽略错误继续
    }

    // Step 3: open_channel
    const { result, trace: openTrace } = await openChannelWithTrace(fromNode, {
      pubkey,
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
      pubkey,
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
