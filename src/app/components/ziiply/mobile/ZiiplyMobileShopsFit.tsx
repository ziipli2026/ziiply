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
  const [fit, setFit] = useState({ scale: 1, scrollHeight: 0 });

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const contents = contentsRef.current;
    if (!enabled || !viewport || !contents) return;

    const measure = () => {
      const availableHeight = viewport.clientHeight;
      const naturalHeight = contents.offsetHeight;
      if (!availableHeight || !naturalHeight) return;
      const scale = Math.max(0.85, Math.min(1, availableHeight / naturalHeight));
      const fittedHeight = Math.ceil(naturalHeight * scale);
      const scrollHeight = fittedHeight > availableHeight ? fittedHeight : 0;
      setFit((current) => current.scale === scale && current.scrollHeight === scrollHeight
        ? current
        : { scale, scrollHeight });
    };
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    observer.observe(contents);
    return () => observer.disconnect();
  }, [enabled]);

  if (!enabled) {
    return <div className="flex min-h-0 flex-1 flex-col">{children}</div>;
  }

  return (
    <div ref={viewportRef} className={`relative min-h-0 flex-1 overflow-x-hidden ${fit.scrollHeight ? "overflow-y-auto overscroll-y-contain" : "overflow-y-hidden"}`}>
      <div className="relative min-h-full overflow-hidden" style={fit.scrollHeight ? { height: fit.scrollHeight } : undefined}>
        <div
          ref={contentsRef}
          className="absolute inset-x-0 top-0 flex min-h-full origin-top flex-col"
          style={{ transform: fit.scale < 1 ? `scale(${fit.scale})` : undefined }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
