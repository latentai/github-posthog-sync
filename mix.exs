defmodule GitHubPostHogSync.MixProject do
  use Mix.Project

  def project do
    [
      app: :github_posthog_sync,
      name: "github-posthog-sync",
      version: "0.0.0",
      elixir: "~> 1.11",
      escript: [main_module: GitHubPostHogSync],
      aliases: [
        sync: "run -e 'GitHubPostHogSync.main([])'"
      ],
      deps: deps()
    ]
  end

  def application do
    [
      extra_applications: [:logger, :posthog]
    ]
  end

  defp deps do
    [
      {:dotenvy, "~> 1.1"},
      {:req, "~> 0.5"},
      {:tentacat, "~> 2.5"},
      {:uniq, "~> 0.1"}
    ]
  end
end
