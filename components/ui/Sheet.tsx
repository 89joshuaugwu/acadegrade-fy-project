'use client';

import { useRef, useState } from 'react';
import { cn } from '@/lib/utils/cn';
import { Modal, type ModalProps } from './Modal';

export interface SheetProps extends Omit<ModalProps, 'presentation' | 'size'> {
  dismissDistance?: number;
}

export function Sheet({
  children,
  onClose,
  dismissDistance = 96,
  className,
  ...props
}: SheetProps) {
  const startY = useRef<number | null>(null);
  const offsetRef = useRef(0);
  const [offset, setOffset] = useState(0);

  function finishDrag() {
    if (offsetRef.current >= dismissDistance) onClose();
    startY.current = null;
    offsetRef.current = 0;
    setOffset(0);
  }

  return (
    <Modal
      {...props}
      onClose={onClose}
      presentation="sheet"
      className={cn('max-h-[calc(100dvh-1rem)] sm:max-h-[calc(100dvh-2rem)]', className)}
    >
      <div
        style={{ transform: `translateY(${offset}px)` }}
        className="transition-transform duration-150"
      >
        <button
          type="button"
          aria-label="Swipe down to close"
          onPointerDown={(event) => {
            startY.current = event.clientY;
            offsetRef.current = 0;
            setOffset(0);
          }}
          onPointerMove={(event) => {
            if (startY.current === null) return;
            const nextOffset = Math.max(0, event.clientY - startY.current);
            offsetRef.current = nextOffset;
            setOffset(nextOffset);
          }}
          onPointerUp={finishDrag}
          onPointerCancel={() => {
            startY.current = null;
            offsetRef.current = 0;
            setOffset(0);
          }}
          className="-mt-3 mb-3 flex h-8 w-full touch-none items-center justify-center rounded-lg"
        >
          <span className="h-1.5 w-12 rounded-full bg-[var(--acade-control-border)]" aria-hidden="true" />
        </button>
        {children}
      </div>
    </Modal>
  );
}
