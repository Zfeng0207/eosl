export const sum = <T>(a: readonly T[], f: (x: T) => number): number => a.reduce((s, x) => s + f(x), 0);

export const fmt = (n: number): string => Math.round(n).toLocaleString('en');

/** Distinct values of `k`, in first-seen order. */
export const uniq = <T, K extends keyof T>(a: readonly T[], k: K): T[K][] => [...new Set(a.map((x) => x[k]))];
