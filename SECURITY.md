# Security Policy

## Supported Versions

\*\*We release patches for security vulnerabilities in the following versions:

**Latest release is always supported.**

**Old-new versions may be considered, but I unsure on whether I do this.**

**LTS (if possible) will be serviced for up to a year or more, considering stability/demand.**

**Anything else below this criteria requires you to upgrade.**

**Note**: Gabe is an actively developed Discord bot. We recommend always using the latest commit from the `master` branch to ensure you have the most recent security patches.

## Reporting a Vulnerability

We take the security of Gabe seriously. If you discover a security vulnerability that is directly exploitable, please follow these steps:

### 1. **Don't Make It Public**

Please **do not** report security vulnerabilities through public GitHub issues, discussions, or pull requests.

### 2. **Contact Us Privately**

Report security issues by **one** of the following methods:

- **GitHub Security Advisories** (preferred): [Report a vulnerability](https://github.com/thesomewhatyou/gabe/security/advisories/new)
- **Direct Contact**: Contact thru [here](mailto:gabriel@gabeos.dev) or thru [here](mailto:gabe@thesomewhatyou.me).

### 3. **What to Include**

When reporting a vulnerability, please include:

- **Description**: A clear description of the vulnerability
- **Impact**: What an attacker could potentially do
- **Reproduction Steps**: Detailed steps to reproduce the issue
- **Affected Components**: Which parts of the codebase are affected (TypeScript bot code, native C++ modules, dependencies, etc.)
- **Suggested Fix**: If you have ideas on how to fix it (optional)
- **Environment**: Node.js version (if you're using Bun/Deno, try on Node first and come back if it still applies), OS, relevant configuration

### 4. **What to Expect**

- **Acknowledgment**: We will acknowledge receipt of your vulnerability report within **24 hours**
- **Updates**: We will provide regular updates on our progress
- **Timeline**: We aim to release a fix within **7-14 days** for critical vulnerabilities
- **Credit**: If you wish, we will credit you in the security advisory and release notes

## Security Considerations for Self-Hosting

If you are self-hosting Gabe, please be aware of the following security considerations:

### Environment Variables and Secrets

- **Never commit** your `.env` file to version control
- Store sensitive tokens securely:
  - `TOKEN`: Discord bot token
  - `DB`: Database connection string (may contain credentials)
  - `LAVALINK_HOST`, `LAVALINK_PORT`, `LAVALINK_PASSWORD`: Lavalink credentials
  - `GENIUS_TOKEN`: Genius API token (if used)
- Use environment variable encryption in production (e.g., Docker secrets, Kubernetes secrets, or encrypted env files)

### Database Security

- **SQLite**: Ensure file permissions restrict access to the database file
- **PostgreSQL**: Use strong passwords, enable SSL/TLS, restrict network access
- Never expose database ports to the public internet without proper authentication

### Native Dependencies

Gabe uses native C++ modules and system libraries:

- **Keep dependencies updated**: Regularly run `pnpm update` to get security patches
- **System libraries**: Keep these updated via your package manager:
  - `libvips-dev` (image processing)
  - `libmagick++-dev` (ImageMagick - known for security issues, optional)
  - `libzxingcore-dev` (QR code processing, optional)
- **ImageMagick**: If you don't need the `magik` and `wall` commands, build without ImageMagick using `pnpm build:no-magick` to reduce attack surface

### Discord Permissions

- Follow the **principle of least privilege**: Only grant the bot the Discord permissions it needs
- Review the permissions in `src/utils/constants.ts` before inviting the bot to servers
- Be cautious with privileged intents (GUILD_MEMBERS, GUILD_PRESENCES, MESSAGE_CONTENT)

### Command Permissions

- Configure command permissions appropriately using Discord's built-in permission system
- Moderation commands should be restricted to appropriate roles
- The `OWNER` environment variable grants full bot control - protect this ID

### Rate Limiting and Abuse Prevention

- Gabe includes built-in cooldowns for commands (see `src/utils/cooldown.ts`)
- Monitor for abuse, especially on resource-intensive image processing commands
- Consider implementing additional rate limiting at the network level (e.g., nginx, Cloudflare)

### Logging and Monitoring

- Review logs regularly for suspicious activity
- Be careful not to log sensitive data (tokens, user passwords, etc.)
- Monitor resource usage (CPU, memory, disk) for unexpected spikes that might indicate abuse

### Lavalink Security

If using music features:

- Secure your Lavalink instance with a strong password
- Do not expose Lavalink to the public internet without authentication
- Use TLS/SSL for Lavalink connections if possible

## Known Security Limitations

### ImageMagick

ImageMagick has a history of security vulnerabilities (arbitrary code execution, denial of service). While we use the C++ API and apply security policies, consider:

- Building without ImageMagick (`pnpm build:no-magick`) if you don't need `magik` and `wall` commands
- Keeping ImageMagick updated to the latest version
- Monitoring ImageMagick security advisories: https://imagemagick.org/script/security-policy.php

### User-Generated Content

Gabe processes user-uploaded images and audio. While we use safe libraries, always:

- Run the bot in a sandboxed environment (containers, VMs)
- Apply resource limits (memory, CPU, disk) to prevent DoS
- Monitor for malicious inputs

### Third-Party APIs

Gabe may interact with external APIs (Genius, Lavalink sources, etc.):

- API tokens should be kept secret
- Be aware of data shared with third parties
- Review privacy policies of services you enable

## Dependency Security

We use the following tools to manage dependency security:

- **pnpm audit**: Run `pnpm audit` to check for known vulnerabilities
- **Dependabot** (recommended): We mostly use this as it's more auto.
- **Regular updates**: We recommend updating dependencies monthly AT MOST. Better to do it everyday and avoid vulnerabilities.

To check for vulnerabilities:

```bash
pnpm audit
pnpm audit --fix  # Auto-fix where possible
```
