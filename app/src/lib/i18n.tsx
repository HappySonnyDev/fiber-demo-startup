"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";

export type Language = "zh" | "en";

interface I18nContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: string, vars?: Record<string, string>) => string | string[];
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

// 翻译数据
const translations: Record<Language, Record<string, string | string[]>> = {
  zh: {
    // 通用
    "app.title": "Fiber Network Demo",
    "app.description": "交互式学习 Fiber 支付网络，理解通道建立、链下支付等核心流程",
    "nav.backToHome": "返回首页",
    "nav.sdkDocs": "SDK 文档",
    "nav.language": "语言",
    
    // 首页
    "home.quickStart.title": "快速入门",
    "home.quickStart.desc": "2 节点分步骤教学，适合新手理解基础概念",
    "home.quickStart.step1": "P2P 连接",
    "home.quickStart.step2": "建立通道",
    "home.quickStart.step3": "链下支付",
    "home.quickStart.requireDocker": "需要先运行 Docker",
    "home.quickStart.startLearning": "开始学习",
    "home.fullDemo.title": "完整演示",
    "home.fullDemo.desc": "3 节点多跳路由，体验完整支付网络拓扑",
    "home.fullDemo.route": "A → B → C 多跳路由支付",
    "home.fullDemo.enterDemo": "进入演示",
    
    // Demo 模式
    "demo.init.title": "Demo Network",
    "demo.init.desc": "点击下方按钮初始化 3 节点演示网络",
    "demo.init.button": "初始化 Demo 网络",
    "demo.sidebar.networkAction": "网络操作",
    "demo.sidebar.createNetworkFirst": "请先创建网络",
    "demo.sidebar.channelStatus": "通道状态",
    "demo.sidebar.channels": "通道",
    "demo.sidebar.nodeStatus": "节点状态",
    "demo.sidebar.online": "在线",
    "demo.sidebar.offline": "离线",
    "demo.sidebar.selectNodeHint": "点击右侧图中的节点进行操作",
    "demo.node.selected": "已选中 · 查看左侧面板",
    "demo.node.l1.height": "高度",
    "demo.node.l1.version": "版本",
    "demo.node.l1.balance": "链上余额 (L1)",
    "demo.node.l2.channels": "通道数",
    "demo.zoom": "缩放",
    "demo.selected": "已选择",
    "demo.clickToSelect": "点击节点选择",
    
    // 通道操作
    "channel.open.title": "开启通道 (L1→L2)",
    "channel.open.amount": "资金量",
    "channel.open.amount.ckb": "shannon",
    "channel.open.amount.udt": "UDT 基本单位",
    "channel.open.amount.ckbHint": "CKB",
    "channel.open.amount.udtHint": "sUDT 金额（每个节点有 10 亿）",
    "channel.open.button": "建立通道",
    "channel.open.opening": "建立中...",
    "channel.open.confirming": "通道确认中...",
    "channel.open.fromTo": "从 {from} 到 {to}",
    "channel.close.title": "通道内资金",
    "channel.close.hint": "关闭后回归链上/L1",
    "channel.close.myBalance": "我可支付",
    "channel.close.peerBalance": "对端可支付",
    "channel.close.totalLocked": "总计锁定",
    "channel.close.button": "结算并关闭通道",
    "channel.close.buttonHint": "资金回归链上",
    "channel.status.ready": "已就绪",
    "channel.status.waiting": "等待",
    "channel.status.confirming": "确认中",
    "channel.asset.ckb": "CKB",
    "channel.asset.udt": "sUDT",
    
    // 支付
    "payment.title": "链下支付 (L2)",
    "payment.amount": "金额",
    "payment.target": "收款节点（支持多跳）",
    "payment.selectTarget": "选择收款节点",
    "payment.createInvoice": "生成发票",
    "payment.pay": "发起支付",
    "payment.paying": "路由寻路中...",
    "payment.success": "支付成功!",
    "payment.invoicePreview": "发票预览",
    
    // 输出面板
    "output.title": "输出",
    "output.rpcInspector": "RPC Inspector",
    "output.rpcHint": "执行操作后 RPC 调用将显示在此",
    "output.clickToView": "点击上方条目查看详情",
    "output.request": "请求",
    "output.response": "响应",
    "output.error": "错误",
    "output.paramDesc": "参数说明",
    "output.returnDesc": "返回字段说明",
    
    // 日志
    "log.system": "系统",
    "log.request": "请求",
    "log.response": "响应",
    "log.init": "Fiber Network UI 已初始化",
    "log.connect": "正在连接 Fiber 节点...",
    "log.ready": "所有节点已连接，通道已加载",
    "log.offline": "部分节点离线，请检查 Docker",
    "log.disconnect": "已断开节点连接",
    "log.channelReady": "通道已就绪",
    "log.balanceUpdated": "通道余额已更新",
    
    // QuickStart
    "quickstart.title": "快速入门",
    "quickstart.subtitle": "3 步掌握 Fiber 基础",
    "quickstart.step1.title": "Step 1: P2P 连接",
    "quickstart.step1.subtitle": "让 Alice 连接 Bob 的 P2P 网络",
    "quickstart.step2.title": "Step 2: 建立通道",
    "quickstart.step2.subtitle": "Alice 向 Bob 开启支付通道（100 CKB）",
    "quickstart.step3.title": "Step 3: 链下支付",
    "quickstart.step3.subtitle": "Alice 向 Bob 发送 10 CKB",
    "quickstart.alice": "付款方",
    "quickstart.bob": "收款方",
    "quickstart.channelEstablished": "通道已建立",
    "quickstart.execute": "执行操作",
    "quickstart.executing": "执行中...",
    "quickstart.completed": "已完成",
    "quickstart.waitingChannel": "等待通道就绪...",
    "quickstart.dockerHint": "请先启动 Docker 容器以确保节点在线",
    "quickstart.channelWaitingHint": "通道正在等待 CKB 出块确认，预计 10-20 秒...",
    "quickstart.allCompleted": "恭喜！你已完成所有步骤，现在可以进入完整演示探索更多功能",
    "quickstart.waitForChannel": "请等待通道就绪后再进行支付",
    "quickstart.completePrevSteps": "请先完成前面的步骤",
    "quickstart.sdkCode": "SDK 代码",
    "quickstart.rpcCall": "RPC 调用记录",
    
    // Docs
    "docs.title": "JS RPC SDK 文档",
    "docs.whySdk": "为什么需要 SDK？",
    "docs.nodeCategory": "节点",
    "docs.channelCategory": "通道",
    "docs.paymentCategory": "支付",
    "docs.github": "Fiber GitHub",
    "docs.typeSignature": "类型签名",
    "docs.params": "参数（SDK 层）",
    "docs.returns": "返回值",
    "docs.sdkExample": "SDK 示例",
    "docs.rawRpc": "Raw RPC 对比",
    "docs.notes": "注意事项",
    "docs.request": "请求",
    "docs.response": "响应",
    "docs.noParams": "无参数",
    "docs.field": "字段",
    "docs.type": "类型",
    "docs.required": "必填",
    "docs.desc": "说明",
  },
  en: {
    // Common
    "app.title": "Fiber Network Demo",
    "app.description": "Interactive learning of Fiber payment network, understanding channel establishment, off-chain payments and more",
    "nav.backToHome": "Back to Home",
    "nav.sdkDocs": "SDK Docs",
    "nav.language": "Language",
    
    // Home
    "home.quickStart.title": "Quick Start",
    "home.quickStart.desc": "2-node step-by-step tutorial, perfect for beginners",
    "home.quickStart.step1": "P2P Connection",
    "home.quickStart.step2": "Open Channel",
    "home.quickStart.step3": "Off-chain Payment",
    "home.quickStart.requireDocker": "Docker required",
    "home.quickStart.startLearning": "Start Learning",
    "home.fullDemo.title": "Full Demo",
    "home.fullDemo.desc": "3-node multi-hop routing, experience complete payment network",
    "home.fullDemo.route": "A → B → C Multi-hop Payment",
    "home.fullDemo.enterDemo": "Enter Demo",
    
    // Demo Mode
    "demo.init.title": "Demo Network",
    "demo.init.desc": "Click below to initialize 3-node demo network",
    "demo.init.button": "Initialize Demo Network",
    "demo.sidebar.networkAction": "Network Actions",
    "demo.sidebar.createNetworkFirst": "Please create a network first",
    "demo.sidebar.channelStatus": "Channel Status",
    "demo.sidebar.channels": "channels",
    "demo.sidebar.nodeStatus": "Node Status",
    "demo.sidebar.online": "Online",
    "demo.sidebar.offline": "Offline",
    "demo.sidebar.selectNodeHint": "Click a node on the right to operate",
    "demo.node.selected": "Selected · Check left panel",
    "demo.node.l1.height": "Height",
    "demo.node.l1.version": "Version",
    "demo.node.l1.balance": "On-chain Balance (L1)",
    "demo.node.l2.channels": "Channels",
    "demo.zoom": "Zoom",
    "demo.selected": "Selected",
    "demo.clickToSelect": "Click node to select",
    
    // Channel Operations
    "channel.open.title": "Open Channel (L1→L2)",
    "channel.open.amount": "Amount",
    "channel.open.amount.ckb": "shannon",
    "channel.open.amount.udt": "UDT base units",
    "channel.open.amount.ckbHint": "CKB",
    "channel.open.amount.udtHint": "sUDT amount (each node has 1 billion)",
    "channel.open.button": "Open Channel",
    "channel.open.opening": "Opening...",
    "channel.open.confirming": "Confirming...",
    "channel.open.fromTo": "From {from} to {to}",
    "channel.close.title": "Channel Funds",
    "channel.close.hint": "Returns to L1 after closing",
    "channel.close.myBalance": "I can pay",
    "channel.close.peerBalance": "Peer can pay",
    "channel.close.totalLocked": "Total Locked",
    "channel.close.button": "Settle & Close Channel",
    "channel.close.buttonHint": "Funds return on-chain",
    "channel.status.ready": "Ready",
    "channel.status.waiting": "Waiting",
    "channel.status.confirming": "Confirming",
    "channel.asset.ckb": "CKB",
    "channel.asset.udt": "sUDT",
    
    // Payment
    "payment.title": "Off-chain Payment (L2)",
    "payment.amount": "Amount",
    "payment.target": "Recipient (multi-hop supported)",
    "payment.selectTarget": "Select recipient",
    "payment.createInvoice": "Create Invoice",
    "payment.pay": "Send Payment",
    "payment.paying": "Routing...",
    "payment.success": "Payment Success!",
    "payment.invoicePreview": "Invoice Preview",
    
    // Output Panel
    "output.title": "Output",
    "output.rpcInspector": "RPC Inspector",
    "output.rpcHint": "RPC calls will appear here after operations",
    "output.clickToView": "Click items above to view details",
    "output.request": "Request",
    "output.response": "Response",
    "output.error": "Error",
    "output.paramDesc": "Parameter Description",
    "output.returnDesc": "Return Field Description",
    
    // Logs
    "log.system": "System",
    "log.request": "Request",
    "log.response": "Response",
    "log.init": "Fiber Network UI initialized",
    "log.connect": "Connecting to Fiber nodes...",
    "log.ready": "All nodes connected. Channels loaded.",
    "log.offline": "Some nodes are offline. Please check Docker.",
    "log.disconnect": "Disconnected from nodes.",
    "log.channelReady": "Channel is ready",
    "log.balanceUpdated": "Channel balance updated",
    
    // QuickStart
    "quickstart.title": "Quick Start",
    "quickstart.subtitle": "Master Fiber basics in 3 steps",
    "quickstart.step1.title": "Step 1: P2P Connection",
    "quickstart.step1.subtitle": "Connect Alice to Bob's P2P network",
    "quickstart.step2.title": "Step 2: Open Channel",
    "quickstart.step2.subtitle": "Alice opens payment channel to Bob (100 CKB)",
    "quickstart.step3.title": "Step 3: Off-chain Payment",
    "quickstart.step3.subtitle": "Alice sends 10 CKB to Bob",
    "quickstart.alice": "Payer",
    "quickstart.bob": "Payee",
    "quickstart.channelEstablished": "Channel Established",
    "quickstart.execute": "Execute",
    "quickstart.executing": "Executing...",
    "quickstart.completed": "Completed",
    "quickstart.waitingChannel": "Waiting for channel...",
    "quickstart.dockerHint": "Please start Docker containers first",
    "quickstart.channelWaitingHint": "Channel waiting for CKB block confirmation, ~10-20s...",
    "quickstart.allCompleted": "Congratulations! You've completed all steps. Explore more in the full demo.",
    "quickstart.waitForChannel": "Please wait for channel to be ready",
    "quickstart.completePrevSteps": "Please complete previous steps first",
    "quickstart.sdkCode": "SDK Code",
    "quickstart.rpcCall": "RPC Call History",
    
    // Docs
    "docs.title": "JS RPC SDK Docs",
    "docs.whySdk": "Why SDK?",
    "docs.nodeCategory": "Node",
    "docs.channelCategory": "Channel",
    "docs.paymentCategory": "Payment",
    "docs.github": "Fiber GitHub",
    "docs.typeSignature": "Type Signature",
    "docs.params": "Parameters (SDK Layer)",
    "docs.returns": "Returns",
    "docs.sdkExample": "SDK Example",
    "docs.rawRpc": "Raw RPC Comparison",
    "docs.notes": "Notes",
    "docs.request": "Request",
    "docs.response": "Response",
    "docs.noParams": "No parameters",
    "docs.field": "Field",
    "docs.type": "Type",
    "docs.required": "Required",
    "docs.desc": "Description",
  },
};

// 安全的翻译函数，支持变量插值
function translate(lang: Language, key: string, vars?: Record<string, string>): string {
  const value = translations[lang][key];
  if (!value) {
    console.warn(`Missing translation: ${key}`);
    return key;
  }
  
  let result = value as string;
  
  // 变量插值
  if (vars) {
    Object.entries(vars).forEach(([k, v]) => {
      result = result.replace(new RegExp(`{${k}}`, "g"), v);
    });
  }
  
  return result;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>("zh");

  const setLang = useCallback((newLang: Language) => {
    setLangState(newLang);
    // 保存到 localStorage
    if (typeof window !== "undefined") {
      localStorage.setItem("fiber-lang", newLang);
    }
  }, []);

  // 从 localStorage 恢复语言设置
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("fiber-lang") as Language | null;
      if (saved && (saved === "zh" || saved === "en")) {
        setLangState(saved);
      }
    }
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string>) => translate(lang, key, vars),
    [lang]
  );

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  
  // 包装 t 函数，确保返回 string
  const t = (key: string, vars?: Record<string, string>): string => {
    const result = context.t(key, vars);
    return typeof result === 'string' ? result : key;
  };
  
  return { ...context, t };
}
