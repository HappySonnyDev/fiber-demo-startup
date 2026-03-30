/**
 * 代码块组件
 */

import React from 'react';
import { Highlight } from 'prism-react-renderer';
import { CheckCircle, Copy } from 'lucide-react';
import { customTheme } from './constants';

interface CodeBlockProps {
  code: string;
  onCopy: () => void;
  copied: boolean;
}

export function CodeBlock({ code, onCopy, copied }: CodeBlockProps) {
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
