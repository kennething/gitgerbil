import * as vscode from "vscode";
import { defaultScannedFiles } from "./extension";

export async function handleScannedFileTypes(): Promise<void> {
  const config = vscode.workspace.getConfiguration("gitgerbil");
  const value = config.get<string[]>("scannedFileTypes");
  if (!value) return void vscode.window.showErrorMessage("Failed to get scanned file types from configuration.");

  const input = await vscode.window.showInputBox({
    prompt: "Enter file extensions to scan, separated by commas",
    value: value.join(", "),
    validateInput: (value) => {
      if (!value) return;
      const extensions = value.split(",").map((ext) => ext.trim());
      if (extensions.some((ext) => !/^[a-zA-Z0-9]+$/.test(ext))) return "File extensions must be alphanumeric and cannot contain dots or spaces";
    }
  });
  if (input === undefined) return;

  const newValue = input.length === 0 ? (defaultScannedFiles as unknown as string[]) : input.split(",").map((ext) => ext.trim());

  await config.update("scannedFileTypes", newValue, vscode.ConfigurationTarget.Global);
  vscode.window.showInformationMessage(`Scanned file extensions updated.`);
}

export async function toggleFilePathScanning(): Promise<void> {
  const config = vscode.workspace.getConfiguration("gitgerbil");
  const newValue = !config.get<boolean>("enableFilePathScanning");

  await config.update("enableFilePathScanning", newValue, vscode.ConfigurationTarget.Global);
  await vscode.window.showInformationMessage(`File path scanning ${newValue ? "enabled" : "disabled"}.`);
}

export async function toggleSecretScanning(): Promise<void> {
  const config = vscode.workspace.getConfiguration("gitgerbil");
  const newValue = !config.get<boolean>("enableSecretScanning");

  await config.update("enableSecretScanning", newValue, vscode.ConfigurationTarget.Global);
  await vscode.window.showInformationMessage(`Secret scanning ${newValue ? "enabled" : "disabled"}.`);
}

export async function toggleStrictSecretScanning(): Promise<void> {
  const config = vscode.workspace.getConfiguration("gitgerbil");
  const newValue = !config.get<boolean>("enableStrictSecretScanning");

  await config.update("enableStrictSecretScanning", newValue, vscode.ConfigurationTarget.Global);
  await vscode.window.showInformationMessage(`Strict secret scanning ${newValue ? "enabled" : "disabled"}.`);
}

export async function toggleCommentScanning(): Promise<void> {
  const config = vscode.workspace.getConfiguration("gitgerbil");
  const newValue = !config.get<boolean>("enableCommentScanning");

  await config.update("enableCommentScanning", newValue, vscode.ConfigurationTarget.Global);
  await vscode.window.showInformationMessage(`Comment scanning ${newValue ? "enabled" : "disabled"}.`);
}
