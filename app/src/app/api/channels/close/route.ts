import { NextResponse } from 'next/server';
import { closeChannel } from '@/lib/fiber-client';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nodeName, channelId } = body;

    if (!nodeName || !channelId) {
      return NextResponse.json(
        { error: 'Missing required fields: nodeName, channelId' },
        { status: 400 }
      );
    }

    const result = await closeChannel(nodeName, channelId);

    return NextResponse.json({ success: true, result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
