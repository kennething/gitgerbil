import { defaultScannedFiles } from "../../extension/utils/globals";
import { describe } from "mocha";
import assert from "node:assert";
import * as vscode from "vscode";
import path from "path";
import fs from "fs";

export async function activateExtension() {
  const extension = vscode.extensions.getExtension("KennethNg.gitgerbil");
  assert.ok(extension, "Extension not found");

  await extension.activate();
  assert.ok(extension.isActive, "Extension failed to activate");
}

export async function waitForDiagnostic(fileName: string) {
  return new Promise<vscode.Diagnostic[]>((resolve) => {
    const listener = vscode.languages.onDidChangeDiagnostics(async (event) => {
      const uri = event.uris.find((uri) => uri.fsPath.endsWith(fileName));
      if (!uri) return;

      const diagnostics = vscode.languages.getDiagnostics(uri);
      listener.dispose();
      resolve(diagnostics);
    });
  });
}

export function createFiles(workspace: string, files: { name: string; content: string }[]) {
  const folder = fs.mkdtempSync(path.join(workspace, "test-"));

  for (const file of files) {
    const filePath = path.join(folder, file.name);
    fs.writeFileSync(filePath, file.content);
  }

  return folder;
}

export const redkitten6sSupabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlbG1qa2VxZWttaGt4c3JycndiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1NzE4NTksImV4cCI6MjA4NDE0Nzg1OX0.cbspqjrqcdDkREd3tOlS2TcjknjIzUUeIcX_t8eNYfE";
export const redkitten6sYouTubeKey = "AIzaSyAVQKyYxMrhgHWR8f9LJms0GVpcufhMLwc";

export function resetConfig() {
  vscode.workspace.getConfiguration("gitgerbil").update("scannedFileTypes", defaultScannedFiles, vscode.ConfigurationTarget.Global);
  vscode.workspace.getConfiguration("gitgerbil").update("enableFilePathScanning", true, vscode.ConfigurationTarget.Global);
  vscode.workspace.getConfiguration("gitgerbil").update("enableSecretScanning", true, vscode.ConfigurationTarget.Global);
  vscode.workspace.getConfiguration("gitgerbil").update("enableStrictSecretScanning", true, vscode.ConfigurationTarget.Global);
  vscode.workspace.getConfiguration("gitgerbil").update("enableCommentScanning", true, vscode.ConfigurationTarget.Global);
}
