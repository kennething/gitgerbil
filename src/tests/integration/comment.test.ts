import { createFiles, resetConfig, waitForDiagnostic } from "./utils";
import { describe } from "mocha";
import assert from "node:assert";
import * as vscode from "vscode";

describe("Comment Scanning", function () {
  const workspace = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  assert.ok(workspace, "No workspace found");

  test("should give diagnostics when hint comment in file", async function () {
    const folder = createFiles(workspace, [
      {
        name: "index.ts",
        content: `// TODO: commit api key\nconst apiKey = "";\n`
      }
    ]);

    const diagnostics = await waitForDiagnostic(`${folder}/index.ts`);
    assert.strictEqual(diagnostics.length, 1, "Expected one diagnostic for one hint comment");
  });

  test("should give multiple diagnostics when multiple hint comments in file", async function () {
    const folder = createFiles(workspace, [
      {
        name: "index.ts",
        content: `// TODO: commit api key\nconst apiKey = "";\n\n// FIXME: commit other api key\nconst otherApiKey = "";\n`
      }
    ]);

    const diagnostics = await waitForDiagnostic(`${folder}/index.ts`);
    assert.strictEqual(diagnostics.length, 2, "Expected multiple diagnostics for multiple hint comments");
  });

  test("should not give diagnostics when no hint comment in file", async function () {
    const folder = createFiles(workspace, [{ name: "index.ts", content: `const apiKey = "";\n` }]);

    const diagnostics = await waitForDiagnostic(`${folder}/index.ts`);
    assert.strictEqual(diagnostics.length, 0, "Expected no diagnostics for file without hint comments");
  });

  test("should not give diagnostics for ignored file type", async function () {
    const folder = createFiles(workspace, [
      {
        name: "index.ts",
        content: `// TODO: commit api key\nconst apiKey = "";\n`
      }
    ]);

    vscode.workspace.getConfiguration("gitgerbil").update("scannedFileTypes", [], vscode.ConfigurationTarget.Global);

    const diagnostics = await waitForDiagnostic(`${folder}/index.ts`);
    assert.strictEqual(diagnostics.length, 0, "Expected no diagnostics for ignored file");
  });

  test("should not give diagnostics if comment scanning disabled", async function () {
    const folder = createFiles(workspace, [
      {
        name: "index.ts",
        content: `// TODO: commit api key\nconst apiKey = "";\n`
      }
    ]);

    vscode.workspace.getConfiguration("gitgerbil").update("enableCommentScanning", false, vscode.ConfigurationTarget.Global);

    const diagnostics = await waitForDiagnostic(`${folder}/index.ts`);
    assert.strictEqual(diagnostics.length, 0, "Expected no diagnostics when comment scanning disabled");
  });

  this.afterEach(resetConfig);
});
