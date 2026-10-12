import type { Rag } from '@/data/types';

/** Leadership wording per status: [label, description, icon glyph] (the prototype's RL). */
export const STATUS: Readonly<Record<Rag, readonly [string, string, string]>> = {
  red: ['Act now', 'Out of support or ends within 90 days', '!'],
  amber: ['At risk', 'Support ends within 12 months', '◷'],
  green: ['Supported', 'More than 12 months of support', '✓'],
  grey: ['No date', 'No end-of-support date recorded', '?'],
};

export const STATUS_COLOR: Readonly<Record<Rag, string>> = {
  red: 'var(--r)',
  amber: 'var(--a)',
  green: 'var(--g)',
  grey: 'var(--n)',
};

/** Statuses that can be put in focus (grey has no end date, so it can't be projected). */
export const FOCUSABLE: readonly Rag[] = ['red', 'amber', 'green'];
export const ALL_STATUSES: readonly Rag[] = ['red', 'amber', 'green', 'grey'];
