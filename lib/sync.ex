defmodule GitHubPostHogSync do
  @moduledoc """
  This module enables you to sync your GitHub traffic statistics to PostHog.

  This utility is indended to be used via Mix, rather than directly as a
  library. Please see the project README for further information and usage.
  """
  require Logger

  @doc """
  Sync your GitHub traffic statistics to PostHog.
  """
  def main(_args) do
    initialize()
    |> locate_owner()
    |> stream_repositories()
    |> filter_repositories()
    |> locate_statistics()
    |> expand_events()
    |> filter_events()
    |> buffer_events()
    |> submit_events()
  end

  @doc false
  # Initializes a GitHub client using application configuration.
  defp initialize() do
    key = Application.get_env(:github_posthog_sync, :github_key)
    url = Application.get_env(:github_posthog_sync, :github_url)

    Tentacat.Client.new(%{access_token: key}, url)
  end

  @doc false
  # Locates the GitHub owner defined by the configuration.
  #
  # This can be either an organization, a user, or a whoami(). We will
  # try look for each of these in order until we find a match.
  defp locate_owner(client) do
    # the configured owner identifier, which can be an empty string
    config = Application.get_env(:github_posthog_sync, :github_id, "")

    # locators to find the owning entity
    locators = [
      &Tentacat.Organizations.find(&1, config),
      &Tentacat.Users.find(&1, config),
      &Tentacat.Users.me(&1)
    ]

    # try each locator until one has a returned result
    Enum.reduce_while(locators, nil, fn locator, _acc ->
      case locator.(client) do
        {200, data, _response} ->
          {:halt, {client, data}}

        _ ->
          {:cont, nil}
      end
    end)
  end

  @doc false
  # Initialize a stream of repositories for an organization owner.
  #
  # This is determined by "type": "Organization" in the GitHub API model.
  defp stream_repositories({client, %{"login" => login, "type" => "Organization"}}) do
    {200, repositories, _response} =
      Tentacat.Repositories.list_orgs(client, login)

    {client, repositories}
  end

  @doc false
  # Initialize a stream of repositories for a user owner.
  #
  # This is determined by "type": "User" in the GitHub API model.
  defp stream_repositories({client, %{"login" => login, "type" => "User"}}) do
    {200, repositories, _response} =
      Tentacat.Repositories.list_users(client, login)

    {client, repositories}
  end

  @doc false
  # Trim a repository stream based on configuration filters.
  #
  # This will enable the removal of any forks, private repositories or archived
  # repositories from the pages being returned by the GitHub API.
  defp filter_repositories({client, repositories}) do
    # fetch all configuration and filters from the environment
    forks = Application.get_env(:github_posthog_sync, :forks)
    private = Application.get_env(:github_posthog_sync, :private)
    archived = Application.get_env(:github_posthog_sync, :archived)

    repositories =
      Stream.filter(repositories, fn
        # filter out forks if we don't want them
        %{"fork" => true} when not forks -> false
        # filter out archives if we don't want them
        %{"archived" => true} when not archived -> false
        # filter out private repos if we don't want them
        %{"visibility" => "private"} when not private -> false
        # accept the rest
        _ -> true
      end)

    {client, repositories}
  end

  @doc false
  # Map a stream of repositories to groups of statistics.
  #
  # This is a little noisy, but basically we walk the statistics mapping
  # in the application configuration and emit batches of statistics for
  # a repository.
  #
  # These batches are in the form `{ repo, type, data }`, and will be
  # exploded out into more granular entries in future steps
  defp locate_statistics({client, repositories}) do
    # fetch the statistics mapping directly from the configuration
    statistics = Application.get_env(:github_posthog_sync, :statistics)

    # lazily process each repository in the stream
    Stream.flat_map(repositories, fn repository ->
      # fetch each group of repo statistics
      Stream.map(statistics, fn {statistic, _} ->
        # format the path due to lack of Tentacat support
        location = Map.get(repository, "full_name")
        resource = "repos/#{location}/traffic/#{statistic}"

        # the header is necessary
        {200, data, _response} =
          Tentacat.get(resource, client, [
            {"X-GitHub-Api-Version", "2022-11-28"}
          ])

        # map to a batch that we can explode out later
        {location, statistic, Map.get(data, statistic)}
      end)
    end)
  end

  @doc false
  # Expand statistics into event payloads for PostHog.
  #
  # This receives groups of repository statistics and converts them
  # into substreams of events ready for the PostHog API.
  #
  # The most important piece here is that the following fields are
  # used to determine uniqueness in PostHog, and need special attention:
  #
  # * uuid
  # * event
  # * distinct_id
  # * timestamp
  #
  # We use UUID v5 to have a parameterized (but reproducible) identifier
  # that can be overwritten in case this tool is run multiple times.
  defp expand_events(statistics) do
    # fetch the statistics mapping and UUID namespace from the config
    mapping = Application.get_env(:github_posthog_sync, :statistics)
    namespace = Application.get_env(:github_posthog_sync, :namespace)

    # stream and convert each group of statistics into events
    Stream.flat_map(statistics, fn {repo, statistic, data} ->
      # convert every piece of data into an event payload matching PostHog's API
      Stream.map(data, fn %{"count" => count, "uniques" => uniques, "timestamp" => timestamp} ->
        id = "#{repo}:#{timestamp}:#{statistic}"
        uid = Uniq.UUID.uuid5(namespace, id)

        %{
          "uuid" => uid,
          "event" => Map.get(mapping, statistic),
          "timestamp" => timestamp,
          "distinct_id" => uid,
          "properties" => %{
            "repo" => repo,
            "count" => count,
            "uniques" => uniques,
            "$geoip_disable" => true,
            "$ignore_sent_at" => true,
            "$process_person_profile" => false
          }
        }
      end)
    end)
  end

  @doc false
  # Filter out duplicate events prior to submission.
  defp filter_events(events) do
    # # fetch the PostHog credentials and endpoint for the submisson
    phc = Application.get_env(:github_posthog_sync, :posthog_phc)
    phx = Application.get_env(:github_posthog_sync, :posthog_phx)
    url = Application.get_env(:github_posthog_sync, :posthog_url)

    # fetch the authenticated project list
    res =
      Req.get!("#{url}/api/projects", auth: {:bearer, phx})

    # find the project identifier
    pid =
      res.body
      |> Map.get("results", [])
      |> Enum.find(&(&1["api_token"] == phc))
      |> Map.get("id")

    # compute the lower timestamp bound, don't use data to keep stream lazy
    min =
      Date.utc_today()
      |> Date.add(-15)
      |> DateTime.new!(~T[00:00:00], "Etc/UTC")
      |> DateTime.to_iso8601()

    # fetch top 10K identifiers
    res =
      Req.post!("#{url}/api/projects/#{pid}/query",
        auth: {:bearer, phx},
        json: %{
          query: %{
            kind: "HogQLQuery",
            query:
              "SELECT DISTINCT(uuid) FROM events WHERE timestamp >= toDateTime('#{min}') LIMIT 10000"
          }
        }
      )

    # convert ids to a set
    has =
      res.body
      |> Map.get("results", [])
      |> List.flatten()
      |> MapSet.new()

    # filter out the events which already exist
    Stream.filter(events, &(&1["uuid"] not in has))
  end

  @doc false
  # Buffer events into chunks for batched submission.
  defp buffer_events(events),
    do: Stream.chunk_every(events, Application.get_env(:github_posthog_sync, :buffer))

  @doc false
  # Process and submit event batches to the PostHog API.
  #
  # We make sure to set `historical_migration`, even though it's not
  # really a migration just to avoid triggering any PostHog limits.
  defp submit_events(events) do
    # fetch the PostHog credentials and endpoint for the submisson
    phc = Application.get_env(:github_posthog_sync, :posthog_phc)
    url = Application.get_env(:github_posthog_sync, :posthog_url)

    # no stream required now
    Enum.each(events, fn batch ->
      Req.post!("#{url}/batch",
        json: %{
          "historical_migration" => true,
          "api_key" => phc,
          "batch" => batch
        }
      )
    end)
  end
end
