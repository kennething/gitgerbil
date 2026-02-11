import { diagnostics, ignoredFiles, scannedFiles, scanningOptions } from "./globals";
import { checkComments, scanSecretKeys, validateFileName } from "./validate";
import type { API, Repository } from "../types/git";
import type { LineRange } from "../types/index";
import * as vscode from "vscode";

enum DiagnosticCodes {
  FilePathViolation,
  SecretDetected,
  CommentDetected
}

const commentByLanguage = {
  typescript: (c, i) => `// ${c}\n${i}`,
  typescriptreact: (c, i) => `// ${c}\n${i}`,
  javascript: (c, i) => `// ${c}\n${i}`,
  javascriptreact: (c, i) => `// ${c}\n${i}`,
  vue: (c, i) => `<!-- ${c} -->\n${i}`,
  svelte: (c, i) => `<!-- ${c} -->\n${i}`,
  python: (c, i) => `# ${c}\n${i}`,
  ruby: (c, i) => `# ${c}\n${i}`,
  go: (c, i) => `// ${c}\n${i}`,
  java: (c, i) => `// ${c}\n${i}`,
  php: (c, i) => `// ${c}\n${i}`,
  csharp: (c, i) => `// ${c}\n${i}`,
  cpp: (c, i) => `// ${c}\n${i}`,
  c: (c, i) => `// ${c}\n${i}`,
  rust: (c, i) => `// ${c}\n${i}`,
  html: (c, i) => `<!-- ${c} -->\n${i}`,
  css: (c, i) => `/* ${c} */\n${i}`,
  scss: (c, i) => `/* ${c} */\n${i}`,
  less: (c, i) => `/* ${c} */\n${i}`,
  json: (c, i) => `// ${c}\n${i}`,
  yaml: (c, i) => `# ${c}\n${i}`,
  yml: (c, i) => `# ${c}\n${i}`,
  markdown: (c, i) => `<!-- ${c} -->\n${i}`,
  toml: (c, i) => `# ${c}\n${i}`
} as Record<vscode.TextDocument["languageId"], (comment: string, indentation: string) => string>;

function getCommentByLanguage(language: vscode.TextDocument["languageId"], line: vscode.TextLine, comment: string) {
  const indentMatch = line.text.match(/^\s*/);
  const indentation = indentMatch ? indentMatch[0] : "";

  return commentByLanguage[language]?.(comment, indentation) ?? `// ${comment}\n${indentation}`;
}

export class CodeActionProvider implements vscode.CodeActionProvider {
  provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range | vscode.Selection,
    context: vscode.CodeActionContext,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<(vscode.CodeAction | vscode.Command)[]> {
    const actions: vscode.CodeAction[] = [];

    for (const diagnostic of context.diagnostics) {
      if (diagnostic.code === DiagnosticCodes.FilePathViolation) {
        const fix = new vscode.CodeAction("Ignore file path violation", vscode.CodeActionKind.QuickFix);
        fix.diagnostics = [diagnostic];

        const edit = new vscode.WorkspaceEdit();
        edit.insert(document.uri, new vscode.Position(0, 0), getCommentByLanguage(document.languageId, document.lineAt(0), "gitgerbil-ignore-file"));
        fix.edit = edit;
        actions.push(fix);
        break;
      }

      const ignoreLineFix = new vscode.CodeAction("Ignore this line", vscode.CodeActionKind.QuickFix);
      ignoreLineFix.diagnostics = [diagnostic];
      const ignoreLineEdit = new vscode.WorkspaceEdit();
      ignoreLineEdit.insert(document.uri, diagnostic.range.start, getCommentByLanguage(document.languageId, document.lineAt(diagnostic.range.start.line), "gitgerbil-ignore-line"));
      ignoreLineFix.edit = ignoreLineEdit;

      const ignoreFileFix = new vscode.CodeAction("Ignore entire file", vscode.CodeActionKind.QuickFix);
      ignoreFileFix.diagnostics = [diagnostic];
      const ignoreFileEdit = new vscode.WorkspaceEdit();
      ignoreFileEdit.insert(document.uri, new vscode.Position(0, 0), getCommentByLanguage(document.languageId, document.lineAt(0), "gitgerbil-ignore-file"));
      ignoreFileFix.edit = ignoreFileEdit;

      actions.push(ignoreLineFix, ignoreFileFix);

      if (diagnostic.code === DiagnosticCodes.SecretDetected) {
        const replaceSecretFix = new vscode.CodeAction("Replace potential secret with placeholder", vscode.CodeActionKind.QuickFix);
        replaceSecretFix.diagnostics = [diagnostic];

        const replaceSecretEdit = new vscode.WorkspaceEdit();
        replaceSecretEdit.replace(document.uri, diagnostic.range, "<secret>");
        replaceSecretFix.edit = replaceSecretEdit;

        actions.push(replaceSecretFix);
      } else {
        const deleteLineFix = new vscode.CodeAction("Delete this comment", vscode.CodeActionKind.QuickFix);
        deleteLineFix.diagnostics = [diagnostic];

        const deleteLineEdit = new vscode.WorkspaceEdit();
        deleteLineEdit.delete(document.uri, new vscode.Range(new vscode.Position(diagnostic.range.start.line, 0), new vscode.Position(diagnostic.range.start.line + 1, 0)));
        deleteLineFix.edit = deleteLineEdit;

        actions.push(deleteLineFix);
      }
    }
    return actions;
  }
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
