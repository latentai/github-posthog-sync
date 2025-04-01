import { PostHog } from 'posthog-node';
import { POSTHOG_API_KEY, POSTHOG_API_URL } from './config.js';
import { SYNC_NAMESPACE, SYNC_STATS_MAPPING } from './config.js';
import { v5 } from 'uuid';

PostHog.prototype.register = function register(repo, stat) {
  let uid = v5(`${repo}:${stat.timestamp}:${stat.name}`, SYNC_NAMESPACE);

  let event = {
    uuid: uid,
    event: SYNC_STATS_MAPPING[stat.name].event,
    timestamp: stat.timestamp,
    distinctId: uid,
    properties: {
      repo: repo.full_name,
      count: stat.count || 0,
      uniques: stat.uniques || 0,
    },
  };

  return this.capture(event);
};

export default new PostHog(POSTHOG_API_KEY, {
  host: POSTHOG_API_URL,
});
