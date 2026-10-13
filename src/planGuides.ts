/**
 * The written guide for each training plan (src/plans.ts): who it's for, how it builds up,
 * what each kind of session does, a note for every week, and tips. Shown on app/plan/[id].tsx.
 */
export interface PlanGuide {
  goal: string;
  whoFor: string;
  needs: string[];
  phases: { weeks: string; title: string; text: string }[];
  sessionTypes: { name: string; text: string }[];
  /** One note per week, explaining what that week is for. */
  weekNotes: string[];
  tips: string[];
  finish: string;
}

const COMMON_TIPS = [
  'Start every session at an easy pace. If you can\'t say a full sentence, slow down. Going too fast is the most common reason people stop.',
  'Leave at least one rest day between runs. Your body gets stronger while it rests, not while it runs.',
  'If a week feels too hard, repeat it. There\'s no prize for finishing on time, only for finishing.',
  'A sharp or worsening pain is a reason to stop and rest. General tiredness and stiff legs are normal.',
  'Drink some water, and eat something light an hour or two before you run.',
];

export const GUIDES: Record<string, PlanGuide> = {
  c25k: {
    goal: 'Run 5 km, or 30 minutes without stopping, in 9 weeks.',
    whoFor: 'Complete beginners, or anyone coming back after a long break. You don\'t need to be able to run at all yet. If you can walk briskly for 30 minutes, you can start.',
    needs: ['Comfortable trainers', 'About 30 minutes, three times a week', 'A safe route: a park, a quiet pavement or a track'],
    phases: [
      { weeks: '1–2', title: 'Getting started', text: 'Very short runs of 1 to 1½ minutes with plenty of walking in between. Your heart, lungs and legs get used to running a little at a time.' },
      { weeks: '3–4', title: 'Longer runs', text: 'Runs grow to 3 and then 5 minutes. Walking breaks stay, so you always get a chance to recover.' },
      { weeks: '5–6', title: 'The big jump', text: 'This is where it changes: by the end of week 5 you run 20 minutes without stopping. It feels like a big step, but the earlier weeks have prepared you for it.' },
      { weeks: '7–9', title: 'Running non-stop', text: 'No more walking. Every session is one continuous run, growing from 25 to 30 minutes. At an easy pace, 30 minutes is about 5 km for most people.' },
    ],
    sessionTypes: [
      { name: 'Warm-up walk (5 min)', text: 'A brisk walk before every session warms up your muscles and gets your heart rate up gently.' },
      { name: 'Run/walk', text: 'Run for a set time, then walk to recover. Pacer tells you when to switch. Run slowly enough that you could still talk.' },
      { name: 'Continuous run', text: 'One steady run with no walking. Pick a pace you could keep going at, even if it feels slow.' },
      { name: 'Cool-down walk (5 min)', text: 'Lets your heart rate come down slowly and helps your legs feel less stiff the next day.' },
    ],
    weekNotes: [
      'Learn the rhythm: 1 minute of running, then a walk. It should feel almost too easy.',
      'Runs grow to 1½ minutes. Keep the running slow.',
      'Two lengths of run: 1½ and 3 minutes. The 3 minute runs are your first real challenge.',
      'Up to 5 minute runs, with shorter walks. Halfway through the plan!',
      'The big week: 5, then 8, then 20 minutes without stopping. Trust the plan and go slowly.',
      'Mostly running now, finishing with 25 minutes non-stop.',
      '25 minutes, three times. Get comfortable running without walking breaks.',
      '28 minutes. Your easy running is getting stronger every session.',
      '30 minutes non-stop. You\'re a runner! Try a 5 km route or a parkrun.',
    ],
    tips: COMMON_TIPS,
    finish: 'By the end you can run for 30 minutes without stopping, which is about 5 km. A great next step is a parkrun (free, every Saturday) or the First 10K plan.',
  },
  '10k': {
    goal: 'Run 10 km in 8 weeks.',
    whoFor: 'People who can already run about 3 km, or 20 minutes, without stopping. If that\'s too much right now, do Couch to 5K first.',
    needs: ['Running shoes that fit well', 'About 30 to 70 minutes, three times a week (the long run takes longest)', 'A route where you can run 10 km, or a loop you can repeat'],
    phases: [
      { weeks: '1–3', title: 'Building a base', text: 'Easy runs get you running regularly, short run/walk reps add a little speed, and the long run grows from 4 to 5½ km.' },
      { weeks: '4–6', title: 'Going further', text: 'The long run reaches 8 km and your easy runs get longer. This is where your endurance really grows.' },
      { weeks: '7', title: 'Peak week', text: 'Your longest training run: 9 km. After this, the plan gets easier so you\'re fresh for race day.' },
      { weeks: '8', title: 'Race week', text: 'Shorter, easier runs so your legs are rested, then the full 10 km.' },
    ],
    sessionTypes: [
      { name: 'Easy run', text: 'A relaxed run at a pace where you could chat. Most of your running should feel like this. It builds endurance without wearing you out.' },
      { name: 'Run/walk reps', text: '2 minutes of running a bit quicker than easy, then 1 minute of walking, repeated. It teaches your body to run faster without getting exhausted.' },
      { name: 'Long run', text: 'The most important session of the week. Go slowly: the aim is time on your feet, not speed. It grows by about 1 km a week so your legs can adapt.' },
    ],
    weekNotes: [
      'Long run of 4 km. Get into a routine of three runs a week.',
      'Long run of 5 km. The reps go up to 6.',
      'Long run of 5½ km. Easy runs grow to 25 minutes.',
      'Long run of 6½ km. You\'re now past halfway to 10 km.',
      'Long run of 7 km and 30 minute easy runs.',
      'Long run of 8 km. This is the hardest week so far, so rest well.',
      'Peak week: 9 km. If you can run this, you can run 10.',
      'Race week. Keep the first two runs easy, then run your 10 km!',
    ],
    tips: [...COMMON_TIPS, 'For runs over an hour, take water with you.'],
    finish: 'You\'ll run 10 km. After that, try to get faster with Sub-30 5K, or go longer with the half marathon plan.',
  },
  sub30: {
    goal: 'Run 5 km in under 30 minutes, in 6 weeks.',
    whoFor: 'People who can already run 5 km without stopping, in roughly 31 to 35 minutes. This plan is about getting faster, not further.',
    needs: ['Running shoes', 'About 30 to 45 minutes, three times a week', 'A flat route or a track for the 400 m reps'],
    phases: [
      { weeks: '1–2', title: 'Learning the pace', text: 'Short 400 m reps at 5:30 per km teach your legs what faster running feels like. The steady runs are at 6:00 per km, which is exactly sub-30 pace.' },
      { weeks: '3–5', title: 'Building speed and stamina', text: 'More reps and longer steady runs. Running at 6:00 per km starts to feel normal.' },
      { weeks: '6', title: 'Time trial', text: 'Fewer reps so you\'re fresh, then a 5 km time trial aiming for under 30 minutes (5:55 per km).' },
    ],
    sessionTypes: [
      { name: '400 m reps', text: 'Run 400 m (one lap of a track) at 5:30 per km, a bit faster than your goal pace, then rest for 90 seconds. Pacer tells you if you\'re on pace. Running faster than goal pace makes goal pace feel easier.' },
      { name: 'Easy run', text: 'A relaxed run to recover between the harder sessions. Don\'t worry about pace at all.' },
      { name: 'Steady run', text: 'A longer run at 6:00 per km, your target race pace. Pacer warns you if you drift too slow, so you learn what the pace feels like.' },
    ],
    weekNotes: [
      '5 reps of 400 m and a 4 km steady run. Find your rhythm at 6:00 per km.',
      '6 reps and a 5 km steady run. Don\'t start the reps too fast.',
      '6 reps again and another 5 km steady run, which should feel a little easier.',
      '7 reps and a 6 km steady run. You\'re running further than race distance at race pace.',
      '8 reps and 6 km. The hardest week, so rest well afterwards.',
      'Only 4 reps to keep your legs fresh, then the time trial. Start steady and speed up in the last kilometre.',
    ],
    tips: [...COMMON_TIPS, 'On the reps, the last one should feel hard but not all-out. If your pace drops a lot, rest a little longer.'],
    finish: 'You\'ll run 5 km in under 30 minutes. From here, try the First 10K, or keep doing one reps session a week to keep getting faster.',
  },
  half: {
    goal: 'Run a half marathon (21.1 km) in 12 weeks.',
    whoFor: 'People who can run 5 to 8 km comfortably. If 8 km sounds like a lot, do the First 10K plan first.',
    needs: ['Good running shoes (make sure they\'ve been worn in before race day)', 'About 40 minutes to 2½ hours, three times a week (the long runs get long)', 'Water and maybe energy gels or sweets for runs over an hour'],
    phases: [
      { weeks: '1–4', title: 'Base building', text: 'Easy runs, short tempo runs and a long run that grows from 8 to 11 km. You build the endurance everything else is built on.' },
      { weeks: '5–8', title: 'Building endurance', text: 'The long run goes from 12 to 15 km and the tempo runs reach 20 minutes. This is the core of the plan.' },
      { weeks: '9', title: 'Peak', text: 'Your longest run: 16 km. After this you\'re ready, and the rest is about recovering.' },
      { weeks: '10–12', title: 'Taper and race', text: 'Shorter runs so your legs are fully rested and strong, then race day. It feels odd to run less, but it makes you faster on the day.' },
    ],
    sessionTypes: [
      { name: 'Easy run', text: 'Relaxed, conversational running. It builds endurance and helps you recover from the harder sessions.' },
      { name: 'Tempo run', text: '10 minutes of easy running to warm up, then a block at "comfortably hard" pace, where you could say a few words but not chat. It raises the pace you can hold for a long time.' },
      { name: 'Long run', text: 'The key session. Run slowly, around 1 minute per km slower than you would in a 5K. Practise drinking and eating on the runs over an hour.' },
    ],
    weekNotes: [
      'Long run of 8 km. Get used to three runs a week.',
      'Long run of 9 km and a 12 minute tempo.',
      'Long run of 10 km. You\'re near halfway to the half.',
      'Long run of 11 km. Take water if it\'s warm.',
      'Long run of 12 km. Try taking a drink or a gel during the run.',
      'Long run of 13 km and an 18 minute tempo.',
      'Long run of 14 km. Easy runs reach 45 minutes.',
      'Long run of 15 km. Rest well this week.',
      'Peak week: 16 km. Your longest run before the race.',
      'Taper begins: 14 km. Running less now makes you stronger on race day.',
      'Long run of 11 km. Keep everything easy.',
      'Race week! Two short runs, then 21.1 km. Start slower than you think you should.',
    ],
    tips: [...COMMON_TIPS, 'Don\'t try anything new on race day: wear shoes and kit you\'ve already run in.', 'Plan your race morning: breakfast 2–3 hours before, and get there early.'],
    finish: 'You\'ll run a half marathon. Take a few easy weeks afterwards to recover before your next goal.',
  },
};
