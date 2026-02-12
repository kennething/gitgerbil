import { diagnostics, ignoredFiles, scannedFiles, scanningOptions } from "./globals";
import { checkComments, scanSecretKeys, validateFileName } from "./validate";
import type { API, Repository } from "../types/git";
import type { LineRange } from "../types/index";
import * as vscode from "vscode";

export enum DiagnosticCodes {
  FilePathViolation,
  SecretDetected,
  CommentDetected
}

/** Creates a diagnostic message for a given range and severity.
 * @param message The message to display in the diagnostic.
 * @param severity The severity level of the diagnostic.
 * @param lineRange Optional line range to associate with the diagnostic. If not provided, defaults to the first line.
 * @returns A `vscode.Diagnostic` object with the specified message, severity, and range.
 */
function createDiagnostic(message: string, severity: vscode.DiagnosticSeverity, code: DiagnosticCodes, lineRange?: LineRange): vscode.Diagnostic {
  const defaultRange =
    lineRange ??
    ([
      [0, 0],
      [0, 1]
    ] as LineRange);
  const range = new vscode.Range(new vscode.Position(...defaultRange[0]), new vscode.Position(...defaultRange[1]));

  const diagnostic = new vscode.Diagnostic(range, message, severity);
  diagnostic.code = code;
  diagnostic.source = "GitGerbil";
  return diagnostic;
}

/** Checks a file for potential issues based on its name, folder, content, and comments.
 *
 * The file will be skipped if it is ignored by git.
 * @param repo The repository to check against.
 * @param uri The URI of the file to check.
 */
export async function checkFile(repo: Repository, uri: vscode.Uri): Promise<void> {
  if (ignoredFiles.has(uri.fsPath.split("/").pop() ?? "")) return diagnostics.delete(uri);
  if ((await repo.checkIgnore([uri.fsPath])).size) return diagnostics.delete(uri);
  // ? if not a dotfile and the extension isnt in scannedFiles
  if (!/^\.[^./\\]+$/.test(uri.fsPath.split("/").pop() ?? "") && !scannedFiles.has(uri.fsPath.split(".").pop() ?? "")) return diagnostics.delete(uri);

  const buffer = await vscode.workspace.fs.readFile(uri);
  const content = Buffer.from(buffer).toString("utf-8");

  const fileDiagnostics: vscode.Diagnostic[] = [];
  const fileIsIgnored = content.split("\n")[0]?.includes("gitgerbil-ignore-file");
  if (fileIsIgnored) return diagnostics.delete(uri);

  if (scanningOptions.filePathScanning) {
    const fileNameViolation = validateFileName(uri);
    if (fileNameViolation)
      fileDiagnostics.push(createDiagnostic(`${fileNameViolation === 1 ? "File" : "Folder"} name matches a sensitive pattern`, vscode.DiagnosticSeverity.Warning, DiagnosticCodes.FilePathViolation));
  }

  if (scanningOptions.secretScanning) {
    const secretResults = scanSecretKeys(content, scanningOptions.strictSecretScanning);
    if (secretResults.length) fileDiagnostics.push(...secretResults.map(([range, message]) => createDiagnostic(message, vscode.DiagnosticSeverity.Error, DiagnosticCodes.SecretDetected, range)));
  }

  if (scanningOptions.commentScanning) {
    const commentResults = checkComments(content);
    if (commentResults.length)
      fileDiagnostics.push(...commentResults.map(([range, message]) => createDiagnostic(message, vscode.DiagnosticSeverity.Information, DiagnosticCodes.CommentDetected, range)));
  }

  if (fileDiagnostics.length) diagnostics.set(uri, fileDiagnostics);
  else diagnostics.delete(uri);
}

export async function checkAllFiles(repo: Repository, path: vscode.Uri) {
  const directory = await vscode.workspace.fs.readDirectory(path);

  for (const [name, type] of directory) {
    const newPath = vscode.Uri.joinPath(path, name);
    if (newPath.fsPath.includes("/.git")) continue;
    if ((await repo.checkIgnore([newPath.fsPath])).size) {
      diagnostics.delete(newPath);
      continue;
    }

    if (type === vscode.FileType.Directory) checkAllFiles(repo, newPath);
    else checkFile(repo, newPath);
  }
}

/** Allows for waiting until a Git repository is detected or a timeout occurs
 * @param git The Git API instance to check for repositories.
 * @param timeout The maximum time to wait for a repository, in milliseconds. Defaults to 5000ms.
 * @throws Will throw an error if no Git repository is detected within the specified timeout.
 */
export async function waitForGitRepo(git: API, timeout = 5000) {
  const start = Date.now();
  while (git.repositories.length === 0) {
    if (Date.now() - start > timeout) throw new Error("Git repository not detected");
    await new Promise((res) => setTimeout(res, 100));
  }
}
