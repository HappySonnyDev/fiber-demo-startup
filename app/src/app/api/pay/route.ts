import { NextResponse } from 'next/server';
import { payInvoice, NODES } from '@/lib/fiber-client';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nodeName = 'alice', invoice } = body;

    if (!invoice) {
      return NextResponse.json(
        { error: 'Missing required field: invoice' },
        { status: 400 }
      );
    }

    const node = NODES[nodeName];
    if (!node) {
      return NextResponse.json(
        { error: `Unknown node: ${nodeName}` },
        { status: 400 }
      );
    }

    const result = await payInvoice(nodeName, { invoice });

    return NextResponse.json({
      success: true,
      node: nodeName,
      result,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
