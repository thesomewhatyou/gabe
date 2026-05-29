type Args = {
  args: string[];
  flags: {
    [key: string]: string | boolean | number;
  };
};

function getFlagDashLength(input: string) {
  if (input.startsWith("--")) return 2;
  if (input.startsWith("\u2014") || input.startsWith("â€”")) return 1;
  return 0;
}

export default (cmd: string[] | string) => {
  let input = cmd;
  if (typeof input === "string") input = input.split(/\s+/g);
  const args: Args = { args: [], flags: {} };
  let curr: string | null = null;

  for (let i = 0; i < input.length; i++) {
    const a = input[i];
    const dashLength = getFlagDashLength(a);

    if (dashLength && !curr) {
      if (a.includes("=")) {
        const [arg, value] = a.slice(dashLength).split("=");
        let ended = true;
        if (arg !== "args") {
          if (value.startsWith('"')) {
            if (value.endsWith('"')) {
              args.flags[arg] = value.slice(1).slice(0, -1);
            } else {
              args.flags[arg] = `${value.slice(1)} `;
              ended = false;
            }
          } else if (value.endsWith('"')) {
            args.flags[arg] += a.slice(0, -1);
          } else if (value !== "") {
            args.flags[arg] = value;
          } else {
            args.flags[arg] = true;
          }
          if (args.flags[arg] === "true") {
            args.flags[arg] = true;
          } else if (args.flags[arg] === "false") {
            args.flags[arg] = false;
          }
          if (!ended) curr = arg;
        }
      } else {
        args.flags[a.slice(dashLength)] = true;
      }
    } else if (curr) {
      if (a.endsWith('"')) {
        args.flags[curr] += a.slice(0, -1);
        curr = null;
      } else {
        args.flags[curr] += `${a} `;
      }
    } else {
      args.args.push(a);
    }
  }

  if (curr && args.flags[curr] === "") {
    args.flags[curr] = true;
  }

  return args;
};
