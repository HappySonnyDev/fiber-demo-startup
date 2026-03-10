import { NextResponse } from 'next/server';
import { openChannel, connectPeer, getNodeP2PAddress, NODES } from '@/lib/fiber-client';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { fromNode, toNode, fundingAmount } = body;

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

    // 获取目标节点的 P2P 地址
    const p2pAddress = await getNodeP2PAddress(toNode);
    if (!p2pAddress) {
      return NextResponse.json(
        { error: 'Could not get P2P address from target node' },
        { status: 500 }
      );
    }

    // 先自动 connect_peer，确保 P2P 已连接（已连则忽略错误）
    try {
      await connectPeer(fromNode, { address: p2pAddress });
      // 等待握手完成
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch {
      // 可能已经连接，忽略错误继续
    }

    // 从 P2P 地址中提取 Peer ID
    // 格式: /dns4/fiber-node2/tcp/8228/p2p/Qmcb7wrGe9QxzTpipFCRJc4fMhfr8mogPGao7EsjeVzEmP
    const peerIdMatch = p2pAddress.match(/p2p\/(.+)$/);
    const peerId = peerIdMatch ? peerIdMatch[1] : p2pAddress;

    const result = await openChannel(fromNode, {
      peerId,
      fundingAmount: fundingAmount.toString(),
    });

    return NextResponse.json({
      success: true,
      fromNode,
      toNode,
      peerId,
      result,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
