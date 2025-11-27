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



## First-time setup (Discord)

1) Create an application and bot user
- Go to https://discord.com/developers/applications and create a new application.
- In the Bot tab: add a bot, then copy the token (paste into your `.env` as `TOKEN`). Keep it secret.
- If you plan to use classic prefix commands, enable the "Message Content Intent" on the Bot page.

2) Invite the bot
- OAuth2 > URL Generator
  - Scopes: `bot`, `applications.commands`
  - Permissions: Send Messages, Embed Links, Attach Files, Use External Emojis, Connect, Speak, Use Slash Commands
- Open the generated URL to add Gabe to your server.

3) Lavalink (for music)
- You need a Lavalink v4 server running. Use `pnpm run docker:run-lava` for a quick local instance.
- Make sure the Lavalink host/port/secret in `config/soundplayer.json` (or env) match your Lavalink.

## Environment variables (quick reference)

- `TOKEN` (required): Your bot token from Discord Developer Portal.
- `PREFIX` (optional): Prefix for classic commands. Default `&`.
- `DB` (optional): Database URL. Examples: `sqlite:///data/gabe.db`, `postgres://user:pass@host:5432/db`.
- `API_TYPE` (optional): Set to `ws` to use the external image API via WebSocket.
- `TEMPDIR` (optional): Directory for temporary images (default OS temp).
- `THRESHOLD` (optional): Max size of `TEMPDIR` before cleanup (e.g. `4G`, `500M`).
- `REST_PROXY` (optional): Custom Discord REST base URL (advanced; leave empty unless you know you need it).
- `SENTRY_DSN` (optional): Enable error reporting to Sentry.
- `DEBUG` (optional): Set to `true` for verbose logs.

## First run checklist

- Node.js 22+ installed (check with `node -v`).
- `.env` file contains a valid `TOKEN` and optional settings.
- If you want classic commands: set `config/commands.json` to enable `types.classic` and enable the Message Content Intent for the bot.
- Lavalink running and reachable if you intend to use music features.

## Troubleshooting

- Incorrect bot token length
  - Error: "Incorrect bot token length". Make sure you copied the Bot Token, not the OAuth2 client secret.

- Native image build fails
  - Ensure build tools are available (C/C++ toolchain, `cmake-js`).
  - Try building without ImageMagick: `pnpm build:no-magick`.

- Cannot connect to Discord
  - Verify `TOKEN` is correct and the bot is invited to at least one server.
  - Check network/firewall and consider setting `REST_PROXY` only if required.

- Prefix commands not responding
  - Ensure `types.classic` is enabled in `config/commands.json`.
  - Enable the Message Content Intent for your bot in the Developer Portal.

- Music not working
  - Confirm Lavalink is running and configured. Check its console logs.
  - Verify host/port/secret and that your bot can connect from its network.

- Windows
  - Windows is not officially supported. Use WSL for best results.

## Logs and stability

- Logs print to the console using colorized output. For extra debug information, use `pnpm run start:debug`.
- Gabe will gracefully shut down on `SIGINT`/`SIGTERM` and will log unhandled rejections and uncaught exceptions. If `SENTRY_DSN` is set, errors will also be reported to Sentry on startup.

## Support and contributions

- Issues and PRs are welcome. Please include logs and steps to reproduce when reporting bugs.
- See the Privacy Policy in `PRIVACY.md`.
