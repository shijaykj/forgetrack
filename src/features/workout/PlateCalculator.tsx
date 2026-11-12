import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useApp } from '@/store/app';
import { BAR_OPTIONS, describePlates, loadPlates, PLATES } from '@/domain/plates';
import { Icon } from '@/components/Icon';
import { Button, Segmented, Sheet } from '@/components/ui';
import { haptic } from '@/lib/feedback';
import { fmtWeight, fromDisplay, toDisplay } from '@/lib/util';

/** Plate colour + relative size, loosely following competition colour coding. */
const PLATE_STYLE: Record<string, { color: string; h: number }> = {
  'kg-25': { color: '#e5484d', h: 100 },
  'kg-20': { color: '#3e7bfa', h: 100 },
  'kg-15': { color: '#f5c542', h: 88 },
  'kg-10': { color: '#3ecf7a', h: 76 },
  'kg-5': { color: '#e8eaed', h: 60 },
  'kg-2.5': { color: '#e5484d', h: 48 },
  'kg-1.25': { color: '#b8bec8', h: 40 },
  'lb-45': { color: '#3e7bfa', h: 100 },
  'lb-35': { color: '#f5c542', h: 92 },
  'lb-25': { color: '#3ecf7a', h: 82 },
  'lb-10': { color: '#e8eaed', h: 62 },
  'lb-5': { color: '#e5484d', h: 50 },
  'lb-2.5': { color: '#b8bec8', h: 42 },
};

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100));

export function PlateCalculator({
  open,
  onClose,
  initialKg,
  onApply,
}: {
  open: boolean;
  onClose: () => void;
  /** Weight to start from (kg), e.g. the next set's weight. */
  initialKg?: number | null;
  /** When given, shows "Use for next set" and receives the weight in kg. */
  onApply?: (kg: number) => void;
}) {
  const unit = useApp((s) => s.profile.unit);
  const bar = useApp((s) => s.profile.bar[unit]);
  const updateProfile = useApp((s) => s.updateProfile);
  const step = unit === 'kg' ? 2.5 : 5;
  const [value, setValue] = useState('');

  useEffect(() => {
    if (!open) return;
    const start = initialKg ? Math.round(toDisplay(initialKg, unit) * 100) / 100 : bar + 2 * PLATES[unit][1];
    setValue(fmt(start));
  }, [open, initialKg, unit, bar]);

  const target = Math.max(0, Number.parseFloat(value) || 0);
  const load = loadPlates(target, bar, PLATES[unit]);
  const nudge = (d: number) => {
    setValue(fmt(Math.max(bar, Math.round((target + d) / step) * step)));
    haptic(6);
  };
  const barOptions = BAR_OPTIONS[unit].includes(bar) ? BAR_OPTIONS[unit] : [...BAR_OPTIONS[unit], bar];

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Plate calculator"
      footer={
        onApply ? (
          <Button
            variant="primary"
            block
            icon="check"
            onClick={() => {
              onApply(fromDisplay(load.total, unit));
              onClose();
            }}
            disabled={load.total <= 0}
          >
            Use {fmt(load.total)} {unit} for next set
          </Button>
        ) : undefined
      }
    >
      <div className="plate-calc">
        <div className="plate-input-row">
          <button type="button" className="plate-nudge" aria-label={`Minus ${step} ${unit}`} onClick={() => nudge(-step)}>
            <Icon name="minus" size={20} />
          </button>
          <label className="plate-input">
            <input
              inputMode="decimal"
              value={value}
              onChange={(e) => setValue(e.target.value.replace(/[^\d.]/g, ''))}
              aria-label={`Target weight in ${unit}`}
              className="num"
              data-autofocus
            />
            <span className="faint">{unit}</span>
          </label>
          <button type="button" className="plate-nudge" aria-label={`Plus ${step} ${unit}`} onClick={() => nudge(step)}>
            <Icon name="plus" size={20} />
          </button>
        </div>

        <div className="plate-bar" aria-hidden="true">
          <span className="plate-sleeve-stub" />
          <span className="plate-collar" />
          <div className="plate-stack">
            <AnimatePresence initial={false}>
              {load.perSide.map((p, i) => {
                const st = PLATE_STYLE[`${unit}-${p}`] ?? { color: '#888', h: 50 };
                return (
                  <motion.span
                    key={`${i}-${p}`}
                    className="plate"
                    style={{ height: `${st.h}%`, background: st.color }}
                    initial={{ opacity: 0, x: 24 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 24 }}
                    transition={{ type: 'spring', stiffness: 600, damping: 38 }}
                  >
                    <span className="plate-label num">{fmt(p)}</span>
                  </motion.span>
                );
              })}
            </AnimatePresence>
          </div>
          <span className="plate-sleeve" />
        </div>

        <div className="plate-summary">
          <div className="eyebrow">Each side</div>
          <div className="plate-per-side num">{load.perSide.length ? describePlates(load.perSide) : 'Empty bar'}</div>
          {load.remainder > 0.001 && (
            <div className="plate-warn">
              <Icon name="info" size={14} /> Closest is {fmt(load.total)} {unit} — {fmt(load.remainder)} {unit} short
            </div>
          )}
          {target > 0 && target < bar && (
            <div className="plate-warn">
              <Icon name="info" size={14} /> Lighter than the {fmt(bar)} {unit} bar
            </div>
          )}
        </div>

        <div className="plate-bar-pick">
          <span className="faint">Bar</span>
          <Segmented
            size="sm"
            label="Bar weight"
            value={String(bar)}
            onChange={(v) => updateProfile({ bar: { ...useApp.getState().profile.bar, [unit]: Number(v) } })}
            options={barOptions.map((b) => ({ value: String(b), label: `${fmt(b)} ${unit}` }))}
          />
        </div>
        {initialKg != null && initialKg > 0 && Math.abs(toDisplay(initialKg, unit) - target) > 0.01 && (
          <button type="button" className="plate-reset faint" onClick={() => setValue(fmtWeight(initialKg, unit))}>
            Reset to {fmtWeight(initialKg, unit)} {unit}
          </button>
        )}
      </div>
    </Sheet>
  );
}
