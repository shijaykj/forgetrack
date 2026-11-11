import { useState } from 'react';
import { CATEGORIES, EQUIPMENT, ExerciseSchema, MUSCLE_GROUPS, TRACKING, type Exercise, type MuscleGroup } from '@/domain/types';
import { useApp } from '@/store/app';
import { CATEGORY_LABEL, EQUIPMENT_LABEL, MUSCLE_LABEL, TRACKING_LABEL } from '@/data/exercises';
import { Button, Chip, TextArea, TextInput } from '@/components/ui';
import { toast } from '@/store/ui';

export function CustomExerciseForm({
  initial,
  initialName = '',
  onSaved,
  onCancel,
}: {
  initial?: Exercise;
  initialName?: string;
  onSaved: (id: string) => void;
  onCancel: () => void;
}) {
  const save = useApp((s) => s.saveCustomExercise);
  const [name, setName] = useState(initial?.name ?? initialName);
  const [primary, setPrimary] = useState<MuscleGroup>(initial?.primaryMuscle ?? 'chest');
  const [secondary, setSecondary] = useState<MuscleGroup[]>(initial?.secondaryMuscles ?? []);
  const [equipment, setEquipment] = useState<Exercise['equipment']>(initial?.equipment ?? 'barbell');
  const [category, setCategory] = useState<Exercise['category']>(initial?.category ?? 'compound');
  const [tracking, setTracking] = useState<Exercise['tracking']>(initial?.tracking ?? 'weight_reps');
  const [instructions, setInstructions] = useState((initial?.instructions ?? []).join('\n'));
  const [error, setError] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const draft = {
      id: initial?.id ?? 'pending',
      name: name.trim(),
      primaryMuscle: primary,
      secondaryMuscles: secondary.filter((m) => m !== primary),
      equipment,
      category,
      tracking,
      instructions: instructions.split('\n').map((l) => l.trim()).filter(Boolean),
      isCustom: true,
    };
    const parsed = ExerciseSchema.safeParse(draft);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.path[0] === 'name' ? 'Give the exercise a name (1–80 characters).' : 'Please check the fields.');
      return;
    }
    const { id: _id, isCustom: _c, ...rest } = parsed.data;
    const id = save({ ...rest, ...(initial ? { id: initial.id } : {}) });
    toast({ message: initial ? 'Exercise updated' : `${draft.name} created`, tone: 'success' });
    onSaved(id);
  };

  return (
    <form className="stack custom-form" onSubmit={submit} noValidate>
      <TextInput label="Name" value={name} onChange={(e) => (setName(e.target.value), setError(''))} placeholder="e.g. Landmine Press" maxLength={80} data-autofocus autoFocus />
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <fieldset className="fs">
        <legend className="field-label">Primary muscle</legend>
        <div className="chip-wrap">
          {MUSCLE_GROUPS.map((m) => (
            <Chip key={m} active={primary === m} onClick={() => setPrimary(m)}>
              {MUSCLE_LABEL[m]}
            </Chip>
          ))}
        </div>
      </fieldset>
      <fieldset className="fs">
        <legend className="field-label">Secondary muscles</legend>
        <div className="chip-wrap">
          {MUSCLE_GROUPS.filter((m) => m !== primary).map((m) => (
            <Chip key={m} active={secondary.includes(m)} onClick={() => setSecondary((s) => (s.includes(m) ? s.filter((x) => x !== m) : [...s, m]))}>
              {MUSCLE_LABEL[m]}
            </Chip>
          ))}
        </div>
      </fieldset>
      <div className="form-grid">
        <label className="field">
          <span className="field-label">Equipment</span>
          <select className="input" value={equipment} onChange={(e) => setEquipment(e.target.value as Exercise['equipment'])}>
            {EQUIPMENT.map((x) => (
              <option key={x} value={x}>
                {EQUIPMENT_LABEL[x]}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="field-label">Category</span>
          <select className="input" value={category} onChange={(e) => setCategory(e.target.value as Exercise['category'])}>
            {CATEGORIES.map((x) => (
              <option key={x} value={x}>
                {CATEGORY_LABEL[x]}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="field">
        <span className="field-label">Tracking</span>
        <select className="input" value={tracking} onChange={(e) => setTracking(e.target.value as Exercise['tracking'])}>
          {TRACKING.map((x) => (
            <option key={x} value={x}>
              {TRACKING_LABEL[x]}
            </option>
          ))}
        </select>
      </label>
      <TextArea label="Instructions (one step per line, optional)" value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={3} />
      <div className="row" style={{ justifyContent: 'flex-end' }}>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="primary" type="submit" icon="check">
          {initial ? 'Save' : 'Create exercise'}
        </Button>
      </div>
    </form>
  );
}
