import * as migration_20260927_193553_initial from './20260927_193553_initial';
import * as migration_20260927_203354_pages_and_globals from './20260927_203354_pages_and_globals';
import * as migration_20260928_162741_feature_coming_soon from './20260928_162741_feature_coming_soon';
import * as migration_20260929_184421_social_previews from './20260929_184421_social_previews';

export const migrations = [
  {
    up: migration_20260927_193553_initial.up,
    down: migration_20260927_193553_initial.down,
    name: '20260927_193553_initial',
  },
  {
    up: migration_20260927_203354_pages_and_globals.up,
    down: migration_20260927_203354_pages_and_globals.down,
    name: '20260927_203354_pages_and_globals',
  },
  {
    up: migration_20260928_162741_feature_coming_soon.up,
    down: migration_20260928_162741_feature_coming_soon.down,
    name: '20260928_162741_feature_coming_soon',
  },
  {
    up: migration_20260929_184421_social_previews.up,
    down: migration_20260929_184421_social_previews.down,
    name: '20260929_184421_social_previews'
  },
];
