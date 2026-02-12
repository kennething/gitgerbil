// gitgerbil-ignore-file

import { createFiles, redkitten6sSupabaseKey, redkitten6sYouTubeKey, resetConfig, waitForDiagnostic } from "./utils";
import { describe } from "mocha";
import assert from "node:assert";
import * as vscode from "vscode";

describe("Secret Scanning", function () {
  this.timeout(4000);

  const workspace = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  assert.ok(workspace, "No workspace found");

  test("should give diagnostics when secret in file", async function () {
    const folder = createFiles(workspace, [
      {
        name: "CLAUDE.md",
        content: `blah blah blah\n\nnothing to see here\n\n\n\nAPI_KEY=${redkitten6sSupabaseKey}\n`
      }
    ]);

    const diagnostics = await waitForDiagnostic(`${folder}/CLAUDE.md`);
    assert.strictEqual(diagnostics.length, 1, "Expected one diagnostic for one secret in file");
  });

  test("should give multiple diagnostics when multiple secrets in file", async function () {
    const folder = createFiles(workspace, [
      {
        name: "CLAUDE.md",
        content: `blah blah blah\n\nnothing to see here\n\n\n\nAPI_KEY=${redkitten6sSupabaseKey}\nAPI_KEY=${redkitten6sSupabaseKey}\nAPI_KEY=${redkitten6sYouTubeKey}\n\nAPI_KEY=${redkitten6sYouTubeKey}\n`
      }
    ]);

    const diagnostics = await waitForDiagnostic(`${folder}/CLAUDE.md`);
    assert.strictEqual(diagnostics.length, 4, "Expected multiple diagnostics for multiple secrets in file");
  });

  test("should not give diagnostics when no secret in file", async function () {
    const folder = createFiles(workspace, [{ name: "README.md", content: "blah blah blah\n\nnothing to see here\n" }]);

    const diagnostics = await waitForDiagnostic(`${folder}/README.md`);
    assert.strictEqual(diagnostics.length, 0, "Expected no diagnostics for safe file");
  });

  test("should not give diagnostics for ignored file type", async function () {
    const folder = createFiles(workspace, [
      {
        name: "CLAUDE.md",
        content: `blah blah blah\n\nnothing to see here\n\n\n\nAPI_KEY=${redkitten6sSupabaseKey}\n`
      }
    ]);

    vscode.workspace.getConfiguration("gitgerbil").update("scannedFileTypes", [], vscode.ConfigurationTarget.Global);

    const diagnostics = await waitForDiagnostic(`${folder}/CLAUDE.md`);
    assert.strictEqual(diagnostics.length, 0, "Expected no diagnostics for ignored file");
  });

  test("should not give diagnostics for .gitignore'd file type", async function () {
    const folder = createFiles(workspace, [
      {
        name: ".gitignore",
        content: "*.md\n"
      },
      {
        name: "CLAUDE.md",
        content: `blah blah blah\n\nnothing to see here\n\n\n\nAPI_KEY=${redkitten6sSupabaseKey}\n`
      }
    ]);

    const diagnostics = await waitForDiagnostic(`${folder}/CLAUDE.md`);
    assert.strictEqual(diagnostics.length, 0, "Expected no diagnostics for .gitignore'd file");
  });

  test("should not give diagnostics if secret scanning disabled", async function () {
    const folder = createFiles(workspace, [
      {
        name: "CLAUDE.md",
        content: `blah blah blah\n\nnothing to see here\n\n\n\nAPI_KEY=${redkitten6sSupabaseKey}\n`
      }
    ]);

    vscode.workspace.getConfiguration("gitgerbil").update("enableSecretScanning", false, vscode.ConfigurationTarget.Global);

    const diagnostics = await waitForDiagnostic(`${folder}/CLAUDE.md`);
    assert.strictEqual(diagnostics.length, 0, "Expected no diagnostics when secret scanning disabled");
  });

  test("should not give diagnostics if strict secret scanning enabled and no indicators in file", async function () {
    const folder = createFiles(workspace, [
      {
        name: "CLAUDE.md",
        content: `blah blah blah\n\nnothing to see here\n\n\n\n${redkitten6sSupabaseKey}\n`
      }
    ]);

    const diagnostics = await waitForDiagnostic(`${folder}/CLAUDE.md`);
    assert.strictEqual(diagnostics.length, 0, "Expected no diagnostics when strict secret scanning enabled and no indicators in file");
  });

  this.afterEach(resetConfig);
});
