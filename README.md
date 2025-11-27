# Gabe - Your Discord Bro (or Enemy)                                                                                                 		 

Gabe is a fast, loud, and mildly cursed Discord bot built on top of [Oceanic.js](https://oceanic.ws). It ships native image processing, reliable moderation, fun commands, music via Lavalink, and a flexible storage layer — all tuned for low resource usage.

## Highlights

- Powerful image processing (native module; optional ImageMagick support)
- Moderation tools: ban, kick, timeout, purge
- Music playback via [Lavalink](https://github.com/lavalink-devs/Lavalink) using [Shoukaku](https://github.com/Deivu/Shoukaku)
- Tags system for saving and retrieving snippets
- Low resource usage (CPU/RAM) — naps are normal  <img src="https://github.com/user-attachments/assets/a58b183a-cf97-478d-a7e1-8895cbd44c8e" align="right" width="128" height="128" alt="gabe logo"/>

- Dual command system: slash commands and prefix commands (`&` by default)
- Databases: SQLite (default) or PostgreSQL
- Extensible: add commands by dropping files in `commands/`
                                      
## Requirements

- Node.js 22+ (required)
- Linux/macOS recommended. Windows is not officially supported; use WSL if you must.
- For image features, a native module is compiled via `cmake-js`. A basic C/C++ toolchain is required when building from source. ImageMagick can be toggled on/off at build time.

## Quick start

1) Clone and install

```
git clone https://github.com/gabrielpiss/gabe.git
cd gabe
pnpm install
```

2) Configure environment (at minimum, your Discord bot token)

Create a `.env` file in the project root:

```
TOKEN=your_discord_bot_token
# Optional (examples)
PREFIX=&
# DB=sqlite:///data/gabe.db           # SQLite (default if not set)
# DB=postgres://user:pass@host:5432/db # PostgreSQL
# API_TYPE=ws                          # Use the external image API via WebSocket
# TEMPDIR=/tmp/gabe-images             # Directory for temporary images
# THRESHOLD=4G                         # Max size of TEMPDIR before cleanup
# REST_PROXY=https://discord.com/api   # REST proxy for Discord (optional)
# SENTRY_DSN=                          # Sentry error tracking (optional)
```

3) Build and run

```
pnpm build
pnpm start
```

- Want extra logs? `pnpm run start:debug`
- Prefer Bun or Deno? Try `pnpm run start:bun` or `pnpm run start:deno` (experimental).

## Commands

Use `/help` or `&help` in your server to view available commands and categories.

## Docker and Lavalink

- Build the image: `pnpm run docker:build`
- Run Gabe: `pnpm run docker:run-bot`
- Run Lavalink v4 (required for music):
  - Configure `application.yml` in the repo root
  - Start: `pnpm run docker:run-lava`

## Configuration notes

- Prefix defaults to `&`.
- To enable classic (prefix) commands and/or application commands, adjust `config/commands.json`.
- For large/clustered deployments, PM2 support is available (optional dependency).

## Privacy and Security

- Privacy policy: see [`PRIVACY.md`](./PRIVACY.md)
- Never commit or share your bot token. If you see an “incorrect bot token length” error, you might have pasted the OAuth2 client secret instead of the bot token.

## Contributing

MIT licensed. Issues and PRs are welcome — features, fixes, docs, or just chaos improvements.

## Credits

Gabe is based on the legendary [esmBot](https://github.com/esmBot/esmBot) by [Essem](https://github.com/TheEssem). The rest is pure Gabe.


