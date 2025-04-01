import 'dotenv/config';

export const GITHUB_API_ID = process.env['GITHUB_API_ID'];
export const GITHUB_API_KEY = process.env['GITHUB_API_KEY'];
export const GITHUB_API_URL = process.env['GITHUB_API_URL'] || 'https://api.github.com';

export const POSTHOG_API_KEY = process.env['POSTHOG_API_KEY'];
export const POSTHOG_API_URL = process.env['POSTHOG_API_URL'] || 'https://us.i.posthog.com';

export const SYNC_NAMESPACE =
  process.env['SYNC_NAMESPACE'] || '45e8f109-f056-4372-9545-9d7b78b20c34';
export const SYNC_ALLOW_FORKS = Boolean(process.env['SYNC_ALLOW_FORKS']);
export const SYNC_STATS_MAPPING = {
  clones: {
    event: 'repository.cloned',
    method: 'getClones',
  },
  views: {
    event: 'repository.viewed',
    method: 'getViews',
  },
};
