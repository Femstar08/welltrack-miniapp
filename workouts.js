/* Workouts from health/6-month-transformation-plan.md, keyed by weekday (0 = Sunday).
 * Kept here so the app can show the full session without waiting on the coach.
 * Tempo reads eccentric-pause-concentric in seconds. */
window.WELLTRACK_WORKOUTS = {
  1: {
    name: "Upper Push",
    focus: "Chest, shoulders, triceps",
    duration: "45–55 min",
    intensity: "Moderate",
    note: "All dumbbell or cable — no barbell bench press, for safety at Hb 112.",
    exercises: [
      { name: "Dumbbell Bench Press", sets: "3 × 12", tempo: "3-1-2", rest: "2 min", note: "Moderate weight. Dumbbells can be dropped safely if lightheaded" },
      { name: "Landmine Kneeling Press", sets: "4 × 8", tempo: "2-1-2", rest: "2 min", note: "Kneeling removes spinal load. Joint-friendly arc" },
      { name: "Standing Cable Chest Fly", sets: "3 × 15", tempo: "3-1-3", rest: "90 sec", note: "Cables at chest height. Squeeze at the front. Upright = unrestricted breathing" },
      { name: "Dumbbell Lateral Raise", sets: "3 × 12", tempo: "2-0-2", rest: "90 sec", note: "Light weight, strict form. No swinging" },
      { name: "Cable Tricep Pushdown (Rope)", sets: "3 × 12", tempo: "2-1-2", rest: "90 sec", note: "Controlled, split the rope at the bottom" },
    ],
  },
  2: {
    name: "Rest + walk",
    focus: "Active recovery",
    duration: "30 min",
    intensity: "Low",
    note: "Walking flushes inflammatory waste without adding recovery debt. No gym, no home workout.",
    exercises: [],
  },
  3: {
    name: "Back and Pull",
    focus: "Back, biceps, rear delts",
    duration: "45–55 min",
    intensity: "Moderate",
    note: "Seated or supported wherever possible to keep breathing easy.",
    exercises: [
      { name: "Seated Cable Row", sets: "3 × 12", tempo: "2-1-2", rest: "2 min", note: "Upright, supported. Replaces bent-over rows, which compress the chest" },
      { name: "Cable Lat Pulldown (Wide)", sets: "3 × 12", tempo: "3-1-2", rest: "2 min", note: "Full stretch at the top, squeeze shoulder blades at the bottom" },
      { name: "Face Pulls", sets: "3 × 15", tempo: "2-1-3", rest: "90 sec", note: "Cable set high. Rear delts and upper back. Good for posture" },
      { name: "Dumbbell Alternating Bicep Curl", sets: "3 × 12", tempo: "2-1-2", rest: "90 sec", note: "Standing, controlled, no swinging" },
      { name: "Dumbbell Hammer Curl", sets: "3 × 12", tempo: "2-1-2", rest: "90 sec", note: "Hits the brachialis that standard curls miss" },
    ],
  },
  4: {
    name: "Lower Body",
    focus: "Quads, hamstrings, glutes, calves",
    duration: "45–55 min",
    intensity: "Moderate",
    note: "All machine or dumbbell — no barbell squats or heavy deadlifts.",
    exercises: [
      { name: "Leg Press", sets: "3 × 12", tempo: "3-1-2", rest: "2 min", note: "Safe, supported, no spinal load" },
      { name: "Romanian Deadlift (Dumbbells)", sets: "3 × 12", tempo: "3-1-2", rest: "2 min", note: "Light weight. Dumbbells, not barbell" },
      { name: "Leg Extension (Machine)", sets: "3 × 15", tempo: "2-1-2", rest: "90 sec", note: "Isolates quads. Fully supported" },
      { name: "Leg Curl (Machine)", sets: "3 × 15", tempo: "2-1-2", rest: "90 sec", note: "Isolates hamstrings. Fully supported" },
      { name: "Dumbbell Calf Raise", sets: "3 × 15", tempo: "2-1-2", rest: "60 sec", note: "Full range of motion, squeeze at the top" },
      { name: "Machine Ab Crunch", sets: "3 × 12", tempo: "2-1-2", rest: "60 sec", note: "One core exercise to finish. Supported" },
    ],
  },
  5: {
    name: "Core, Conditioning and Stamina",
    focus: "Core then a stamina circuit",
    duration: "40–50 min",
    intensity: "Moderate-High",
    note: "Monitor breathing on the circuit — stop if you cannot recover within the rest period.",
    exercises: [
      { name: "Dead Bugs", sets: "3 × 10 each side", rest: "60 sec", note: "Opposite arm/leg extends. Core engaged throughout" },
      { name: "Hanging Knee Raises", sets: "3 × 12", rest: "60 sec", note: "Control the sway. Captain's chair if too hard" },
      { name: "Pallof Press", sets: "3 × 12 each side", rest: "60 sec", note: "Anti-rotation. Builds deep core stability" },
      { name: "Plank (weighted if possible)", sets: "3 × 30–45 sec", rest: "60 sec", note: "Add a light plate once bodyweight feels easy" },
    ],
    circuit: {
      title: "Stamina circuit — 3 rounds",
      note: "Rest 60 sec between exercises, 2 min between rounds.",
      items: [
        { name: "Rowing Machine", detail: "3 min steady", note: "Moderate heart rate. Not a sprint" },
        { name: "Kettlebell Swings", detail: "15 reps", note: "Hip hinge, not a squat" },
        { name: "Battle Ropes", detail: "30 seconds", note: "Alternating waves" },
        { name: "Farmer's Walk", detail: "40 metres", note: "Heavy dumbbells, upright posture" },
      ],
    },
  },
  6: {
    name: "Active recovery walk",
    focus: "Walk 30–45 min, brisk",
    duration: "30–45 min",
    intensity: "Low",
    note: "Weigh-in day — same time, same conditions.",
    exercises: [],
  },
  0: {
    name: "Full rest",
    focus: "No training",
    duration: "—",
    intensity: "None",
    note: "Complete rest. Batch cook for Monday–Wednesday.",
    exercises: [],
  },
};

/* Safety rules that apply to every session, from the plan's training notes. */
window.WELLTRACK_TRAINING_RULES = [
  "Moderate intensity, 60–70% of max. Reps 12–15 for the first 3 months.",
  "Stop 2–3 reps short of failure — do not grind reps.",
  "Full rest between sets: 2–3 minutes.",
  "Stop immediately if dizzy, seeing spots, or breathing does not recover within 2 minutes.",
];
