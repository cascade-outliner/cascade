import * as migration_20260927_193553_initial from './20260927_193553_initial';
import * as migration_20260927_203354_pages_and_globals from './20260927_203354_pages_and_globals';

export const migrations = [
  {
    up: migration_20260927_193553_initial.up,
    down: migration_20260927_193553_initial.down,
    name: '20260927_193553_initial',
  },
  {
    up: migration_20260927_203354_pages_and_globals.up,
    down: migration_20260927_203354_pages_and_globals.down,
    name: '20260927_203354_pages_and_globals'
  },
];
