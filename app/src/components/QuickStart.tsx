'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Highlight, themes } from 'prism-react-renderer';
import { 
  Zap, Play, Check, RefreshCw, Copy, CheckCircle, 
  ChevronRight, ChevronDown, Terminal, ArrowRight
} from 'lucide-react';
import type { RpcTrace } from '@/lib/fiber-client';
import { useI18n } from '@/lib/i18n';

type QuickStartStep = 1 | 2 | 3;

interface StepStatus {
  completed: boolean;
  inProgress: boolean;
  waiting?: boolean; // 等待通道就绪
  rpcTrace?: RpcTrace[];
}

interface QuickStartProps {
  onBack: () => void;
}

const SDK_EXAMPLES = {
  step1: {
    title: 'Step 1: P2P 连接',
    subtitle: '让 Alice 连接 Bob 的 P2P 网络',
    code: `import { connectPeer, getNodeP2PAddress } from '@/lib/fiber-client';

// 1. 获取 Bob 的 P2P 地址
const bobAddress = await getNodeP2PAddress('bob');
// 返回: "/dns4/node2/tcp/10002/p2p/QmXxx..."

// 2. Alice 连接 Bob
await connectPeer('alice', { address: bobAddress });
// RPC: connect_peer { address: "..." }`,
  },
  step2: {
    title: 'Step 2: 建立通道',
    subtitle: 'Alice 向 Bob 开启支付通道（100 CKB）',
    code: `import { openChannel, getNodeP2PAddress } from '@/lib/fiber-client';

// 1. 获取 Bob 的 Peer ID
const bobAddress = await getNodeP2PAddress('bob');
const peerId = bobAddress.split('/p2p/')[1];

// 2. Alice 开启通道（100 CKB = 10^10 shannon）
const result = await openChannel('alice', {
  peerId,
  fundingAmount: '10000000000',
  assetType: 'CKB'
});
// 返回: { channel_id: "0x..." }`,
  },
  step3: {
    title: 'Step 3: 链下支付',
    subtitle: 'Alice 向 Bob 发送 10 CKB',
    code: `import { createInvoice, payInvoice } from '@/lib/fiber-client';

// 1. Bob 生成发票（收款方）
const invoiceResult = await createInvoice('bob', {
  amount: '1000000000', // 10 CKB
  description: 'Quick Start Demo',
  assetType: 'CKB'
});
const invoice = invoiceResult.invoice_address;

// 2. Alice 支付（付款方）
await payInvoice('alice', { invoice });
// 支付成功！余额实时更新`,
  },
};

// 自定义代码主题 - GitHub Dark 风格
const customTheme = {
  plain: {
    color: '#e6edf3',
    backgroundColor: '#0d1117',
  },
  styles: [
    { types: ['comment'], style: { color: '#8b949e', fontStyle: 'italic' as const } },
    { types: ['string'], style: { color: '#a5d6ff' } },
    { types: ['keyword'], style: { color: '#ff7b72' } },
    { types: ['function'], style: { color: '#d2a8ff' } },
    { types: ['number'], style: { color: '#79c0ff' } },
    { types: ['operator'], style: { color: '#79c0ff' } },
    { types: ['punctuation'], style: { color: '#8b949e' } },
    { types: ['constant'], style: { color: '#79c0ff' } },
    { types: ['import'], style: { color: '#ff7b72' } },
  ],
};

function CodeBlock({ code, onCopy, copied }: { code: string; onCopy: () => void; copied: boolean }) {
  return (
    <div className="relative group">
      <button
        onClick={onCopy}
        className="absolute top-3 right-3 z-10 p-2 rounded-lg bg-[#161b22] hover:bg-[#21262d] text-[#8b949e] hover:text-white transition-all opacity-0 group-hover:opacity-100 border border-[#30363d]"
      >
        {copied ? <CheckCircle className="w-4 h-4 text-[#3fb950]" /> : <Copy className="w-4 h-4" />}
      </button>
      
      <Highlight theme={customTheme} code={code} language="typescript">
        {({ className, style, tokens, getLineProps, getTokenProps }) => (
          <pre 
            className={`${className} text-[13px] leading-6 p-4 rounded-lg border border-[#30363d] whitespace-pre-wrap break-all`}
            style={style}
          >
            {tokens.map((line, i) => (
              <div key={i} {...getLineProps({ line })} className="table-row">
                <span className="table-cell text-[#484f58] select-none pr-4 text-right w-8 text-xs">{i + 1}</span>
                <span className="table-cell">
                  {line.map((token, key) => (
                    <span key={key} {...getTokenProps({ token })} />
                  ))}
                </span>
              </div>
            ))}
          </pre>
        )}
      </Highlight>
    </div>
  );
}

export default function QuickStart({ onBack }: QuickStartProps) {
  const { t } = useI18n();
  const [currentStep, setCurrentStep] = useState<QuickStartStep>(1);
  const [stepStatuses, setStepStatuses] = useState<Record<number, StepStatus>>({
    1: { completed: false, inProgress: false },
    2: { completed: false, inProgress: false, waiting: false },
    3: { completed: false, inProgress: false },
  });
  const [channelReady, setChannelReady] = useState(false);
  const [copied, setCopied] = useState(false);
  const [expandedRpc, setExpandedRpc] = useState<string | null>(null);
  const [nodesOnline, setNodesOnline] = useState({ alice: false, bob: false });

  // 检查通道状态
  const checkChannelReady = async (): Promise<boolean> => {
    try {
      const res = await fetch('/api/channels');
      const data = await res.json();
      console.log('Channel data:', JSON.stringify(data, null, 2));
      if (data.nodes) {
        const aliceNode = data.nodes.find((n: { name: string }) => n.name === 'alice');
        const aliceChannels = aliceNode?.channels || [];
        console.log('Alice channels:', aliceChannels.length, aliceChannels);
        
        // 检查是否有任何通道（不管状态）
        if (aliceChannels.length > 0) {
          // 检查通道状态 - 支持多种字段格式
          const readyChannel = aliceChannels.find((ch: Record<string, unknown>) => {
            const state = ch.state as Record<string, unknown> | undefined;
            const stateName = state?.state_name || (ch as Record<string, unknown>).state_name;
            console.log('Channel state:', stateName, ch);
            return stateName === 'CHANNEL_READY';
          });
          return !!readyChannel;
        }
      }
    } catch (err) {
      console.error('Check channel error:', err);
    }
    return false;
  };

  // 等待通道就绪
  const waitForChannelReady = async () => {
    setStepStatuses(prev => ({
      ...prev,
      2: { ...prev[2], waiting: true },
    }));
    
    // 轮询检查通道状态，最多等待 120 秒
    for (let i = 0; i < 40; i++) {
      await new Promise(resolve => setTimeout(resolve, 3000));
      console.log(`Checking channel ready... attempt ${i + 1}/40`);
      const ready = await checkChannelReady();
      if (ready) {
        console.log('Channel is ready!');
        setChannelReady(true);
        setStepStatuses(prev => ({
          ...prev,
          2: { ...prev[2], completed: true, waiting: false, inProgress: false },
        }));
        setTimeout(() => setCurrentStep(3), 800);
        return;
      }
    }
    // 超时
    console.log('Channel ready timeout');
    setStepStatuses(prev => ({
      ...prev,
      2: { ...prev[2], waiting: false, inProgress: false },
    }));
    alert(t('quickstart.channelWaitingHint'));
  };

  useEffect(() => {
    const checkNodes = async () => {
      try {
        const res = await fetch('/api/nodes');
        const data = await res.json();
        if (data.nodes) {
          const aliceNode = data.nodes.find((n: { name: string }) => n.name === 'alice');
          const bobNode = data.nodes.find((n: { name: string }) => n.name === 'bob');
          setNodesOnline({
            alice: aliceNode?.isOnline || false,
            bob: bobNode?.isOnline || false,
          });
        }
      } catch {}
    };
    checkNodes();
    const interval = setInterval(checkNodes, 5000);
    return () => clearInterval(interval);
  }, []);

  const executeStep = async (step: QuickStartStep) => {
    setStepStatuses(prev => ({
      ...prev,
      [step]: { ...prev[step], inProgress: true },
    }));

    try {
      let response;
      let traces: RpcTrace[] = [];

      if (step === 1) {
        response = await fetch('/api/connect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fromNode: 'alice', toNode: 'bob' }),
        });
      } else if (step === 2) {
        // 静默关闭所有已有通道
        try {
          const chRes = await fetch('/api/channels');
          const chData = await chRes.json();
          if (chData.nodes) {
            const aliceChannels = chData.nodes.find((n: { name: string }) => n.name === 'alice')?.channels || [];
            await Promise.all(
              aliceChannels.map((ch: { channel_id: string }) =>
                fetch('/api/channels/close', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ nodeName: 'alice', channelId: ch.channel_id }),
                }).catch(() => {})
              )
            );
            if (aliceChannels.length > 0) {
              // 等待关闭操作广播
              await new Promise(resolve => setTimeout(resolve, 2000));
            }
          }
        } catch {}
        // 重置 channelReady 状态
        setChannelReady(false);

        response = await fetch('/api/channels/open', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fromNode: 'alice',
            toNode: 'bob',
            fundingAmount: '100000000000',
            assetType: 'CKB',
          }),
        });
        const data = await response.json();
        if (data?.rpcTrace) traces = data.rpcTrace;
        
        if (data?.success) {
          setStepStatuses(prev => ({
            ...prev,
            [step]: { ...prev[step], rpcTrace: traces },
          }));
          // 通道建立后等待就绪
          await waitForChannelReady();
          return;
        } else {
          throw new Error(data?.error || '通道建立失败');
        }
      } else if (step === 3) {
        const invoiceRes = await fetch('/api/invoice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nodeName: 'bob',
            amount: '10',
            assetType: 'CKB',
          }),
        });
        const invoiceData = await invoiceRes.json();
        if (!invoiceData.success) throw new Error(invoiceData.error);
        
        response = await fetch('/api/pay', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nodeName: 'alice',
            invoice: invoiceData.invoice,
          }),
        });
      }

      const data = await response?.json();
      if (data?.rpcTrace) traces = data.rpcTrace;

      if (data?.success || data?.result !== undefined) {
        setStepStatuses(prev => ({
          ...prev,
          [step]: { completed: true, inProgress: false, rpcTrace: traces },
        }));
        if (step < 3) {
          setTimeout(() => setCurrentStep((step + 1) as QuickStartStep), 800);
        }
      } else {
        throw new Error(data?.error || '操作失败');
      }
    } catch (error) {
      console.error('Step error:', error);
      setStepStatuses(prev => ({
        ...prev,
        [step]: { ...prev[step], inProgress: false },
      }));
      alert(error instanceof Error ? error.message : t('quickstart.dockerHint'));
    }
  };

  const copyCode = () => {
    const code = SDK_EXAMPLES[`step${currentStep}` as keyof typeof SDK_EXAMPLES].code;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const currentExample = SDK_EXAMPLES[`step${currentStep}` as keyof typeof SDK_EXAMPLES];
  
  // 步骤标签翻译
  const stepLabels = [t('quickstart.step1.title'), t('quickstart.step2.title'), t('quickstart.step3.title')];

  const canExecute = useCallback((step: QuickStartStep) => {
    if (!nodesOnline.alice || !nodesOnline.bob) return false;
    if (step === 1) return true;
    if (step === 2) return stepStatuses[1].completed && !stepStatuses[2].waiting;
    if (step === 3) return channelReady;
    return false;
  }, [nodesOnline, stepStatuses, channelReady]);

  const allCompleted = stepStatuses[1].completed && stepStatuses[2].completed && stepStatuses[3].completed;

  return (
    <div className="w-full h-full flex bg-[#0d1117]">
      {/* 左侧：步骤导航 */}
      <div className="w-44 bg-[#010409] border-r border-[#21262d] flex flex-col">
        <div className="p-4 border-b border-[#21262d]">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-[#58a6ff]" />
            <h3 className="text-sm font-semibold text-white">{t('quickstart.title')}</h3>
          </div>
          <p className="text-xs text-[#8b949e] mt-1">{t('quickstart.subtitle')}</p>
        </div>
        
        <div className="flex-1 p-3 space-y-1">
          {[1, 2, 3].map((step) => {
            const status = stepStatuses[step];
            const isCurrent = currentStep === step;
            const stepLabel = [t('home.quickStart.step1'), t('home.quickStart.step2'), t('home.quickStart.step3')][step - 1];
            
            return (
              <button
                key={step}
                onClick={() => setCurrentStep(step as QuickStartStep)}
                className={`w-full text-left p-3 rounded-lg transition-all ${
                  isCurrent 
                    ? 'bg-[#1f6feb]/10 border border-[#1f6feb]/50' 
                    : status.completed 
                      ? 'bg-[#238636]/10 border border-[#238636]/30' 
                      : 'hover:bg-[#161b22] border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                    status.completed 
                      ? 'bg-[#238636] text-white' 
                      : isCurrent 
                        ? 'bg-[#1f6feb] text-white' 
                        : 'bg-[#21262d] text-[#8b949e]'
                  }`}>
                    {status.completed ? <Check className="w-3 h-3" /> : step}
                  </div>
                  <span className={`text-sm ${
                    isCurrent ? 'text-white' : status.completed ? 'text-[#3fb950]' : 'text-[#8b949e]'
                  }`}>
                    {stepLabel}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* 节点状态 */}
        <div className="p-3 border-t border-[#21262d]">
          <div className="text-[10px] text-[#6e7681] uppercase tracking-wider mb-2">{t('demo.sidebar.nodeStatus')}</div>
          <div className="space-y-1.5">
            {['alice', 'bob'].map(name => {
              const online = nodesOnline[name as keyof typeof nodesOnline];
              return (
                <div key={name} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs ${
                  online ? 'text-[#3fb950]' : 'text-[#f85149]'
                }`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${online ? 'bg-[#3fb950]' : 'bg-[#f85149]'}`} />
                  <span className="capitalize font-medium">{name}</span>
                  <span className="ml-auto text-[10px] opacity-60">{online ? t('demo.sidebar.online') : t('demo.sidebar.offline')}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 中间：拓扑图 + 操作 */}
      <div className="flex-1 flex flex-col">
        {/* 拓扑图区域 */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="relative flex items-start gap-28 pt-0">
            {/* 连接线 - 在两个正方形中间 */}
            <div className="absolute top-10 left-20 right-20 h-[2px] bg-[#21262d]">
              {stepStatuses[1].completed && (
                <div className={`h-full transition-all duration-500 ${
                  stepStatuses[2].completed ? 'bg-[#238636]' : 'bg-[#1f6feb]'
                }`} style={{ width: '100%' }} />
              )}
              {stepStatuses[1].inProgress && (
                <div className="h-full w-1/2 bg-[#1f6feb] animate-pulse" />
              )}
            </div>

            {/* Alice */}
            <div className="flex flex-col items-center relative z-10">
              <div className={`w-20 h-20 rounded-xl flex items-center justify-center border-2 transition-all ${
                nodesOnline.alice 
                  ? 'bg-[#161b22] border-[#30363d] shadow-lg' 
                  : 'bg-[#0d1117] border-[#21262d]'
              } ${currentStep === 1 && stepStatuses[1].inProgress ? 'ring-2 ring-[#1f6feb] ring-opacity-50' : ''}`}>
                <span className="text-2xl font-bold text-white">A</span>
              </div>
              <div className="mt-2.5 text-center">
                <span className="text-sm font-medium text-white">Alice</span>
                <p className="text-[10px] text-[#6e7681]">{t('quickstart.alice')}</p>
              </div>
            </div>

            {/* Bob */}
            <div className="flex flex-col items-center relative z-10">
              <div className={`w-20 h-20 rounded-xl flex items-center justify-center border-2 transition-all ${
                nodesOnline.bob 
                  ? 'bg-[#161b22] border-[#30363d] shadow-lg' 
                  : 'bg-[#0d1117] border-[#21262d]'
              } ${currentStep === 1 && stepStatuses[1].inProgress ? 'ring-2 ring-[#1f6feb] ring-opacity-50' : ''}`}>
                <span className="text-2xl font-bold text-white">B</span>
              </div>
              <div className="mt-2.5 text-center">
                <span className="text-sm font-medium text-white">Bob</span>
                <p className="text-[10px] text-[#6e7681]">{t('quickstart.bob')}</p>
              </div>
            </div>

            {/* 状态指示 */}
            {stepStatuses[2].completed && (
              <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#238636]/10 border border-[#238636]/30">
                <CheckCircle className="w-3.5 h-3.5 text-[#3fb950]" />
                <span className="text-xs text-[#3fb950] font-medium">{t('quickstart.channelEstablished')}</span>
              </div>
            )}
          </div>
        </div>

        {/* 操作面板 */}
        <div className="p-5 border-t border-[#21262d] bg-[#010409]">
          <div className="max-w-lg mx-auto">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="text-sm font-semibold text-white">{stepLabels[currentStep - 1]}</h4>
                <p className="text-xs text-[#6e7681] mt-0.5">{currentExample.subtitle}</p>
              </div>
              <button
                onClick={() => executeStep(currentStep)}
                disabled={!canExecute(currentStep) || stepStatuses[currentStep].inProgress || stepStatuses[currentStep].waiting || stepStatuses[currentStep].completed}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  stepStatuses[currentStep].completed
                    ? 'bg-[#238636]/20 text-[#3fb950] border border-[#238636]/30'
                    : stepStatuses[currentStep].waiting
                      ? 'bg-[#d29922]/20 text-[#d29922] border border-[#d29922]/30'
                    : canExecute(currentStep)
                      ? 'bg-[#1f6feb] hover:bg-[#388bfd] text-white'
                      : 'bg-[#21262d] text-[#6e7681] cursor-not-allowed'
                }`}
              >
                {stepStatuses[currentStep].completed ? (
                  <><CheckCircle className="w-4 h-4" /> {t('quickstart.completed')}</>
                ) : stepStatuses[currentStep].waiting ? (
                  <><RefreshCw className="w-4 h-4 animate-spin" /> {t('quickstart.waitingChannel')}</>
                ) : stepStatuses[currentStep].inProgress ? (
                  <><RefreshCw className="w-4 h-4 animate-spin" /> {t('quickstart.executing')}</>
                ) : (
                  <><Play className="w-4 h-4" /> {t('quickstart.execute')}</>
                )}
              </button>
            </div>

            {!nodesOnline.alice || !nodesOnline.bob ? (
              <div className="flex items-center gap-2 text-xs text-[#d29922] bg-[#d29922]/10 rounded-lg px-3 py-2 border border-[#d29922]/20">
                <Terminal className="w-3.5 h-3.5" />
                {t('quickstart.dockerHint')}
              </div>
            ) : stepStatuses[2].waiting ? (
              <div className="flex items-center gap-2 text-xs text-[#d29922] bg-[#d29922]/10 rounded-lg px-3 py-2 border border-[#d29922]/20">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                {t('quickstart.channelWaitingHint')}
              </div>
            ) : allCompleted ? (
              <div className="flex items-center gap-2 text-xs text-[#3fb950] bg-[#238636]/10 rounded-lg px-3 py-2 border border-[#238636]/20">
                <CheckCircle className="w-3.5 h-3.5" />
                {t('quickstart.allCompleted')}
              </div>
            ) : currentStep === 3 && !channelReady ? (
              <div className="text-xs text-[#6e7681] bg-[#161b22] rounded-lg px-3 py-2 border border-[#21262d]">
                {t('quickstart.waitForChannel')}
              </div>
            ) : !canExecute(currentStep) ? (
              <div className="text-xs text-[#6e7681] bg-[#161b22] rounded-lg px-3 py-2 border border-[#21262d]">
                {t('quickstart.completePrevSteps')}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* 右侧：代码面板 */}
      <div className="w-[380px] bg-[#010409] border-l border-[#21262d] flex flex-col">
        {/* 标题栏 */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-[#21262d]">
          <Terminal className="w-4 h-4 text-[#8b949e]" />
          <span className="text-sm font-medium text-white">{t('quickstart.sdkCode')}</span>
          <span className="ml-auto text-[10px] text-[#6e7681] bg-[#161b22] px-2 py-0.5 rounded border border-[#21262d]">TS</span>
        </div>

        {/* 代码内容 */}
        <div className="flex-1 overflow-y-auto p-4">
          <CodeBlock code={currentExample.code} onCopy={copyCode} copied={copied} />

          {/* RPC 调用记录 */}
          {stepStatuses[currentStep].rpcTrace && stepStatuses[currentStep].rpcTrace!.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center gap-1.5 text-[10px] text-[#6e7681] mb-2 uppercase tracking-wider font-medium">
                <Zap className="w-3 h-3" /> {t('quickstart.rpcCall')}
              </div>
              <div className="space-y-2">
                {stepStatuses[currentStep].rpcTrace!.map((trace, idx) => (
                  <div key={idx} className="bg-[#0d1117] rounded-lg border border-[#21262d] overflow-hidden">
                    <button
                      className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-[#161b22] transition-colors"
                      onClick={() => setExpandedRpc(expandedRpc === `${currentStep}-${idx}` ? null : `${currentStep}-${idx}`)}
                    >
                      {expandedRpc === `${currentStep}-${idx}` ? (
                        <ChevronDown className="w-3.5 h-3.5 text-[#6e7681]" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-[#6e7681]" />
                      )}
                      <span className="text-[#58a6ff] font-mono text-xs">{trace.method}</span>
                      {trace.error ? (
                        <span className="ml-auto text-[10px] text-[#f85149] bg-[#f85149]/10 px-1.5 py-0.5 rounded">{t('output.error')}</span>
                      ) : (
                        <span className="ml-auto text-[10px] text-[#3fb950] bg-[#238636]/10 px-1.5 py-0.5 rounded">{trace.durationMs}ms</span>
                      )}
                    </button>
                    {expandedRpc === `${currentStep}-${idx}` && (
                      <div className="px-3 pb-3 space-y-2">
                        <div>
                          <div className="text-[10px] text-[#d29922] mb-1 font-medium">{t('output.request')}</div>
                          <pre className="text-[11px] text-[#e6edf3] bg-[#161b22] rounded-md p-2.5 overflow-x-auto border border-[#21262d]">
                            {JSON.stringify(trace.params, null, 2)}
                          </pre>
                        </div>
                        <div>
                          <div className={`text-[10px] mb-1 font-medium ${trace.error ? 'text-[#f85149]' : 'text-[#3fb950]'}`}>
                            {trace.error ? t('output.error') : t('output.response')}
                          </div>
                          <pre className={`text-[11px] rounded-md p-2.5 overflow-x-auto border ${
                            trace.error 
                              ? 'text-[#f85149] bg-[#f85149]/5 border-[#f85149]/20' 
                              : 'text-[#e6edf3] bg-[#161b22] border-[#21262d]'
                          }`}>
                            {trace.error || JSON.stringify(trace.result, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
