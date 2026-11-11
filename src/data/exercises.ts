import type { Equipment, Exercise, ExerciseCategory, MuscleGroup, Tracking } from '@/domain/types';

type Row = [
  id: string,
  name: string,
  primary: MuscleGroup,
  secondary: MuscleGroup[],
  equipment: Equipment,
  category: ExerciseCategory,
  instructions: string[],
  tracking?: Tracking,
  rest?: number,
];

/* Instructions are short original cues — not a substitute for coaching. */
const rows: Row[] = [
  // Chest
  ['bench-press', 'Bench Press', 'chest', ['triceps', 'shoulders'], 'barbell', 'compound', ['Lie with eyes under the bar, feet planted, shoulder blades pinned back.', 'Lower the bar under control to the mid-chest.', 'Press up and slightly back until elbows lock.'], 'weight_reps', 180],
  ['incline-bench-press', 'Incline Bench Press', 'chest', ['shoulders', 'triceps'], 'barbell', 'compound', ['Set the bench to roughly 30°.', 'Lower the bar to the upper chest.', 'Press up over the shoulders.'], 'weight_reps', 150],
  ['decline-bench-press', 'Decline Bench Press', 'chest', ['triceps'], 'barbell', 'compound', ['Secure your legs on a decline bench.', 'Lower the bar to the lower chest.', 'Press back to lockout.']],
  ['db-bench-press', 'Dumbbell Bench Press', 'chest', ['triceps', 'shoulders'], 'dumbbell', 'compound', ['Kick the dumbbells up and set your shoulders.', 'Lower with elbows around 45° from the torso.', 'Press up, bringing the bells slightly together.']],
  ['incline-db-press', 'Incline Dumbbell Press', 'chest', ['shoulders', 'triceps'], 'dumbbell', 'compound', ['Bench at 30–45°.', 'Lower the dumbbells beside the upper chest.', 'Press up and in without clanking.']],
  ['chest-fly-cable', 'Cable Fly', 'chest', ['shoulders'], 'cable', 'isolation', ['Set pulleys at shoulder height and step forward.', 'With soft elbows, sweep the handles together.', 'Return slowly until you feel a stretch.']],
  ['pec-deck', 'Pec Deck', 'chest', [], 'machine', 'isolation', ['Adjust the seat so handles are at chest height.', 'Squeeze the pads together.', 'Control the return.']],
  ['push-up', 'Push-Up', 'chest', ['triceps', 'shoulders', 'abs'], 'bodyweight', 'compound', ['Hands just wider than shoulders, body in one line.', 'Lower until the chest nearly touches the floor.', 'Push back up without sagging hips.'], 'bodyweight_reps', 60],
  ['dip', 'Dip', 'chest', ['triceps', 'shoulders'], 'bodyweight', 'compound', ['Support yourself on parallel bars.', 'Lean slightly forward and lower until shoulders are below elbows.', 'Press back to lockout.'], 'bodyweight_reps', 120],
  ['machine-chest-press', 'Machine Chest Press', 'chest', ['triceps'], 'machine', 'compound', ['Set the seat so handles align with mid-chest.', 'Press forward to near lockout.', 'Return under control.']],
  // Back
  ['deadlift', 'Deadlift', 'back', ['hamstrings', 'glutes', 'forearms'], 'barbell', 'compound', ['Bar over mid-foot, hinge and grip just outside the legs.', 'Brace, pull the slack out, push the floor away.', 'Stand tall, then return the bar along the same path.'], 'weight_reps', 240],
  ['barbell-row', 'Barbell Row', 'back', ['biceps', 'forearms'], 'barbell', 'compound', ['Hinge to roughly 45° with a neutral spine.', 'Row the bar to the lower ribs.', 'Lower with control.'], 'weight_reps', 150],
  ['pull-up', 'Pull-Up', 'back', ['biceps', 'forearms'], 'bodyweight', 'compound', ['Hang with an overhand grip, shoulders active.', 'Pull until the chin clears the bar.', 'Lower to a full hang.'], 'bodyweight_reps', 120],
  ['chin-up', 'Chin-Up', 'back', ['biceps'], 'bodyweight', 'compound', ['Hang with an underhand grip.', 'Pull the chest toward the bar.', 'Lower all the way down.'], 'bodyweight_reps', 120],
  ['lat-pulldown', 'Lat Pulldown', 'back', ['biceps'], 'cable', 'compound', ['Grip wide, thighs under the pad.', 'Pull the bar to the upper chest, elbows down.', 'Let it rise until arms are straight.']],
  ['seated-cable-row', 'Seated Cable Row', 'back', ['biceps'], 'cable', 'compound', ['Sit tall with a slight knee bend.', 'Row the handle to the stomach.', 'Reach forward while keeping the back neutral.']],
  ['db-row', 'One-Arm Dumbbell Row', 'back', ['biceps'], 'dumbbell', 'compound', ['Support one hand and knee on a bench.', 'Row the dumbbell toward the hip.', 'Lower to a full stretch.']],
  ['t-bar-row', 'T-Bar Row', 'back', ['biceps'], 'machine', 'compound', ['Chest on the pad or hinge over the bar.', 'Row toward the chest.', 'Lower slowly.']],
  ['face-pull', 'Face Pull', 'shoulders', ['back'], 'cable', 'isolation', ['Rope at upper-chest height.', 'Pull toward the face, splitting the rope.', 'Finish with hands beside the ears.'], 'weight_reps', 60],
  ['back-extension', 'Back Extension', 'back', ['glutes', 'hamstrings'], 'bodyweight', 'isolation', ['Hips on the pad, ankles locked.', 'Lower the torso with a neutral spine.', 'Rise until the body is straight.'], 'bodyweight_reps', 60],
  ['rack-pull', 'Rack Pull', 'back', ['glutes', 'forearms'], 'barbell', 'compound', ['Bar on pins around knee height.', 'Brace and drive the hips through.', 'Lower back to the pins.'], 'weight_reps', 180],
  // Shoulders
  ['overhead-press', 'Overhead Press', 'shoulders', ['triceps', 'abs'], 'barbell', 'compound', ['Bar on the front delts, grip just outside shoulders.', 'Press straight up, moving the head back then through.', 'Lock out overhead with ribs down.'], 'weight_reps', 150],
  ['db-shoulder-press', 'Dumbbell Shoulder Press', 'shoulders', ['triceps'], 'dumbbell', 'compound', ['Sit tall with dumbbells at ear height.', 'Press up until arms are straight.', 'Lower to the starting position.']],
  ['lateral-raise', 'Lateral Raise', 'shoulders', [], 'dumbbell', 'isolation', ['Stand tall, slight bend in the elbows.', 'Raise the dumbbells out to shoulder height.', 'Lower slowly.'], 'weight_reps', 60],
  ['cable-lateral-raise', 'Cable Lateral Raise', 'shoulders', [], 'cable', 'isolation', ['Handle in the far hand, pulley low.', 'Sweep the arm out to shoulder height.', 'Return with control.'], 'weight_reps', 60],
  ['rear-delt-fly', 'Rear Delt Fly', 'shoulders', ['back'], 'dumbbell', 'isolation', ['Hinge forward with a flat back.', 'Raise the arms out to the sides.', 'Lower slowly.'], 'weight_reps', 60],
  ['arnold-press', 'Arnold Press', 'shoulders', ['triceps'], 'dumbbell', 'compound', ['Start with palms facing you at chin height.', 'Rotate the palms out as you press up.', 'Reverse on the way down.']],
  ['upright-row', 'Upright Row', 'shoulders', ['back'], 'barbell', 'compound', ['Grip a little wider than shoulder width.', 'Pull the bar up, elbows leading.', 'Stop around chest height.']],
  ['machine-shoulder-press', 'Machine Shoulder Press', 'shoulders', ['triceps'], 'machine', 'compound', ['Adjust seat so handles start at shoulder level.', 'Press up.', 'Lower under control.']],
  // Biceps
  ['barbell-curl', 'Barbell Curl', 'biceps', ['forearms'], 'barbell', 'isolation', ['Stand tall, elbows by your sides.', 'Curl the bar toward the shoulders.', 'Lower fully without swinging.'], 'weight_reps', 75],
  ['db-curl', 'Dumbbell Curl', 'biceps', ['forearms'], 'dumbbell', 'isolation', ['Palms forward, elbows fixed.', 'Curl up, squeezing at the top.', 'Lower slowly.'], 'weight_reps', 75],
  ['hammer-curl', 'Hammer Curl', 'biceps', ['forearms'], 'dumbbell', 'isolation', ['Neutral grip, palms facing each other.', 'Curl up without moving the elbows.', 'Lower under control.'], 'weight_reps', 75],
  ['preacher-curl', 'Preacher Curl', 'biceps', [], 'ez-bar', 'isolation', ['Upper arms flat on the pad.', 'Curl up to just short of vertical.', 'Lower to a near-full stretch.'], 'weight_reps', 75],
  ['cable-curl', 'Cable Curl', 'biceps', ['forearms'], 'cable', 'isolation', ['Bar on a low pulley.', 'Curl up with elbows pinned.', 'Return slowly.'], 'weight_reps', 60],
  ['incline-db-curl', 'Incline Dumbbell Curl', 'biceps', [], 'dumbbell', 'isolation', ['Lie back on an incline bench, arms hanging.', 'Curl without letting the elbows drift forward.', 'Lower to full extension.'], 'weight_reps', 75],
  // Triceps
  ['tricep-pushdown', 'Tricep Pushdown', 'triceps', [], 'cable', 'isolation', ['Elbows tucked, bar or rope at chest height.', 'Push down until arms are straight.', 'Let it rise to about 90°.'], 'weight_reps', 60],
  ['overhead-tricep-ext', 'Overhead Tricep Extension', 'triceps', [], 'cable', 'isolation', ['Face away from the pulley, rope behind the head.', 'Extend the arms forward and up.', 'Return to a deep stretch.'], 'weight_reps', 60],
  ['skull-crusher', 'Skull Crusher', 'triceps', [], 'ez-bar', 'isolation', ['Lie on a bench, bar over the shoulders.', 'Bend the elbows to lower the bar behind the head.', 'Extend back up.'], 'weight_reps', 75],
  ['close-grip-bench', 'Close-Grip Bench Press', 'triceps', ['chest', 'shoulders'], 'barbell', 'compound', ['Grip about shoulder width.', 'Lower to the lower chest, elbows close.', 'Press to lockout.'], 'weight_reps', 150],
  ['tricep-dip-bench', 'Bench Dip', 'triceps', ['chest'], 'bodyweight', 'isolation', ['Hands on a bench behind you.', 'Lower by bending the elbows.', 'Press back up.'], 'bodyweight_reps', 60],
  // Legs
  ['back-squat', 'Back Squat', 'quadriceps', ['glutes', 'hamstrings', 'abs'], 'barbell', 'compound', ['Bar on the upper back, feet shoulder width.', 'Brace and sit down between the hips.', 'Drive up, keeping the chest tall.'], 'weight_reps', 210],
  ['front-squat', 'Front Squat', 'quadriceps', ['glutes', 'abs'], 'barbell', 'compound', ['Bar racked on the front delts, elbows high.', 'Squat down with an upright torso.', 'Stand back up.'], 'weight_reps', 180],
  ['leg-press', 'Leg Press', 'quadriceps', ['glutes', 'hamstrings'], 'machine', 'compound', ['Feet shoulder width on the platform.', 'Lower until knees reach about 90°.', 'Press without locking the knees hard.'], 'weight_reps', 150],
  ['hack-squat', 'Hack Squat', 'quadriceps', ['glutes'], 'machine', 'compound', ['Shoulders under the pads.', 'Descend with control.', 'Drive back up.'], 'weight_reps', 150],
  ['leg-extension', 'Leg Extension', 'quadriceps', [], 'machine', 'isolation', ['Pad on the lower shins.', 'Extend the knees fully.', 'Lower slowly.'], 'weight_reps', 60],
  ['bulgarian-split-squat', 'Bulgarian Split Squat', 'quadriceps', ['glutes'], 'dumbbell', 'compound', ['Rear foot on a bench.', 'Lower the back knee toward the floor.', 'Drive through the front foot.'], 'weight_reps', 90],
  ['walking-lunge', 'Walking Lunge', 'quadriceps', ['glutes', 'hamstrings'], 'dumbbell', 'compound', ['Step forward into a lunge.', 'Lower the back knee near the floor.', 'Push through and step into the next rep.'], 'weight_reps', 90],
  ['goblet-squat', 'Goblet Squat', 'quadriceps', ['glutes'], 'kettlebell', 'compound', ['Hold a bell at the chest.', 'Squat down between the knees.', 'Stand tall.'], 'weight_reps', 90],
  ['romanian-deadlift', 'Romanian Deadlift', 'hamstrings', ['glutes', 'back'], 'barbell', 'compound', ['Start standing with soft knees.', 'Push the hips back, sliding the bar down the thighs.', 'Return by driving the hips forward.'], 'weight_reps', 150],
  ['leg-curl', 'Lying Leg Curl', 'hamstrings', ['calves'], 'machine', 'isolation', ['Pad just above the heels.', 'Curl the heels toward the glutes.', 'Lower under control.'], 'weight_reps', 60],
  ['seated-leg-curl', 'Seated Leg Curl', 'hamstrings', [], 'machine', 'isolation', ['Thigh pad snug, knee aligned with the pivot.', 'Curl down and back.', 'Return slowly.'], 'weight_reps', 60],
  ['good-morning', 'Good Morning', 'hamstrings', ['back', 'glutes'], 'barbell', 'compound', ['Bar on the upper back.', 'Hinge forward with soft knees.', 'Return to standing.']],
  ['nordic-curl', 'Nordic Curl', 'hamstrings', [], 'bodyweight', 'isolation', ['Kneel with ankles anchored.', 'Lower the torso forward as slowly as possible.', 'Push off the floor to return.'], 'bodyweight_reps', 90],
  ['hip-thrust', 'Hip Thrust', 'glutes', ['hamstrings'], 'barbell', 'compound', ['Upper back on a bench, bar over the hips.', 'Drive the hips up until the torso is flat.', 'Lower with control.'], 'weight_reps', 120],
  ['glute-bridge', 'Glute Bridge', 'glutes', ['hamstrings'], 'bodyweight', 'isolation', ['Lie on your back, knees bent.', 'Squeeze the glutes to lift the hips.', 'Lower slowly.'], 'bodyweight_reps', 60],
  ['cable-kickback', 'Cable Kickback', 'glutes', [], 'cable', 'isolation', ['Ankle strap on a low pulley.', 'Kick the leg back and up.', 'Return with control.'], 'weight_reps', 45],
  ['hip-abduction', 'Hip Abduction', 'glutes', [], 'machine', 'isolation', ['Sit with pads outside the knees.', 'Push the knees apart.', 'Return slowly.'], 'weight_reps', 45],
  ['standing-calf-raise', 'Standing Calf Raise', 'calves', [], 'machine', 'isolation', ['Balls of the feet on the platform.', 'Rise as high as possible.', 'Lower to a deep stretch.'], 'weight_reps', 60],
  ['seated-calf-raise', 'Seated Calf Raise', 'calves', [], 'machine', 'isolation', ['Pad on the lower thighs.', 'Raise the heels.', 'Lower fully.'], 'weight_reps', 60],
  // Core
  ['plank', 'Plank', 'abs', ['shoulders'], 'bodyweight', 'core', ['Forearms under shoulders, body straight.', 'Brace the abs and glutes.', 'Hold the position.'], 'duration', 60],
  ['hanging-leg-raise', 'Hanging Leg Raise', 'abs', ['forearms'], 'bodyweight', 'core', ['Hang from a bar.', 'Raise the legs by curling the pelvis.', 'Lower without swinging.'], 'bodyweight_reps', 60],
  ['cable-crunch', 'Cable Crunch', 'abs', [], 'cable', 'core', ['Kneel holding a rope behind the head.', 'Crunch down, bringing the ribs to the hips.', 'Return slowly.'], 'weight_reps', 60],
  ['ab-wheel', 'Ab Wheel Rollout', 'abs', ['shoulders'], 'other', 'core', ['Kneel holding the wheel.', 'Roll forward as far as you can control.', 'Pull back using the abs.'], 'bodyweight_reps', 60],
  ['russian-twist', 'Russian Twist', 'abs', [], 'bodyweight', 'core', ['Sit leaning back, feet light.', 'Rotate the torso side to side.', 'Keep the chest tall.'], 'bodyweight_reps', 45],
  ['side-plank', 'Side Plank', 'abs', ['shoulders'], 'bodyweight', 'core', ['Forearm under the shoulder, feet stacked.', 'Lift the hips into a straight line.', 'Hold.'], 'duration', 45],
  ['dead-bug', 'Dead Bug', 'abs', [], 'bodyweight', 'core', ['Lie on your back, arms and knees up.', 'Extend opposite arm and leg.', 'Alternate sides.'], 'bodyweight_reps', 45],
  // Forearms
  ['wrist-curl', 'Wrist Curl', 'forearms', [], 'barbell', 'isolation', ['Forearms on a bench, palms up.', 'Curl the wrists up.', 'Lower slowly.'], 'weight_reps', 45],
  ['farmers-carry', "Farmer's Carry", 'forearms', ['back', 'abs'], 'dumbbell', 'compound', ['Pick up heavy weights in each hand.', 'Walk tall with short steps.', 'Set down with control.'], 'duration', 90],
  ['reverse-curl', 'Reverse Curl', 'forearms', ['biceps'], 'ez-bar', 'isolation', ['Overhand grip.', 'Curl the bar up.', 'Lower slowly.'], 'weight_reps', 60],
  ['dead-hang', 'Dead Hang', 'forearms', ['back'], 'bodyweight', 'isolation', ['Grip a bar overhead.', 'Hang with relaxed shoulders.', 'Hold as long as possible.'], 'duration', 60],
  // Cardio / conditioning
  ['rowing-machine', 'Rowing Machine', 'back', ['quadriceps', 'biceps'], 'machine', 'cardio', ['Drive with the legs first.', 'Then lean back and pull to the ribs.', 'Return in reverse order.'], 'duration', 60],
  ['assault-bike', 'Air Bike', 'quadriceps', ['shoulders'], 'machine', 'cardio', ['Push and pull the handles while pedalling.', 'Keep a steady cadence.', 'Breathe.'], 'duration', 60],
  ['kettlebell-swing', 'Kettlebell Swing', 'glutes', ['hamstrings', 'back'], 'kettlebell', 'compound', ['Hike the bell back between the legs.', 'Snap the hips forward to float the bell.', 'Let it fall back into the next hinge.'], 'weight_reps', 90],
];

export const LIBRARY: Exercise[] = rows.map(([id, name, primaryMuscle, secondaryMuscles, equipment, category, instructions, tracking = 'weight_reps', rest]) => ({
  id,
  name,
  primaryMuscle,
  secondaryMuscles,
  equipment,
  category,
  tracking,
  instructions,
  isCustom: false,
  ...(rest ? { defaultRestSec: rest } : {}),
}));

export const LIBRARY_MAP = new Map(LIBRARY.map((e) => [e.id, e]));

export const MUSCLE_LABEL: Record<MuscleGroup, string> = {
  chest: 'Chest',
  back: 'Back',
  shoulders: 'Shoulders',
  biceps: 'Biceps',
  triceps: 'Triceps',
  quadriceps: 'Quads',
  hamstrings: 'Hamstrings',
  glutes: 'Glutes',
  calves: 'Calves',
  abs: 'Abs',
  forearms: 'Forearms',
};

export const EQUIPMENT_LABEL: Record<Equipment, string> = {
  barbell: 'Barbell',
  dumbbell: 'Dumbbell',
  machine: 'Machine',
  cable: 'Cable',
  bodyweight: 'Bodyweight',
  kettlebell: 'Kettlebell',
  band: 'Band',
  smith: 'Smith machine',
  'ez-bar': 'EZ bar',
  other: 'Other',
};

export const CATEGORY_LABEL: Record<ExerciseCategory, string> = {
  compound: 'Compound',
  isolation: 'Isolation',
  core: 'Core',
  cardio: 'Conditioning',
  mobility: 'Mobility',
};

export const TRACKING_LABEL: Record<Tracking, string> = {
  weight_reps: 'Weight × reps',
  bodyweight_reps: 'Bodyweight reps (+ optional load)',
  duration: 'Duration',
};
