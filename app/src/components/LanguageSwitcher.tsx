"use client";

import React from "react";
import { useI18n, type Language } from "@/lib/i18n";
import { Globe } from "lucide-react";

export default function LanguageSwitcher() {
  const { lang, setLang, t } = useI18n();

  const toggleLang = () => {
    const newLang: Language = lang === "zh" ? "en" : "zh";
    setLang(newLang);
  };

  return (
    <button
      onClick={toggleLang}
      className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#888] hover:text-white border border-[#3e3e42] hover:border-[#555] rounded transition-colors"
      title={t("nav.language") as string}
    >
      <Globe className="w-3 h-3" />
      <span className="font-medium">{lang === "zh" ? "中文" : "EN"}</span>
    </button>
  );
}
