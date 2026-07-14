/**
 * Coveo organization snapshot utilities.
 *
 * A Coveo snapshot JSON looks like:
 * {
 *   "id": "...",
 *   "orgId": "...",
 *   "resources": {
 *     "SOURCE": { "mySourceName": { ...fields... } },
 *     "QUERY_PIPELINE": { "Default": { ...fields... } },
 *     "EXTENSION": { ... },
 *     ...
 *   }
 * }
 *
 * Resources are matched by their key (resourceName).
 * Fields listed in COVEO_ID_FIELDS are excluded from the diff because they
 * are organization-specific unique identifiers that will always differ.
 */

import { diffValues, countChanges } from './diffUtils';
import type { DiffEntry } from './diffUtils';

// ---------------------------------------------------------------------------
// Fields that contain organization-unique IDs or volatile timestamps and
// should therefore be excluded when comparing resource configurations.
// ---------------------------------------------------------------------------
export const COVEO_ID_FIELDS: ReadonlySet<string> = new Set([
  'id',
  'organizationId',
  'orgId',
  'originId',
  'targetId',
  'created',
  'updated',
  'createdDate',
  'updatedDate',
  'expirationDate',
  'lastModified',
  'resourceName', // same as the map key; not meaningful to diff
]);

// ---------------------------------------------------------------------------
// Human-readable labels for known resource types
// ---------------------------------------------------------------------------
export const RESOURCE_TYPE_LABELS: Record<string, string> = {
  CATALOG: 'Catalog',
  CATALOG_CONFIG: 'Catalog Configuration',
  EXTENSION: 'Extension',
  FEATURED_RESULT: 'Featured Result',
  FIELD: 'Field',
  FILTER: 'Filter',
  INSIGHT_PANEL_CONFIGURATION: 'Insight Panel Configuration',
  INSIGHT_PANEL_INTERFACE: 'Insight Panel Interface',
  MAPPING: 'Mapping',
  ML_MODEL: 'ML Model',
  ML_MODEL_ASSOCIATION: 'ML Model Association',
  QUERY_PARAMETER: 'Query Parameter',
  QUERY_PIPELINE: 'Query Pipeline',
  QUERY_PIPELINE_CONDITION: 'Query Pipeline Condition',
  RANKING_EXPRESSION: 'Ranking Expression',
  RANKING_WEIGHT: 'Ranking Weight',
  RESULT_RANKING: 'Result Ranking',
  SEARCH_PAGE: 'Search Page',
  SECURITY_PROVIDER: 'Security Provider',
  SETTING: 'Setting',
  SOURCE: 'Source',
  STATEMENT_GROUP: 'Statement Group',
  STOP_WORD: 'Stop Word',
  STOREFRONT_ASSOCIATION: 'Storefront Association',
  SUBSCRIPTION: 'Subscription',
  THESAURUS: 'Thesaurus',
  TRACKING_ID: 'Tracking ID',
  TRIGGER: 'Trigger',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface CoveoSnapshot {
  id?: string;
  orgId?: string;
  targetId?: string;
  resources?: Record<string, Record<string, unknown>>;
  [key: string]: unknown;
}

export interface ResourceEntry {
  name: string;
  data: Record<string, unknown>;
}

export interface ResourceCompare {
  name: string;
  leftData: Record<string, unknown>;
  rightData: Record<string, unknown>;
  diffCount: number;
  diff: DiffEntry[];
}

export interface ResourceTypeComparison {
  type: string;
  /** Human-readable label */
  label: string;
  /** Resources that exist only in the left (non-prod) snapshot */
  leftOnly: ResourceEntry[];
  /** Resources that exist only in the right (prod) snapshot */
  rightOnly: ResourceEntry[];
  /** Resources that exist in both and have no configuration differences */
  identical: string[];
  /** Resources that exist in both but have configuration differences */
  changed: ResourceCompare[];
}

export interface SnapshotComparisonResult {
  byType: ResourceTypeComparison[];
  totalAdded: number;
  totalRemoved: number;
  totalChanged: number;
  totalIdentical: number;
}

// ---------------------------------------------------------------------------
// Detection
// ---------------------------------------------------------------------------

/** Returns true if the value looks like a Coveo organization snapshot. */
export function isCoveoSnapshot(obj: unknown): obj is CoveoSnapshot {
  if (obj === null || typeof obj !== 'object') return false;
  const r = (obj as Record<string, unknown>).resources;
  return r !== null && typeof r === 'object' && !Array.isArray(r);
}

// ---------------------------------------------------------------------------
// Comparison
// ---------------------------------------------------------------------------

/**
 * Compares two Coveo snapshots resource-by-resource.
 *
 * Resources are matched by their map key (the `resourceName`).
 * Fields in {@link COVEO_ID_FIELDS} are excluded from the diff.
 */
export function compareSnapshots(
  left: CoveoSnapshot,
  right: CoveoSnapshot,
): SnapshotComparisonResult {
  const leftResources = left.resources ?? {};
  const rightResources = right.resources ?? {};

  const allTypes = new Set([
    ...Object.keys(leftResources),
    ...Object.keys(rightResources),
  ]);

  let totalAdded = 0;
  let totalRemoved = 0;
  let totalChanged = 0;
  let totalIdentical = 0;

  const byType: ResourceTypeComparison[] = [...allTypes].sort().map((type) => {
    const leftMap = (leftResources[type] ?? {}) as Record<string, unknown>;
    const rightMap = (rightResources[type] ?? {}) as Record<string, unknown>;

    const allNames = new Set([
      ...Object.keys(leftMap),
      ...Object.keys(rightMap),
    ]);

    const leftOnly: ResourceEntry[] = [];
    const rightOnly: ResourceEntry[] = [];
    const identical: string[] = [];
    const changed: ResourceCompare[] = [];

    for (const name of [...allNames].sort()) {
      const hasLeft = Object.prototype.hasOwnProperty.call(leftMap, name);
      const hasRight = Object.prototype.hasOwnProperty.call(rightMap, name);

      if (hasLeft && !hasRight) {
        leftOnly.push({ name, data: leftMap[name] as Record<string, unknown> });
      } else if (!hasLeft && hasRight) {
        rightOnly.push({ name, data: rightMap[name] as Record<string, unknown> });
      } else {
        const diff = diffValues(
          leftMap[name],
          rightMap[name],
          '',
          COVEO_ID_FIELDS,
        );
        if (diff.length === 0) {
          identical.push(name);
        } else {
          changed.push({
            name,
            leftData: leftMap[name] as Record<string, unknown>,
            rightData: rightMap[name] as Record<string, unknown>,
            diffCount: countChanges(diff),
            diff,
          });
        }
      }
    }

    // added   = present in right (prod) but not left (non-prod)
    // removed = present in left (non-prod) but not right (prod)
    totalAdded += rightOnly.length;
    totalRemoved += leftOnly.length;
    totalChanged += changed.length;
    totalIdentical += identical.length;

    return {
      type,
      label: RESOURCE_TYPE_LABELS[type] ?? type,
      leftOnly,
      rightOnly,
      identical,
      changed,
    };
  });

  return { byType, totalAdded, totalRemoved, totalChanged, totalIdentical };
}
