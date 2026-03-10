import { NextResponse } from 'next/server';
import { createInvoice, NODES } from '@/lib/fiber-client';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nodeName = 'charlie', amount, description = 'B端订单', expiry = 3600 } = body;

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

    // 金额转换为 shannon (1 CKB = 10^8 shannon)
    const amountInShannon = (parseFloat(amount) * 100000000).toString();

    const result = await createInvoice(nodeName, {
      amount: amountInShannon,
      description,
      expiry,
    });

    // Fiber new_invoice 返回 { invoice_address: "fibd...", invoice: {...} }
    // 我们返回 invoice_address 作为支付用的字符串
    return NextResponse.json({
      success: true,
      node: nodeName,
      invoice: result.invoice_address || result,
      amount,
      description,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
