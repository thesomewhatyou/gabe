# Gabe Discord Bot - Copilot Instructions

## Repository Overview

**Gabe** is a feature-rich Discord bot built with TypeScript and Oceanic.js. The bot provides powerful image processing (using libvips and native C++ modules via cmake), music playback (via Lavalink), moderation tools, server tags, and extensive command support. It's designed for low resource utilization with dual command support (slash commands and prefix-based commands).

- **Type**: Discord bot application
- **Languages**: TypeScript (main), C++ (native image processing modules)
- **Runtime**: Node.js 22+ (also supports Bun 1.1+ and Deno 2.3+)
- **Framework**: Oceanic.js for Discord API, libvips for image processing
- **Build System**: TypeScript Compiler (tsc) + CMake for native modules
- **Package Manager**: pnpm (version 10.13.1+)
- **Database**: SQLite (preferred) or PostgreSQL
- **Lines of Code**: ~5,750 TypeScript source lines, plus native C++ modules

## Required Native Dependencies

**CRITICAL**: The bot requires system-level dependencies that MUST be installed before building:

- **cmake** (3.15+) - Required for building native image processing modules
- **libvips-dev** (vips-cpp) - Core image processing library
- **fontconfig-dev** - Font handling
- **libmagick++-dev** - Optional but enables `magik` and `wall` commands
- **libzxingcore-dev** or **zxing-cpp-dev** - Optional, enables QR code commands (not available on macOS via Homebrew)
- **build-essential** or **alpine-sdk** - C++ compiler toolchain

Without these dependencies, `pnpm install` and `pnpm build` will fail with native module build errors.

## Build and Validation Process

### Bootstrap and Installation

**ALWAYS run these steps in order**:

1. **Enable pnpm**: `corepack enable` (uses Node.js Corepack)
2. **Install dependencies**: `pnpm install --frozen-lockfile` (takes 2-3 minutes)
   - Uses frozen lockfile to ensure reproducible builds
   - Downloads ~505 packages including JSR packages (@jsr/db__sqlite, etc.)
   - May fail with network errors if npm.jsr.io is unreachable
   - Builds native modules (better-sqlite3, bufferutil) automatically

### Build Process

**Build TypeScript + Native Modules** (takes 3-5 minutes):
```bash
pnpm build
# This runs: tsc && pnpm build:natives
# Equivalent to: tsc && cmake-js compile --CDWITH_MAGICK=ON
```

**Build without ImageMagick**:
```bash
pnpm build:no-magick
# This runs: tsc && cmake-js compile --CDWITH_MAGICK=OFF
```

**Debug builds**:
```bash
pnpm build:debug          # With ImageMagick, Debug mode
pnpm build:debug-no-magick # Without ImageMagick, Debug mode
```

**TypeScript-only build** (useful for quick iterations):
```bash
pnpm build:ts  # Only runs tsc, skips native modules
```

**IMPORTANT BUILD NOTES**:
- If you get "Cannot find module './build/Release/image.node'", you forgot to run `pnpm build:natives`
- If cmake fails, check that native dependencies (vips, cmake) are installed
- If you see node-gyp errors, try: `pnpm i -g node-gyp && rm -rf node_modules && pnpm install`
- Build artifacts go to `dist/` (TypeScript) and `build/Release/` (native modules)
- The build process uses cmake-js to compile C++ native modules
- Native builds are NOT required when running with Bun or Deno if you only modify TypeScript

### Linting and Formatting

**Lint the codebase**:
```bash
pnpm lint
# Runs eslint with TypeScript, import-x, and prettier plugins
# Config: eslint.config.js (flat config format)
```

**Format code**:
```bash
pnpm format        # Auto-fix formatting issues
pnpm format:check  # Check without modifying
```

**Linting configuration**:
- ESLint flat config in `eslint.config.js`
- Prettier config in `.prettierrc` (printWidth: 120, tabWidth: 2, no single quotes)
- Import ordering enforced (alphabetical, grouped by builtin/external/internal)
- TypeScript strict rules enabled
- Unused vars with underscore prefix are allowed

### Running the Bot

**Prerequisites**: You MUST create a `.env` file with at minimum:
- `TOKEN`: Discord bot token
- `DB`: Database URL (e.g., `sqlite://path/to/db.sqlite` or `postgresql://...`)
- `OWNER`: Your Discord user ID
- `PREFIX`: Command prefix (e.g., `&`)
- `LOCALE`: Language code (e.g., `en-US`)

**Run commands**:
```bash
pnpm start              # Node.js (requires prior pnpm build)
pnpm start:bun          # Bun runtime (can skip tsc build)
pnpm start:deno         # Deno runtime (can skip tsc build)
pnpm start:debug        # Node.js with DEBUG=true
```

**Production deployment with PM2**:
```bash
pnpm add -g pm2
pm2 start ecosystem.config.cjs
```

### Testing

**No automated tests exist** in this repository. Validation is done by:
1. Building successfully
2. Linting without errors
3. Running the bot and verifying commands work
4. Checking GitHub Actions CI passes

## GitHub Actions CI/CD

### Build Workflow (`.github/workflows/build.yml`)

Runs on: Push to `master`, Pull Requests to `master`

**Steps**:
1. Checkout code
2. Setup pnpm and Node.js 22
3. Install system dependencies: `cmake libvips-dev libmagick++-dev libzxingcore-dev` (Ubuntu)
4. Run `pnpm install --frozen-lockfile && pnpm run build`
5. Upload native module artifact (`build/Release/image.node`)

**This workflow MUST pass for PRs to be merged**. If it fails:
- Check native dependency installation
- Verify cmake configuration in CMakeLists.txt
- Ensure TypeScript compiles without errors

### Docker Workflows

- `deploy-to-ghcr.yml`: Publishes Docker image to ghcr.io on master push
- `docker-release.yml`, `docker-commit.yml`: Release-specific Docker builds
- `docker.yml`: Reusable workflow for multi-platform Docker builds (linux/amd64, linux/arm64)

Docker builds use Alpine Linux and install dependencies via apk.

## Project Layout and Architecture

### Root Directory Structure

**Key files**:
- `package.json`: Main project config, scripts, dependencies
- `tsconfig.json`: TypeScript compiler config (target: es2022, module: preserve)
- `eslint.config.js`: ESLint flat config
- `CMakeLists.txt`: Native module build configuration
- `Dockerfile`: Multi-stage Alpine-based container build
- `docker-compose.yml`: Bot + Lavalink orchestration
- `ecosystem.config.cjs`: PM2 process manager config
- `.env` (gitignored): Runtime environment variables

### Source Code (`src/`)

**Main entry point**: `src/app.ts`
- Validates Node.js version (>= 22)
- Loads .env configuration
- Initializes Discord client and command handlers
- Connects to database and image processing workers

**Subdirectories**:
- `src/classes/`: Command and interaction classes
- `src/events/`: Discord event handlers (ready, messageCreate, interactionCreate, etc.)
- `src/utils/`: Helper utilities (logger, image processing, database, soundplayer)
- `src/database/`: Database drivers and schema
- `src/pagination/`: Pagination utilities for bot responses
- `src/pm2/`: PM2 integration for process management
- `src/api/`: Optional HTTP API server (start with `pnpm start-api`)

### Commands (`commands/`)

Commands are organized by category (fun, general, image-editing, message, misc, moderation, music, tags, user). Each command is a separate JavaScript file that exports command metadata and handler functions. The bot uses a dynamic loader to discover commands at runtime.

### Native Modules (`natives/`)

C++ source files for image processing operations (blur, bounce, caption, circle, crop, deepfry, etc.). Compiled via CMake into `build/Release/image.node`. Uses libvips for all image operations.

**Key native files**:
- `natives/common.cc`, `natives/common.h`: Shared utilities
- `natives/commands.h`: Command interface definitions
- `natives/node/image.cc`: Node.js N-API bindings
- Individual operation files: `blur.cc`, `caption.cc`, `meme.cc`, etc.

### Configuration (`config/`)

**JSON configuration files**:
- `config/commands.json`: Enable/disable command types and blacklist commands
- `config/messages.json`: Custom emotes and bot status messages
- `config/servers.json`: Lavalink and image server connection details

### Database (`db/`)

SQLite database files are stored here by default (`.sqlite`, `.sqlite-shm`, `.sqlite-wal`). Gitignored.

### Assets and Locales

- `assets/`: Images, fonts, region flags
- `locales/`: i18n language files (JSON format)

### Documentation (`docs/`)

- `docs/setup.md`: Comprehensive setup guide
- `docs/commands.md`: Command documentation
- `docs/config.md`: Environment variable reference
- `docs/runtimes.md`: Bun/Deno compatibility notes
- `docs/postgresql.md`: PostgreSQL setup

## Path Aliases and Import Maps

The project uses path aliases defined in `tsconfig.json` and `package.json`:

- `#cmd-classes/*` → `./src/classes/*` (Node) or `./dist/classes/*` (built)
- `#utils/*` → `./src/utils/*` (Node) or `./dist/utils/*` (built)
- `#pagination` → `./src/pagination/pagination.ts`
- `#config/*` → `./config/*`

When editing imports, use these aliases instead of relative paths where applicable.

## Common Issues and Workarounds

### Node.js Version Mismatch

**Error**: "WARN Unsupported engine: wanted: {"node":">=22"}"
**Solution**: Install Node.js 22 via nvm: `nvm install 22 && nvm use 22`

### Missing Native Dependencies

**Error**: "Cannot find module './build/Release/image.node'" or cmake errors
**Solution**: Install system dependencies, then rebuild: `pnpm build`

### pnpm Install Failures

**Error**: "ELIFECYCLE Command failed"
**Solution**: `pnpm i -g node-gyp && rm -rf node_modules && pnpm install`

### JSR Package Download Failures

**Error**: "ENOTFOUND npm.jsr.io"
**Solution**: Retry or check network connectivity. JSR packages (@jsr/db__sqlite) are required for Deno support.

### ImageMagick-Related Build Failures

**Error**: CMake can't find ImageMagick
**Solution**: Either install ImageMagick dev packages OR use `pnpm build:no-magick`

### Tenor GIF Errors

**Error**: "no decode delegate for this image format" with Tenor GIFs
**Solution**: Tenor GIFs are MP4s. Set `TENOR` env var with Tenor API key.

### PostgreSQL Connection Refused

**Error**: "connect ECONNREFUSED 127.0.0.1:5432"
**Solution**: Start PostgreSQL (`sudo systemctl start postgresql`) or use SQLite instead

### Runtime-Specific Issues (Bun/Deno)

**Error**: Crashes on startup with native modules
**Solution**: Switch Node.js version to 22 (Deno) or 24 (Bun), then `pnpm rebuild`

## Development Workflow Best Practices

1. **Always run `pnpm install --frozen-lockfile`** after pulling changes
2. **Always run `pnpm build`** after dependency changes or native module modifications
3. **Run `pnpm lint`** before committing to catch style/import issues
4. **Test locally** with `pnpm start:debug` to see detailed logs
5. **For TypeScript-only changes**, `pnpm build:ts && pnpm start` is faster than full rebuild
6. **Check `.gitignore`** - don't commit `dist/`, `build/`, `node_modules/`, `.env`, `*.sqlite`

## Validation Checklist

Before submitting changes, ensure:
- [ ] `pnpm install --frozen-lockfile` succeeds
- [ ] `pnpm build` completes without errors
- [ ] `pnpm lint` passes with no errors
- [ ] Bot starts successfully (`pnpm start` or `pnpm start:debug`)
- [ ] Changed commands work as expected (test manually)
- [ ] No secrets or `.env` committed
- [ ] GitHub Actions build workflow will pass (check for native dependency issues)

## Additional Notes

- This is a **fork/derivative** of esmBot by Essem
- The bot does NOT respond to regular text messages, only commands
- PM2 is used for production deployments (config: `ecosystem.config.cjs`)
- Docker images are available at `ghcr.io/gabrielpiss/gabe:edge`
- Lavalink 4+ with Java 17+ is required for music features (optional)
- The bot supports both SQLite and PostgreSQL; SQLite is simpler for development

**When in doubt, consult the docs folder** or trust these instructions. Avoid unnecessary exploration - this file contains everything you need to build, test, and validate changes efficiently.
