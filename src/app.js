function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function diffJson(left, right, basePath = "") {
  const allKeys = new Set([
    ...Object.keys(left || {}),
    ...Object.keys(right || {}),
  ]);
  const differences = [];

  for (const key of allKeys) {
    const path = basePath ? `${basePath}.${key}` : key;
    const hasLeft = Object.prototype.hasOwnProperty.call(left, key);
    const hasRight = Object.prototype.hasOwnProperty.call(right, key);

    if (!hasLeft) {
      differences.push({ path, type: "added", right: right[key] });
      continue;
    }

    if (!hasRight) {
      differences.push({ path, type: "removed", left: left[key] });
      continue;
    }

    const leftValue = left[key];
    const rightValue = right[key];

    if (isObject(leftValue) && isObject(rightValue)) {
      differences.push(...diffJson(leftValue, rightValue, path));
      continue;
    }

    if (JSON.stringify(leftValue) !== JSON.stringify(rightValue)) {
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
  return JSON.parse(text);
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
    compareButton.addEventListener("click", () => {
      runComparison();
    });
  }
}
