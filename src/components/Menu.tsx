import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Icon, type IconName } from './Icon';
import { cx } from '@/lib/util';

/**
 * Lightweight anchored popover menu, portalled and clamped to the viewport.
 * Opens downward, flipping up when there isn't room — important near the bottom of a phone screen.
 */
export function Menu({
  trigger,
  children,
  align = 'end',
  width = 240,
  label,
}: {
  trigger: (props: { onClick: () => void; 'aria-expanded': boolean; 'aria-haspopup': 'menu'; ref: React.Ref<HTMLButtonElement> }) => ReactNode;
  children: (close: () => void) => ReactNode;
  align?: 'start' | 'end';
  width?: number;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; up: boolean } | null>(null);

  useLayoutEffect(() => {
    if (!open || !btn.current) return;
    const place = () => {
      const r = btn.current!.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const h = panel.current?.offsetHeight ?? 260;
      const w = Math.min(width, vw - 16);
      let left = align === 'end' ? r.right - w : r.left;
      left = Math.max(8, Math.min(vw - w - 8, left));
      const up = r.bottom + h + 8 > vh && r.top - h - 8 > 0;
      const top = up ? r.top - h - 6 : Math.min(r.bottom + 6, vh - h - 8);
      setPos({ top, left, up });
    };
    place();
    const raf = requestAnimationFrame(place);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, align, width]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (panel.current?.contains(e.target as Node) || btn.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        btn.current?.focus();
      }
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    requestAnimationFrame(() => panel.current?.querySelector<HTMLElement>('button')?.focus({ preventScroll: true }));
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <>
      {trigger({ onClick: () => setOpen((o) => !o), 'aria-expanded': open, 'aria-haspopup': 'menu', ref: btn })}
      {createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              ref={panel}
              role="menu"
              aria-label={label}
              className="menu"
              style={{ top: pos?.top ?? -9999, left: pos?.left ?? -9999, width: Math.min(width, window.innerWidth - 16) }}
              initial={{ opacity: 0, scale: 0.96, y: pos?.up ? 6 : -6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.14, ease: [0.2, 0.8, 0.2, 1] }}
            >
              {children(close)}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
}

export function MenuItem({
  icon,
  children,
  onSelect,
  tone,
  hint,
  active,
}: {
  icon?: IconName;
  children: ReactNode;
  onSelect: () => void;
  tone?: 'danger';
  hint?: ReactNode;
  active?: boolean;
}) {
  return (
    <button type="button" role="menuitem" className={cx('menu-item', tone && `menu-${tone}`, active && 'menu-active')} onClick={onSelect}>
      {icon && <Icon name={icon} size={18} />}
      <span className="menu-label">{children}</span>
      {hint && <span className="menu-hint">{hint}</span>}
    </button>
  );
}

export const MenuSep = () => <div className="menu-sep" role="separator" />;
export const MenuLabel = ({ children }: { children: ReactNode }) => <div className="menu-cap eyebrow">{children}</div>;
