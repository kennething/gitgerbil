import { defaultScannedFiles, diagnostics, scannedFiles, scanningOptions, setDiagnostics } from "./utils/globals";
import { checkAllFiles, checkFile, CodeActionProvider, waitForGitRepo } from "./utils/helper";
import type { GitExtension, Repository } from "./types/git";
import * as commands from "./utils/commands";
import * as vscode from "vscode";

export async function activate(context: vscode.ExtensionContext) {
  const gitExtension = vscode.extensions.getExtension<GitExtension>("vscode.git")?.exports;
  if (!gitExtension) throw new Error("Git extension not found");

  setDiagnostics(vscode.languages.createDiagnosticCollection("gitgerbil"));
  context.subscriptions.push(diagnostics);

  const git = gitExtension.getAPI(1);
  await waitForGitRepo(git);
  const repo = git.repositories[0];

  initConfig();
  initConfigWatchers(repo, context);
  initCommandListeners(context);
  initCodeActions(context);

  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (workspaceFolder) await checkAllFiles(repo, workspaceFolder.uri);

  initFileWatchers(repo, workspaceFolder, context);
}

function initConfig() {
  const scanningConfig = vscode.workspace.getConfiguration("gitgerbil");
  scannedFiles.clear();

  for (const fileType of scanningConfig.get<string[]>("scannedFileTypes", defaultScannedFiles as unknown as string[])) scannedFiles.add(fileType);
  scanningOptions.filePathScanning = scanningConfig.get<boolean>("enableFilePathScanning", scanningOptions.filePathScanning);
  scanningOptions.secretScanning = scanningConfig.get<boolean>("enableSecretScanning", scanningOptions.secretScanning);
  scanningOptions.commentScanning = scanningConfig.get<boolean>("enableCommentScanning", scanningOptions.commentScanning);
  scanningOptions.strictSecretScanning = scanningConfig.get<boolean>("enableStrictSecretScanning", scanningOptions.strictSecretScanning);
}

function initConfigWatchers(repo: Repository, context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((event) => {
      const config = vscode.workspace.getConfiguration("gitgerbil");

      if (event.affectsConfiguration("gitgerbil.scannedFileTypes")) {
        const value = config.get<string[]>("scannedFileTypes");
        if (!value) return;

        scannedFiles.clear();
        for (const fileType of value) scannedFiles.add(fileType);
      } else if (event.affectsConfiguration("gitgerbil.enableFilePathScanning")) scanningOptions.filePathScanning = config.get<boolean>("enableFilePathScanning", scanningOptions.filePathScanning);
      else if (event.affectsConfiguration("gitgerbil.enableSecretScanning")) scanningOptions.secretScanning = config.get<boolean>("enableSecretScanning", scanningOptions.secretScanning);
      else if (event.affectsConfiguration("gitgerbil.enableCommentScanning")) scanningOptions.commentScanning = config.get<boolean>("enableCommentScanning", scanningOptions.commentScanning);
      else if (event.affectsConfiguration("gitgerbil.enableStrictSecretScanning"))
        scanningOptions.strictSecretScanning = config.get<boolean>("enableStrictSecretScanning", scanningOptions.strictSecretScanning);

      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (workspaceFolder) checkAllFiles(repo, workspaceFolder.uri);
    })
  );
}

function initCommandListeners(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand("gitgerbil.setScannedFileTypes", commands.handleScannedFileTypes),
    vscode.commands.registerCommand("gitgerbil.toggleFilePathScanning", commands.toggleFilePathScanning),
    vscode.commands.registerCommand("gitgerbil.toggleSecretScanning", commands.toggleSecretScanning),
    vscode.commands.registerCommand("gitgerbil.toggleCommentScanning", commands.toggleCommentScanning),
    vscode.commands.registerCommand("gitgerbil.toggleStrictSecretScanning", commands.toggleStrictSecretScanning)
  );
}

function initCodeActions(context: vscode.ExtensionContext) {
  // prettier-ignore
  context.subscriptions.push(
    vscode.languages.registerCodeActionsProvider(
      { scheme: "file", language: "*" },
      new CodeActionProvider(),
      { providedCodeActionKinds: [vscode.CodeActionKind.QuickFix] }
    )
  )
}

function initFileWatchers(repo: Repository, folder: vscode.WorkspaceFolder | undefined, context: vscode.ExtensionContext) {
  const watchFn = (uri: vscode.Uri) => {
    if (uri.path.includes(".gitignore") && folder) checkAllFiles(repo, folder.uri);
    else checkFile(repo, uri);
  };
  const watcher = vscode.workspace.createFileSystemWatcher("**/*");
  watcher.onDidChange(watchFn);
  watcher.onDidCreate(watchFn);
  context.subscriptions.push(watcher);
}
