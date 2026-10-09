import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

/**
 * Windows-like resizable 3-column layout with 2 draggable splitters.
 * - Saves widths to localStorage (per device).
 * - Right panel auto-fills remaining space.
 */
export default function ResizableThreePane({
  storageKey = 'pos:threePaneWidths:v1',
  minLeft = 280,
  minMiddle = 320,
  minRight = 340,
  defaultLeft = 420,
  defaultMiddle = 420,
  splitterWidth = 6,
  left,
  middle,
  right,
}) {
  const containerRef = useRef(null);
  const dragRef = useRef(null); // { which: 'left'|'middle', startX, startLeft, startMiddle }

  const [leftW, setLeftW] = useState(defaultLeft);
  const [middleW, setMiddleW] = useState(defaultMiddle);
  const [containerW, setContainerW] = useState(1200);

  const isNarrow = containerW < 980; // responsive fallback

  // Load saved widths
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Number.isFinite(parsed?.leftW)) setLeftW(parsed.leftW);
      if (Number.isFinite(parsed?.middleW)) setMiddleW(parsed.middleW);
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Observe container width
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const ro = new ResizeObserver((entries) => {
      const w = entries?.[0]?.contentRect?.width;
      if (Number.isFinite(w)) setContainerW(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Ensure widths remain valid on resize
  useEffect(() => {
    if (isNarrow) return;
    const available = containerW - splitterWidth * 2;
    const maxLeft = available - minMiddle - minRight;
    const nextLeft = clamp(leftW, minLeft, Math.max(minLeft, maxLeft));

    const maxMiddle = available - nextLeft - minRight;
    const nextMiddle = clamp(middleW, minMiddle, Math.max(minMiddle, maxMiddle));

    if (nextLeft !== leftW) setLeftW(nextLeft);
    if (nextMiddle !== middleW) setMiddleW(nextMiddle);
  }, [containerW, isNarrow, leftW, middleW, minLeft, minMiddle, minRight, splitterWidth]);

  const rightW = useMemo(() => {
    if (isNarrow) return 0;
    const available = containerW - splitterWidth * 2;
    return Math.max(minRight, available - leftW - middleW);
  }, [containerW, isNarrow, leftW, middleW, minRight, splitterWidth]);

  const save = useCallback((l, m) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ leftW: l, middleW: m }));
    } catch {
      // ignore
    }
  }, [storageKey]);

  const beginDrag = (which) => (e) => {
    e.preventDefault();
    dragRef.current = {
      which,
      startX: e.clientX,
      startLeft: leftW,
      startMiddle: middleW,
    };
    document.body.classList.add('select-none');
  };

  useEffect(() => {
    const onMove = (e) => {
      const d = dragRef.current;
      if (!d || isNarrow) return;

      const dx = e.clientX - d.startX;
      const available = containerW - splitterWidth * 2;

      if (d.which === 'left') {
        const maxLeft = available - minMiddle - minRight;
        const nextLeft = clamp(d.startLeft + dx, minLeft, Math.max(minLeft, maxLeft));
        setLeftW(nextLeft);
        return;
      }

      if (d.which === 'middle') {
        const maxMiddle = available - leftW - minRight;
        const nextMiddle = clamp(d.startMiddle + dx, minMiddle, Math.max(minMiddle, maxMiddle));
        setMiddleW(nextMiddle);
      }
    };

    const onUp = () => {
      const d = dragRef.current;
      if (!d) return;
      dragRef.current = null;
      document.body.classList.remove('select-none');
      save(leftW, middleW);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [containerW, isNarrow, leftW, middleW, minLeft, minMiddle, minRight, save, splitterWidth]);

  if (isNarrow) {
    return (
      <div ref={containerRef} className="h-full w-full overflow-hidden">
        <div className="grid grid-cols-1 gap-3 h-full p-3 overflow-auto">
          <div className="card min-h-[300px] overflow-hidden">{left}</div>
          <div className="card min-h-[260px] overflow-hidden">{middle}</div>
          <div className="card min-h-[260px] overflow-hidden">{right}</div>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="h-full w-full overflow-hidden">
      <div className="h-full flex overflow-hidden">
        <div className="h-full overflow-hidden" style={{ width: leftW }}>
          {left}
        </div>

        <div
          className="pos-splitter"
          style={{ width: splitterWidth }}
          onMouseDown={beginDrag('left')}
          role="separator"
          aria-label="Resize left panel"
        />

        <div className="h-full overflow-hidden" style={{ width: middleW }}>
          {middle}
        </div>

        <div
          className="pos-splitter"
          style={{ width: splitterWidth }}
          onMouseDown={beginDrag('middle')}
          role="separator"
          aria-label="Resize middle panel"
        />

        <div className="h-full overflow-hidden flex-1" style={{ minWidth: rightW }}>
          {right}
        </div>
      </div>
    </div>
  );
}
