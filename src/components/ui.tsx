import {
  forwardRef,
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from 'react';
import { createPortal } from 'react-dom';
import { animate, AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Icon, type IconName } from './Icon';
import { cx } from '@/lib/util';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'ok';
type Size = 'sm' | 'md' | 'lg' | 'xl';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: IconName;
  iconRight?: IconName;
  block?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', icon, iconRight, block, className, children, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cx('btn', `btn-${variant}`, `btn-${size}`, block && 'btn-block', !children && 'btn-icon-only', className)}
      {...rest}
    >
      {icon && <Icon name={icon} size={size === 'sm' ? 16 : size === 'xl' ? 22 : 18} />}
      {children && <span>{children}</span>}
      {iconRight && <Icon name={iconRight} size={size === 'sm' ? 16 : 18} />}
    </button>
  );
});

export function IconButton({
  icon,
  label,
  className,
  size = 20,
  tone,
  ...rest
}: { icon: IconName; label: string; size?: number; tone?: 'danger' | 'ember' } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" aria-label={label} title={label} className={cx('icon-btn', tone && `icon-btn-${tone}`, className)} {...rest}>
      <Icon name={icon} size={size} />
    </button>
  );
}

export function Card({
  children,
  className,
  as: As = 'section',
  interactive,
  ...rest
}: { children: ReactNode; className?: string; as?: 'section' | 'div' | 'article'; interactive?: boolean } & React.HTMLAttributes<HTMLElement>) {
  return (
    <As className={cx('card', interactive && 'card-interactive', className)} {...rest}>
      {children}
    </As>
  );
}

export function SectionHeader({ title, action, eyebrow }: { title: ReactNode; action?: ReactNode; eyebrow?: string }) {
  return (
    <div className="section-head">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h2>{title}</h2>
      </div>
      {action}
    </div>
  );
}

export function Chip({
  active,
  children,
  className,
  ...rest
}: { active?: boolean; children: ReactNode } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" aria-pressed={active} className={cx('chip', active && 'chip-active', className)} {...rest}>
      {children}
    </button>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
  size = 'md',
}: {
  value: T;
  options: { value: T; label: ReactNode }[];
  onChange: (v: T) => void;
  label: string;
  size?: 'sm' | 'md';
}) {
  const id = useId();
  return (
    <div className={cx('segmented', size === 'sm' && 'segmented-sm')} role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          className={cx('seg-opt', o.value === value && 'seg-active')}
          onClick={() => onChange(o.value)}
        >
          {o.value === value && (
            <motion.span layoutId={`seg-${id}`} className="seg-pill" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />
          )}
          <span className="seg-label">{o.label}</span>
        </button>
      ))}
    </div>
  );
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} className={cx('switch', checked && 'switch-on')} onClick={() => onChange(!checked)}>
      <motion.span className="switch-knob" layout transition={{ type: 'spring', stiffness: 600, damping: 34 }} />
    </button>
  );
}

export const TextInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { label?: string; hint?: string }>(
  function TextInput({ label, hint, className, id, ...rest }, ref) {
    const auto = useId();
    const fid = id ?? auto;
    return (
      <label className={cx('field', className)} htmlFor={fid}>
        {label && <span className="field-label">{label}</span>}
        <input ref={ref} id={fid} className="input" {...rest} />
        {hint && <span className="field-hint">{hint}</span>}
      </label>
    );
  },
);

export function TextArea({ label, className, id, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string }) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <label className={cx('field', className)} htmlFor={fid}>
      {label && <span className="field-label">{label}</span>}
      <textarea id={fid} className="input textarea" {...rest} />
    </label>
  );
}

/** Animated number that tweens between values (respects reduced motion). */
export function NumberTicker({ value, format = (n) => String(Math.round(n)), className }: { value: number; format?: (n: number) => string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const prev = useRef(value);
  const reduce = useReducedMotion();
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduce || prev.current === value) {
      el.textContent = format(value);
      prev.current = value;
      return;
    }
    const controls = animate(prev.current, value, {
      duration: 0.7,
      ease: [0.2, 0.8, 0.2, 1],
      onUpdate: (v) => (el.textContent = format(v)),
    });
    prev.current = value;
    return () => controls.stop();
  }, [value, format, reduce]);
  return (
    <span ref={ref} className={cx('num', className)}>
      {format(value)}
    </span>
  );
}

export function ProgressRing({
  value,
  size = 56,
  stroke = 5,
  color = 'var(--ember)',
  track = 'var(--line-2)',
  children,
  className,
}: {
  value: number; // 0..1
  size?: number;
  stroke?: number;
  color?: string;
  track?: string;
  children?: ReactNode;
  className?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  return (
    <div className={cx('ring', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={false}
          animate={{ strokeDashoffset: c * (1 - v) }}
          transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      {children && <div className="ring-center">{children}</div>}
    </div>
  );
}

export function EmptyState({ icon, title, body, action }: { icon: IconName; title: string; body?: ReactNode; action?: ReactNode }) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <Icon name={icon} size={26} />
      </div>
      <h3>{title}</h3>
      {body && <p className="muted">{body}</p>}
      {action && <div className="empty-action">{action}</div>}
    </div>
  );
}

/**
 * Bottom sheet on mobile, centered panel on desktop. Closes on scrim tap or Escape.
 * Used sparingly — most interactions are inline.
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  className,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'md' | 'lg' | 'full';
  className?: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  // Callers pass inline closures; keep the latest in a ref so the open effect runs once per open
  // (re-running it would steal focus from inputs on every render).
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!open) return;
    const prevFocus = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        closeRef.current();
      }
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => {
      const el = panelRef.current?.querySelector<HTMLElement>('[data-autofocus]') ?? panelRef.current;
      el?.focus({ preventScroll: true });
    });
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      prevFocus?.focus?.({ preventScroll: true });
    };
  }, [open]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="sheet-root" role="presentation">
          <motion.div className="sheet-scrim" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={typeof title === 'string' ? title : undefined}
            tabIndex={-1}
            className={cx('sheet', `sheet-${size}`, className)}
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 520, damping: 42 }}
          >
            <div className="sheet-grabber" aria-hidden="true" />
            {title && (
              <div className="sheet-head">
                <h3>{title}</h3>
                <IconButton icon="x" label="Close" onClick={onClose} />
              </div>
            )}
            <div className="sheet-body">{children}</div>
            {footer && <div className="sheet-foot">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

/** Small inline confirm: first tap arms, second tap within 3s confirms. Avoids modal dialogs. */
export function ConfirmButton({
  onConfirm,
  children,
  confirmLabel = 'Tap again to confirm',
  ...rest
}: Omit<ButtonProps, 'onClick'> & { onConfirm: () => void; confirmLabel?: string }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 3000);
    return () => clearTimeout(t);
  }, [armed]);
  return (
    <Button
      {...rest}
      variant={armed ? 'danger' : rest.variant}
      onClick={() => (armed ? (setArmed(false), onConfirm()) : setArmed(true))}
      aria-live="polite"
    >
      {armed ? confirmLabel : children}
    </Button>
  );
}

export function Stat({ label, value, unit, sub, accent }: { label: string; value: ReactNode; unit?: string; sub?: ReactNode; accent?: boolean }) {
  return (
    <div className={cx('stat', accent && 'stat-accent')}>
      <div className="eyebrow">{label}</div>
      <div className="stat-value">
        {value}
        {unit && <span className="stat-unit">{unit}</span>}
      </div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

export function Badge({ children, tone = 'default', icon }: { children: ReactNode; tone?: 'default' | 'ember' | 'gold' | 'ok' | 'steel'; icon?: IconName }) {
  return (
    <span className={cx('badge', `badge-${tone}`)}>
      {icon && <Icon name={icon} size={12} strokeWidth={2.2} />}
      {children}
    </span>
  );
}
