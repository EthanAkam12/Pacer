import { CoachStyle } from './types';

/**
 * Everything each coach personality says. Most cues have several versions; the engine picks one at
 * random each time so the coach doesn't sound like a recording. Numbers (pace, distance, time) come
 * in already spoken, e.g. pace "5 30 per kilometre", distance "2 kilometres", time "3 minutes 10 seconds".
 */
export interface CoachLines {
  sample: string;
  start: (plan: string) => string[]; // plan: "5 kilometres, target pace 5 30 per kilometre"
  workoutStart: (name: string) => string[];
  paused: string[];
  resumed: string[];
  split: (done: string, pace: string, left: string) => string[];
  onTarget: string[];
  ahead: (by: string) => string[];
  behind: (by: string) => string[];
  halfway: string[];
  togo400: string[];
  togo100: string[];
  slow: (now: string, ref: string) => string[]; // ref: "your target's 5 30 per kilometre"
  backOnPace: string[];
  /** Beginner plans: walking when it's a run step is fine. */
  walkOk: string[];
  stopped: string[];
  hrHigh: (bpm: number) => string[];
  finish: (dist: string, time: string, avg: string | null) => string[];
  workoutDone: (dist: string, time: string) => string[];
  endedEarly: (dist: string, time: string) => string[];
  cue: { run: string[]; walk: string[]; rest: string[] };
  pb: (what: string, time: string) => string[];
  rankUp: (rank: string) => string[];
  achievement: (title: string) => string[];
  /** Empty means this coach never chats between updates. */
  encourage: string[];
}

const avgLine = (avg: string | null) => (avg ? ` Average pace, ${avg}.` : '');
/** Capital first letter, for a phrase that starts a sentence. */
const C = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const COACHES: Record<CoachStyle, CoachLines> = {
  friendly: {
    sample: "You're doing brilliantly. Stay relaxed and just keep that rhythm going.",
    start: (p) => [`Right, here we go. ${p}. Let's have a lovely run!`, `Okay! ${p}. Off we go, nice and easy to start.`, `${p}. I'm right here with you. Let's go!`],
    workoutStart: (n) => [`Let's do this. ${n}.`, `Okay, ${n}. I'll talk you through every bit.`],
    paused: ['Paused. Take a breather.', 'No problem, paused.'],
    resumed: ["And we're back! Let's go.", 'Off we go again. Nice.'],
    split: (d, p, l) => [`That's ${d}! That one was ${p}. ${l} to go.`, `${d} done, nice work. You ran that at ${p}. ${l} left.`, `Another one down, that's ${d}. ${p} for that split. Just ${l} to go.`],
    onTarget: ['Right on target, perfect.', "Spot on. That's exactly the pace.", 'Bang on target. Lovely.'],
    ahead: (b) => [`You're ${b} ahead of target. Brilliant!`, `${b} up on your target. Keep that going!`],
    behind: (b) => [`You're ${b} behind target, but don't worry, lift it just a little.`, `${b} off target. A tiny bit quicker and you're there.`],
    halfway: ["Halfway! You're doing so well.", "That's halfway. It's all homeward from here!"],
    togo400: ["400 metres to go. That's just one lap of a track. Start pushing!", "Only 400 metres left. You've totally got this!"],
    togo100: ['100 metres! Sprint to the line!', 'Last 100! Give it everything!'],
    slow: (n, r) => [`You've eased off a bit. You're at ${n}, and ${r}. Drive those arms and pick it back up.`, `Just slowing a touch, you're at ${n}. ${C(r)}. Quick light steps, you can do it.`],
    backOnPace: ["That's it, you're back on pace. Lovely.", 'Yes! Back where you want to be. Hold it there.'],
    walkOk: ["Walking's completely fine. Catch your breath, and start running again when you're ready.", "Taking a little walk? That's okay. You're still moving, and that's what counts. Jog again when you feel ready."],
    stopped: ["Looks like you've stopped. Tap pause if you need a break, or let's get going again.", "Have you stopped? That's okay. Pause if you need to, otherwise off we go."],
    hrHigh: (h) => [`Your heart rate's ${h}, that's really high. Ease off a touch and slow your breathing.`, `Heart rate ${h}. Let's bring it down a little, nice slow breaths.`],
    finish: (d, t, a) => [`Finish line! ${d} in ${t}.${avgLine(a)} What a run!`, `And that's it! ${d} done in ${t}.${avgLine(a)} I'm so proud of you.`],
    workoutDone: (d, t) => [`Workout complete! ${d} in ${t}. Brilliant work.`, `That's the whole workout done. ${d} in ${t}. Fantastic.`],
    endedEarly: (d, t) => [`Run finished. ${d} in ${t}. Every run counts, well done.`, `All done. ${d} in ${t}. Nice one.`],
    cue: { run: ['Go!', "Let's go!", 'Off you go!'], walk: ['Nice and easy.', 'Walk it out, well done.'], rest: ['Catch your breath.', 'Rest up, you earned it.'] },
    pb: (w, t) => [`And guess what? That's a new personal best for ${w}! ${t}. Amazing!`, `New personal best for ${w}, ${t}! You should be really proud.`],
    rankUp: (r) => [`Oh, and you've ranked up to ${r}! Brilliant.`, `Big news: you're now ${r}!`],
    achievement: (a) => [`You've unlocked an achievement: ${a}!`, `Achievement unlocked. ${a}! Nice.`],
    encourage: [
      'Strong running. Keep your shoulders loose.',
      "You're doing brilliantly. Stay relaxed and keep the rhythm.",
      "Breathe deep, run tall. You've got this.",
      'Every step counts. Keep it up.',
      'Smooth and steady. This is your run.',
      'Quick, light feet. Lovely running.',
      "I'm loving this pace. Keep it coming.",
    ],
  },
  tough: {
    sample: "Don't you dare slow down. Dig in!",
    start: (p) => [`${p}. No excuses today. Move!`, `${p}. Let's see what you're made of. Go!`],
    workoutStart: (n) => [`${n}. Every rep counts. Let's work.`, `${n}. Focus. Here we go.`],
    paused: ['Paused. Make it quick.', 'Paused. Clock is ticking.'],
    resumed: ['Break over. Move!', 'Back to work. Go!'],
    split: (d, p, l) => [`${d}. ${p}. ${l} left. Keep working.`, `That's ${d}. Split was ${p}. ${l} to go. No easing off.`],
    onTarget: ['On target. Stay there.', 'Right on pace. Good. Hold it.'],
    ahead: (b) => [`${b} ahead. Good. Don't get comfortable.`, `You're ${b} up. Keep the pressure on.`],
    behind: (b) => [`${b} behind. Not good enough. Pick it up, now.`, `You're ${b} down. Find another gear.`],
    halfway: ['Halfway. The hard half starts now.', "Halfway. Now we find out who you are."],
    togo400: ['400 metres left. Empty the tank!', '400 to go. Everything you have left. Now!'],
    togo100: ['100 metres! Everything!', 'Last 100. Sprint. Go, go, go!'],
    slow: (n, r) => [`You're slowing down. ${n}. ${C(r)}. No excuses. Drive your arms!`, `${n}? That's not it. ${C(r)}. Pick it up!`],
    backOnPace: ['Better. Hold it.', "That's more like it. Stay there."],
    walkOk: ["Walking. Fine, but only until you've got your breath back. Then we go again.", "Take a moment. Then back to running. You've got this."],
    stopped: ["You've stopped. Pause it or get moving.", "Why have we stopped? Pause, or go."],
    hrHigh: (h) => [`Heart rate ${h}. Back off a touch. Smart, not stupid.`, `${h} beats. Ease it a little. We go hard, not reckless.`],
    finish: (d, t, a) => [`Done. ${d} in ${t}.${avgLine(a)} Good. Now recover properly.`, `Finished. ${d}, ${t}.${avgLine(a)} You earned that one.`],
    workoutDone: (d, t) => [`Workout done. ${d} in ${t}. That's how you get better.`, `Job done. ${d} in ${t}. Respect.`],
    endedEarly: (d, t) => [`Run ended. ${d} in ${t}. Next time, we finish it.`, `Stopped at ${d}, ${t}. We go again next time.`],
    cue: { run: ['Go! Go! Go!', 'Go now!', 'Move!'], walk: ['Recover fast.', 'Walk. Get your breath back.'], rest: ['Get ready.', 'Rest. Next one is coming.'] },
    pb: (w, t) => [`New personal best for ${w}. ${t}. That's what hard work does.`, `Personal best, ${w}, ${t}. Now beat it.`],
    rankUp: (r) => [`You've ranked up. ${C(r)}. Earned, not given.`, `${r}. Keep climbing.`],
    achievement: (a) => [`Achievement unlocked: ${a}. Good. Next one.`],
    encourage: [
      "Don't you dare slow down. Dig in!",
      'Pain is temporary. Keep driving.',
      "You didn't come out here to jog. Push!",
      'Stronger every step. Keep the pressure on.',
      'This is where you get better. Hold the pace.',
      "Nobody's coming to run this for you. Go!",
    ],
  },
  calm: {
    sample: 'Soft shoulders, easy breathing. Just let the run flow.',
    start: (p) => [`${p}. Settle in, and enjoy it.`, `${p}. Let's ease into it, no rush.`],
    workoutStart: (n) => [`${n}. Take it one step at a time.`, `${n}. Breathe, and begin.`],
    paused: ['Paused. Take all the time you need.', 'Paused. Have a moment.'],
    resumed: ['Welcome back. Ease into it.', 'Gently does it. Off we go.'],
    split: (d, p, l) => [`${d}. That one was ${p}. ${l} to go. Lovely and steady.`, `That's ${d} done, at ${p}. ${l} remaining. Keep breathing easy.`],
    onTarget: ['Nicely on target.', 'Right where you want to be.'],
    ahead: (b) => [`You're ${b} ahead of target. Lovely.`, `${b} ahead. Stay relaxed.`],
    behind: (b) => [`You're ${b} behind target. No rush, gently lengthen your stride.`, `${b} behind. Just a little more lift, when you're ready.`],
    halfway: ['Halfway. Nice and steady.', "You're halfway there. Beautifully done."],
    togo400: ['400 metres to go. Stay relaxed, and lift a little.', 'Just 400 metres now. Breathe, and bring it home.'],
    togo100: ['100 metres. Bring it home.', 'Last 100. Smooth and strong.'],
    slow: (n, r) => [`You've drifted to ${n}. ${C(r)}. Gently lift your cadence and find your rhythm again.`, `A little slower now, ${n}. ${C(r)}. Soft shoulders, quicker feet.`],
    backOnPace: ["Lovely, you're back on pace.", "There's your rhythm again."],
    walkOk: ["Walking is perfectly okay. Breathe, relax, and ease back into a jog when your body says yes.", "There's no rush. Walk for a bit, and gently start running again when you're ready."],
    stopped: ["You've stopped moving. Pause whenever you need to.", 'Take a moment if you need it. Tap pause.'],
    hrHigh: (h) => [`Heart rate ${h}. Slow down a little and breathe out fully.`, `${h} beats a minute. Let's soften the pace, and breathe.`],
    finish: (d, t, a) => [`Well done. ${d} in ${t}.${avgLine(a)} Take a moment to enjoy that.`, `You're finished. ${d}, in ${t}.${avgLine(a)} Lovely work.`],
    workoutDone: (d, t) => [`Workout complete. ${d} in ${t}. Let your breathing settle.`, `All done. ${d} in ${t}. Beautifully done.`],
    endedEarly: (d, t) => [`Run finished. ${d} in ${t}. Listening to your body is never wrong.`],
    cue: { run: ['Off you go.', 'And run, gently.'], walk: ['Nice and relaxed.', 'Ease into a walk.'], rest: ['Breathe slowly.', 'Rest, and breathe.'] },
    pb: (w, t) => [`That's a new personal best for ${w}. ${t}. Well done.`, `A new personal best, for ${w}. ${t}. Lovely.`],
    rankUp: (r) => [`You've reached ${r}. Well deserved.`],
    achievement: (a) => [`You've unlocked ${a}. Lovely.`],
    encourage: [
      'Soft shoulders, easy breathing. Let the run flow.',
      'Relax your hands and your jaw. Nice and smooth.',
      'Breathe in for three steps, and out for three steps.',
      'Run tall and light. You are doing well.',
      'Enjoy this. Every run makes you stronger.',
      'Notice the ground under your feet. Light and quiet.',
    ],
  },
  cheeky: {
    sample: "Legs feeling heavy? Good. That means they're working.",
    start: (p) => [`${p}. Right, let's see what you've got.`, `${p}. Shoes on? Brilliant. Let's go!`],
    workoutStart: (n) => [`${n}. This'll be fun. Probably.`, `${n}. Don't worry, I'll be gentle. I won't.`],
    paused: ['Paused. I saw that, by the way.', 'Paused. Quick snack?'],
    resumed: ['And we are back. Nobody saw a thing.', "Off we go again. Missed me?"],
    split: (d, p, l) => [`${d} done! ${p} for that one. ${l} to go. Easy peasy.`, `Ding ding, that's ${d}. ${p}. Only ${l} to go!`],
    onTarget: ['Bang on target. Show off.', 'Exactly on pace. Are you a robot?'],
    ahead: (b) => [`${b} ahead of target. Steady on, Usain.`, `You're ${b} up. Who are you?`],
    behind: (b) => [`${b} behind target. The snails are catching up.`, `${b} down. Come on, the ice cream van's leaving.`],
    halfway: ["Halfway! It's all downhill from here. Well, not literally.", 'Halfway! Same again and we can go home.'],
    togo400: ['400 metres to go. One lap. You could do this in your sleep.', '400 left. Pretend someone just shouted free pizza.'],
    togo100: ['100 metres! Pretend there is cake at the finish!', 'Last 100! Run like you left the oven on!'],
    slow: (n, r) => [`Is that a stroll? You're at ${n}, and ${r}. Swing those arms!`, `${n}. Hmm. ${C(r)}. I've seen faster tortoises. Go on!`],
    backOnPace: ["There it is! Knew you had it in you.", "And we're back. Panic over."],
    walkOk: ["Ooh, a little stroll! That's allowed, I promise. Off you go again when you're ready.", "Walking? No judgement here. Get your breath, then show me that jog again."],
    stopped: ["You've stopped. Admiring the view? Tap pause if you need a break.", "Hello? Anyone there? Pause, or let's go."],
    hrHigh: (h) => [`Steady on, heart rate's ${h}. It's working overtime. Ease off a touch.`],
    finish: (d, t, a) => [`Done! ${d} in ${t}.${avgLine(a)} Go and tell everyone. Twice.`, `Finished! ${d}, ${t}.${avgLine(a)} Legend behaviour.`],
    workoutDone: (d, t) => [`Workout done! ${d} in ${t}. Absolute legend.`, `That's a wrap. ${d} in ${t}. You may now collapse.`],
    endedEarly: (d, t) => [`Run finished. ${d} in ${t}. A run's a run!`],
    cue: { run: ['Off you pop!', 'Go on then!', 'Leg it!'], walk: ['Walk it off.', 'Little stroll. Lovely.'], rest: ['Have a breather.', 'Rest. Look casual.'] },
    pb: (w, t) => [`New personal best for ${w}, ${t}! Somebody call the papers!`, `Personal best, ${w}, ${t}! Frame it.`],
    rankUp: (r) => [`You've ranked up to ${r}! Fancy.`, `${r}! Look at you go.`],
    achievement: (a) => [`Achievement unlocked: ${a}! Shiny.`],
    encourage: [
      "Legs feeling heavy? Good. That means they're working.",
      "Looking good. Well, I can't see you, but I bet you do.",
      "You're faster than you were yesterday. Probably.",
      'Every step is one step closer to sitting on the sofa.',
      'Keep going. Your future self is already very impressed.',
      'If anyone asks, this is your warm up.',
    ],
  },
  wise: {
    sample: "Run the mile you're in, not the one ahead. That's the whole secret.",
    start: (p) => [`${p}. Start slower than you want to. You'll thank me later.`, `${p}. Right then, let's go and enjoy ourselves.`],
    workoutStart: (n) => [`${n}. The work is where the magic is.`, `${n}. One rep at a time, love.`],
    paused: ["Paused. Even marathoners stop for a drink.", 'Paused. Take your time.'],
    resumed: ['Back at it. Find your rhythm first.', 'On we go, nice and steady.'],
    split: (d, p, l) => [`${d}. ${p} for that one. ${l} to go. Lovely and even.`, `That's ${d} in the bag. ${p}. ${l} left. Run the one you're in.`],
    onTarget: ["Right on target. That's experience talking.", 'Spot on. Even pacing wins races.'],
    ahead: (b) => [`${b} ahead. Careful now, bank it gently.`, `You're ${b} up. Don't spend it all at once.`],
    behind: (b) => [`${b} behind. No panic. Small adjustments, not big ones.`, `${b} off the target. Ease it up a notch, nice and gradual.`],
    halfway: ["Halfway. This is where races are really won.", 'Halfway. The second half is run with the head, not the legs.'],
    togo400: ['400 to go. Now you can spend what you saved.', 'Last 400. This is what all the miles were for.'],
    togo100: ['100 metres. Head up, finish proud.', 'Last 100. Run it like you mean it.'],
    slow: (n, r) => [`You've drifted back to ${n}, and ${r}. Shorten your stride and quicken the feet. It always comes back.`, `${n}, a little slow. ${C(r)}. Hills, wind, tired legs, it happens. Just lift the cadence.`],
    backOnPace: ["There you go. Back in the groove.", "That's it. Steady as she goes."],
    walkOk: ["Walking is part of running. Rest a moment, then start again. That's how everyone gets there.", "Every runner walks sometimes. Catch your breath, and run again when you feel ready."],
    stopped: ["You've stopped. No shame in that. Pause it if you need a minute.", 'Take a breath if you need it. Tap pause.'],
    hrHigh: (h) => [`Heart rate's ${h}. That's red line territory. Back off, there's no prize for that today.`],
    finish: (d, t, a) => [`And home. ${d} in ${t}.${avgLine(a)} That's a run to remember.`, `Done. ${d}, ${t}.${avgLine(a)} Stretch, drink some water, and be proud.`],
    workoutDone: (d, t) => [`That's the session done. ${d} in ${t}. The body gets stronger while it rests, so rest well.`],
    endedEarly: (d, t) => [`Finished there. ${d} in ${t}. The best runners know when to stop.`],
    cue: { run: ['Off you go.', 'And run. Smooth now.'], walk: ['Walk, and let the heart settle.', 'Easy walk. You earned it.'], rest: ['Rest. Shake the legs out.', 'Breathe. Next one soon.'] },
    pb: (w, t) => [`New personal best for ${w}. ${t}. I've seen a lot of runners, and that's a proper result.`],
    rankUp: (r) => [`You've climbed to ${r}. Patience pays.`],
    achievement: (a) => [`Achievement unlocked: ${a}. Well earned.`],
    encourage: [
      "Run the mile you're in, not the one ahead.",
      "A hill is just a flat road standing up. Short steps.",
      'Relax your face. A smiling runner is a faster runner.',
      "Consistency beats intensity. You're doing it right.",
      "The first few minutes always lie. You're warmed up now.",
      'Light feet, tall hips, quiet breathing. That is good running.',
    ],
  },
  technical: {
    sample: 'Check your cadence. Quick, light steps, around 170 a minute.',
    start: (p) => [`${p}. Start at conversation pace for the first kilometre.`, `${p}. Run tall, relaxed shoulders. Begin.`],
    workoutStart: (n) => [`${n}. Hit the paces, take the rests seriously.`, `${n}. Quality over quantity. Go.`],
    paused: ['Paused.', 'Paused. Timer stopped.'],
    resumed: ['Resumed. Build back up over 30 seconds.', 'Resumed.'],
    split: (d, p, l) => [`${d}. Split, ${p}. ${l} remaining.`, `${d} complete. ${p}. ${l} to go. Check your form.`],
    onTarget: ['On target. Even splits are the most efficient way to run.', 'On target.'],
    ahead: (b) => [`${b} ahead of target. Watch for going out too fast.`, `${b} ahead. Fine, if your breathing is controlled.`],
    behind: (b) => [`${b} behind target. Increase cadence slightly rather than stride length.`, `${b} behind. Add a few steps per minute.`],
    halfway: ['Halfway. Aim for an equal or faster second half.', 'Halfway point.'],
    togo400: ['400 metres. Raise the cadence and drive the arms.', '400 to go. Lean slightly forward from the ankles.'],
    togo100: ['100 metres. Full effort.', 'Final 100. Arms and knees.'],
    slow: (n, r) => [`Pace has dropped to ${n}. ${C(r)}. Shorten your stride and increase cadence.`, `${n}. ${C(r)}. Check posture: tall, hips forward, relaxed hands.`],
    backOnPace: ['Back on target pace.', 'Pace recovered.'],
    walkOk: ["Walking detected. That's fine at this stage. Recover, then resume an easy jog.", "Walk break. Let your heart rate settle, then return to a relaxed running pace."],
    stopped: ['No movement detected. Pause if you are stopping.'],
    hrHigh: (h) => [`Heart rate ${h}, above 93 percent of max. Reduce effort.`],
    finish: (d, t, a) => [`Finished. ${d} in ${t}.${avgLine(a)} Cool down with five minutes of walking.`],
    workoutDone: (d, t) => [`Session complete. ${d} in ${t}. Rehydrate and stretch your calves and hips.`],
    endedEarly: (d, t) => [`Run ended. ${d} in ${t}.`],
    cue: { run: ['Go.', 'Run.'], walk: ['Walk. Let your heart rate drop.'], rest: ['Rest. Stay on your feet if you can.'] },
    pb: (w, t) => [`Personal best for ${w}: ${t}. A measurable improvement.`],
    rankUp: (r) => [`Rank increased to ${r}.`],
    achievement: (a) => [`Achievement unlocked: ${a}.`],
    encourage: [
      'Check your cadence. Quick, light steps, around 170 a minute.',
      'Arms at 90 degrees, swinging forward and back, not across your body.',
      'Land under your hips, not out in front.',
      'Breathe from your belly, not your chest.',
      'Relax your hands. Imagine holding crisps without crushing them.',
      'Look ahead, about 20 metres, not at your feet.',
    ],
  },
  minimal: {
    sample: '2 kilometres. 5 40 per kilometre. On target.',
    start: (p) => [`${p}.`],
    workoutStart: (n) => [`${n}.`],
    paused: ['Paused.'],
    resumed: ['Resumed.'],
    split: (d, p, l) => [`${d}. ${p}. ${l} to go.`],
    onTarget: ['On target.'],
    ahead: (b) => [`${b} ahead.`],
    behind: (b) => [`${b} behind.`],
    halfway: ['Halfway.'],
    togo400: ['400 metres to go.'],
    togo100: ['100 metres.'],
    slow: (n, r) => [`Slowing. ${n}. ${C(r)}.`],
    backOnPace: ['Back on pace.'],
    walkOk: ["Walking is fine. Run when ready."],
    stopped: ['Stopped.'],
    hrHigh: (h) => [`Heart rate ${h}. High.`],
    finish: (d, t, a) => [`Finished. ${d} in ${t}.${avgLine(a)}`],
    workoutDone: (d, t) => [`Workout complete. ${d} in ${t}.`],
    endedEarly: (d, t) => [`Run finished. ${d} in ${t}.`],
    cue: { run: [''], walk: [''], rest: [''] },
    pb: (w, t) => [`Personal best, ${w}, ${t}.`],
    rankUp: (r) => [`Rank up. ${C(r)}.`],
    achievement: (a) => [`Achievement: ${a}.`],
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
  /** Pacer Plus coach. */
  plus?: boolean;
}

export const PERSONAS: Persona[] = [
  { id: 'laura', name: 'Laura', traits: ['Calm', 'Relaxed', 'Reassuring'], style: 'calm', gender: 'female', accents: ['en-GB', 'en-IE', 'en-AU', 'en-US'], rate: 0.93, pitch: 1.0 },
  { id: 'dave', name: 'Dave', traits: ['Aggressive', 'Intense', 'Hard-working'], style: 'tough', gender: 'male', accents: ['en-GB', 'en-AU', 'en-US'], rate: 1.06, pitch: 0.9 },
  { id: 'maya', name: 'Maya', traits: ['Upbeat', 'Friendly', 'Encouraging'], style: 'friendly', gender: 'female', accents: ['en-US', 'en-AU', 'en-GB'], rate: 1.02, pitch: 1.06 },
  { id: 'jack', name: 'Jack', traits: ['Cheeky', 'Funny', 'Energetic'], style: 'cheeky', gender: 'male', accents: ['en-AU', 'en-GB', 'en-US'], rate: 1.04, pitch: 1.04 },
  { id: 'charlie', name: 'Charlie', traits: ['Wise', 'Warm', 'Seasoned marathoner'], style: 'wise', gender: 'female', accents: ['en-IE', 'en-GB', 'en-AU', 'en-US'], rate: 0.95, pitch: 0.97 },
  { id: 'kai', name: 'Kai', traits: ['Technical', 'Precise', 'Form-focused'], style: 'technical', gender: 'male', accents: ['en-US', 'en-GB', 'en-AU'], rate: 1.02, pitch: 1.0 },
  { id: 'sam', name: 'Sam', traits: ['Focused', 'Minimal', 'Just the numbers'], style: 'minimal', gender: 'male', accents: ['en-US', 'en-GB', 'en-AU'], rate: 1.05, pitch: 1.0 },
  { id: 'rosie', name: 'Rosie', traits: ['Bubbly', 'Playful', 'Never stops smiling'], style: 'cheeky', gender: 'female', accents: ['en-GB', 'en-IE', 'en-AU', 'en-US'], rate: 1.05, pitch: 1.1, plus: true },
  { id: 'marcus', name: 'Marcus', traits: ['Ex-sprinter', 'Driven', 'Old-school'], style: 'tough', gender: 'male', accents: ['en-US', 'en-GB', 'en-AU'], rate: 1.0, pitch: 0.85, plus: true },
];

const LEGACY: Record<string, string> = { friendly: 'maya', tough: 'dave', calm: 'laura', minimal: 'sam', cheeky: 'jack' };

export const personaFor = (id: string) => PERSONAS.find((p) => p.id === (LEGACY[id] ?? id)) ?? PERSONAS[2];
