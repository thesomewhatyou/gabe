import SlotsCommand from "./gamble/slots.js";

class GambleCommand extends SlotsCommand {
    static description = "Gamble your GabeCoins - risk it all!";
    static aliases = ["casino", "bet"];
}

export default GambleCommand;
