"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

export default function ZiiplyMobileShopsFit({
  children,
  enabled,
}: {
  children: ReactNode;
  enabled: boolean;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentsRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const contents = contentsRef.current;
    if (!enabled || !viewport || !contents) return;

    const fit = () => {
      if (!viewport.clientHeight || !contents.offsetHeight) return;
      setScale(Math.min(1, viewport.clientHeight / contents.offsetHeight));
    };
    fit();

    const observer = new ResizeObserver(fit);
    observer.observe(viewport);
    observer.observe(contents);
    return () => observer.disconnect();
  }, [enabled]);

  if (!enabled) {
    return <div className="flex min-h-0 flex-1 flex-col">{children}</div>;
  }

  return (
    <div ref={viewportRef} className="relative min-h-0 flex-1 overflow-hidden">
      <div
        ref={contentsRef}
        className="absolute inset-x-0 top-0 flex min-h-full origin-top flex-col"
        style={{ transform: scale < 1 ? `scale(${scale})` : undefined }}
      >
        {children}
      </div>
    </div>
  );
}
