import { Constants } from "oceanic.js";
import Command from "#cmd-classes/command.js";
import { random } from "#utils/misc.js";

class AnnoyCommand extends Command {
    static responses = [
        "Oh, brother, this guy STINKS!",
        "You're such a douchebag.",
        "https://c.tenor.com/sfaSyW6Oj2UAAAAC/tenor.gif",
        "sybau 🥀",
        "sdiybt 🥀",
        "You will burn in hell. You'll see. They'll all see.",
        "You're so bad, you'll be banned for exploiting.",
        "Your cubes in Blender turn into spheres.",
        "Stealing credit card info... putting your family up on eBay... done.",
        "(That's it I kill you now)[https://c.tenor.com/E98MUUBuSU4AAAAC/tenor.gif]",
        "die",
        "https://c.tenor.com/bEz-fHCnVPwAAAAd/tenor.gif",
    ];
    async run() {
        const user = this.getOptionUser("who")
        const target = user ?? this.author;
        return `${target.mention}, ${random(AnnoyCommand.responses)}`;

    }
    static flags = [
        {
            name: "who",
            type: Constants.ApplicationCommandOptionTypes.USER,
            description: "User to annoy (defaults to you)",
            classic: true,
        },
    ];
    static description = "Piss someone off with an insult";
    static aliases = ["annoy", "pisssomeoneoff", "berude", "berate"]
    static dbRequired = false;
    static cooldown = 5;
    static cooldownMessage = "WAIT. Just wait."
    static cooldownType = "user"
}
export default AnnoyCommand;  