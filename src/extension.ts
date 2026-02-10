import { checkComments, scanSecretKeys, validateFileName, type LineRange } from "./validate";
import type { API, GitExtension, Repository } from "./types/git";
import * as commands from "./commands";
import * as vscode from "vscode";

export const defaultScannedFiles = ["ts", "js", "jsx", "tsx", "vue", "py", "rb", "go", "java", "php", "cs", "cpp", "c", "h", "rs", "html", "css", "scss", "less", "json", "yaml", "yml", "md"] as const;
const ignoredFiles = new Set<string>(["package-lock.json", "yarn.lock", "pnpm-lock.yaml", "Cargo.lock", "Gemfile.lock", "go.sum"]);
const scannedFiles = new Set<string>();
const scanningOptions = {
  filePathScanning: true,
  secretScanning: true,
  strictSecretScanning: true,
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
  diagnostic.source = "GitGerbil";
  return diagnostic;
}

/** Checks a file for potential issues based on its name, folder, content, and comments.
 *
 * The file will be skipped if it is ignored by git.
 * @param repo The repository to check against.
 * @param uri The URI of the file to check.
 */
async function checkFile(repo: Repository, uri: vscode.Uri): Promise<void> {
  if (ignoredFiles.has(uri.fsPath.split("/").pop() ?? "")) return diagnostics.delete(uri);
  if ((await repo.checkIgnore([uri.fsPath])).size) return diagnostics.delete(uri);
  // ? if not a dotfile and the extension isnt in scannedFiles
  if (!/^\.[^./\\]+$/.test(uri.fsPath.split("/").pop() ?? "") && !scannedFiles.has(uri.fsPath.split(".").pop() ?? "")) return diagnostics.delete(uri);

  const buffer = await vscode.workspace.fs.readFile(uri);
  const content = Buffer.from(buffer).toString("utf-8");

  const fileDiagnostics: vscode.Diagnostic[] = [];
  const fileIsIgnored = content.split("\n")[0]?.includes("gitgerbil-ignore-file");

  if (!fileIsIgnored && scanningOptions.filePathScanning) {
    const fileNameViolation = validateFileName(uri);
    if (fileNameViolation) fileDiagnostics.push(createDiagnostic(`${fileNameViolation === 1 ? "File" : "Folder"} name matches a sensitive pattern`, vscode.DiagnosticSeverity.Warning));
  }
  if (!fileIsIgnored && scanningOptions.secretScanning) {
    const secretResults = scanSecretKeys(content, scanningOptions.strictSecretScanning);
    if (secretResults.length) fileDiagnostics.push(...secretResults.map(([range, message]) => createDiagnostic(message, vscode.DiagnosticSeverity.Error, range)));
  }
  if (!fileIsIgnored && scanningOptions.commentScanning) {
    const commentResults = checkComments(content);
    if (commentResults.length) fileDiagnostics.push(...commentResults.map(([range, message]) => createDiagnostic(message, vscode.DiagnosticSeverity.Information, range)));
  }

  if (fileDiagnostics.length) diagnostics.set(uri, fileDiagnostics);
  else diagnostics.delete(uri);
}

async function waitForGitRepo(git: API, timeout = 5000) {
  const start = Date.now();
  while (git.repositories.length === 0) {
    if (Date.now() - start > timeout) throw new Error("Git repository not detected");
    await new Promise((res) => setTimeout(res, 100));
  }
}

export async function activate(context: vscode.ExtensionContext) {
  const gitExtension = vscode.extensions.getExtension<GitExtension>("vscode.git")?.exports;
  if (!gitExtension) throw new Error("Git extension not found");

  diagnostics = vscode.languages.createDiagnosticCollection("gitgerbil");
  context.subscriptions.push(diagnostics);

  const git = gitExtension.getAPI(1);
  await waitForGitRepo(git);
  const repo = git.repositories[0];

  const scanningConfig = vscode.workspace.getConfiguration("gitgerbil");
  scannedFiles.clear();
  for (const fileType of scanningConfig.get<string[]>("scannedFileTypes", defaultScannedFiles as unknown as string[])) scannedFiles.add(fileType);
  scanningOptions.filePathScanning = scanningConfig.get<boolean>("enableFilePathScanning", scanningOptions.filePathScanning);
  scanningOptions.secretScanning = scanningConfig.get<boolean>("enableSecretScanning", scanningOptions.secretScanning);
  scanningOptions.commentScanning = scanningConfig.get<boolean>("enableCommentScanning", scanningOptions.commentScanning);
  scanningOptions.strictSecretScanning = scanningConfig.get<boolean>("enableStrictSecretScanning", scanningOptions.strictSecretScanning);

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
      else if (event.affectsConfiguration("gitgerbil.enableStrictSecretScanning"))
        scanningOptions.strictSecretScanning = config.get<boolean>("enableStrictSecretScanning", scanningOptions.strictSecretScanning);
      console.warn(scanningOptions.strictSecretScanning);
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (workspaceFolder) checkAllFiles(workspaceFolder.uri);
    })
  );

  // * commands
  context.subscriptions.push(
    vscode.commands.registerCommand("gitgerbil.setScannedFileTypes", commands.handleScannedFileTypes),
    vscode.commands.registerCommand("gitgerbil.toggleFilePathScanning", commands.toggleFilePathScanning),
    vscode.commands.registerCommand("gitgerbil.toggleSecretScanning", commands.toggleSecretScanning),
    vscode.commands.registerCommand("gitgerbil.toggleCommentScanning", commands.toggleCommentScanning),
    vscode.commands.registerCommand("gitgerbil.toggleStrictSecretScanning", commands.toggleStrictSecretScanning)
  );

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

  // * add watchers
  const watchFn = (uri: vscode.Uri) => {
    if (uri.path.includes(".gitignore") && workspaceFolder) checkAllFiles(workspaceFolder.uri);
    else checkFile(repo, uri);
  };
  const watcher = vscode.workspace.createFileSystemWatcher("**/*");
  watcher.onDidChange(watchFn);
  watcher.onDidCreate(watchFn);
  context.subscriptions.push(watcher);

  // * check all files on actviation
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  // if (workspaceFolder) await checkAllFiles(workspaceFolder.uri);
}
