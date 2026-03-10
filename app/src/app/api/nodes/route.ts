import { NextResponse } from 'next/server';
import { getAllNodesInfo, checkAllNodesHealth, getAllOnChainBalances, NODES } from '@/lib/fiber-client';

export async function GET() {
  try {
    const [nodesInfo, healthStatus, balances] = await Promise.all([
      getAllNodesInfo(),
      checkAllNodesHealth(),
      getAllOnChainBalances(),
    ]);

    const response = Object.keys(NODES).map((name) => {
      const node = NODES[name];
      const info = nodesInfo[name];
      const isOnline = healthStatus[name];
      const ckbShannon = balances[name] ?? BigInt(0);
      // shannon → CKB (1 CKB = 10^8 shannon)
      const ckbBalance = Number(ckbShannon / BigInt(100000000));

      return {
        name: node.name,
        role: node.role,
        rpcUrl: node.rpcUrl,
        isOnline,
        ckbBalance,
        info: info?.info || null,
        error: info?.error || null,
      };
    });

    return NextResponse.json({ nodes: response });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
