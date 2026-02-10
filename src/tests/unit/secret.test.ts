// gitgerbil-ignore-file

import { scanSecretKeys } from "../../validate";
import { describe, test } from "mocha";
import assert from "node:assert";

const redkitten6sSupabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlbG1qa2VxZWttaGt4c3JycndiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1NzE4NTksImV4cCI6MjA4NDE0Nzg1OX0.cbspqjrqcdDkREd3tOlS2TcjknjIzUUeIcX_t8eNYfE";
const redkitten6sYouTubeKey = "AIzaSyAVQKyYxMrhgHWR8f9LJms0GVpcufhMLwc";

describe("Secret Detection", function () {
  test("should detect a valid secret", function () {
    const content = `API_KEY=${redkitten6sSupabaseKey}`;
    assert.strictEqual(scanSecretKeys(content).length, 1);
  });

  test("should detect a valid secret with other text", function () {
    const content = `const apiKey = [({"${redkitten6sSupabaseKey}"})]`;
    assert.strictEqual(scanSecretKeys(content).length, 1);
  });

  test("should detect multiple secrets in the same file", function () {
    const content = [
      `API_KEY=${redkitten6sSupabaseKey}`,
      `API_KEY=${redkitten6sYouTubeKey}`,
      "API_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWUsImlhdCI6MTUxNjIzOTAyMn0.KMUFsIDTnFmyG3nMiGM6H9FNFUROf3wh7SmqJp-QV30",
      `API_KEY=${redkitten6sSupabaseKey}`
    ];
    assert.strictEqual(scanSecretKeys(content.join("\n")).length, content.length);
  });

  test("should detect a secret without indicators if strict mode is off", function () {
    const content = `("${redkitten6sSupabaseKey}");`;
    assert.strictEqual(scanSecretKeys(content, false).length, 1);
  });

  test("should not detect an invalid secret", function () {
    const content = ["API_KEY=this is bob", "API_KEY=bob says hi", "API_KEY=this is bob when the train goes by", "API_KEY=splat"];
    assert.strictEqual(scanSecretKeys(content.join("\n")).length, 0);
  });

  test("should not detect a secret without indicators in strict mode", function () {
    const content = `("${redkitten6sSupabaseKey}");`;
    assert.strictEqual(scanSecretKeys(content).length, 0);
  });

  test("should ignore secrets on lines with gitgerbil-ignore-line", function () {
    const content = `// gitgerbil-ignore-line\nAPI_KEY=${redkitten6sSupabaseKey}`;
    assert.strictEqual(scanSecretKeys(content).length, 0);
  });
});
