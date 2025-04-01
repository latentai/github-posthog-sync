import { PostHog } from 'posthog-node';
import { POSTHOG_API_KEY, POSTHOG_API_URL } from './config.js';
import { SYNC_NAMESPACE, SYNC_STATS_MAPPING } from './config.js';
import { v5 } from 'uuid';

/**
 * Register a repository statistic with PostHog's API.
 *
 * @param {object} repo
 *    A repository object from the GitHub API.
 * @param {object} stat
 *    A statistic entry from the GitHub API.
 */
PostHog.prototype.register = function register(repo, stat) {
  // generate a uuid based on the repository + day + stat type
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

// expore the full client rather than proxy
export default new PostHog(POSTHOG_API_KEY, {
  host: POSTHOG_API_URL,
});
