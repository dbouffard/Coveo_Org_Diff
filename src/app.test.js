import test from "node:test";
import assert from "node:assert/strict";
import { diffJson } from "./app.js";

test("diffJson reports added, removed, and changed fields", () => {
  const left = {
    unchanged: true,
    changed: 1,
    removed: "legacy",
    nested: { feature: false },
  };
  const right = {
    unchanged: true,
    changed: 2,
    added: "new",
    nested: { feature: true },
  };

  assert.deepEqual(diffJson(left, right), [
    { path: "added", right: "new", type: "added" },
    { left: 1, path: "changed", right: 2, type: "changed" },
    { left: false, path: "nested.feature", right: true, type: "changed" },
    { left: "legacy", path: "removed", type: "removed" },
  ]);
});

test("diffJson compares arrays deeply", () => {
  assert.deepEqual(
    diffJson(
      { pipelines: ["A", { model: "v1" }] },
      { pipelines: ["A", { model: "v1" }] },
    ),
    [],
  );

  assert.deepEqual(
    diffJson(
      { pipelines: ["A", { model: "v1" }] },
      { pipelines: ["A", { model: "v2" }] },
    ),
    [
      {
        path: "pipelines",
        type: "changed",
        left: ["A", { model: "v1" }],
        right: ["A", { model: "v2" }],
      },
    ],
  );
});
