# Moderation Commands

This folder contains Gabe's moderation commands with his signature snarky personality.

## Commands

- **ban.js** - Ban users from the server
- **kick.js** - Kick users from the server
- **timeout.js** - Timeout users temporarily
- **untimeout.js** - Remove timeouts
- **purge.js** - Bulk delete messages

## Features

All moderation commands include:

✅ Proper permission checks  
✅ Safety features (can't moderate admins/mods)  
✅ Self-protection (can't target yourself or Gabe)  
✅ Gabe's personality in all responses  
✅ Comprehensive error handling  
✅ Audit logging with moderator info

## Usage

See [commands.md](../docs/commands.md) for full documentation.

## Development

These commands follow the standard Gabe command structure:

- Import from `#cmd-classes/command.js`
- Export default class extending `Command`
- Static `flags` for parameters
- Static `description` and `aliases`
- Async `run()` method for execution

---

_Part of Gabe Bot by Gabriel Piss_
