defmodule GitHubPostHogSync.MixProject do
  use Mix.Project

  def project do
    [
      app: :github_posthog_sync,
      name: "github-posthog-sync",
      version: "0.0.0",
      elixir: "~> 1.11",
      deps: [
        {:dotenvy, "~> 1.1"},
        {:req, "~> 0.5"},
        {:tentacat, "~> 2.5"},
        {:uuid, "~> 1.1"}
      ],
      escript: [main_module: GitHubPostHogSync],
      aliases: [
        sync: "run -e 'GitHubPostHogSync.main([])'"
      ]
    ]
  end
end
