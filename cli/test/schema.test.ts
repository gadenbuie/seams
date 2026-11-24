import assert from "node:assert/strict";
import { Ajv2020 } from "ajv/dist/2020.js";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { copyFixture, fixtureDir } from "./helpers.ts";

describe("the bundled schema", () => {
  it("validates the proposal's example manifest", () => {
    const schema = JSON.parse(
      readFileSync(path.resolve(import.meta.dirname, "..", "schemas", "v1", "seams.schema.json"), "utf8"),
    );
    const validate = new Ajv2020({ strict: false }).compile(schema);
    const example = JSON.parse(
      readFileSync(path.join(fixtureDir("example"), ".agents", "seams.json"), "utf8"),
    );
    assert.equal(validate(example), true, JSON.stringify(validate.errors ?? []));
  });

  it("rejects an unknown top-level key", () => {
    const schema = JSON.parse(
      readFileSync(path.resolve(import.meta.dirname, "..", "schemas", "v1", "seams.schema.json"), "utf8"),
    );
    const validate = new Ajv2020({ strict: false }).compile(schema);
    assert.equal(validate({ schemaVersion: 1, seamsVersion: "0.1.0", extra: true }), false);
  });

  it("covers the copied example fixture", () => {
    // copyFixture must keep .agents/seams.json, including hidden directories.
    const project = copyFixture("example");
    const copied = readFileSync(path.join(project, ".agents", "seams.json"), "utf8");
    assert.match(copied, /schemaVersion/);
  });
});
