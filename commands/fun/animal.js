import CatCommand from "./animal/cat.js";

class AnimalCommand extends CatCommand {
  static description = "Get random animal pictures";
  static aliases = ["animals"];
}

export default AnimalCommand;
