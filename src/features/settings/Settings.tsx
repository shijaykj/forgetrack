import { useRef, useState, type ReactNode } from 'react';
import { useApp, snapshot, SCHEMA_VERSION } from '@/store/app';
import { toast } from '@/store/ui';
import { useDocumentTitle, useExerciseLookup } from '@/lib/hooks';
import { BackupSchema, type Backup } from '@/domain/types';
import { generateSampleData } from '@/data/sample';
import { Icon, Logo, type IconName } from '@/components/Icon';
import { Button, Card, ConfirmButton, Segmented, Switch, TextInput } from '@/components/ui';
import { fmtClock, fmtWeight } from '@/lib/util';
import '@/styles/pages.css';
import '@/styles/workout.css';

const RESTS = [60, 90, 120, 150, 180, 240];

function Row({ icon, title, sub, children }: { icon: IconName; title: string; sub?: ReactNode; children: ReactNode }) {
  return (
    <div className="set-item">
      <span className="set-item-icon">
        <Icon name={icon} size={18} />
      </span>
      <div className="set-item-text">
        <div className="setting-title">{title}</div>
        {sub && <div className="faint set-item-sub">{sub}</div>}
      </div>
      <div className="set-item-ctl">{children}</div>
    </div>
  );
}

function download(name: string, data: string, type: string) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function Settings() {
  useDocumentTitle('Settings');
  const profile = useApp((s) => s.profile);
  const counts = {
    w: useApp((s) => s.workouts.length),
    r: useApp((s) => s.routines.length),
    c: useApp((s) => s.customExercises.length),
  };
  const update = useApp((s) => s.updateProfile);
  const lookup = useExerciseLookup();
  const fileRef = useRef<HTMLInputElement>(null);
  const [notif, setNotif] = useState(() => ('Notification' in window ? Notification.permission : 'unsupported'));
  const stamp = new Date().toISOString().slice(0, 10);

  const exportJSON = () => {
    const backup: Backup = { app: 'forgetrack', version: SCHEMA_VERSION, exportedAt: Date.now(), data: snapshot() };
    download(`forgetrack-backup-${stamp}.json`, JSON.stringify(backup, null, 2), 'application/json');
    toast({ message: 'Backup downloaded', tone: 'success' });
  };
  const exportCSV = () => {
    const rows = [['date', 'workout', 'exercise', 'set', 'type', `weight_${profile.unit}`, 'reps', 'duration_sec']];
    for (const w of useApp.getState().workouts.slice().sort((a, b) => a.startedAt - b.startedAt))
      for (const e of w.exercises)
        e.sets.forEach((s, i) =>
          rows.push([new Date(w.startedAt).toISOString(), w.name, lookup(e.exerciseId)?.name ?? e.exerciseId, String(i + 1), s.type, s.weight != null ? fmtWeight(s.weight, profile.unit) : '', String(s.reps ?? ''), String(s.durationSec ?? '')]),
        );
    const csv = rows.map((r) => r.map((c) => (/[",\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(',')).join('\n');
    download(`forgetrack-sets-${stamp}.csv`, csv, 'text/csv');
  };
  const importJSON = async (file: File) => {
    try {
      const parsed = BackupSchema.safeParse(JSON.parse(await file.text()));
      if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? 'Invalid backup');
      const before = snapshot();
      useApp.getState().replaceAll(parsed.data.data);
      toast({ message: `Restored ${parsed.data.data.workouts.length} workouts`, tone: 'success', action: { label: 'Undo', run: () => useApp.getState().replaceAll(before) } });
    } catch (err) {
      toast({ message: `Import failed: ${(err as Error).message}`, tone: 'danger' });
    }
  };

  return (
    <div className="page page-narrow">
      <div className="page-head">
        <div>
          <div className="eyebrow">Preferences</div>
          <h1>Settings</h1>
        </div>
      </div>

      <div className="stack">
        <Card className="settings-card">
          <div className="eyebrow settings-cap">Profile</div>
          <div className="set-item">
            <span className="set-item-icon">
              <Icon name="user" size={18} />
            </span>
            <TextInput value={profile.name} placeholder="Your name" onChange={(e) => update({ name: e.target.value.slice(0, 40) })} aria-label="Display name" className="set-name" />
          </div>
          <Row icon="target" title="Weekly goal" sub="Sessions per week on Today's ring">
            <div className="stepper">
              <button type="button" aria-label="Decrease goal" onClick={() => update({ weeklyGoal: Math.max(1, profile.weeklyGoal - 1) })}>
                <Icon name="minus" size={16} />
              </button>
              <span className="num">{profile.weeklyGoal}</span>
              <button type="button" aria-label="Increase goal" onClick={() => update({ weeklyGoal: Math.min(14, profile.weeklyGoal + 1) })}>
                <Icon name="plus" size={16} />
              </button>
            </div>
          </Row>
        </Card>

        <Card className="settings-card">
          <div className="eyebrow settings-cap">Training</div>
          <Row icon="scale" title="Units" sub="Stored precisely; switch any time">
            <Segmented size="sm" label="Units" value={profile.unit} onChange={(unit) => update({ unit })} options={[{ value: 'kg', label: 'kg' }, { value: 'lb', label: 'lb' }]} />
          </Row>
          <div className="set-item set-item-col">
            <div className="row" style={{ gap: 12 }}>
              <span className="set-item-icon">
                <Icon name="timer" size={18} />
              </span>
              <div className="set-item-text">
                <div className="setting-title">Default rest</div>
                <div className="faint set-item-sub">Library exercises carry their own sensible defaults; override per exercise in a workout.</div>
              </div>
            </div>
            <div className="rest-grid settings-rest">
              {RESTS.map((s) => (
                <button key={s} type="button" className={`rest-opt num ${profile.defaultRestSec === s ? 'on' : ''}`} onClick={() => update({ defaultRestSec: s })}>
                  {fmtClock(s)}
                </button>
              ))}
            </div>
          </div>
          <Row icon="calendar" title="Week starts on">
            <Segmented size="sm" label="Week start" value={String(profile.weekStartsOn) as '0' | '1'} onChange={(v) => update({ weekStartsOn: v === '1' ? 1 : 0 })} options={[{ value: '1', label: 'Mon' }, { value: '0', label: 'Sun' }]} />
          </Row>
        </Card>

        <Card className="settings-card">
          <div className="eyebrow settings-cap">Experience</div>
          <Row icon="moon" title="Theme" sub="Dark is tuned for the gym floor">
            <Segmented size="sm" label="Theme" value={profile.theme} onChange={(theme) => update({ theme })} options={[{ value: 'dark', label: 'Dark' }, { value: 'light', label: 'Light' }, { value: 'system', label: 'Auto' }]} />
          </Row>
          <Row icon="bolt" title="Sounds" sub="Soft chime when rest ends">
            <Switch checked={profile.sound} onChange={(sound) => update({ sound })} label="Sounds" />
          </Row>
          <Row icon="pulse" title="Haptics" sub="Vibration feedback where supported">
            <Switch checked={profile.haptics} onChange={(haptics) => update({ haptics })} label="Haptics" />
          </Row>
          <Row icon="info" title="Rest notifications" sub={notif === 'granted' ? 'Enabled — alerts when the app is in the background' : notif === 'denied' ? 'Blocked in browser settings' : notif === 'unsupported' ? 'Not supported on this browser' : 'Get alerted when rest ends in another app'}>
            {notif === 'default' && (
              <Button size="sm" onClick={async () => setNotif(await Notification.requestPermission())}>
                Enable
              </Button>
            )}
          </Row>
        </Card>

        <Card className="settings-card">
          <div className="eyebrow settings-cap">Your data</div>
          <p className="muted settings-note">
            Everything lives on this device in IndexedDB — {counts.w} workouts, {counts.r} routines, {counts.c} custom exercises. No account, no limits. Back up regularly.
          </p>
          <div className="settings-actions">
            <Button icon="download" onClick={exportJSON}>
              Export backup
            </Button>
            <Button icon="upload" onClick={() => fileRef.current?.click()}>
              Restore backup
            </Button>
            <Button icon="layers" onClick={exportCSV}>
              Export sets (CSV)
            </Button>
            <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => (e.target.files?.[0] && importJSON(e.target.files[0]), (e.target.value = ''))} />
          </div>
          <div className="divider" style={{ margin: '16px 0' }} />
          <div className="settings-actions">
            <ConfirmButton
              icon="sparkle"
              confirmLabel="Replace all data with samples?"
              onConfirm={() => {
                const before = snapshot();
                useApp.getState().replaceAll(generateSampleData());
                toast({ message: 'Sample data loaded', tone: 'success', action: { label: 'Undo', run: () => useApp.getState().replaceAll(before) } });
              }}
            >
              Load sample data
            </ConfirmButton>
            <ConfirmButton
              variant="ghost"
              icon="trash"
              confirmLabel="Erase everything? Tap again"
              onConfirm={() => {
                const before = snapshot();
                useApp.getState().resetAll();
                toast({ message: 'All data erased', tone: 'danger', action: { label: 'Undo', run: () => useApp.getState().replaceAll(before) } });
              }}
            >
              Erase all data
            </ConfirmButton>
          </div>
        </Card>

        <div className="about">
          <Logo size={34} />
          <div>
            <strong className="brand-word">
              FORGE<span>TRACK</span>
            </strong>
            <p className="faint" style={{ fontSize: 12.5 }}>
              v1.0 · local-first · self-hosted. Shortcuts: <span className="kbd">N</span> start/resume workout.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
