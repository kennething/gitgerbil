import { checkComments, scanSecretKeys, validateFileName, type LineRange } from "./validate";
import type { GitExtension, Repository } from "../types/git";
import * as commands from "./commands";
import * as vscode from "vscode";

const defaultScannedFiles = ["ts", "js", "jsx", "tsx", "vue", "py", "rb", "go", "java", "php", "cs", "cpp", "c", "h", "rs", "html", "css", "scss", "less", "json", "yaml", "yml"] as const;
const scannedFiles = new Set<string>(defaultScannedFiles);
const scanningOptions = {
  filePathScanning: true,
  secretScanning: true,
  commentScanning: true
};
let diagnostics: vscode.DiagnosticCollection;

/** Creates a diagnostic message for a given range and severity.
 * @param message The message to display in the diagnostic.
 * @param severity The severity level of the diagnostic.
 * @param lineRange Optional line range to associate with the diagnostic. If not provided, defaults to the first line.
 * @returns A `vscode.Diagnostic` object with the specified message, severity, and range.
 */
function createDiagnostic(message: string, severity: vscode.DiagnosticSeverity, lineRange?: LineRange): vscode.Diagnostic {
  const defaultRange =
    lineRange ??
    ([
      [0, 0],
      [0, 1]
    ] as LineRange);
  const range = new vscode.Range(new vscode.Position(...defaultRange[0]), new vscode.Position(...defaultRange[1]));

  const diagnostic = new vscode.Diagnostic(range, message, severity);
  diagnostic.source = "Commit Scanner";
  return diagnostic;
}

/** Checks a file for potential issues based on its name, folder, content, and comments.
 *
 * The file will be skipped if it is ignored by git.
 * @param repo The repository to check against.
 * @param uri The URI of the file to check.
 */
async function checkFile(repo: Repository, uri: vscode.Uri): Promise<void> {
  if ((await repo.checkIgnore([uri.fsPath])).size) return diagnostics.delete(uri);
  console.log(uri.fsPath);
  // ? if not a dotfile and the extension isnt in scannedFiles
  if (!/^\.[^./\\]+$/.test(uri.fsPath.split("/").pop() ?? "") && !scannedFiles.has(/^[^.]+\.([^.]+)$/.exec(uri.fsPath)?.[1] ?? "")) return diagnostics.delete(uri);

  const buffer = await vscode.workspace.fs.readFile(uri);
  const content = Buffer.from(buffer).toString("utf-8");

  const fileDiagnostics: vscode.Diagnostic[] = [];

  if (scanningOptions.filePathScanning) {
    const fileNameViolation = validateFileName(uri);
    if (fileNameViolation) fileDiagnostics.push(createDiagnostic(`${fileNameViolation === 1 ? "File" : "Folder"} name matches a sensitive pattern`, vscode.DiagnosticSeverity.Warning));
  }
  if (scanningOptions.secretScanning) {
    const secretResults = scanSecretKeys(content);
    if (secretResults.length) fileDiagnostics.push(...secretResults.map(([range, message]) => createDiagnostic(message, vscode.DiagnosticSeverity.Error, range)));
  }
  if (scanningOptions.commentScanning) {
    const commentResults = checkComments(content);
    if (commentResults.length) fileDiagnostics.push(...commentResults.map(([range, message]) => createDiagnostic(message, vscode.DiagnosticSeverity.Hint, range)));
  }

  if (fileDiagnostics.length) diagnostics.set(uri, fileDiagnostics);
  else diagnostics.delete(uri);
}

export function activate(context: vscode.ExtensionContext) {
  const gitExtension = vscode.extensions.getExtension<GitExtension>("vscode.git")?.exports;
  if (!gitExtension) throw new Error("Git extension not found");

  diagnostics = vscode.languages.createDiagnosticCollection("commit-scanner");
  context.subscriptions.push(diagnostics);

  const git = gitExtension.getAPI(1);
  const repo = git.repositories[0];

  const scanningConfig = vscode.workspace.getConfiguration("gitgerbil");
  scannedFiles.clear();
  for (const fileType of scanningConfig.get<string[]>("scannedFileTypes", defaultScannedFiles as unknown as string[])) scannedFiles.add(fileType);
  scanningOptions.filePathScanning = scanningConfig.get<boolean>("enableFilePathScanning", scanningOptions.filePathScanning);
  scanningOptions.secretScanning = scanningConfig.get<boolean>("enableSecretScanning", scanningOptions.secretScanning);
  scanningOptions.commentScanning = scanningConfig.get<boolean>("enableCommentScanning", scanningOptions.commentScanning);

  async function checkAllFiles(path: vscode.Uri) {
    const directory = await vscode.workspace.fs.readDirectory(path);

    for (const [name, type] of directory) {
      const newPath = vscode.Uri.joinPath(path, name);
      if (newPath.fsPath.includes("/.git")) continue;
      if ((await repo.checkIgnore([newPath.fsPath])).size) {
        diagnostics.delete(newPath);
        continue;
      }

      if (type === vscode.FileType.Directory) checkAllFiles(newPath);
      else checkFile(repo, newPath);
    }
  }

  // * check all files on actviation
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (workspaceFolder) checkAllFiles(workspaceFolder.uri);

  // * add watchers
  const watchFn = (uri: vscode.Uri) => {
    if (uri.path.includes(".gitignore") && workspaceFolder) checkAllFiles(workspaceFolder.uri);
    else checkFile(repo, uri);
  };
  const watcher = vscode.workspace.createFileSystemWatcher("**/*");
  watcher.onDidChange(watchFn);
  watcher.onDidCreate(watchFn);
  context.subscriptions.push(watcher);

  // * check settings
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

      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (workspaceFolder) checkAllFiles(workspaceFolder.uri);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("gitgerbil.setScannedFileTypes", commands.handleScannedFileTypes),
    vscode.commands.registerCommand("gitgerbil.enableFilePathScanning", commands.enableFilePathScanning),
    vscode.commands.registerCommand("gitgerbil.enableSecretScanning", commands.enableSecretScanning),
    vscode.commands.registerCommand("gitgerbil.enableCommentScanning", commands.enableCommentScanning),
    vscode.commands.registerCommand("gitgerbil.disableFilePathScanning", commands.disableFilePathScanning),
    vscode.commands.registerCommand("gitgerbil.disableSecretScanning", commands.disableSecretScanning),
    vscode.commands.registerCommand("gitgerbil.disableCommentScanning", commands.disableCommentScanning)
  );
}
