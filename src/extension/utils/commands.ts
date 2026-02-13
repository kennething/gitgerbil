import { defaultScannedFiles } from "../globals";
import * as vscode from "vscode";

async function toggleSettingCommand(configName: string, infoMessage: (newValue: boolean, undoIsSkipped: boolean) => string, skipUndo = false) {
  const config = vscode.workspace.getConfiguration("gitgerbil");
  const newValue = !config.get<boolean>(configName);

  await config.update(configName, newValue, vscode.ConfigurationTarget.Global);
  const disposable = skipUndo ? await vscode.window.showInformationMessage(infoMessage(newValue, true)) : await vscode.window.showInformationMessage(infoMessage(newValue, false), "Undo");
  if (disposable === "Undo") toggleSettingCommand(configName, infoMessage, true);
}

export async function handleScannedFileTypes(skipUndo = false): Promise<void> {
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
  const disposable = skipUndo ? await vscode.window.showInformationMessage(`Scanned file extensions updated.`) : await vscode.window.showInformationMessage(`Scanned file extensions updated.`, "Undo");
  if (disposable === "Undo") handleScannedFileTypes(true);
}

export async function toggleFilePathScanning(): Promise<void> {
  // prettier-ignore
  await toggleSettingCommand(
    "enableFilePathScanning",
    (newValue, undoIsSkipped) => `File path scanning ${undoIsSkipped ? "re-" : ""}${newValue ? "enabled" : "disabled"}.`
  );
}

export async function toggleSecretScanning(): Promise<void> {
  // prettier-ignore
  await toggleSettingCommand(
    "enableSecretScanning",
    (newValue, undoIsSkipped) => `Secret scanning ${undoIsSkipped ? "re-" : ""}${newValue ? "enabled" : "disabled"}.`
  );
}

export async function toggleStrictSecretScanning(): Promise<void> {
  // prettier-ignore
  await toggleSettingCommand(
    "enableStrictSecretScanning",
    (newValue, undoIsSkipped) => `Strict secret scanning ${undoIsSkipped ? "re-" : ""}${newValue ? "enabled" : "disabled"}.`
  );
}

export async function toggleCommentScanning(): Promise<void> {
  // prettier-ignore
  await toggleSettingCommand(
    "enableCommentScanning",
    (newValue, undoIsSkipped) => `Comment scanning ${undoIsSkipped ? "re-" : ""}${newValue ? "enabled" : "disabled"}.`
  );
}
