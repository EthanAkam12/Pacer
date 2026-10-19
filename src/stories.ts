import { IntervalStep, StepKind, Workout } from './types';

/**
 * Story runs (Pacely Plus). The coach narrates an adventure, and the run/walk/sprint steps are
 * part of the story ("They're behind you — sprint!"). Each chapter is one timed interval step.
 * `say` is read when the chapter starts (followed by a short instruction), `mid` halfway through.
 * Effort, not pace, is what matters, so there are no slowing-down warnings on story runs.
 */
export interface Chapter { kind: StepKind; seconds: number; say: string; mid?: string; sprint?: boolean }
export interface Story { id: string; title: string; emoji: string; blurb: string; level: string; intro: string; outro: string; chapters: Chapter[] }

const walk = (seconds: number, say: string, mid?: string): Chapter => ({ kind: 'walk', seconds, say, mid });
const jog = (seconds: number, say: string, mid?: string): Chapter => ({ kind: 'run', seconds, say, mid });
const sprint = (seconds: number, say: string, mid?: string): Chapter => ({ kind: 'run', seconds, say, mid, sprint: true });

export const STORIES: Story[] = [
  {
    id: 'outbreak',
    title: 'Outbreak',
    emoji: '🧟',
    level: 'Beginner friendly',
    blurb: 'The city has fallen. Get across it to the last rescue helicopter before it leaves at dawn.',
    intro: 'Outbreak. It\'s 5 a.m. The city went quiet three days ago, and now the only sound is the shuffling. A radio crackles: the last helicopter leaves the stadium at dawn. You\'re six kilometres away. Let\'s go, quietly at first.',
    outro: 'You burst onto the pitch as the rotors start to turn. A hand grabs yours and pulls you aboard. Below, the city shrinks away. You made it. Outbreak, complete. Brilliant running.',
    chapters: [
      walk(180, 'Slip out of the back door and walk to the end of the alley. Stay low, stay quiet, and let your legs warm up.', 'Something moves behind the bins. Just a cat. Keep walking.'),
      jog(240, 'The main road is clear. Start an easy jog towards the bridge. Smooth and relaxed, save your energy.', 'Abandoned cars everywhere. Weave between them. You\'re doing well.'),
      sprint(45, 'A groan behind you. Then another. They\'ve seen you!', 'Nearly at the bridge. Keep pushing!'),
      walk(90, 'You\'re over the bridge and they can\'t follow. Walk and get your breath back.'),
      jog(240, 'Through the park now. Steady jog along the path. Listen out.', 'The trees thin out ahead. The stadium lights are on the horizon.'),
      sprint(60, 'The park gates are closing on their own. If they lock, you\'re trapped. Go!', 'Thirty seconds. You can make it!'),
      walk(90, 'You slide through the gap just in time. Walk it off. Breathe.'),
      jog(300, 'High street. Jog past the shops, staying in the middle of the road where you can see them coming.', 'A supply drop! You grab a water bottle as you pass. Keep going.'),
      sprint(45, 'A whole crowd pours out of the shopping centre. Run!', 'Faster! Don\'t look back!'),
      walk(90, 'You\'ve lost them in the side streets. Walk. You\'ve earned it.'),
      jog(180, 'The stadium is close. Jog up the hill towards the gates. The sky is getting lighter.', 'You can hear the helicopter warming up.'),
      sprint(60, 'The rotors are spinning! Everything you\'ve got, all the way to the pitch!', 'Almost there. Don\'t stop!'),
      walk(180, 'Cool down with an easy walk while the helicopter climbs. Let your heart rate come down.'),
    ],
  },
  {
    id: 'heist',
    title: 'The Midnight Heist',
    emoji: '💎',
    level: 'Intermediate',
    blurb: 'You\'re the getaway runner for a crew stealing back a stolen diamond. Timing is everything.',
    intro: 'The Midnight Heist. The Star of the Sea was stolen from its owners years ago, and tonight your crew takes it back. You\'re the runner: you carry it out. The guards change shift at midnight. Get into position.',
    outro: 'You hand the diamond to the owner\'s family at the harbour. Nobody saw a thing. The crew grins in the dark. The Midnight Heist, complete. Smooth running.',
    chapters: [
      walk(180, 'Walk casually towards the museum. Just a person out for an evening stroll.', 'Hands in pockets. Nothing to see here.'),
      jog(180, 'Your earpiece clicks. "Go time." Easy jog around the back of the building.'),
      sprint(30, 'The searchlight is sweeping towards you. Sprint to the next shadow!'),
      walk(60, 'Safe in the shadows. Walk to the service door.'),
      jog(240, 'Inside. Jog the long corridor to the gallery. Light feet. Quiet breathing.', 'Two more doors. The crew has the cameras looping.'),
      sprint(40, 'A laser grid switches on behind you. Beat it before it closes!'),
      walk(60, 'You\'re through. Walk to the case. The diamond glows blue in the dark.'),
      sprint(45, 'You lift it. ALARM! Run for the fire exit!', 'Down the stairs! Go go go!'),
      walk(90, 'Out into the street. Slow to a walk. Blend into the crowd. Act normal.'),
      jog(300, 'The getaway is by the river. Jog steadily along the embankment.', 'Sirens in the distance, heading the wrong way. Your crew planned this perfectly.'),
      sprint(45, 'A guard spots you by the bridge. One last burst!', 'Twenty more seconds!'),
      jog(180, 'You\'ve lost him. Easy jog down to the harbour.'),
      walk(180, 'Walk the last stretch to the boat. Cool down and catch your breath.'),
    ],
  },
  {
    id: 'mars',
    title: 'Mars Rescue',
    emoji: '🚀',
    level: 'Intermediate',
    blurb: 'A dust storm has stranded a crew on Mars. You\'re the only one who can reach them on foot.',
    intro: 'Mars Rescue. A dust storm has knocked out every rover on the base. Four crew members are trapped at the far research station, and their oxygen is running low. The only way to reach them is on foot. Suit up.',
    outro: 'You lock the airlock door behind the last of the crew. Through the window, the storm rages, but everyone is safe. Mission control is cheering in your ear. Mars Rescue, complete. Commander, that was outstanding.',
    chapters: [
      walk(180, 'Step out of the airlock onto the red sand. Walk and get used to your suit.', 'The base disappears behind you in the dust.'),
      jog(300, 'Mission control: "Steady pace, commander. Conserve your oxygen." Easy jog towards the canyon.', 'Your oxygen gauge reads 80 percent. Right on plan.'),
      sprint(40, 'Rocks tumbling down the canyon wall! Sprint clear!'),
      walk(90, 'You made it past. Walk while your breathing settles.'),
      jog(300, 'Through the canyon. Keep a steady rhythm, like the beat of your suit\'s fan.', 'Halfway to the station. The crew can hear you on the radio now.'),
      sprint(50, 'The storm front is coming in fast. Get to the shelter rocks before it hits!', 'Nearly there!'),
      walk(90, 'Shelter. The storm passes overhead. Walk in place and recover.'),
      jog(240, 'The storm\'s moved on. Jog the last few kilometres across the plain.', 'You can see the station\'s lights blinking.'),
      sprint(60, 'Their oxygen alarm is going off! Sprint to the station!', 'You\'re so close. Push!'),
      jog(180, 'You\'re in. Now lead the crew back to the shuttle at an easy jog.'),
      walk(180, 'Everyone\'s aboard. Walk and cool down. Mission accomplished.'),
    ],
  },
];

export const storyById = (id: string | undefined) => STORIES.find((s) => s.id === id) ?? null;
export const storyMinutes = (s: Story) => Math.round(s.chapters.reduce((a, c) => a + c.seconds, 0) / 60);

/** A story as a workout the coaching engine can run (one interval step per chapter). */
export function storyWorkout(s: Story): Workout {
  const block: IntervalStep[] = s.chapters.map((c) => ({ kind: c.kind, measure: 'time', value: c.seconds }));
  return { id: `story-${s.id}`, name: s.title, warmup: null, block, repeats: 1, cooldown: null };
}

/** The short instruction after each chapter's narration. */
export function chapterCue(c: Chapter): string {
  const t = c.seconds >= 120 ? `${Math.round(c.seconds / 60)} minutes` : `${c.seconds} seconds`;
  return c.sprint ? `Sprint for ${t}!` : c.kind === 'walk' ? `Walk for ${t}.` : `Jog for ${t}.`;
}
