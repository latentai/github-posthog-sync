import 'dotenv/config';

// GitHub API configuration
export const SYNC_GITHUB_ID = process.env['SYNC_GITHUB_ID'];
export const SYNC_GITHUB_KEY = process.env['SYNC_GITHUB_KEY'];
export const SYNC_GITHUB_URL = process.env['SYNC_GITHUB_URL'] || 'https://api.github.com';

// PostHog API configuration
export const SYNC_POSTHOG_KEY = process.env['SYNC_POSTHOG_KEY'];
export const SYNC_POSTHOG_URL = process.env['SYNC_POSTHOG_URL'] || 'https://us.i.posthog.com';

// Application configuration
export const SYNC_NAMESPACE =
  process.env['SYNC_NAMESPACE'] || '45e8f109-f056-4372-9545-9d7b78b20c34';
export const SYNC_ALLOW_FORKS = (process.env['SYNC_ALLOW_FORKS'] || '0') !== '0';
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
