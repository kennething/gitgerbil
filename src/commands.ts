import * as vscode from "vscode";

export async function handleScannedFileTypes(): Promise<void> {
  const config = vscode.workspace.getConfiguration("gitgerbil");
  const value = config.get<string[]>("scannedFileTypes");
  if (!value) return void vscode.window.showErrorMessage("Failed to get scanned file types from configuration");

  const input = await vscode.window.showInputBox({
    prompt: "Enter file extensions to scan, separated by commas",
    value: value.join(", "),
    validateInput: (value) => {
      const extensions = value.split(",").map((ext) => ext.trim());
      if (extensions.some((ext) => !/^[a-zA-Z0-9]+$/.test(ext))) return "File extensions must be alphanumeric and cannot contain dots or spaces";
    }
  });
  if (!input) return;

  const newValue = input.split(",").map((ext) => ext.trim());
  await config.update("scannedFileTypes", newValue, vscode.ConfigurationTarget.Global);
  vscode.window.showInformationMessage(`${newValue.join(", ")} files will be scanned`);
}

export async function enableFilePathScanning(): Promise<void> {
  const config = vscode.workspace.getConfiguration("gitgerbil");
  await config.update("enableFilePathScanning", true, vscode.ConfigurationTarget.Global);
  await vscode.window.showInformationMessage("File path scanning enabled");
}

export async function enableSecretScanning(): Promise<void> {
  const config = vscode.workspace.getConfiguration("gitgerbil");
  await config.update("enableSecretScanning", true, vscode.ConfigurationTarget.Global);
  await vscode.window.showInformationMessage("Secret scanning enabled");
}

export async function enableCommentScanning(): Promise<void> {
  const config = vscode.workspace.getConfiguration("gitgerbil");
  await config.update("enableCommentScanning", true, vscode.ConfigurationTarget.Global);
  await vscode.window.showInformationMessage("Comment scanning enabled");
}

export async function disableFilePathScanning(): Promise<void> {
  const config = vscode.workspace.getConfiguration("gitgerbil");
  await config.update("enableFilePathScanning", false, vscode.ConfigurationTarget.Global);
  await vscode.window.showInformationMessage("File path scanning disabled");
}

export async function disableSecretScanning(): Promise<void> {
  const config = vscode.workspace.getConfiguration("gitgerbil");
  await config.update("enableSecretScanning", false, vscode.ConfigurationTarget.Global);
  await vscode.window.showInformationMessage("Secret scanning disabled");
}

export async function disableCommentScanning(): Promise<void> {
  const config = vscode.workspace.getConfiguration("gitgerbil");
  await config.update("enableCommentScanning", false, vscode.ConfigurationTarget.Global);
  await vscode.window.showInformationMessage("Comment scanning disabled");
}
