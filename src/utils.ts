import * as vscode from "vscode";

/** Checks if the file name or folder name matches any sensitive patterns.
 * @param uri The URI of the file to check.
 * @returns `1` if the file name matches any sensitive patterns, `2` if the folder name matches any sensitive patterns, `0` otherwise.
 */
export function validateFileName(uri: vscode.Uri): 0 | 1 | 2 {
  const fileName = uri.fsPath.split("/").pop() ?? "";
  const filePatterns = [
    /.*\.env.*/i,
    /.*\.key.*/i,
    /.*\.pem.*/i,
    /.*\.p12.*/i,
    /.*\.pfx.*/i,
    /.*\.crt.*/i,
    /.*\.cer.*/i,
    /.*\.der.*/i,
    /.*\.asc.*/i,
    /.*\.gpg.*/i,
    /.*\.ssh.*/i,
    /.*\.aws.*/i,
    /.*\.azure.*/i,
    /.*\.google.*/i
  ] as const;

  const fileNameMatches = filePatterns.some((pattern) => pattern.test(fileName));
  if (fileNameMatches) return 1;

  const folderName = uri.fsPath.split("/").slice(-2, -1)[0] ?? "";
  const folderPatterns = [/node_modules/i, /vendor/i, /dist/i, /build/i, /out/i, /bin/i, /obj/i, /target/i, /logs/i, /tmp/i, /temp/i, /\.?venv/i, /__pycache__/i] as const;

  return folderPatterns.some((pattern) => pattern.test(folderName)) ? 2 : 0;
}

type LinePosition = [line: number, col: number];
export type LineRange = [from: LinePosition, to: LinePosition];

/** Scans the content for potential secret keys based on predefined patterns.
 * @param content The content to scan for secret keys.
 * @returns An array of tuples containing the range of the detected secret key and the message.
 */
export function scanSecretKeys(content: string): [range: LineRange, message: string][] {
  const results: [range: LineRange, message: string][] = [];

  const patterns = [
    /[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, // * jwt
    /sk_live_[0-9a-zA-Z]{24}/g, // * stripe
    /sk_test_[0-9a-zA-Z]{24}/g, // * stripe
    /A[A-Z]{3}[0-9A-Z]{16}/g, // * aws
    /AIza[0-9A-Za-z-_]{35}/g, // * google
    /-----BEGIN PRIVATE KEY-----/g, // * private key
    /ghp_[0-9a-zA-Z]{36}/g, // * github pat
    /github_pat_[0-9a-zA-Z]{40}/g, // * github pat
    /sk-[0-9a-zA-Z]{48}/g, // * openai
    /(?=(?:[A-Za-z0-9_-]*[0-9_-]){4,})[A-Za-z0-9_-]{20,}={1,2}/g, // generic base64 pattern
    /(?=(?:[0-9a-fA-F]*[0-9]){4,})[0-9a-fA-F]{16,}/g // generic hex pattern
  ];

  outer: for (const pattern of patterns) {
    for (const match of content.matchAll(pattern)) {
      const startIndex = match.index;
      const matchedString = match[0];
      const linesUpToMatch = content.slice(0, startIndex).split("\n");

      const startLine = linesUpToMatch.length - 1;
      const startCol = linesUpToMatch[linesUpToMatch.length - 1].length;
      const endLine = startLine + matchedString.split("\n").length - 1;
      const endCol = matchedString.includes("\n") ? matchedString.split("\n").pop()!.length : startCol + matchedString.length;

      results.push([
        [
          [startLine, startCol],
          [endLine, endCol]
        ],
        `Potential secret key detected: ${matchedString}`
      ]);
      break outer;
    }
  }

  return results;
}

/** Checks the content for comments containing specific hints.
 * @param content The content to check for comments.
 * @returns An array of tuples containing the range of the comment and the message.
 */
export function checkComments(content: string): [range: LineRange, message: string][] {
  const results: [range: LineRange, message: string][] = [];

  const commentPatterns = [
    /\/\/.*/g, // * singleline comments
    /\/\*[\s\S]*?\*\//g, // * multiline comments
    /#.*$/gm, // * python comments
    /<!--[\s\S]*?-->/g, // * html comments
    /--.*$/gm // * sql comments
  ] as const;
  const commentHints = ["TODO", "FIXME", "HACK", "FIX", "todo", "fixme", "hack", "fix"] as const;

  for (const pattern of commentPatterns) {
    for (const match of content.matchAll(pattern)) {
      const comment = match[0];
      const usedHint = commentHints.find((hint) => comment.includes(hint));
      if (!usedHint) continue;

      const startIndex = match.index;
      const linesUpToComment = content.slice(0, startIndex).split("\n");

      const startLine = linesUpToComment.length - 1;
      const startCol = linesUpToComment[linesUpToComment.length - 1].length;
      const endLine = startLine + comment.split("\n").length - 1;
      const endCol = comment.includes("\n") ? comment.split("\n").pop()!.length : startCol + comment.length;

      results.push([
        [
          [startLine, startCol],
          [endLine, endCol]
        ],
        `Comment contains a ${usedHint} hint`
      ]);
    }
  }

  return results;
}
