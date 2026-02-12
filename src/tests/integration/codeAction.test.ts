import { createAndOpenFile, redkitten6sSupabaseKey, resetConfig, waitForDiagnostic } from "./utils";
import { describe } from "mocha";
import assert from "node:assert";
import * as vscode from "vscode";

describe("Code Actions", function () {
  this.timeout(5000);

  const workspace = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  assert.ok(workspace, "No workspace found");

  describe("File Path Actions", function () {
    test("should provide ignore file action", async function () {
      const [folder, document] = await createAndOpenFile(workspace, {
        name: ".env",
        content: `super secret env variables hehe\n`
      });

      const diagnostics = await waitForDiagnostic(`${folder}/.env`);
      assert.strictEqual(diagnostics.length, 1, "Expected one diagnostic for sensitive file");

      const codeActions = await vscode.commands.executeCommand<vscode.CodeAction[]>("vscode.executeCodeActionProvider", vscode.Uri.file(`${folder}/.env`), diagnostics[0].range);
      const codeAction = codeActions.find((action) => action.title === "Ignore file path violation");
      assert.ok(codeAction, "Expected code action to ignore file");

      await vscode.workspace.applyEdit(codeAction.edit!);
      await vscode.commands.executeCommand(codeAction.command!.command, ...codeAction.command!.arguments!);

      assert.ok(document.getText().includes("// gitgerbil-ignore-file"), "Expected file to be ignored for file path scanning");
    });
  });

  describe("Secret Actions", function () {
    test("should provide ignore file action", async function () {
      const [folder, document] = await createAndOpenFile(workspace, {
        name: "index.ts",
        content: `const apiKey = "${redkitten6sSupabaseKey}";\n`
      });

      const diagnostics = await waitForDiagnostic(`${folder}/index.ts`);
      assert.strictEqual(diagnostics.length, 1, "Expected one diagnostic for secret in file");

      const codeActions = await vscode.commands.executeCommand<vscode.CodeAction[]>("vscode.executeCodeActionProvider", vscode.Uri.file(`${folder}/index.ts`), diagnostics[0].range);
      const codeAction = codeActions.find((action) => action.title === "Ignore entire file");
      assert.ok(codeAction, "Expected code action to ignore file");

      await vscode.workspace.applyEdit(codeAction.edit!);
      await vscode.commands.executeCommand(codeAction.command!.command, ...codeAction.command!.arguments!);

      assert.ok(document.getText().includes("// gitgerbil-ignore-file"), "Expected file to be ignored for secret scanning");
    });

    test("should provide ignore line action", async function () {
      const [folder, document] = await createAndOpenFile(workspace, {
        name: "index.ts",
        content: `const apiKey = "${redkitten6sSupabaseKey}";\n`
      });

      const diagnostics = await waitForDiagnostic(`${folder}/index.ts`);
      assert.strictEqual(diagnostics.length, 1, "Expected one diagnostic for secret in file");

      const codeActions = await vscode.commands.executeCommand<vscode.CodeAction[]>("vscode.executeCodeActionProvider", vscode.Uri.file(`${folder}/index.ts`), diagnostics[0].range);
      const codeAction = codeActions.find((action) => action.title === "Ignore this line");
      assert.ok(codeAction, "Expected code action to ignore line");

      await vscode.workspace.applyEdit(codeAction.edit!);
      await vscode.commands.executeCommand(codeAction.command!.command, ...codeAction.command!.arguments!);

      assert.ok(document.getText().includes("// gitgerbil-ignore-line"), "Expected line to be ignored for secret scanning");
    });

    test("should provide replace secret action", async function () {
      const [folder, document] = await createAndOpenFile(workspace, {
        name: "index.ts",
        content: `const apiKey = "${redkitten6sSupabaseKey}";\n`
      });

      const diagnostics = await waitForDiagnostic(`${folder}/index.ts`);
      assert.strictEqual(diagnostics.length, 1, "Expected one diagnostic for secret in file");

      const codeActions = await vscode.commands.executeCommand<vscode.CodeAction[]>("vscode.executeCodeActionProvider", vscode.Uri.file(`${folder}/index.ts`), diagnostics[0].range);
      const codeAction = codeActions.find((action) => action.title === "Replace secret with placeholder");
      assert.ok(codeAction, "Expected code action to replace secret with placeholder");

      await vscode.workspace.applyEdit(codeAction.edit!);
      await vscode.commands.executeCommand(codeAction.command!.command, ...codeAction.command!.arguments!);

      assert.ok(document.getText().includes('const apiKey = "<secret>";'), "Expected secret to be replaced with placeholder");
    });
  });

  describe("Comment Actions", function () {
    test("should provide ignore file action", async function () {
      const [folder, document] = await createAndOpenFile(workspace, {
        name: "index.ts",
        content: `// TODO: commit api key\nconst apiKey = "";\n`
      });

      const diagnostics = await waitForDiagnostic(`${folder}/index.ts`);
      assert.strictEqual(diagnostics.length, 1, "Expected one diagnostic for hint comment in file");

      const codeActions = await vscode.commands.executeCommand<vscode.CodeAction[]>("vscode.executeCodeActionProvider", vscode.Uri.file(`${folder}/index.ts`), diagnostics[0].range);
      const codeAction = codeActions.find((action) => action.title === "Ignore entire file");
      assert.ok(codeAction, "Expected code action to ignore file");

      await vscode.workspace.applyEdit(codeAction.edit!);
      await vscode.commands.executeCommand(codeAction.command!.command, ...codeAction.command!.arguments!);

      assert.ok(document.getText().includes("// gitgerbil-ignore-file"), "Expected file to be ignored for comment scanning");
    });

    test("should provide ignore line action", async function () {
      const [folder, document] = await createAndOpenFile(workspace, {
        name: "index.ts",
        content: `// TODO: commit api key\nconst apiKey = "";\n`
      });

      const diagnostics = await waitForDiagnostic(`${folder}/index.ts`);
      assert.strictEqual(diagnostics.length, 1, "Expected one diagnostic for hint comment in file");

      const codeActions = await vscode.commands.executeCommand<vscode.CodeAction[]>("vscode.executeCodeActionProvider", vscode.Uri.file(`${folder}/index.ts`), diagnostics[0].range);
      const codeAction = codeActions.find((action) => action.title === "Ignore this line");
      assert.ok(codeAction, "Expected code action to ignore line");

      await vscode.workspace.applyEdit(codeAction.edit!);
      await vscode.commands.executeCommand(codeAction.command!.command, ...codeAction.command!.arguments!);

      assert.ok(document.getText().includes("// gitgerbil-ignore-line"), "Expected line to be ignored for comment scanning");
    });

    test("should provide delete comment action", async function () {
      const [folder, document] = await createAndOpenFile(workspace, {
        name: "index.ts",
        content: `// TODO: commit api key\nconst apiKey = "";\n`
      });

      const diagnostics = await waitForDiagnostic(`${folder}/index.ts`);
      assert.strictEqual(diagnostics.length, 1, "Expected one diagnostic for hint comment in file");

      const codeActions = await vscode.commands.executeCommand<vscode.CodeAction[]>("vscode.executeCodeActionProvider", vscode.Uri.file(`${folder}/index.ts`), diagnostics[0].range);
      const codeAction = codeActions.find((action) => action.title === "Delete this comment");
      assert.ok(codeAction, "Expected code action to delete comment");

      await vscode.workspace.applyEdit(codeAction.edit!);
      await vscode.commands.executeCommand(codeAction.command!.command, ...codeAction.command!.arguments!);

      assert.ok(!document.getText().includes("TODO"), "Expected comment to be deleted");
    });
  });

  this.afterEach(resetConfig);
});
