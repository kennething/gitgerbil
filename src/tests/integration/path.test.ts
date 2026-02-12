import { createFiles, resetConfig, waitForDiagnostic } from "./utils";
import { describe } from "mocha";
import assert from "node:assert";
import * as vscode from "vscode";

describe("File Path Scanning", function () {
  const workspace = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  assert.ok(workspace, "No workspace found");

  test("should give diagnostic when file path is sensitive", async function () {
    const folder = createFiles(workspace, [{ name: ".env", content: "super secret env variables hehe\n" }]);

    const diagnostics = await waitForDiagnostic(`${folder}/.env`);
    assert.strictEqual(diagnostics.length, 1, "Expected one diagnostic for unsafe file");
  });

  test("should not give diagnostics when no file path issues", async function () {
    const folder = createFiles(workspace, [{ name: "README.md", content: "blah blah blah\n\nnothing to see here\n" }]);

    const diagnostics = await waitForDiagnostic(`${folder}/README.md`);
    assert.strictEqual(diagnostics.length, 0, "Expected no diagnostics for safe file");
  });

  test("should not give diagnostics when sensitive file is .gitignore'd", async function () {
    const folder = createFiles(workspace, [
      { name: ".gitignore", content: "*.env\n" },
      { name: ".env", content: "super secret env variables hehe\n" }
    ]);

    const diagnostics = await waitForDiagnostic(`${folder}/.env`);
    assert.strictEqual(diagnostics.length, 0, "Expected no diagnostics for .gitignore'd sensitive file");
  });

  test("should not give diagnostics if file path scanning disabled", async function () {
    const folder = createFiles(workspace, [{ name: ".env", content: "# gitgerbil-ignore-file\n\nsuper secret env variables hehe\n" }]);

    const diagnostics = await waitForDiagnostic(`${folder}/.env`);
    assert.strictEqual(diagnostics.length, 0, "Expected no diagnostics when file path scanning disabled");
  });

  this.afterEach(resetConfig);
});
