# Gabe and Privacy

First things first: **Gabe does not and is incapable of collecting IP addresses, emails, or any other sensitive personal/private info.** This info is not accessible via Discord's API [except for emails](https://discord.com/developers/docs/resources/user#user-object), which require the email OAuth2 scope to access. Gabe does NOT have this scope enabled. 

<!--- Forks, if you're reading this and you have the email OAuth2 scope enabled, PLEASE NOTIFY USERS. It's called common sense. --->

Whenever a command is run using Gabe, a command count number is increased. **This counter is completely anonymous and is used only for statistical purposes.** Users can check this info at any time using the count and help commands.

Gabe uses the following user-related info:

- User IDs (needed for many reasons such as the tag commands and replying to users)
- Avatars (needed for some embeds and the avatar command)
- Usernames (for embeds and avatar command)
- Permissions (for checking if a user has perms to run some commands)
- Whether the user is a bot (needed to prevent other bots from running commands)

<!--- Add user info that is collected, if needed, forks --->

Out of these, **only user IDs are stored in the database**, and they are used only with the tag system for checking the owner of a tag. Databases are not read, even by the bot owner.

<!--- Unless you too also do this, forks --->

Gabe uses the following guild-related info:

- Guild IDs (for guild-specific settings)
- Guild channel IDs (for getting where to send a message, storing disabled channels)
- List of members (for getting permissions and obtaining user objects by ID)

<!--- Add guild info that is collected, if needed, forks --->

Out of these, **only guild and channel IDs are stored in the database** for configuration info and storing disabled channels/commands, prefixes, and tags.

<!--- Ditto, forks --->

If you want this data removed, please contact the bot administrator.

<!--- Due to GDPR, this is required on your end, forks. Please comply, I don't want to get YOU in trouble, or me either.--->

Hopefully this document is clear enough to help understand what Gabe does and doesn't use. If you have any questions, please contact the bot administrator.

TRUST THE PROCESS!!!! :3c
