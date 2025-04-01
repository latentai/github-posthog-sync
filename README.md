# GitHub PostHog Sync

This repository contains tools to sync your GitHub traffic stats to PostHog.

It also includes a set of GitHub Actions to automatically run the sync
periodically. You can fork this repository, change the secrets in the GitHub
Actions UI, and then forget about it!

## Quick Start

To get start with automation, fork this repository and configure any
environment variables as Secrets inside your repository. You can find
this by going to `Settings > Security > Secrets and Variables > Secrets`.

All secrets are automatically masked in build logs by GitHub, so any key
are protected out of the box. The section below will document any options
you need to provide to get up and running; only a couple!

## Configuration

There are several options you must provide before running this tool. Options
are provided as environment variables, either manually or via `.env`. The
required options are as follows:

```
SYNC_GITHUB_KEY=github_pat_*
SYNC_POSTHOG_KEY=phc_*
```

You can look inside `.env.sample` for the full list of supported options,
along with their defaults.

By default this tool wil run against the authenticated user, but you can
point it to another user or organization via `SYNC_GITHUB_ID`:

```
SYNC_GITHUB_ID=whitfin
```

Your GitHub token must have the read-only `Administration` scope for the
user or organization you're running this tool against. This is required
to access the Traffic APIs (as they're admin-only).

## Under the Hood

The tool is very simple, doing the following:

1. Pulls the repositories for the chosen user or organization
2. Pulls the last 14 days (the max) traffic stats for each repository
3. Maps each statistic into a PostHog event
4. Sends each event to PostHog

This means that every day is indexed 14 times (i.e. once a day for two weeks)
until it ages out. Fortunately we know that PostHog is based on ClickHouse which
will enforce deduplication (last one in) based on a combination of these 4 fields
in the event:

- `uuid`
- `name`
- `timestamp`
- `distinct_id`

The sync will use deterministic fields for these values (via UUID v5) to ensure
that they're the same for the same day. ClickHouse provide eventual consistency
when it comes to deduplication, so over time and "old" copies of the events will
age out.

This also means that the time of day the sync runs is irrelevant, because the only
value for a day which "matters" happens during the sync 14 days after it occured.
There is no point running the sync more than once per day, as traffic stats appear
to be updated at by GitHub on that frequency.
