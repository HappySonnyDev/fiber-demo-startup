import { NextResponse } from 'next/server';
import { createInvoiceWithTrace, NODES } from '@/lib/fiber-client';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nodeName = 'charlie', amount, description = 'B端订单', expiry = 3600, assetType = 'CKB' } = body;

    if (!amount) {
      return NextResponse.json(
        { error: 'Missing required field: amount' },
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

    // 金额转换：CKB 转换为 shannon (1 CKB = 10^8 shannon)，UDT 直接使用
    const amountInBaseUnit = assetType === 'CKB'
      ? (parseFloat(amount) * 100000000).toString()
      : amount.toString();

    const { result, trace } = await createInvoiceWithTrace(nodeName, {
      amount: amountInBaseUnit,
      description,
      expiry,
      assetType: assetType as 'CKB' | 'UDT',
    });

    if (trace.error) {
      return NextResponse.json(
        { error: trace.error, rpcTrace: [trace] },
        { status: 500 }
      );
    }

    const typedResult = result as { invoice_address?: string } | null;

    return NextResponse.json({
      success: true,
      node: nodeName,
      invoice: typedResult?.invoice_address || result,
      amount,
      assetType,
      description,
      rpcTrace: [trace],
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
