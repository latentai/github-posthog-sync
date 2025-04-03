import { Octokit } from '@octokit/rest';
import {
    SYNC_DEBUG,
    SYNC_GITHUB_KEY,
    SYNC_GITHUB_ID,
    SYNC_GITHUB_URL,
    SYNC_STATS_MAPPING,
} from './config.js';

// base client via config
const octokit = new Octokit({
    auth: SYNC_GITHUB_KEY,
    baseUrl: SYNC_GITHUB_URL,
    log: {
        warn: SYNC_DEBUG ? console.warn : () => {},
        error: SYNC_DEBUG ? console.error : () => {},
    },
});

/**
 * Asynchronously yields repositories for the configured user.
 *
 * @async
 * @generator
 * @function
 * @yields {Promise<object>}
 *    A repository object from the GitHub API.
 */
export async function* getRepositories() {
    // figure out who we're fetching for
    let whoami =
        (await _lookupOrg(SYNC_GITHUB_ID)) ||
        (await _lookupUser(SYNC_GITHUB_ID)) ||
        (await _getCurrentUser());

    // figure out which methods and fields to use in the API calls
    let api = whoami.type === 'User' ? 'listForUser' : 'listForOrg';
    let field = whoami.type === 'User' ? 'username' : 'org';

    // create an async iterator using the determined method and field
    let iterator = octokit.paginate.iterator(octokit.rest.repos[api], {
        [field]: whoami.login,
    });

    // yield the data from every page
    for await (let response of iterator) {
        yield* response.data;
    }
}

/**
 * Asynchronously yields statistics for the provided repository.
 *
 * @param {object} repo
 *    A repository object from the GitHub API.
 * @yields {Promise<object>}
 *    A statistics entry from the GitHub API.
 * @generator
 * @function
 * @async
 */
export async function* getRepositoryStats(repo) {
    // walk through the configured stats mapping in the config
    for (let [name, opts] of Object.entries(SYNC_STATS_MAPPING)) {
        // fetch the data for the statistic via the API method
        let { data } = await octokit.rest.repos[opts.method]({
            owner: repo.owner.login,
            repo: repo.name,
        });

        // yield each entry individually
        for (let entry of data[name]) {
            yield { name: name, ...entry };
        }
    }
}

/**
 * Retrieve the currently authenticated user.
 *
 * @returns {object}
 *    A user object from the GitHub API.
 * @private
 * @async
 */
async function _getCurrentUser() {
    return octokit.rest.users.getAuthenticated().then(function (response) {
        return response.data;
    });
}

/**
 * Retrieve a user by username.
 *
 * @param {string} username
 *    The username to lookup in the GitHub API.
 * @returns {object}
 *    A user object from the GitHub API, it it exists.
 * @private
 * @async
 */
async function _lookupUser(username) {
    return _lookup(username, function () {
        return octokit.rest.users.getByUsername({ username });
    });
}

/**
 * Retrieve an organization by name.
 *
 * @param {string} name
 *    The name to lookup in the GitHub API.
 * @returns {object}
 *    An organization object from the GitHub API, it it exists.
 * @private
 * @async
 */
async function _lookupOrg(org) {
    return _lookup(org, function () {
        return octokit.rest.orgs.get({ org });
    });
}

/**
 * Lookup a resource in the GitHub API.
 *
 * @param {string} identity
 *    The identifier to search for in the API.
 * @param {function} provider
 *    The provider function to fetch from the API.
 * @returns
 *    A GitHub API object, if it exists.
 */
async function _lookup(identity, provider) {
    if (!identity) {
        return;
    }

    try {
        return (await provider(identity)).data;
    } catch {
        // 404, etc.
    }
}
