"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { translate, type Language } from "./translations";

interface I18nContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: string, vars?: Record<string, string>) => string | string[];
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

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

// 导出翻译数据供文档页面使用
export { translations } from "./translations";
