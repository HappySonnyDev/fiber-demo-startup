"use client";

import React from 'react';
import NextLink from 'next/link';
import { Zap, Play, Activity } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import LanguageSwitcher from '@/components/LanguageSwitcher';

export default function HomePage() {
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
            <span className="font-bold text-white text-lg tracking-wide">Fiber</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <LanguageSwitcher />

          <NextLink
            href="/docs"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#888] hover:text-white border border-[#3e3e42] hover:border-[#555] rounded transition-colors"
          >
            <Zap className="w-3 h-3" /> {t('nav.sdkDocs')}
          </NextLink>
        </div>
      </header>

      {/* 主体工作区 */}
      <main className="flex-1 relative bg-[#191919] overflow-hidden flex items-center justify-center">
        <div className="flex flex-col items-center text-center z-10">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mb-6 shadow-xl shadow-blue-900/30">
            <Zap className="w-10 h-10 text-white fill-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">{t('app.title')}</h1>
          <p className="text-[#888] mb-10 max-w-md">{t('app.description')}</p>

          <div className="flex gap-6">
            {/* 快速入门卡片 */}
            <NextLink href="/quickstart">
              <div className="w-72 bg-[#1e1e1e] rounded-xl border border-[#3e3e42] p-6 hover:border-blue-500/50 transition-all group cursor-pointer">
                <div className="w-12 h-12 bg-blue-600/20 rounded-lg flex items-center justify-center mb-4 group-hover:bg-blue-600/30 transition-colors">
                  <Play className="w-6 h-6 text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{t('home.quickStart.title')}</h3>
                <p className="text-[#888] text-sm mb-4">{t('home.quickStart.desc')}</p>

                <div className="bg-[#252526] rounded-lg p-4 mb-4 h-[140px] flex flex-col items-center justify-center">
                  <div className="flex items-center justify-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-purple-600/20 border border-purple-500/30 flex items-center justify-center">
                      <span className="text-purple-400 font-bold text-sm">A</span>
                    </div>
                    <div className="flex-1 h-0.5 bg-gradient-to-r from-purple-500/50 via-blue-500 to-purple-500/50 relative">
                      <div className="absolute inset-0 bg-blue-400/50 animate-pulse"></div>
                    </div>
                    <div className="w-12 h-12 rounded-lg bg-purple-600/20 border border-purple-500/30 flex items-center justify-center">
                      <span className="text-purple-400 font-bold text-sm">B</span>
                    </div>
                  </div>
                  <p className="text-[#666] text-xs mt-3 text-center">{t('home.quickStart.step1')} → {t('home.quickStart.step2')} → {t('home.quickStart.step3')}</p>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#666]">{t('home.quickStart.requireDocker')}</span>
                  <span className="text-blue-400 group-hover:translate-x-1 transition-transform">{t('home.quickStart.startLearning')} →</span>
                </div>
              </div>
            </NextLink>

            {/* 完整演示卡片 */}
            <NextLink href="/demo">
              <div className="w-72 bg-[#1e1e1e] rounded-xl border border-[#3e3e42] p-6 hover:border-green-500/50 transition-all group cursor-pointer">
                <div className="w-12 h-12 bg-green-600/20 rounded-lg flex items-center justify-center mb-4 group-hover:bg-green-600/30 transition-colors">
                  <Activity className="w-6 h-6 text-green-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{t('home.fullDemo.title')}</h3>
                <p className="text-[#888] text-sm mb-4">{t('home.fullDemo.desc')}</p>

                <div className="bg-[#252526] rounded-lg p-4 mb-4 h-[140px] flex flex-col items-center justify-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex items-center gap-8">
                      <div className="w-12 h-12 rounded-lg bg-purple-600/20 border border-purple-500/30 flex items-center justify-center">
                        <span className="text-purple-400 font-bold text-sm">A</span>
                      </div>
                      <div className="w-12 h-12 rounded-lg bg-purple-600/20 border border-purple-500/30 flex items-center justify-center">
                        <span className="text-purple-400 font-bold text-sm">B</span>
                      </div>
                    </div>
                    <div className="w-12 h-12 rounded-lg bg-green-600/20 border border-green-500/30 flex items-center justify-center">
                      <span className="text-green-400 font-bold text-sm">C</span>
                    </div>
                  </div>
                  <p className="text-[#666] text-xs mt-3 text-center">{t('home.fullDemo.route')}</p>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#666]">{t('home.quickStart.requireDocker')}</span>
                  <span className="text-green-400 group-hover:translate-x-1 transition-transform">{t('home.fullDemo.enterDemo')} →</span>
                </div>
              </div>
            </NextLink>
          </div>
        </div>
      </main>
    </div>
  );
}
