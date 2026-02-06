import { checkComments, scanSecretKeys, validateFileName, type LineRange } from "./utils";
import type { GitExtension, Repository } from "../types/git";
import * as vscode from "vscode";

const scannedFiles = new Set<string>(["ts", "js", "jsx", "tsx", "vue", "py", "rb", "go", "java", "php", "cs", "cpp", "c", "h", "rs", "html", "css", "scss", "less", "json", "yaml", "yml"]);
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
  // ? if not a dotfile and the extension isnt in scannedFiles
  if (!/^\.[^./\\]+$/.test(uri.fsPath.split("/").pop() ?? "") && !scannedFiles.has(/^[^.]+\.([^.]+)$/.exec(uri.fsPath)?.[1] ?? "")) return;

  const buffer = await vscode.workspace.fs.readFile(uri);
  const content = Buffer.from(buffer).toString("utf-8");

  const fileDiagnostics: vscode.Diagnostic[] = [];

  const fileNameViolation = validateFileName(uri);
  if (fileNameViolation) fileDiagnostics.push(createDiagnostic(`${fileNameViolation === 1 ? "File" : "Folder"} name matches a sensitive pattern`, vscode.DiagnosticSeverity.Warning));
  const secretResults = scanSecretKeys(content);
  if (secretResults.length) fileDiagnostics.push(...secretResults.map(([range, message]) => createDiagnostic(message, vscode.DiagnosticSeverity.Error, range)));
  const commentResults = checkComments(content);
  if (commentResults.length) fileDiagnostics.push(...commentResults.map(([range, message]) => createDiagnostic(message, vscode.DiagnosticSeverity.Hint, range)));

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

  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (workspaceFolder) checkAllFiles(workspaceFolder.uri);

  const watchFn = (uri: vscode.Uri) => {
    if (uri.path.includes(".gitignore") && workspaceFolder) checkAllFiles(workspaceFolder.uri);
    else checkFile(repo, uri);
  };
  const watcher = vscode.workspace.createFileSystemWatcher("**/*");
  watcher.onDidChange(watchFn);
  watcher.onDidCreate(watchFn);
  context.subscriptions.push(watcher);
}
