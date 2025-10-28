import TagsGetCommand from "./tags/get.js";

class TagsCommand extends TagsGetCommand {
  static description = "The main tags command. Check the help page for more info: https://github.com/gabrielpiss/gabe";
  static aliases = ["t", "tag", "ta"];
}

export default TagsCommand;
