import { useMemo, useState } from 'react';
import { useApp } from '@/store/app';
import { toast } from '@/store/ui';
import { LineChart } from '@/components/charts';
import { Button, Card, SectionHeader } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { fmtDate, fmtWeight, fromDisplay, toDisplay } from '@/lib/util';

export function BodyweightCard() {
  const entries = useApp((s) => s.bodyweight);
  const unit = useApp((s) => s.profile.unit);
  const add = useApp((s) => s.addBodyweight);
  const del = useApp((s) => s.deleteBodyweight);
  const [value, setValue] = useState('');
  const [showAll, setShowAll] = useState(false);

  const sorted = useMemo(() => entries.slice().sort((a, b) => a.date - b.date), [entries]);
  const last = sorted[sorted.length - 1];
  const first30 = sorted.find((e) => e.date >= Date.now() - 30 * 86_400_000);
  const change = last && first30 && first30 !== last ? last.weight - first30.weight : null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const n = parseFloat(value.replace(',', '.'));
    if (!Number.isFinite(n) || n <= 0 || n > 1000) return toast({ message: 'Enter a valid weight', tone: 'danger' });
    add(fromDisplay(n, unit));
    setValue('');
    toast({ message: 'Bodyweight logged', tone: 'success' });
  };

  return (
    <Card>
      <SectionHeader
        eyebrow="Bodyweight"
        title={last ? `${fmtWeight(last.weight, unit)} ${unit}` : 'Track bodyweight'}
        action={
          change != null && (
            <span className="faint num" style={{ fontSize: 13 }}>
              {change >= 0 ? '+' : '−'}
              {fmtWeight(Math.abs(change), unit)} {unit} / 30d
            </span>
          )
        }
      />
      <form className="bw-form" onSubmit={submit}>
        <input className="input num" inputMode="decimal" placeholder={last ? fmtWeight(last.weight, unit) : `Weight in ${unit}`} value={value} onChange={(e) => setValue(e.target.value)} aria-label={`Bodyweight in ${unit}`} />
        <Button type="submit" variant="primary" icon="plus">
          Log
        </Button>
      </form>
      {sorted.length > 1 ? (
        <LineChart data={sorted.map((e) => ({ t: e.date, value: toDisplay(e.weight, unit) }))} height={180} color="var(--steel)" format={(v) => (Math.round(v * 10) / 10).toString()} />
      ) : (
        <p className="faint" style={{ fontSize: 13, padding: '12px 0' }}>
          Log a couple of entries to see your trend.
        </p>
      )}
      {sorted.length > 0 && (
        <>
          <ul className="bw-list">
            {(showAll ? sorted.slice().reverse() : sorted.slice(-3).reverse()).map((e) => (
              <li key={e.id}>
                <span className="faint">{fmtDate(e.date)}</span>
                <span className="num">
                  {fmtWeight(e.weight, unit)} {unit}
                </span>
                <button
                  type="button"
                  className="icon-btn icon-btn-danger"
                  aria-label="Delete entry"
                  onClick={() => {
                    del(e.id);
                    toast({ message: 'Entry deleted', action: { label: 'Undo', run: () => useApp.getState().addBodyweight(e.weight, e.date) } });
                  }}
                >
                  <Icon name="trash" size={15} />
                </button>
              </li>
            ))}
          </ul>
          {sorted.length > 3 && (
            <button type="button" className="link-sm" onClick={() => setShowAll((s) => !s)} style={{ marginTop: 6 }}>
              {showAll ? 'Show less' : `Show all ${sorted.length}`}
            </button>
          )}
        </>
      )}
    </Card>
  );
}
