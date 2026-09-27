import * as migration_20260927_193553_initial from './20260927_193553_initial';

export const migrations = [
  {
    up: migration_20260927_193553_initial.up,
    down: migration_20260927_193553_initial.down,
    name: '20260927_193553_initial'
  },
];
