import type { ProductType } from '@/data/types';

export type TypeFilter = 'All' | ProductType;
export type Horizon = 0 | 3 | 6 | 12;
export const HORIZONS: readonly Horizon[] = [0, 3, 6, 12];
