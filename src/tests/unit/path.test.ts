import { validateFileName } from "../../validate";
import { describe, test } from "mocha";
import assert from "node:assert";

describe("File Name Validation", function () {
  test("should flag file names that match sensitive patterns", function () {
    const violations = [".env", ".env.local", ".env.development", ".env.production", ".env.test", "creds.pem"];

    for (const fileName of violations) {
      assert.strictEqual(validateFileName({ fsPath: fileName } as any), 1, `Expected "${fileName}" to be flagged as a file name violation`);
    }
  });

  test("should flag folder names that match sensitive patterns", function () {
    const violations = [
      "node_modules/.bin/v-lint",
      "node_modules/@kennething/v-lint/src/index.js",
      "dist/index.js",
      "build/vlint.wasm",
      "out/hello",
      "bin/hello",
      "tmp/test.txt",
      "logs/log.txt",
      ".venv/Scripts/activate",
      "__pycache__/index.cpython-310.pyc"
    ];

    for (const fileName of violations) {
      assert.strictEqual(validateFileName({ fsPath: fileName } as any), 2, `Expected "${fileName}" to be flagged as a folder name violation`);
    }
  });

  test("should not flag safe file names", function () {
    const safeFileNames = ["index.js", "app.py", "README.md", "src/configuration.ts"];

    for (const fileName of safeFileNames) {
      assert.strictEqual(validateFileName({ fsPath: fileName } as any), 0, `Expected "${fileName}" to not be flagged as a file name violation`);
    }
  });

  test("should not flag files in safe folders", function () {
    const safeFilePaths = ["src/index.js", "lib/app.py", "docs/README.md"];

    for (const filePath of safeFilePaths) {
      assert.strictEqual(validateFileName({ fsPath: filePath } as any), 0, `Expected "${filePath}" to not be flagged as a folder name violation`);
    }
  });
});
