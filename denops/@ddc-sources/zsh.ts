import {
  BaseSource,
  Candidate,
  Context,
} from "https://deno.land/x/ddc_vim@v0.17.0/types.ts#^";
import { Denops, fn, op } from "https://deno.land/x/ddc_vim@v0.17.0/deps.ts#^";

export class Source extends BaseSource<{}> {
  getCompletePosition(args: {
    context: Context;
  }): Promise<number> {
    const matchPos = args.context.input.search(/\S+$/);
    const completePos = matchPos != null ? matchPos : -1;
    return Promise.resolve(completePos);
  }

  async gatherCandidates(args: {
    denops: Denops,
    context: Context,
  }): Promise<Candidate[]> {
    const runtimepath = await op.runtimepath.getGlobal(args.denops);
    const capture = await fn.globpath(
      args.denops,
      runtimepath,
      "bin/capture.zsh",
      1,
      1,
    ) as string[];
    if (capture.length < 0) {
      return [];
    }
    const existsDeolInput = await fn.exists(args.denops, "*deol#get_input");
    const input = existsDeolInput
      ? await args.denops.call("deol#get_input") as string
      : args.context.input;
    const p = Deno.run({
      cmd: ["zsh", capture[0], input],
      stdout: "piped",
      stderr: "piped",
      stdin: "null",
    });
    await p.status();
    const candidates = new TextDecoder().decode(await p.output()).split(/\r?\n/)
      .filter((line) => line.length != 0)
      .map((line) => {
        const pieces = line.split(" -- ");
        return pieces.length <= 1
          ? { word: line }
          : { word: pieces[0], info: pieces[1] };
      });

    return candidates;
  }

  params(): {} {
    return {};
  }
}
