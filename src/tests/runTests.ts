import { runTests } from "@vscode/test-electron";
import { execSync } from "child_process";
import * as path from "path";
import fs from "fs";
import os from "os";

async function main() {
  try {
    const extensionDevelopmentPath = path.resolve(__dirname, "../../");
    const extensionTestsPath = path.resolve(__dirname, "./integration/index");

    const repoPath = fs.mkdtempSync(path.join(os.tmpdir(), "gitgerbil-test-repo-"));
    execSync("git init", { cwd: repoPath });
    execSync('git config user.email "red@kitten.six"', { cwd: repoPath });
    execSync('git config user.name "RedKitten6"', { cwd: repoPath });

    await runTests({
      extensionDevelopmentPath,
      extensionTestsPath,
      launchArgs: ["--disable-workspace-trust", repoPath]
    });

    fs.glob(repoPath, (error, matches) => {
      if (error) return;
      for (const folder of matches) fs.rmSync(folder, { recursive: true, force: true });
    });
  } catch (error) {
    console.error("Failed to run tests", error);
    process.exit(1);
  }
}

main();
