import { NextResponse } from 'next/server';
import { closeChannelWithTrace } from '@/lib/fiber-client';

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

    const { result, trace } = await closeChannelWithTrace(nodeName, channelId);

    if (trace.error) {
      return NextResponse.json(
        { error: trace.error, rpcTrace: [trace] },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, result, rpcTrace: [trace] });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
