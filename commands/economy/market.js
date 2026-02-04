import SettingsCommand from "./market/settings.js";

class MarketCommand extends SettingsCommand {
  static description = "Secret market manipulation tools (Admin only)";
  static aliases = ["manipulation", "fed"];
  static adminOnly = true; // Hidden from normies
}

export default MarketCommand;
