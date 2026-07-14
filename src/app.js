function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function areEqual(left, right) {
  if (Object.is(left, right)) {
    return true;
  }

  if (Array.isArray(left) && Array.isArray(right)) {
    if (left.length !== right.length) {
      return false;
    }

    return left.every((leftValue, index) => areEqual(leftValue, right[index]));
  }

  if (isObject(left) && isObject(right)) {
    const leftKeys = Object.keys(left);
    const rightKeys = Object.keys(right);
    if (leftKeys.length !== rightKeys.length) {
      return false;
    }

    return leftKeys.every(
      (key) =>
        Object.prototype.hasOwnProperty.call(right, key) &&
        areEqual(left[key], right[key]),
    );
  }

  return false;
}

export function diffJson(left, right, basePath = "") {
  const safeLeft = left ?? {};
  const safeRight = right ?? {};
  const allKeys = new Set([
    ...Object.keys(safeLeft),
    ...Object.keys(safeRight),
  ]);
  const differences = [];

  for (const key of allKeys) {
    const path = basePath ? `${basePath}.${key}` : key;
    const hasLeft = Object.prototype.hasOwnProperty.call(safeLeft, key);
    const hasRight = Object.prototype.hasOwnProperty.call(safeRight, key);

    if (!hasLeft) {
      differences.push({ path, type: "added", right: safeRight[key] });
      continue;
    }

    if (!hasRight) {
      differences.push({ path, type: "removed", left: safeLeft[key] });
      continue;
    }

    const leftValue = safeLeft[key];
    const rightValue = safeRight[key];

    if (isObject(leftValue) && isObject(rightValue)) {
      differences.push(...diffJson(leftValue, rightValue, path));
      continue;
    }

    if (!areEqual(leftValue, rightValue)) {
      differences.push({
        path,
        type: "changed",
        left: leftValue,
        right: rightValue,
      });
    }
  }

  return differences.sort((a, b) => a.path.localeCompare(b.path));
}

export async function parseJsonFile(file) {
  const text = await file.text();
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`"${file.name}" is not valid JSON: ${error.message}`);
  }
}

async function runComparison() {
  const leftInput = document.getElementById("left-json");
  const rightInput = document.getElementById("right-json");
  const output = document.getElementById("diff-output");

  if (!leftInput.files[0] || !rightInput.files[0]) {
    output.textContent = "Please upload both JSON files before comparing.";
    return;
  }

  try {
    const [left, right] = await Promise.all([
      parseJsonFile(leftInput.files[0]),
      parseJsonFile(rightInput.files[0]),
    ]);
    const diff = diffJson(left, right);
    output.textContent = diff.length
      ? JSON.stringify(diff, null, 2)
      : "No differences found.";
  } catch (error) {
    output.textContent = `Could not compare files: ${error.message}`;
  }
}

if (typeof document !== "undefined") {
  const compareButton = document.getElementById("compare-button");
  if (compareButton) {
    compareButton.addEventListener("click", runComparison);
  }
}
