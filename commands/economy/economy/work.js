import Command from "#cmd-classes/command.js";

class WorkCommand extends Command {
    static jobs = [
        { name: "meme reviewer", emoji: "😂", minMult: 1, maxMult: 1.5 },
        { name: "Discord mod", emoji: "🔨", minMult: 0.5, maxMult: 1.2 },
        { name: "crypto bro", emoji: "📈", minMult: 0.1, maxMult: 3 },
        { name: "hot dog vendor", emoji: "🌭", minMult: 0.8, maxMult: 1.3 },
        { name: "professional sleeper", emoji: "😴", minMult: 0.3, maxMult: 0.8 },
        { name: "grass toucher", emoji: "🌱", minMult: 1.2, maxMult: 2 },
        { name: "keyboard warrior", emoji: "⌨️", minMult: 0.6, maxMult: 1.4 },
        { name: "professional gamer", emoji: "🎮", minMult: 0.2, maxMult: 2.5 },
        { name: "cat video curator", emoji: "🐱", minMult: 0.9, maxMult: 1.6 },
        { name: "vibe checker", emoji: "✨", minMult: 0.7, maxMult: 1.8 },
    ];

    static outcomes = [
        "You worked hard as a {job} and earned",
        "After a grueling shift as a {job}, you made",
        "Being a {job} paid off! You earned",
        "Your {job} skills netted you",
        "The {job} life chose you. You earned",
    ];

    async run() {
        if (!this.guild) {
            this.success = false;
            return "This command can only be used in servers.";
        }

        if (!this.database) {
            this.success = false;
            return "Database is not available.";
        }

        const enabled = await this.database.isEconomyEnabled(this.guild.id);
        if (!enabled) {
            this.success = false;
            return "💰 The economy system is not enabled in this server.";
        }

        const userId = this.author?.id;
        if (!userId) {
            this.success = false;
            return "Could not identify user.";
        }

        const settings = await this.database.getEconomySettings(this.guild.id);
        const userData = await this.database.getEconomyUser(this.guild.id, userId);

        // Check cooldown
        if (userData.last_work) {
            const lastWork = new Date(userData.last_work);
            const now = new Date();
            const timeSince = now.getTime() - lastWork.getTime();
            const cooldownMs = settings.work_cooldown * 1000;

            if (timeSince < cooldownMs) {
                const remaining = cooldownMs - timeSince;
                const minutes = Math.floor(remaining / (1000 * 60));
                const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
                this.success = false;
                return `⏰ You're exhausted! Rest for **${minutes}m ${seconds}s** before working again.`;
            }
        }

        // Pick random job
        const job = WorkCommand.jobs[Math.floor(Math.random() * WorkCommand.jobs.length)];

        // Calculate earnings with job multiplier
        const baseEarnings = settings.work_min + Math.random() * (settings.work_max - settings.work_min);
        const multiplier = job.minMult + Math.random() * (job.maxMult - job.minMult);
        const amount = Math.floor(baseEarnings * multiplier);

        const newBalance = await this.database.addBalance(this.guild.id, userId, amount);
        await this.database.setLastWork(this.guild.id, userId);
        await this.database.logTransaction(this.guild.id, userId, "work", amount, undefined, `Worked as ${job.name}`);

        const outcome = WorkCommand.outcomes[Math.floor(Math.random() * WorkCommand.outcomes.length)].replace(
            "{job}",
            `${job.emoji} ${job.name}`,
        );

        return {
            embeds: [
                {
                    title: "💼 Work Complete!",
                    description: `${outcome} **${amount.toLocaleString()}** 🪙 GabeCoins!`,
                    color: 0x3498db,
                    fields: [
                        {
                            name: "New Balance",
                            value: `**${newBalance.toLocaleString()}** 🪙`,
                            inline: true,
                        },
                        {
                            name: "Multiplier",
                            value: `${multiplier.toFixed(2)}x`,
                            inline: true,
                        },
                    ],
                },
            ],
        };
    }

    static description = "Work a random job to earn GabeCoins";
    static aliases = ["job"];
    static dbRequired = true;
}

export default WorkCommand;
