import PricesCommand from "./crypto/prices.js";

class CryptoCommand extends PricesCommand {
    static description = "Trade cryptocurrencies in the GabeCoin market";
    static aliases = ["stocks", "trading"];
}

export default CryptoCommand;
