import { NextResponse } from 'next/server';
import { getAllChannels, NODES } from '@/lib/fiber-client';

export async function GET() {
  try {
    const allChannels = await getAllChannels();

    const response = Object.keys(NODES).map((name) => {
      const node = NODES[name];
      const channelData = allChannels[name];

      return {
        name: node.name,
        role: node.role,
        channels: channelData?.channels || [],
        error: channelData?.error || null,
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
