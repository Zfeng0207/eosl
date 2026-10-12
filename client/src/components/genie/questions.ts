import type { PageKey } from '@/pages';

/**
 * Suggested questions per page. The Leadership prototype ships with none, so the
 * "Suggested for this page" block stays hidden; add questions here to show it.
 */
export const SUGGESTED: Readonly<Record<PageKey, readonly string[]>> = {
  lin: [],
  ov: [],
  wa: [],
  na: [],
  ne: [],
  db: [],
  imp: [],
  upd: [],
};
