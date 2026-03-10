import { NextResponse } from 'next/server';
import { connectPeer, getNodeP2PAddress, NODES } from '@/lib/fiber-client';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { fromNode, toNode } = body;

    if (!fromNode || !toNode) {
      return NextResponse.json(
        { error: 'Missing required fields: fromNode, toNode' },
        { status: 400 }
      );
    }

    // 获取目标节点的 P2P 地址
    const targetAddress = await getNodeP2PAddress(toNode);
    if (!targetAddress) {
      return NextResponse.json(
        { error: `Could not get P2P address for node: ${toNode}` },
        { status: 500 }
      );
    }

    const result = await connectPeer(fromNode, { address: targetAddress });

    return NextResponse.json({
      success: true,
      fromNode,
      toNode,
      address: targetAddress,
      result,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
