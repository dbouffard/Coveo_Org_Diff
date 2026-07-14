/**
 * Recursively computes the structural diff between two JSON values.
 *
 * Returns an array of DiffEntry objects, each describing a single change.
 */

export type ChangeType = 'added' | 'removed' | 'changed' | 'unchanged';

export interface DiffEntry {
  path: string;
  type: ChangeType;
  /** Value in the left (original) snapshot – undefined for 'added' entries */
  leftValue?: unknown;
  /** Value in the right (new) snapshot – undefined for 'removed' entries */
  rightValue?: unknown;
  children?: DiffEntry[];
}

const EMPTY_KEYS: ReadonlySet<string> = new Set();

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Deep-compare two values and produce a tree of DiffEntry records.
 *
 * @param excludeKeys - Object keys to skip entirely during comparison.
 *   Useful for ignoring organisation-unique IDs, timestamps, etc.
 */
export function diffValues(
  left: unknown,
  right: unknown,
  path = '',
  excludeKeys: ReadonlySet<string> = EMPTY_KEYS,
): DiffEntry[] {
  // Both are plain objects → recurse into each key
  if (isObject(left) && isObject(right)) {
    const allKeys = new Set([...Object.keys(left), ...Object.keys(right)]);
    const results: DiffEntry[] = [];

    for (const key of [...allKeys].sort()) {
      if (excludeKeys.has(key)) continue;

      const childPath = path ? `${path}.${key}` : key;
      const hasLeft = Object.prototype.hasOwnProperty.call(left, key);
      const hasRight = Object.prototype.hasOwnProperty.call(right, key);

      if (!hasLeft) {
        results.push(collectAdded(right[key], childPath));
      } else if (!hasRight) {
        results.push(collectRemoved(left[key], childPath));
      } else {
        const childDiff = diffValues(left[key], right[key], childPath, excludeKeys);
        if (childDiff.length === 0) {
          continue;
        }
        if (childDiff.length === 1 && childDiff[0].path === childPath) {
          results.push(childDiff[0]);
        } else {
          results.push({
            path: childPath,
            type: 'changed',
            children: childDiff,
          });
        }
      }
    }

    return results;
  }

  // Both are arrays → compare element by element (index-based)
  if (Array.isArray(left) && Array.isArray(right)) {
    const len = Math.max(left.length, right.length);
    const results: DiffEntry[] = [];

    for (let i = 0; i < len; i++) {
      const childPath = `${path}[${i}]`;
      if (i >= left.length) {
        results.push(collectAdded(right[i], childPath));
      } else if (i >= right.length) {
        results.push(collectRemoved(left[i], childPath));
      } else {
        const childDiff = diffValues(left[i], right[i], childPath, excludeKeys);
        if (childDiff.length > 0) {
          if (childDiff.length === 1 && childDiff[0].path === childPath) {
            results.push(childDiff[0]);
          } else {
            results.push({
              path: childPath,
              type: 'changed',
              children: childDiff,
            });
          }
        }
      }
    }

    return results;
  }

  // Primitive comparison (or type mismatch)
  if (left === right) {
    return [];
  }

  return [{ path, type: 'changed', leftValue: left, rightValue: right }];
}

/** Build an 'added' entry for an entire sub-tree */
function collectAdded(value: unknown, path: string): DiffEntry {
  return { path, type: 'added', rightValue: value };
}

/** Build a 'removed' entry for an entire sub-tree */
function collectRemoved(value: unknown, path: string): DiffEntry {
  return { path, type: 'removed', leftValue: value };
}

/** Count the total number of leaf changes in a DiffEntry tree */
export function countChanges(entries: DiffEntry[]): number {
  return entries.reduce((sum, e) => {
    if (e.children) return sum + countChanges(e.children);
    return sum + 1;
  }, 0);
}
