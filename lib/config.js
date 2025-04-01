import 'dotenv/config';

// GitHub API configuration
export const SYNC_GITHUB_ID = process.env['SYNC_GITHUB_ID'];
export const SYNC_GITHUB_KEY = process.env['SYNC_GITHUB_KEY'];
export const SYNC_GITHUB_URL = process.env['SYNC_GITHUB_URL'] || 'https://api.github.com';

// PostHog API configuration
export const SYNC_POSTHOG_KEY = process.env['SYNC_POSTHOG_KEY'];
export const SYNC_POSTHOG_URL = process.env['SYNC_POSTHOG_URL'] || 'https://us.i.posthog.com';

// Application configuration
export const SYNC_DEBUG = _switch('SYNC_DEBUG');
export const SYNC_ALLOW_FORKS = _switch('SYNC_ALLOW_FORKS');
export const SYNC_ALLOW_PRIVATE = _switch('SYNC_ALLOW_PRIVATE');
export const SYNC_NAMESPACE =
  process.env['SYNC_NAMESPACE'] || '45e8f109-f056-4372-9545-9d7b78b20c34';
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

// boolean flag switch
function _switch(name) {
  return (process.env[name] || '0') !== '0';
}
