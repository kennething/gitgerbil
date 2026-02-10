// gitgerbil-ignore-file

import { defaultScannedFiles } from "../../extension";
import { execSync } from "child_process";
import { describe } from "mocha";
import assert from "node:assert";
import * as vscode from "vscode";
import path from "path";
import fs from "fs";

async function activateExtension() {
  const extension = vscode.extensions.getExtension("KennethNg.gitgerbil");
  assert.ok(extension, "Extension not found");

  await extension.activate();
  assert.ok(extension.isActive, "Extension failed to activate");
}

async function waitForDiagnostic(fileName: string, callback: (diagnostics: vscode.Diagnostic[]) => void) {
  return new Promise<void>((resolve) => {
    vscode.languages.onDidChangeDiagnostics((event) => {
      const uri = event.uris.find((uri) => uri.fsPath.endsWith(fileName));
      if (!uri) return;

      const diagnostics = vscode.languages.getDiagnostics(uri);
      callback(diagnostics);
      resolve();
    });
  });
}

const redkitten6sSupabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlbG1qa2VxZWttaGt4c3JycndiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1NzE4NTksImV4cCI6MjA4NDE0Nzg1OX0.cbspqjrqcdDkREd3tOlS2TcjknjIzUUeIcX_t8eNYfE";
const redkitten6sYouTubeKey = "AIzaSyAVQKyYxMrhgHWR8f9LJms0GVpcufhMLwc";

describe("Extension Tests", function () {
  this.timeout(10000);

  const workspace = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  assert.ok(workspace, "No workspace found");

  const createFiles = (files: { name: string; content: string }[]) => {
    const folder = fs.mkdtempSync(path.join(workspace, "test-"));

    for (const file of files) {
      const filePath = path.join(folder, file.name);
      fs.writeFileSync(filePath, file.content);
    }

    execSync(`git add .`, { cwd: folder });
    execSync(`git commit -m lgtm`, { cwd: folder });

    return folder;
  };

  test("should activate extension", async function () {
    await activateExtension();
  });

  describe("File Path Scanning", function () {
    test("should give diagnostic when file path is sensitive", async function () {
      const folder = createFiles([{ name: ".env", content: "super secret env variables hehe\n" }]);

      await waitForDiagnostic(`${folder}/.env`, (diagnostics) => {
        assert.strictEqual(diagnostics.length, 1, "Expected one diagnostic for unsafe file");
      });
    });

    test("should not give diagnostics when no file path issues", async function () {
      const folder = createFiles([{ name: "README.md", content: "blah blah blah\n\nnothing to see here\n" }]);

      await waitForDiagnostic(`${folder}/README.md`, (diagnostics) => {
        assert.strictEqual(diagnostics.length, 0, "Expected no diagnostics for safe file");
      });
    });

    test("should not give diagnostics when sensitive file is .gitignore'd", async function () {
      const folder = createFiles([
        { name: ".gitignore", content: "*.env\n" },
        { name: ".env", content: "super secret env variables hehe\n" }
      ]);

      await waitForDiagnostic(`${folder}/.env`, (diagnostics) => {
        assert.strictEqual(diagnostics.length, 0, "Expected no diagnostics for .gitignore'd sensitive file");
      });
    });

    test("should not give diagnostics if file path scanning disabled", async function () {
      const folder = createFiles([{ name: ".env", content: "# gitgerbil-ignore-file\n\nsuper secret env variables hehe\n" }]);

      await waitForDiagnostic(`${folder}/.env`, (diagnostics) => {
        assert.strictEqual(diagnostics.length, 0, "Expected no diagnostics when file path scanning disabled");
      });
    });
  });

  describe("Secret Scanning", function () {
    test("should give diagnostics when secret in file", async function () {
      const folder = createFiles([
        {
          name: "CLAUDE.md",
          content: `blah blah blah\n\nnothing to see here\n\n\n\nAPI_KEY=${redkitten6sSupabaseKey}\n`
        }
      ]);

      await waitForDiagnostic(`${folder}/CLAUDE.md`, (diagnostics) => {
        assert.strictEqual(diagnostics.length, 1, "Expected one diagnostic for one secret in file");
      });
    });

    test("should give multiple diagnostics when multiple secrets in file", async function () {
      const folder = createFiles([
        {
          name: "CLAUDE.md",
          content: `blah blah blah\n\nnothing to see here\n\n\n\nAPI_KEY=${redkitten6sSupabaseKey}\nAPI_KEY=${redkitten6sSupabaseKey}\nAPI_KEY=${redkitten6sYouTubeKey}\n\nAPI_KEY=${redkitten6sYouTubeKey}\n`
        }
      ]);

      await waitForDiagnostic(`${folder}/CLAUDE.md`, (diagnostics) => {
        assert.strictEqual(diagnostics.length, 4, "Expected multiple diagnostics for multiple secrets in file");
      });
    });

    test("should not give diagnostics when no secret in file", async function () {
      const folder = createFiles([{ name: "README.md", content: "blah blah blah\n\nnothing to see here\n" }]);

      await waitForDiagnostic(`${folder}/README.md`, (diagnostics) => {
        assert.strictEqual(diagnostics.length, 0, "Expected no diagnostics for safe file");
      });
    });

    test("should not give diagnostics for ignored file type", async function () {
      const folder = createFiles([
        {
          name: "CLAUDE.md",
          content: `blah blah blah\n\nnothing to see here\n\n\n\nAPI_KEY=${redkitten6sSupabaseKey}\n`
        }
      ]);

      vscode.workspace.getConfiguration("gitgerbil").update("scannedFileTypes", [], vscode.ConfigurationTarget.Global);

      await waitForDiagnostic(`${folder}/CLAUDE.md`, (diagnostics) => {
        assert.strictEqual(diagnostics.length, 0, "Expected no diagnostics for ignored file");
      });
    });

    test("should not give diagnostics for .gitignore'd file type", async function () {
      const folder = createFiles([
        {
          name: ".gitignore",
          content: "*.md\n"
        },
        {
          name: "CLAUDE.md",
          content: `blah blah blah\n\nnothing to see here\n\n\n\nAPI_KEY=${redkitten6sSupabaseKey}\n`
        }
      ]);

      await waitForDiagnostic(`${folder}/CLAUDE.md`, (diagnostics) => {
        assert.strictEqual(diagnostics.length, 0, "Expected no diagnostics for .gitignore'd file");
      });
    });

    test("should not give diagnostics if secret scanning disabled", async function () {
      const folder = createFiles([
        {
          name: "CLAUDE.md",
          content: `blah blah blah\n\nnothing to see here\n\n\n\nAPI_KEY=${redkitten6sSupabaseKey}\n`
        }
      ]);

      vscode.workspace.getConfiguration("gitgerbil").update("enableSecretScanning", false, vscode.ConfigurationTarget.Global);

      await waitForDiagnostic(`${folder}/CLAUDE.md`, (diagnostics) => {
        assert.strictEqual(diagnostics.length, 0, "Expected no diagnostics when secret scanning disabled");
      });
    });

    test("should not give diagnostics if strict secret scanning enabled and no indicators in file", async function () {
      const folder = createFiles([
        {
          name: "CLAUDE.md",
          content: `blah blah blah\n\nnothing to see here\n\n\n\n${redkitten6sSupabaseKey}\n`
        }
      ]);

      await waitForDiagnostic(`${folder}/CLAUDE.md`, (diagnostics) => {
        assert.strictEqual(diagnostics.length, 0, "Expected no diagnostics when strict secret scanning enabled and no indicators in file");
      });
    });
  });

  describe("Comment Scanning", function () {
    test("should give diagnostics when hint comment in file", async function () {
      const folder = createFiles([
        {
          name: "index.ts",
          content: `// TODO: commit api key\nconst apiKey = "";\n`
        }
      ]);

      await waitForDiagnostic(`${folder}/index.ts`, (diagnostics) => {
        assert.strictEqual(diagnostics.length, 1, "Expected one diagnostic for one hint comment");
      });
    });

    test("should give multiple diagnostics when multiple hint comments in file", async function () {
      const folder = createFiles([
        {
          name: "index.ts",
          content: `// TODO: commit api key\nconst apiKey = "";\n\n// FIXME: commit other api key\nconst otherApiKey = "";\n`
        }
      ]);

      await waitForDiagnostic(`${folder}/index.ts`, (diagnostics) => {
        assert.strictEqual(diagnostics.length, 2, "Expected multiple diagnostics for multiple hint comments");
      });
    });

    test("should not give diagnostics when no hint comment in file", async function () {
      const folder = createFiles([{ name: "index.ts", content: `const apiKey = "";\n` }]);

      await waitForDiagnostic(`${folder}/index.ts`, (diagnostics) => {
        assert.strictEqual(diagnostics.length, 0, "Expected no diagnostics for file without hint comments");
      });
    });

    test("should not give diagnostics for ignored file type", async function () {
      const folder = createFiles([
        {
          name: "index.ts",
          content: `// TODO: commit api key\nconst apiKey = "";\n`
        }
      ]);

      vscode.workspace.getConfiguration("gitgerbil").update("scannedFileTypes", [], vscode.ConfigurationTarget.Global);

      await waitForDiagnostic(`${folder}/index.ts`, (diagnostics) => {
        assert.strictEqual(diagnostics.length, 0, "Expected no diagnostics for ignored file");
      });
    });

    test("should not give diagnostics if comment scanning disabled", async function () {
      const folder = createFiles([
        {
          name: "index.ts",
          content: `// TODO: commit api key\nconst apiKey = "";\n`
        }
      ]);

      vscode.workspace.getConfiguration("gitgerbil").update("enableCommentScanning", false, vscode.ConfigurationTarget.Global);

      await waitForDiagnostic(`${folder}/index.ts`, (diagnostics) => {
        assert.strictEqual(diagnostics.length, 0, "Expected no diagnostics when comment scanning disabled");
      });
    });
  });

  this.afterEach(function () {
    vscode.workspace.getConfiguration("gitgerbil").update("scannedFileTypes", defaultScannedFiles, vscode.ConfigurationTarget.Global);
    vscode.workspace.getConfiguration("gitgerbil").update("enableFilePathScanning", true, vscode.ConfigurationTarget.Global);
    vscode.workspace.getConfiguration("gitgerbil").update("enableSecretScanning", true, vscode.ConfigurationTarget.Global);
    vscode.workspace.getConfiguration("gitgerbil").update("enableStrictSecretScanning", true, vscode.ConfigurationTarget.Global);
    vscode.workspace.getConfiguration("gitgerbil").update("enableCommentScanning", true, vscode.ConfigurationTarget.Global);
  });
});
