import { PostHog } from 'posthog-node';
import { v5 } from 'uuid';

import {
    SYNC_DEBUG,
    SYNC_NAMESPACE,
    SYNC_POSTHOG_KEY,
    SYNC_POSTHOG_URL,
    SYNC_STATS_MAPPING,
} from './config.js';

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
    let uid = v5(`${repo.full_name}:${stat.timestamp}:${stat.name}`, SYNC_NAMESPACE);
    let event = {
        uuid: uid,
        event: SYNC_STATS_MAPPING[stat.name].event,
        timestamp: stat.timestamp,
        distinctId: uid,
        properties: {
            repo: repo.full_name,
            count: stat.count || 0,
            uniques: stat.uniques || 0,
            $sent_at: stat.timestamp,
            $ignore_sent_at: true,
            $process_person_profile: false,
        },
    };

    // debug logging
    if (SYNC_DEBUG) {
        console.log(JSON.stringify(event));
    }

    // capture internally
    this.capture(event);
};

// expore the full client rather than proxy
export default new PostHog(SYNC_POSTHOG_KEY, {
    host: SYNC_POSTHOG_URL,
    flushAt: 1,
    flushInterval: 0,
});
