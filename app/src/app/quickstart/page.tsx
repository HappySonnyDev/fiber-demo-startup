"use client";

import React from 'react';
import NextLink from 'next/link';
import { Zap } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import QuickStart from '@/components/QuickStart';

export default function QuickStartPage() {
  const { t } = useI18n();

  return (
    <div className="h-screen flex flex-col bg-[#191919] text-[#cccccc] font-sans selection:bg-blue-500/30">
      {/* 顶部工具栏 */}
      <header className="h-14 bg-[#1e1e1e] border-b border-[#2d2d2d] flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-white fill-white" />
            </div>
            <NextLink href="/" className="font-bold text-white text-lg tracking-wide hover:opacity-80 transition-opacity">
              Fiber
            </NextLink>
            <span className="text-[#666] text-sm ml-2">
              / {t('home.quickStart.title')}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          
          <NextLink
            href="/"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#888] hover:text-white border border-[#3e3e42] hover:border-[#555] rounded transition-colors"
          >
            {t('nav.backToHome')}
          </NextLink>

          <NextLink
            href="/docs"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#888] hover:text-white border border-[#3e3e42] hover:border-[#555] rounded transition-colors"
          >
            <Zap className="w-3 h-3" /> {t('nav.sdkDocs')}
          </NextLink>
        </div>
      </header>

      {/* 主体工作区 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <QuickStart />
      </div>
    </div>
  );
}
