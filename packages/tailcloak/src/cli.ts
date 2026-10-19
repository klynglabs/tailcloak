#!/usr/bin/env node
import { init } from "./init.ts";

const [command] = process.argv.slice(2);
if (command === "init") {
  console.log(init(process.cwd()));
} else {
  console.log(
    "Usage: tailcloak init\n\nCreates tailcloak.config.ts with a random seed at your repository root.",
  );
  process.exitCode = command ? 1 : 0;
}
