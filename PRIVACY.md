# Gabe and Privacy

First things first: **Gabe does not and is incapable of collecting IP addresses, emails, or any other sensitive personal/private info.** This info is not accessible via Discord's API [except for emails](https://discord.com/developers/docs/resources/user#user-object), which require the email OAuth2 scope to access. Gabe does NOT have this scope enabled, on the public instance. 

<!--- Forks, if you're reading this and you have the email OAuth2 scope enabled, PLEASE NOTIFY USERS. It's called common sense. --->

Whenever a command is run using Gabe, a command count number is increased. **This counter is completely anonymous and is used only for statistical purposes.** Users can check this info at any time using the count and help commands. Even then, I may just delete it. It seems fun to have a command count, but I also want to consider privacy and security. 

## Data We Access (But Do Not Store)

Gabe accesses the following user-related info at runtime:

- **User IDs** – Needed for commands, replies, and identifying users
- **Avatars** – Used for embeds and the avatar command
- **Usernames** – For embeds and display purposes
- **Permissions** – For checking if a user can run certain commands
- **Bot status** – To prevent other bots from running commands

<!--- Add user info that is collected, if needed, forks --->

Gabe accesses the following guild-related info at runtime:

- **Guild IDs** – For guild-specific settings
- **Channel IDs** – For message routing and disabled channel lists
- **Member lists** – For permissions and obtaining user objects

<!--- Add guild info that is collected, if needed, forks --->

## Data We Store

The following data is persistently stored in the database:

### Guild Configuration
- **Guild IDs** – For storing server-specific settings
- **Channel IDs** – For disabled channels configuration
- **Prefix settings** – Custom command prefixes per server
- **Disabled commands** – Commands disabled in specific servers

### Tags System
- **Tag name and content** – The tag itself
- **User ID of tag owner** – To track who created the tag
- **Guild ID** – Tags are server-specific

### Moderation System
- **Moderation logs** – Records of moderation actions including:
  - User ID of the moderated user
  - Moderator's user ID
  - Action taken (ban, kick, mute, etc.)
  - Reason (if provided)
  - Timestamp
- **Warnings** – User warnings including:
  - User ID of the warned user
  - Moderator's user ID
  - Warning reason
  - Timestamp

### Leveling System (If Enabled)
- **User ID** – To track XP per user
- **Guild ID** – Leveling is server-specific
- **XP and level** – Current progress
- **Last XP gain timestamp** – For cooldown purposes

### Starboard (If Enabled)
- **Message ID** – Original and starboard message references
- **Guild and channel IDs** – Location info
- **Star count** – Number of reactions

### User Preferences
- **User ID** – To associate preferences with a user
- **Locale preference** – Preferred language
- **DM notification settings** – Whether to receive DM notifications

<!--- Ditto, forks --->

## Data Retention

- **Moderation logs and warnings** – Retained indefinitely for server safety purposes, unless manually cleared by server administrators
- **Leveling data** – Retained while the user remains in servers with leveling enabled
- **Tags** – Retained until deleted by the owner or server administrators
- **User preferences** – Retained until the user requests deletion
- **Starboard entries** – May be pruned based on server settings

## Legal Basis for Processing

Under GDPR, we process data based on:

- **Legitimate interest** – For moderation features (keeping servers safe)
- **Consent** – For optional features like leveling and user preferences
- **Contract performance** – For core bot functionality that users invoke

## Your Rights

If you want your data removed, please contact the bot administrator. You have the right to:

- **Access** your data
- **Rectification** of inaccurate data
- **Erasure** ("right to be forgotten")
- **Data portability** – Receive your data in a portable format

Server administrators can clear moderation data for their servers. Individual users can request deletion of their personal data (preferences, leveling data, tag ownership) by contacting the bot administrator.

<!--- Due to GDPR, this is required on your end, forks. Please comply, I don't want to get YOU in trouble, or me either.--->

Hopefully this document is clear enough to help understand what Gabe does and doesn't use. If you have any questions, please contact the bot administrator. Or me.

TRUST THE PROCESS!!!! :3c
