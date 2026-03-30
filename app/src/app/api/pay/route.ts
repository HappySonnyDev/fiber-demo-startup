import { NextResponse } from 'next/server';
import { payInvoiceWithTrace, NODES } from '@/lib/fiber-client';

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

    const { result, trace } = await payInvoiceWithTrace(nodeName, { invoice });

    if (trace.error) {
      return NextResponse.json(
        { error: trace.error, rpcTrace: [trace] },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      node: nodeName,
      result,
      rpcTrace: [trace],
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
