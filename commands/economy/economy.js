import BalanceCommand from "./economy/balance.js";

class EconomyCommand extends BalanceCommand {
    static description = "Economy system - earn, spend, and trade GabeCoins";
    static aliases = ["eco", "money", "wallet"];
}

export default EconomyCommand;
