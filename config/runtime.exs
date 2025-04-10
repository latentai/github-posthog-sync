import Config
import Dotenvy

# .env
source!([
  Path.absname(".env", System.get_env("RELEASE_ROOT") || Path.expand(".")),
  System.get_env()
])

# Application settings
config :github_posthog_sync,
  # GitHub related configuration
  github_id: env!("GPS_GITHUB_ID", :string),
  github_key: env!("GPS_GITHUB_KEY", :string!),
  github_url: env!("GPS_GITHUB_URL", :string, "https://api.github.com"),

  # PostHog related configuration
  posthog_key: env!("GPS_POSTHOG_KEY", :string!),
  posthog_url: env!("GPS_POSTHOG_URL", :string!, "https://us.i.posthog.com"),

  # Optional configuration settings
  forks: env!("GPS_ALLOW_FORKS", :boolean, false),
  private: env!("GPS_ALLOW_PRIVATE", :boolean, false),
  archived: env!("GPS_ALLOW_ARCHIVED", :boolean, true),

  # Internal configuration, just for isolation
  namespace: "45e8f109-f056-4372-9545-9d7b78b20c34",
  statistics: %{
    "clones" => "repository.cloned",
    "views" => "repository.viewed"
  },
  buffer: 25
