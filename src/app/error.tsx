"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-[50vh] flex items-center justify-center px-4">
      <div className="card max-w-md w-full text-center space-y-4">
        <h2 className="page-title text-xl">出了点问题</h2>
        <p className="text-sm text-ink-soft leading-relaxed">
          页面加载或运行时遇到错误。你的本地数据仍保留在本设备上，可以尝试重新加载。
        </p>
        <button type="button" onClick={reset} className="btn-primary text-sm">
          重试
        </button>
      </div>
    </div>
  );
}
