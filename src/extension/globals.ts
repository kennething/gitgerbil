import * as vscode from "vscode";

// prettier-ignore
export const defaultScannedFiles = ["ts", "js", "jsx", "tsx", "vue", "svelte", "py", "rb", "go", "java", "php", "cs", "cpp", "c", "h", "rs", "html", "css", "scss", "less", "json", "yaml", "yml", "md", "txt", "toml"] as const;
export const ignoredFiles = new Set<string>(["package-lock.json", "yarn.lock", "pnpm-lock.yaml", "Cargo.lock", "Gemfile.lock", "go.sum"]);
export const scannedFiles = new Set<string>();

export const scanningOptions = {
  filePathScanning: true,
  secretScanning: true,
  strictSecretScanning: true,
  commentScanning: true
};

export let diagnostics: vscode.DiagnosticCollection;
export function setDiagnostics(newDiagnostics: vscode.DiagnosticCollection) {
  diagnostics = newDiagnostics;
}
