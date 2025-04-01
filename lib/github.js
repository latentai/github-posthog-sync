import { Octokit } from '@octokit/rest';
import { GITHUB_API_KEY, GITHUB_API_ID, GITHUB_API_URL, SYNC_STATS_MAPPING } from './config.js';

const octokit = new Octokit({
  auth: GITHUB_API_KEY,
  baseUrl: GITHUB_API_URL,
});

export async function* getRepositories() {
  let whoami =
    (await _lookupOrg(GITHUB_API_ID)) ||
    (await _lookupUser(GITHUB_API_ID)) ||
    (await _getCurrentUser());

  let api = whoami.type === 'User' ? 'listForUser' : 'listForOrg';
  let field = whoami.type === 'User' ? 'username' : 'org';

  let iterator = octokit.paginate.iterator(octokit.rest.repos[api], {
    [field]: whoami.login,
  });

  for await (let response of iterator) {
    yield* response.data;
  }
}

export async function* getRepositoryStats(repo) {
  for (let [name, opts] of Object.entries(SYNC_STATS_MAPPING)) {
    let { data } = await octokit.rest.repos[opts.method]({
      owner: repo.owner.login,
      repo: repo.name,
    });

    for (let entry of data[name]) {
      yield { name: name, ...entry };
    }
  }
}

async function _getCurrentUser() {
  return octokit.rest.users.getAuthenticated().then(function (response) {
    return response.data;
  });
}

async function _lookupUser(username) {
  return _lookup(username, function () {
    return octokit.rest.users.getByUsername({ username });
  });
}

async function _lookupOrg(org) {
  return _lookup(org, function () {
    return octokit.rest.orgs.get({ org });
  });
}

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
