type LinePosition = [line: number, col: number];
export type LineRange = [from: LinePosition, to: LinePosition];

const snakeCaseIndicators = ["access_key", "secret_key", "access_token", "api_key", "api_secret", "app_secret", "application_key", "app_key", "auth_token", "auth_secret"] as const;
// prettier-ignore
export const indicators = [
  snakeCaseIndicators, // * snake_case
  snakeCaseIndicators.map((i) => i.toUpperCase()), // * UPPER_SNAKE_CASE
  snakeCaseIndicators.map((i) => i.split("_").map((part, index) => (index === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1))).join("")), // * camelCase
  snakeCaseIndicators.map((i) => i.split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join("")), // * PascalCase
  snakeCaseIndicators.map((i) => i.replace(/_/g, "-")), // * kebab-case
  snakeCaseIndicators.map((i) => i.toUpperCase().replace(/_/g, "-")), // * UPPER-KEBAB-CASE
  snakeCaseIndicators.map((i) => i.replace(/_/g, "")), // * flatcase
  snakeCaseIndicators.map((i) => i.toUpperCase().replace(/_/g, "")) // * UPPERFLATCASE
].flat();
