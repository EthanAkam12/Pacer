import { CoachStyle } from './types';

/** The words each coach personality uses. The numbers (pace, distance, time) are the same for every coach. */
export interface CoachLines {
  sample: string;
  letsGo: string;
  paused: string;
  resumed: string;
  finishCheer: string;
  workoutDone: string;
  onTarget: string;
  behindTip: string;
  halfway: string;
  togo400: string;
  togo100: string;
  slowTip: string;
  backOnPace: string;
  stopped: string;
  hrTip: string;
  cue: { run: string; walk: string; rest: string };
  pb: (what: string, time: string) => string;
  /** Empty means this coach never gives encouragement. */
  encourage: string[];
}

export const COACHES: Record<CoachStyle, CoachLines> = {
  friendly: {
    sample: "You're doing brilliantly. Stay relaxed and keep the rhythm.",
    letsGo: "Let's go!",
    paused: 'Paused.',
    resumed: 'Back at it. Go!',
    finishCheer: 'Brilliant run!',
    workoutDone: 'Brilliant work.',
    onTarget: 'Right on target.',
    behindTip: 'Lift it a little.',
    halfway: 'Halfway there! Keep it going.',
    togo400: "400 metres to go. That's one lap of a track. Start pushing!",
    togo100: '100 metres! Sprint to the line!',
    slowTip: 'Drive your arms and pick it back up.',
    backOnPace: "That's it, you're back on pace. Hold it there.",
    stopped: "You've stopped moving. Tap pause if you need a break, or let's get going again.",
    hrTip: "That's very high. Ease off a touch and slow your breathing.",
    cue: { run: 'Go!', walk: 'Nice and easy.', rest: 'Catch your breath.' },
    pb: (what, time) => `And that's a new personal best for ${what}, ${time}! Amazing.`,
    encourage: [
      'Strong running. Keep your shoulders loose.',
      "You're doing brilliantly. Stay relaxed and keep the rhythm.",
      "Breathe deep, run tall. You've got this.",
      'Every step counts. Keep pushing.',
      'Smooth and steady. This is your run.',
      'Quick, light feet. Nice work.',
    ],
  },
  tough: {
    sample: "Don't you dare slow down. Dig in!",
    letsGo: 'Move!',
    paused: 'Paused. Make it quick.',
    resumed: 'Break over. Move!',
    finishCheer: 'Good. Now recover properly.',
    workoutDone: 'Job done. You earned that.',
    onTarget: 'On target. Stay there.',
    behindTip: 'Not good enough. Pick it up now.',
    halfway: "Halfway. The hard half starts now.",
    togo400: '400 metres left. Empty the tank!',
    togo100: '100 metres! Everything you have!',
    slowTip: 'No excuses. Drive your arms and pick it up.',
    backOnPace: 'Better. Hold it.',
    stopped: "You've stopped. Pause it or get moving.",
    hrTip: "Back off a little. Smart, not stupid.",
    cue: { run: 'Go! Go! Go!', walk: 'Recover fast.', rest: 'Get ready.' },
    pb: (what, time) => `New personal best for ${what}, ${time}. That's what hard work does.`,
    encourage: [
      "Don't you dare slow down. Dig in!",
      'Pain is temporary. Keep driving.',
      "You didn't come out here to jog. Push!",
      'Stronger every step. Keep the pressure on.',
      'This is where you get better. Hold the pace.',
    ],
  },
  calm: {
    sample: 'Soft shoulders, easy breathing. Let the run flow.',
    letsGo: 'Settle in and enjoy it.',
    paused: 'Paused. Take your time.',
    resumed: 'Welcome back. Ease into it.',
    finishCheer: 'Well done. Take a moment to enjoy that.',
    workoutDone: 'Lovely work. Let your breathing settle.',
    onTarget: 'Nicely on target.',
    behindTip: 'No rush. Gently lengthen your stride.',
    halfway: 'Halfway. Nice and steady.',
    togo400: '400 metres to go. Stay relaxed and lift a little.',
    togo100: '100 metres. Bring it home.',
    slowTip: 'Gently lift your cadence and find your rhythm again.',
    backOnPace: "Lovely, you're back on pace.",
    stopped: "You've stopped moving. Pause whenever you need to.",
    hrTip: 'Slow down a little and breathe out fully.',
    cue: { run: 'Off you go.', walk: 'Nice and relaxed.', rest: 'Breathe slowly.' },
    pb: (what, time) => `That's a new personal best for ${what}, ${time}. Well done.`,
    encourage: [
      'Soft shoulders, easy breathing. Let the run flow.',
      'Relax your hands and your jaw. Nice and smooth.',
      'Breathe in for three steps, out for three steps.',
      'Run tall and light. You are doing well.',
      'Enjoy this. Every run makes you stronger.',
    ],
  },
  cheeky: {
    sample: "Legs feeling heavy? Good. That means they're working.",
    letsGo: "Right, let's see what you've got.",
    paused: 'Paused. I saw that, by the way.',
    resumed: 'And we are back. Nobody saw a thing.',
    finishCheer: "Done! Go and tell everyone. Twice.",
    workoutDone: 'Workout done. Absolute legend.',
    onTarget: 'Bang on target. Show off.',
    behindTip: "Come on, the snails are catching up.",
    halfway: "Halfway! It's all downhill from here. Well, not literally.",
    togo400: '400 metres to go. One lap. You could do this in your sleep.',
    togo100: '100 metres! Pretend there is cake at the finish!',
    slowTip: 'Is that a stroll? Swing those arms and get moving!',
    backOnPace: "There it is! Knew you had it in you.",
    stopped: "You've stopped. Admiring the view? Tap pause if you need a break.",
    hrTip: "Steady on, your heart's working overtime. Ease off a touch.",
    cue: { run: 'Off you pop!', walk: 'Walk it off.', rest: 'Have a breather.' },
    pb: (what, time) => `New personal best for ${what}, ${time}! Somebody call the papers!`,
    encourage: [
      "Legs feeling heavy? Good. That means they're working.",
      "Looking good. Well, I can't see you, but I bet you do.",
      "You're faster than you were yesterday. Probably.",
      'Every step is one step closer to sitting on the sofa.',
      "Keep going. Your future self is already very impressed.",
    ],
  },
  minimal: {
    sample: '2 kilometres. That split was 5 40 per kilometre. On target.',
    letsGo: '',
    paused: 'Paused.',
    resumed: 'Resumed.',
    finishCheer: '',
    workoutDone: '',
    onTarget: 'On target.',
    behindTip: '',
    halfway: 'Halfway.',
    togo400: '400 metres to go.',
    togo100: '100 metres.',
    slowTip: '',
    backOnPace: 'Back on pace.',
    stopped: 'Stopped.',
    hrTip: '',
    cue: { run: '', walk: '', rest: '' },
    pb: (what, time) => `Personal best, ${what}, ${time}.`,
    encourage: [],
  },
};

/**
 * The named coaches people pick from. Each has a personality (the words it uses) and a voice
 * description used to choose the most natural matching voice on the phone.
 */
export interface Persona {
  id: string;
  name: string;
  traits: string[];
  style: CoachStyle;
  gender: 'female' | 'male';
  accents: string[]; // preferred voice languages, best first
  rate: number; // speaking speed before the person's own speed setting
  pitch: number;
}

export const PERSONAS: Persona[] = [
  { id: 'laura', name: 'Laura', traits: ['Calm', 'Relaxed', 'Reassuring'], style: 'calm', gender: 'female', accents: ['en-GB', 'en-IE', 'en-AU', 'en-US'], rate: 0.93, pitch: 1.0 },
  { id: 'dave', name: 'Dave', traits: ['Aggressive', 'Intense', 'Hard-working'], style: 'tough', gender: 'male', accents: ['en-GB', 'en-AU', 'en-US'], rate: 1.06, pitch: 0.9 },
  { id: 'maya', name: 'Maya', traits: ['Upbeat', 'Friendly', 'Encouraging'], style: 'friendly', gender: 'female', accents: ['en-US', 'en-AU', 'en-GB'], rate: 1.02, pitch: 1.06 },
  { id: 'jack', name: 'Jack', traits: ['Cheeky', 'Funny', 'Energetic'], style: 'cheeky', gender: 'male', accents: ['en-AU', 'en-GB', 'en-US'], rate: 1.04, pitch: 1.04 },
  { id: 'sam', name: 'Sam', traits: ['Focused', 'Precise', 'Just the numbers'], style: 'minimal', gender: 'male', accents: ['en-US', 'en-GB', 'en-AU'], rate: 1.05, pitch: 1.0 },
];

const LEGACY: Record<string, string> = { friendly: 'maya', tough: 'dave', calm: 'laura', minimal: 'sam', cheeky: 'jack' };

export const personaFor = (id: string) => PERSONAS.find((p) => p.id === (LEGACY[id] ?? id)) ?? PERSONAS[2];
