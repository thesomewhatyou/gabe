# Gabe Bot - Commands Documentation

Welcome to Gabe's command documentation! Gabe is a multi-functional Discord bot that's your pal, enemy, or both all at once.

## Table of Contents

- [Moderation Commands](#moderation-commands)
- [Fun Commands](#fun-commands)
- [Command Permissions](#command-permissions)
- [Using Commands](#using-commands)

---

## Moderation Commands

All moderation commands require appropriate Discord permissions. Gabe won't let you moderate admins, other moderators, yourself, or Gabe himself.

### Ban

**Command:** `/ban` or `!ban`  
**Aliases:** `yeet`, `begone`  
**Permission Required:** Ban Members  
**Usage:** `/ban @user [reason] [days]`

Permanently bans a user from the server.

**Parameters:**

- `user` (required) - The user to ban
- `reason` (optional) - Reason for the ban (default: "Gabe's judgement")
- `days` (optional) - Days of messages to delete, 0-7 (default: 0)

**Examples:**

```
/ban @BadUser being annoying 7
!yeet @Spammer spam
```

**Gabe's Response:**

- Success: "🔨 **BANNED!** [user] has been yeeted by Gabe. _Reason:_ [reason]"
- Errors: Snarky messages like "You don't have permission to ban members. Nice try though!"

---

### Kick

**Command:** `/kick` or `!kick`  
**Aliases:** `boot`, `remove`  
**Permission Required:** Kick Members  
**Usage:** `/kick @user [reason]`

Removes a user from the server (they can rejoin with a new invite).

**Parameters:**

- `user` (required) - The user to kick
- `reason` (optional) - Reason for the kick (default: "Gabe's decision")

**Examples:**

```
/kick @Troublemaker breaking rules
!boot @AFK
```

**Gabe's Response:**

- Success: "👢 **KICKED!** [user] has been booted by Gabe. _Reason:_ [reason]"

---

### Timeout

**Command:** `/timeout` or `!timeout`  
**Aliases:** `mute`, `silence`, `shush`  
**Permission Required:** Moderate Members  
**Usage:** `/timeout @user [duration] [reason]`

Temporarily prevents a user from sending messages, adding reactions, or speaking in voice channels.

**Parameters:**

- `user` (required) - The user to timeout
- `duration` (optional) - Duration in minutes, 1-40320 (default: 60)
- `reason` (optional) - Reason for the timeout (default: "Gabe's timeout")

**Examples:**

```
/timeout @Spammer 30 posting spam
!mute @Loud 1440 24 hour cooldown
!shush @Annoying
```

**Gabe's Response:**

- Success: "⏰ **TIMED OUT!** [user] has been silenced by Gabe for [duration] minutes. _Reason:_ [reason]"

---

### Untimeout

**Command:** `/untimeout` or `!untimeout`  
**Aliases:** `unmute`, `unsilence`  
**Permission Required:** Moderate Members  
**Usage:** `/untimeout @user [reason]`

Removes an active timeout from a user.

**Parameters:**

- `user` (required) - The user to untimeout
- `reason` (optional) - Reason for removing the timeout (default: "Gabe's mercy")

**Examples:**

```
/untimeout @Reformed appealed successfully
!unmute @User
```

**Gabe's Response:**

- Success: "✅ **UNTIMEOUT!** [user] can talk again thanks to Gabe. _Reason:_ [reason]"
- Error: "That user isn't even timed out. What are you doing?"

---

### Purge

**Command:** `/purge` or `!purge`  
**Aliases:** `clear`, `clean`, `prune`  
**Permission Required:** Manage Messages  
**Usage:** `/purge [amount]`

Bulk deletes messages in the current channel.

**Parameters:**

- `amount` (optional) - Number of messages to delete, 1-100 (default: 10)

**Examples:**

```
/purge 50
!clear 25
!clean
```

**Notes:**

- Can only delete messages less than 14 days old (Discord limitation)
- Deletes the purge command message too
- Confirmation message auto-deletes after 5 seconds

**Gabe's Response:**

- Success: "🧹 **PURGED!** Gabe deleted [X] messages. This place is cleaner now."

---

## Fun Commands

### Gabe

**Command:** `/gabe` or `!gabe`  
**Aliases:** `about`, `whoisgabe`, `hey`  
**Usage:** `/gabe`

Talk to Gabe and learn about this chaotic bot. Get a random response about what Gabe can do.

**Example Responses:**

- "I'm your pal... unless you annoy me. Then I'm your worst enemy."
- "I'm multifunctional baby! Images? Check. Music? Check. Banning annoying people? Double check!"
- "Gabe's the name, Discord shenanigans is the game!"

---

### Vibe Check

**Command:** `/vibecheck` or `!vibecheck`  
**Aliases:** `vibes`, `checkvibes`, `mood`  
**Usage:** `/vibecheck [@user]`

Checks the vibes of a user with Gabe's scientific analysis.

**Parameters:**

- `user` (optional) - User to vibe check (defaults to yourself)

**Examples:**

```
/vibecheck @Friend
!vibes
!mood @Someone
```

**Example Response:**

```
🎯 **VIBE CHECK** for Username
**Vibe Rating:** ✨ IMMACULATE
**Vibe Meter:** 87%
*Gabe's Analysis:* Vibes are off the charts! Keep doing what you're doing!
```

**Possible Vibe Ratings:**

- ✨ IMMACULATE
- 😎 STELLAR
- 👍 PRETTY GOOD
- 🤷 QUESTIONABLE
- 😬 YIKES
- 💀 AWFUL
- 🎭 CHAOTIC NEUTRAL
- 🔥 ON FIRE
- ❄️ ICE COLD
- 🌈 MAGICAL

---

### Yo Mama

**Command:** `/yomama` or `!yomama`  
**Aliases:** `yourmom`, `yourmama`, `urmom`  
**Usage:** `/yomama`

Get a random yo mama joke from Gabe's joke database (via API).

**Examples:**

```
/yomama
!urmom
```

**Gabe's Response:**

```
😂 **YO MAMA JOKE**
[Random joke from the API]

*Courtesy of Gabe's joke database*
```

---

## Command Permissions

### Required Permissions

| Command      | Discord Permission Required |
| ------------ | --------------------------- |
| ban          | Ban Members                 |
| kick         | Kick Members                |
| timeout      | Moderate Members            |
| untimeout    | Moderate Members            |
| purge        | Manage Messages             |
| _All others_ | No special permissions      |

### Safety Features

Gabe includes several safety features for moderation commands:

1. **Permission Checks** - Users must have the required Discord permission
2. **Role Hierarchy** - Cannot moderate users with Administrator or same-level moderation permissions
3. **Self-Protection** - Cannot target yourself or Gabe
4. **Owner Override** - Bot owner (set in .env) can bypass permission checks

**Example Safety Messages:**

- "I'm not banning a mod/admin. That's above my pay grade."
- "You can't kick yourself! Just leave if you want out."
- "I'm not timing myself out. That's counterproductive!"

---

## Using Commands

Gabe supports two command formats:

### Slash Commands (Recommended)

```
/ban @user reason here
/vibecheck @friend
/purge 50
```

### Classic Prefix Commands

Default prefix is `&` (configurable in .env as `PREFIX`)

```
&ban @user reason here
&vibes @friend
&purge 50
```

You can also use command aliases:

```
&yeet @user
!shush @noisy
!urmom
```

### Getting Help

- `/help` - List all available commands
- `/help [command]` - Get detailed info about a specific command
- `/info` - Learn about Gabe and see stats
- `/gabe` - Talk to Gabe directly

---

## Gabe's Personality

Gabe isn't your typical boring bot. Here's what to expect:

- **Snarky Responses** - Gabe has attitude and isn't afraid to show it
- **Chaotic Energy** - "Your pal, enemy, or both all at once"
- **Helpful** - Despite the sass, Gabe gets the job done
- **Fun Aliases** - Commands have personality-fitting aliases like "yeet" and "shush"
- **Error Messages** - Even errors are entertaining with Gabe

**Example Gabe-isms:**

- "Gabe says: You gotta tell me who to ban, genius."
- "Gabe says: I can't find that user. Are they even real?"
- "Gabe says: Give me more power!"

---

## Notes

- All moderation actions are logged with the moderator's username and reason
- Messages older than 14 days cannot be purged (Discord API limitation)
- Timeout duration is capped at 28 days (40,320 minutes) by Discord
- Gabe requires appropriate bot permissions to perform moderation actions

For setup instructions, configuration, and more details, see the [main documentation](setup.md).

---

_Documentation maintained by Gabriel Piss_
