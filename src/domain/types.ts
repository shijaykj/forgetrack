import { z } from 'zod';

export const MUSCLE_GROUPS = [
  'chest',
  'back',
  'shoulders',
  'biceps',
  'triceps',
  'quadriceps',
  'hamstrings',
  'glutes',
  'calves',
  'abs',
  'forearms',
] as const;
export const MuscleGroupSchema = z.enum(MUSCLE_GROUPS);
export type MuscleGroup = z.infer<typeof MuscleGroupSchema>;

export const EQUIPMENT = [
  'barbell',
  'dumbbell',
  'machine',
  'cable',
  'bodyweight',
  'kettlebell',
  'band',
  'smith',
  'ez-bar',
  'other',
] as const;
export const EquipmentSchema = z.enum(EQUIPMENT);
export type Equipment = z.infer<typeof EquipmentSchema>;

export const CATEGORIES = ['compound', 'isolation', 'core', 'cardio', 'mobility'] as const;
export const CategorySchema = z.enum(CATEGORIES);
export type ExerciseCategory = z.infer<typeof CategorySchema>;

/** How an exercise is measured. */
export const TRACKING = ['weight_reps', 'bodyweight_reps', 'duration'] as const;
export const TrackingSchema = z.enum(TRACKING);
export type Tracking = z.infer<typeof TrackingSchema>;

export const SET_TYPES = ['warmup', 'normal', 'failure', 'drop'] as const;
export const SetTypeSchema = z.enum(SET_TYPES);
export type SetType = z.infer<typeof SetTypeSchema>;

const id = z.string().min(1);
const num = z.number().finite().nonnegative();
const optNum = num.nullable().optional();

export const ExerciseSchema = z.object({
  id,
  name: z.string().trim().min(1).max(80),
  primaryMuscle: MuscleGroupSchema,
  secondaryMuscles: z.array(MuscleGroupSchema).default([]),
  equipment: EquipmentSchema,
  category: CategorySchema,
  tracking: TrackingSchema,
  instructions: z.array(z.string()).default([]),
  isCustom: z.boolean().default(false),
  defaultRestSec: z.number().int().min(0).max(1800).optional(),
});
export type Exercise = z.infer<typeof ExerciseSchema>;

export const TemplateSetSchema = z.object({
  id,
  type: SetTypeSchema,
  weight: optNum,
  reps: optNum,
  durationSec: optNum,
});
export type TemplateSet = z.infer<typeof TemplateSetSchema>;

export const RoutineExerciseSchema = z.object({
  id,
  exerciseId: id,
  restSec: z.number().int().min(0).max(1800).optional(),
  notes: z.string().default(''),
  supersetId: z.string().nullable().optional(),
  sets: z.array(TemplateSetSchema),
});
export type RoutineExercise = z.infer<typeof RoutineExerciseSchema>;

export const RoutineSchema = z.object({
  id,
  name: z.string().trim().min(1).max(60),
  notes: z.string().default(''),
  exercises: z.array(RoutineExerciseSchema),
  createdAt: z.number(),
  updatedAt: z.number(),
  lastUsedAt: z.number().optional(),
});
export type Routine = z.infer<typeof RoutineSchema>;

export const WorkoutSetSchema = z.object({
  id,
  type: SetTypeSchema,
  weight: optNum,
  reps: optNum,
  durationSec: optNum,
  completed: z.boolean(),
  completedAt: z.number().optional(),
});
export type WorkoutSet = z.infer<typeof WorkoutSetSchema>;

export const WorkoutExerciseSchema = z.object({
  id,
  exerciseId: id,
  restSec: z.number().int().min(0).max(1800).optional(),
  notes: z.string().default(''),
  supersetId: z.string().nullable().optional(),
  sets: z.array(WorkoutSetSchema),
});
export type WorkoutExercise = z.infer<typeof WorkoutExerciseSchema>;

export const WorkoutSchema = z.object({
  id,
  name: z.string().max(80),
  routineId: z.string().optional(),
  startedAt: z.number(),
  endedAt: z.number().optional(),
  notes: z.string().default(''),
  exercises: z.array(WorkoutExerciseSchema),
});
export type Workout = z.infer<typeof WorkoutSchema>;

export const BodyweightEntrySchema = z.object({
  id,
  date: z.number(),
  weight: z.number().positive().max(700),
});
export type BodyweightEntry = z.infer<typeof BodyweightEntrySchema>;

export const UnitSchema = z.enum(['kg', 'lb']);
export type Unit = z.infer<typeof UnitSchema>;

export const UserProfileSchema = z.object({
  name: z.string().max(40).default(''),
  unit: UnitSchema.default('kg'),
  defaultRestSec: z.number().int().min(0).max(1800).default(120),
  theme: z.enum(['dark', 'light', 'system']).default('dark'),
  sound: z.boolean().default(true),
  haptics: z.boolean().default(true),
  keepAwake: z.boolean().default(true),
  weekStartsOn: z.union([z.literal(0), z.literal(1)]).default(1),
  weeklyGoal: z.number().int().min(1).max(14).default(4),
});
export type UserProfile = z.infer<typeof UserProfileSchema>;

export const PR_KINDS = ['weight', 'e1rm', 'volume', 'reps'] as const;
export type PRKind = (typeof PR_KINDS)[number];

/** Derived — computed from completed workouts, never persisted. */
export interface PersonalRecord {
  exerciseId: string;
  kind: PRKind;
  value: number;
  weight: number;
  reps: number;
  workoutId: string;
  setId: string;
  date: number;
}

export const AppDataSchema = z.object({
  profile: UserProfileSchema,
  customExercises: z.array(ExerciseSchema),
  routines: z.array(RoutineSchema),
  workouts: z.array(WorkoutSchema),
  bodyweight: z.array(BodyweightEntrySchema),
  active: WorkoutSchema.nullable(),
});
export type AppData = z.infer<typeof AppDataSchema>;

export const BackupSchema = z.object({
  app: z.literal('forgetrack'),
  version: z.number().int(),
  exportedAt: z.number(),
  data: AppDataSchema,
});
export type Backup = z.infer<typeof BackupSchema>;
