/**
 * Spoken warm-up and stretch routines. Each move has a time, an instruction the coach reads out,
 * and (for one-leg moves) a "switch sides" call halfway.
 */
export interface Move { name: string; seconds: number; say: string; sides?: boolean }
export interface Routine { id: string; title: string; blurb: string; moves: Move[] }

export const ROUTINES: Record<string, Routine> = {
  warmup: {
    id: 'warmup',
    title: 'Warm-up',
    blurb: 'Five minutes to get your muscles warm and your heart rate up before you run.',
    moves: [
      { name: 'Brisk walk', seconds: 60, say: 'Start with a brisk walk. Swing your arms and breathe easy.' },
      { name: 'Leg swings', seconds: 40, sides: true, say: 'Hold something steady, and swing one leg forwards and back, nice and relaxed.' },
      { name: 'Side leg swings', seconds: 40, sides: true, say: 'Now swing the leg side to side, across your body and out.' },
      { name: 'Walking lunges', seconds: 40, say: 'Walking lunges. Big step forward, lower your back knee towards the ground, and push up into the next one.' },
      { name: 'High knees', seconds: 30, say: 'High knees. Jog on the spot and lift your knees towards your hips. Quick and light.' },
      { name: 'Bum kicks', seconds: 30, say: 'Bum kicks. Jog on the spot and flick your heels up behind you.' },
      { name: 'Skips', seconds: 30, say: 'Skipping. Light, bouncy skips, driving your arms.' },
      { name: 'Easy jog', seconds: 30, say: 'Finish with an easy jog, building up gently. You\'re ready to run.' },
    ],
  },
  stretch: {
    id: 'stretch',
    title: 'Cool-down stretches',
    blurb: 'Five gentle stretches for after your run. Hold each one; never bounce.',
    moves: [
      { name: 'Calf stretch', seconds: 60, sides: true, say: 'Calf stretch. Hands on a wall, one leg back with the heel down, and lean in gently.' },
      { name: 'Hamstring stretch', seconds: 60, sides: true, say: 'Hamstring stretch. Put one heel out in front, toes up, and hinge forward from your hips with a straight back.' },
      { name: 'Quad stretch', seconds: 60, sides: true, say: 'Quad stretch. Stand tall, hold one ankle behind you and bring your heel towards your bum. Knees together.' },
      { name: 'Hip flexor stretch', seconds: 60, sides: true, say: 'Hip flexor stretch. Kneel on one knee, the other foot in front, and gently push your hips forward.' },
      { name: 'Glute stretch', seconds: 60, sides: true, say: 'Glute stretch. Lie on your back, cross one ankle over the other knee, and pull the legs towards you.' },
    ],
  },
};

export const routineMinutes = (r: Routine) => Math.round(r.moves.reduce((a, m) => a + m.seconds, 0) / 60);
