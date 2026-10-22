import { StepKind } from './types';

/** Shared shapes and helpers for story runs (src/stories.ts and the season files). */
export interface Chapter { kind: StepKind; seconds: number; say: string; mid?: string; sprint?: boolean }
export interface Story {
  id: string; title: string; emoji: string; blurb: string; level: string; intro: string; outro: string; chapters: Chapter[];
  /** Episodes of a season unlock one a week; episode 1 is free for everyone. */
  season?: string; episode?: number;
}

export const walk = (seconds: number, say: string, mid?: string): Chapter => ({ kind: 'walk', seconds, say, mid });
export const jog = (seconds: number, say: string, mid?: string): Chapter => ({ kind: 'run', seconds, say, mid });
export const sprint = (seconds: number, say: string, mid?: string): Chapter => ({ kind: 'run', seconds, say, mid, sprint: true });
