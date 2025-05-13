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

Please note you will have to enable the workflow inside your repository;
this is due to GitHub disabling builds on forks by default.

## Configuration

There are several options you must provide before running this tool. Options
are provided as environment variables, either manually or via `.env`. You can
look inside `.env.sample` for the full list of supported options, along with
their defaults. The required options are as follows:

```
# Required GitHub options
GPS_GITHUB_KEY=github_pat_*     # GitHub read token

# Required PostHog options
GPS_POSTHOG_KEY=phc_*           # PostHog project key
```

By default this tool wil run against the authenticated user via the provided
token, but you can point it to another user or organization via `GPS_GITHUB_ID`:

```
GPS_GITHUB_ID=whitfin
```

Your GitHub token must have the read-only `Administration` scope for the
user or organization you're running this tool against. This is required
to access the Traffic APIs (as they're admin-only).

Although deduplication can be handled at the database level, you are also able
to perform API based deduplication. To do this simply add a PostHog project
identifier and Personal API key, to grant access to the PostHog API:

```
GPS_POSTHOG_ID=111111           # PostHog project identifier
GPS_POSTHOG_TOKEN=phx_*         # PostHog personal API token
```

When both of these options are provided this tool will automatically enable
deduplication via the API. If either is missing, deduplication will be skipped
(and thus relied upon inside ClickHouse).

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
when it comes to deduplication, so over time any "old" copies of the events will
age out. This tool will also deduplicate via API queries, just in case.

This also means that the time of day the sync runs is irrelevant, because the only
value for a day which "matters" happens during the sync 14 days after it occured.
There is no point running the sync more than once per day, as traffic stats appear
to be updated at by GitHub on that frequency.

## Development

If you wish to run this tool manually, you will need to have [Elixir](https://elixir-lang.org)
installed. Once you have this installed, the easiest way to run it is via Mix:

```bash
$ mix deps.get
$ mix sync
```

The code is pretty simple, but if you have any issues please let me know! At some
point in future I'd like to adopt the [posthog-elixir](https://github.com/PostHog/posthog-elixir)
client, but for the time being it lacks support for the `uuid` field we require.
