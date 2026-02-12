import { DiagnosticCodes } from "./helper";
import * as vscode from "vscode";

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
      switch (diagnostic.code) {
        case DiagnosticCodes.SecretDetected:
        case DiagnosticCodes.CommentDetected:
          actions.push(this.getIgnoreLineAction(document, diagnostic, "Ignore this line"), this.getIgnoreFileAction(document, diagnostic, "Ignore entire file"));
          break;
        case DiagnosticCodes.FilePathViolation:
          actions.push(this.getIgnoreFileAction(document, diagnostic, "Ignore file path violation"));
          break;
      }

      if (diagnostic.code === DiagnosticCodes.CommentDetected) actions.push(this.getDeleteLineAction(document, diagnostic, "Delete this comment"));
      else if (diagnostic.code === DiagnosticCodes.SecretDetected) actions.push(this.replaceTextAction(document, diagnostic, "Replace secret with placeholder", "<secret>"));
    }
    return actions;
  }

  private generateAction(document: vscode.TextDocument, diagnostic: vscode.Diagnostic, title: string, editCallback: (edit: vscode.WorkspaceEdit) => void, isPreferred = false): vscode.CodeAction {
    const action = new vscode.CodeAction(title, vscode.CodeActionKind.QuickFix);
    action.diagnostics = [diagnostic];

    const edit = new vscode.WorkspaceEdit();
    editCallback(edit);
    action.edit = edit;
    if (isPreferred) action.isPreferred = isPreferred;

    action.command = {
      command: "gitgerbil.fixAndSave",
      title: "Apply fix and save file",
      arguments: [document.uri]
    };
    return action;
  }

  /** Adds `// gitgerbil-ignore-file` to the beginning of the diagnostic file */
  private getIgnoreFileAction(document: vscode.TextDocument, diagnostic: vscode.Diagnostic, title: string): vscode.CodeAction {
    return this.generateAction(document, diagnostic, title, (edit) => {
      edit.insert(document.uri, new vscode.Position(0, 0), getCommentByLanguage(document.languageId, document.lineAt(0), "gitgerbil-ignore-file"));
    });
  }

  /** Adds `// gitgerbil-ignore-line` above the diagnostic line */
  private getIgnoreLineAction(document: vscode.TextDocument, diagnostic: vscode.Diagnostic, title: string): vscode.CodeAction {
    return this.generateAction(document, diagnostic, title, (edit) => {
      edit.insert(document.uri, diagnostic.range.start, getCommentByLanguage(document.languageId, document.lineAt(diagnostic.range.start.line), "gitgerbil-ignore-line"));
    });
  }

  /** Deletes the entire line containing the diagnostic */
  private getDeleteLineAction(document: vscode.TextDocument, diagnostic: vscode.Diagnostic, title: string): vscode.CodeAction {
    return this.generateAction(
      document,
      diagnostic,
      title,
      (edit) => edit.delete(document.uri, new vscode.Range(new vscode.Position(diagnostic.range.start.line, 0), new vscode.Position(diagnostic.range.start.line + 1, 0))),
      true
    );
  }

  /** Replaces the text within the diagnostic range with the specified replacement string */
  private replaceTextAction(document: vscode.TextDocument, diagnostic: vscode.Diagnostic, title: string, replacement: string): vscode.CodeAction {
    return this.generateAction(document, diagnostic, title, (edit) => edit.replace(document.uri, diagnostic.range, replacement), true);
  }
}
