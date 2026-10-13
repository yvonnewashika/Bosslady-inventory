import { copyFileSync, existsSync } from "node:fs";

const shell = "dist/client/_shell.html";
const index = "dist/client/index.html";

if (!existsSync(shell)) {
  throw new Error(`${shell} was not found.`);
}

copyFileSync(shell, index);

console.log("Created dist/client/index.html");