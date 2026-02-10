import { checkComments } from "../../validate";
import { describe, test } from "mocha";
import assert from "node:assert";

describe("Comment Scanning", function () {
  test("should detect a singleline comment", function () {
    const content = `// TODO: this is a comment\nconst x = 6;\n`;
    assert.strictEqual(checkComments(content).length, 1);
  });

  test("should detect multiple singleline comments", function () {
    const content = `// TODO: this is a comment\nconst x = 6;\n\n# HACK: this is definitely not syntactically correct\ny = 7;\n`;
    assert.strictEqual(checkComments(content).length, 2);
  });

  test("should detect a multiline comment", function () {
    const content = `/* FIXME: this is a\n multiline comment\n */\nconst x = 6;\n`;
    assert.strictEqual(checkComments(content).length, 1);
  });

  test("should detect multiple multiline comments", function () {
    const content = `/* FIXME: this is a\n multiline comment\n */\nconst x = 6;\n\n<!-- HACK: this is definitely not\n syntactically correct\n -->\ny = 7;\n`;
    assert.strictEqual(checkComments(content).length, 2);
  });

  test("should not detect comments without hints", function () {
    const content = `// This is a normal comment\nconst x = 6;\n`;
    assert.strictEqual(checkComments(content).length, 0);
  });

  test("should ignore lines with gitgerbil-ignore-line", function () {
    const content = `// gitgerbil-ignore-line\nTODO: add a 7\nconst x = 6;\n`;
    assert.strictEqual(checkComments(content).length, 0);
  });
});
