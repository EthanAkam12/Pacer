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
      { name: 'Run/walk', text: 'Run for a set time, then walk to recover. Pacely tells you when to switch. Run slowly enough that you could still talk.' },
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
      { name: '400 m reps', text: 'Run 400 m (one lap of a track) at 5:30 per km, a bit faster than your goal pace, then rest for 90 seconds. Pacely tells you if you\'re on pace. Running faster than goal pace makes goal pace feel easier.' },
      { name: 'Easy run', text: 'A relaxed run to recover between the harder sessions. Don\'t worry about pace at all.' },
      { name: 'Steady run', text: 'A longer run at 6:00 per km, your target race pace. Pacely warns you if you drift too slow, so you learn what the pace feels like.' },
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
  comeback: {
    goal: 'Get back to 25 minutes of easy running, safely, in 6 weeks.',
    whoFor: 'Runners coming back from an injury or a long break (a month or more). If you\'re still in pain, or a physio told you not to run yet, wait until you\'re cleared.',
    needs: ['The all-clear to run, if you\'ve been injured', 'About 30 minutes, three times a week', 'Flat, soft routes if you can: grass or trails'],
    phases: [
      { weeks: '1–2', title: 'Easing in', text: 'Short runs of 2 and 3 minutes with walking breaks. The aim is to run without pain, not to get fit.' },
      { weeks: '3–4', title: 'Building trust', text: 'Runs grow to 5 and then 8 minutes. Your body gets used to running again a little at a time.' },
      { weeks: '5–6', title: 'Running again', text: 'Longer runs with one short walk, then 25 minutes of easy running. Then you can go back to your normal training or another plan.' },
    ],
    sessionTypes: [
      { name: 'Run/walk', text: 'Run gently for a set time, then walk for a minute. Pacely tells you when to switch. Every run should feel easy.' },
      { name: 'Warm-up and cool-down walks', text: '5 minutes of walking at each end. Don\'t skip them: they matter more when you\'re coming back.' },
    ],
    weekNotes: [
      '2 minute runs. If anything hurts during or after, stop and rest for a few days.',
      '3 minute runs. You should feel fine the next morning.',
      '5 minute runs with short walks.',
      '8 minute runs. Halfway there.',
      '12 minute runs. Stay slow, even if you feel great.',
      '25 minutes of easy running. Welcome back!',
    ],
    tips: ['Pain that changes how you run means stop. Mild stiffness the next day is fine.', 'Repeat any week that feels too much. Going slowly now stops you getting injured again.', ...COMMON_TIPS.slice(0, 3)],
    finish: 'You\'ll be running 25 minutes easily again. Go back to your usual running, or start First 10K or Couch to 5K\'s later weeks.',
  },
  sub25: {
    goal: 'Run 5 km in under 25 minutes, in 6 weeks.',
    whoFor: 'People who can run 5 km in about 26 to 28 minutes. This plan makes you faster, not able to go further.',
    needs: ['Running shoes', 'About 30 to 45 minutes, three times a week', 'A flat route or track for the reps'],
    phases: [
      { weeks: '1–2', title: 'Learning the pace', text: '400 m reps at 4:40 per km and steady runs at 5:00 per km, which is exactly sub-25 pace.' },
      { weeks: '3–5', title: 'Speed and stamina', text: 'More reps and longer steady runs, so 5:00 per km starts to feel comfortable.' },
      { weeks: '6', title: 'Time trial', text: 'Fewer reps to keep your legs fresh, then 5 km aiming for under 25 minutes.' },
    ],
    sessionTypes: [
      { name: '400 m reps', text: 'Run 400 m at 4:40 per km, a bit faster than race pace, then rest 90 seconds. Pacely tells you if you\'re on pace.' },
      { name: 'Easy run', text: 'Relaxed running to recover. No pace to worry about.' },
      { name: 'Steady run', text: 'A longer run at 5:00 per km, your goal pace. Pacely warns you if you drift too slow.' },
    ],
    weekNotes: [
      '5 reps and a 4 km steady run. Find your rhythm at 5:00 per km.',
      '6 reps and 5 km steady.',
      '7 reps and another 5 km steady. Should feel a bit easier.',
      '7 reps and a 6 km steady run: further than race distance at race pace.',
      '8 reps and 6 km. The hardest week, so rest well.',
      'Only 4 reps, then the time trial. Start steady and speed up in the last kilometre.',
    ],
    tips: [...COMMON_TIPS, 'Run the reps evenly: the last should be as fast as the first.'],
    finish: 'You\'ll run 5 km in under 25 minutes. Next: Sub-20 5K, or 10K personal best.',
  },
  '10kpb': {
    goal: 'Set a new 10K personal best in 8 weeks.',
    whoFor: 'Runners who already run 10 km regularly and want to get faster at it.',
    needs: ['Running shoes', 'Four runs a week, 30 to 90 minutes each', 'A route of 10 km or more'],
    phases: [
      { weeks: '1–3', title: 'Building', text: 'Reps of 800 m, tempo runs and long runs up to 12 km lay the groundwork.' },
      { weeks: '4–6', title: 'Sharpening', text: 'More reps, longer tempo runs and long runs up to 14 km. This is the hard block.' },
      { weeks: '7–8', title: 'Taper and race', text: 'Less volume so you\'re fresh, then race 10 km.' },
    ],
    sessionTypes: [
      { name: '800 m reps', text: 'Run 800 m hard (faster than 10K pace), jog 90 seconds, repeat. Pacely compares each rep with how you started it.' },
      { name: 'Tempo run', text: 'Comfortably hard: you could say a few words, but not chat. It lifts the pace you can hold for 10 km.' },
      { name: 'Easy run', text: 'Relaxed recovery running.' },
      { name: 'Long run', text: 'Slow and steady, building endurance so the last 2 km of the race feel strong.' },
    ],
    weekNotes: [
      '5 × 800 m, 15 min tempo, 10 km long run.',
      '6 reps, 18 min tempo, 11 km.',
      '6 reps, 20 min tempo, 12 km.',
      '7 reps, 22 min tempo, 12 km.',
      '8 reps, 25 min tempo, 13 km.',
      'Peak week: 8 reps, 25 min tempo, 14 km. Rest well.',
      'Taper: 6 reps, 20 min tempo, 12 km.',
      'Race week: short and sharp, then your 10K. Go out steady and finish fast.',
    ],
    tips: [...COMMON_TIPS, 'In the race, run the first 2 km a little slower than goal pace. You\'ll get it back.'],
    finish: 'A new 10K PB. Try the half marathon plan next, or repeat this one aiming a bit faster.',
  },
  sub20: {
    goal: 'Run 5 km in under 20 minutes, in 8 weeks.',
    whoFor: 'Experienced runners who can run 5 km in about 21 to 22 minutes and train four times a week.',
    needs: ['Running shoes', 'Four runs a week', 'A track or a flat measured kilometre for reps'],
    phases: [
      { weeks: '1–3', title: 'Foundation', text: 'Kilometre reps at 3:50 per km, tempo runs at 4:15 and long runs up to 10 km.' },
      { weeks: '4–6', title: 'The hard block', text: 'More reps, 25 minute tempo runs and 12 km long runs. Recovery matters now.' },
      { weeks: '7–8', title: 'Taper and time trial', text: 'Less work so your legs are fresh, then 5 km aiming for under 20 minutes (3:58 per km).' },
    ],
    sessionTypes: [
      { name: '1 km reps', text: 'Run 1 km at 3:50 per km, jog 2 minutes, repeat. The heart of the plan.' },
      { name: 'Tempo run', text: '4:15 per km for 15 to 25 minutes, after a 10 minute warm-up.' },
      { name: 'Easy run', text: 'Truly easy. Most runners go too fast on these.' },
      { name: 'Long run', text: '8 to 12 km at an easy pace, for aerobic strength.' },
    ],
    weekNotes: [
      '4 × 1 km, 15 min tempo, 8 km long.',
      '5 × 1 km, 18 min tempo, 9 km.',
      '5 × 1 km, 20 min tempo, 10 km.',
      '6 × 1 km, 20 min tempo, 10 km.',
      '6 × 1 km, 22 min tempo, 11 km.',
      'Peak: 7 × 1 km, 25 min tempo, 12 km.',
      'Taper: 6 × 1 km, 20 min tempo, 10 km.',
      '3 × 1 km to stay sharp, then the time trial. Even pace: 3:58 every kilometre.',
    ],
    tips: [...COMMON_TIPS, 'Sleep is training too, especially in weeks 4–6.'],
    finish: 'Under 20 minutes for 5 km is a brilliant time. Try 10K personal best next.',
  },
  marathon: {
    goal: 'Run a marathon (42.2 km) in 16 weeks.',
    whoFor: 'Runners who have done a half marathon, or can run 13 km comfortably, and can train four times a week.',
    needs: ['Well worn-in running shoes', 'Four runs a week; long runs take up to 3½ hours', 'Water and energy gels for long runs', 'A plan for race-day food and drink'],
    phases: [
      { weeks: '1–4', title: 'Base', text: 'Easy runs, reps or tempo, and a long run from 13 to 18 km.' },
      { weeks: '5–9', title: 'Building', text: 'The long run grows to 23 km, with a lighter week every few weeks to recover.' },
      { weeks: '10–14', title: 'Peak', text: 'Long runs of 24, 26, 28 and finally 32 km. The hardest part of the plan.' },
      { weeks: '15–16', title: 'Taper and race', text: 'Less running so your legs are fresh and strong, then 42.2 km.' },
    ],
    sessionTypes: [
      { name: 'Easy run', text: 'Relaxed, chatty running. Most of your week.' },
      { name: 'Reps / tempo', text: 'Alternate weeks: 1 km reps comfortably hard, or a tempo block. Keeps you strong and sharp.' },
      { name: 'Long run', text: 'The key session. Run it slowly, and practise drinking and taking gels as you will in the race.' },
    ],
    weekNotes: [
      'Long run 13 km. Four runs a week from now on.',
      'Long run 14 km.',
      'Long run 16 km.',
      'Long run 18 km.',
      'Lighter week: 15 km long run.',
      'Long run 19 km.',
      'Long run 21 km: a half marathon in training!',
      'Long run 23 km. Practise your race-day drinks.',
      'Lighter week: 19 km.',
      'Long run 24 km.',
      'Long run 26 km.',
      'Long run 28 km.',
      'Lighter week: 22 km.',
      'Peak: 32 km. The longest run before race day.',
      'Taper begins: 21 km.',
      'Race week! Short easy runs, then 42.2 km. Start slower than you think you should.',
    ],
    tips: [...COMMON_TIPS, 'Take a drink or a gel every 30–45 minutes on runs over 90 minutes.', 'Don\'t try anything new on race day.'],
    finish: 'You\'ll be a marathoner. Take two easy weeks afterwards: you\'ve earned them.',
  },
};
