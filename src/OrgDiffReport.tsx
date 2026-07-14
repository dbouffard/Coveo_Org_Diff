import { useState } from 'react';
import type {
  ResourceTypeComparison,
  SnapshotComparisonResult,
} from './snapshotUtils';
import { DiffTree } from './DiffTree';

// ---------------------------------------------------------------------------
// Summary bar
// ---------------------------------------------------------------------------

interface SummaryBarProps {
  result: SnapshotComparisonResult;
}

function SummaryBar({ result }: SummaryBarProps) {
  const { totalAdded, totalRemoved, totalChanged, totalIdentical } = result;
  const total = totalAdded + totalRemoved + totalChanged + totalIdentical;
  return (
    <div className="summary-bar">
      <span className="summary-total">{total} resources compared</span>
      <div className="summary-chips">
        {totalChanged > 0 && (
          <span className="chip chip-changed">± {totalChanged} changed</span>
        )}
        {totalAdded > 0 && (
          <span className="chip chip-added">+ {totalAdded} added</span>
        )}
        {totalRemoved > 0 && (
          <span className="chip chip-removed">− {totalRemoved} removed</span>
        )}
        {totalIdentical > 0 && (
          <span className="chip chip-identical">= {totalIdentical} identical</span>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Individual resource diff row (used in "changed" list)
// ---------------------------------------------------------------------------

interface ChangedRowProps {
  name: string;
  diffCount: number;
  diff: ResourceTypeComparison['changed'][number]['diff'];
}

function ChangedRow({ name, diffCount, diff }: ChangedRowProps) {
  const [open, setOpen] = useState(false);
  return (
    <div className="resource-row resource-changed">
      <button
        className="resource-row-header"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span className="row-toggle">{open ? '▼' : '▶'}</span>
        <span className="resource-name">{name}</span>
        <span className="chip chip-changed">{diffCount} change{diffCount !== 1 ? 's' : ''}</span>
      </button>
      {open && (
        <div className="resource-diff-body">
          <DiffTree entries={diff} />
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// One resource type section
// ---------------------------------------------------------------------------

interface ResourceTypeSectionProps {
  comparison: ResourceTypeComparison;
  leftLabel: string;
  rightLabel: string;
}

function ResourceTypeSection({ comparison, leftLabel, rightLabel }: ResourceTypeSectionProps) {
  const { label, leftOnly, rightOnly, identical, changed } = comparison;
  const [open, setOpen] = useState(true);
  const [showIdentical, setShowIdentical] = useState(false);

  const hasAny =
    leftOnly.length + rightOnly.length + changed.length + identical.length > 0;
  if (!hasAny) return null;

  const totalCount =
    leftOnly.length + rightOnly.length + changed.length + identical.length;
  const hasChanges = leftOnly.length + rightOnly.length + changed.length > 0;

  return (
    <section className={`type-section${hasChanges ? ' type-has-changes' : ''}`}>
      <button
        className="type-section-header"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span className="type-toggle">{open ? '▼' : '▶'}</span>
        <span className="type-label">{label}</span>
        <span className="type-meta">
          <span className="type-total">{totalCount} resource{totalCount !== 1 ? 's' : ''}</span>
          {changed.length > 0 && (
            <span className="chip chip-changed">± {changed.length}</span>
          )}
          {rightOnly.length > 0 && (
            <span className="chip chip-added">+ {rightOnly.length}</span>
          )}
          {leftOnly.length > 0 && (
            <span className="chip chip-removed">− {leftOnly.length}</span>
          )}
          {identical.length > 0 && (
            <span className="chip chip-identical">= {identical.length}</span>
          )}
        </span>
      </button>

      {open && (
        <div className="type-section-body">
          {/* Changed resources */}
          {changed.length > 0 && (
            <div className="resource-group">
              <h4 className="group-title group-title-changed">± Changed</h4>
              {changed.map((c) => (
                <ChangedRow
                  key={c.name}
                  name={c.name}
                  diffCount={c.diffCount}
                  diff={c.diff}
                />
              ))}
            </div>
          )}

          {/* Added resources (only in right / prod) */}
          {rightOnly.length > 0 && (
            <div className="resource-group">
              <h4 className="group-title group-title-added">
                + Added in {rightLabel}
              </h4>
              {rightOnly.map((r) => (
                <SimpleResourceRow key={r.name} name={r.name} variant="added" />
              ))}
            </div>
          )}

          {/* Removed resources (only in left / non-prod) */}
          {leftOnly.length > 0 && (
            <div className="resource-group">
              <h4 className="group-title group-title-removed">
                − Only in {leftLabel}
              </h4>
              {leftOnly.map((r) => (
                <SimpleResourceRow key={r.name} name={r.name} variant="removed" />
              ))}
            </div>
          )}

          {/* Identical resources (collapsed by default) */}
          {identical.length > 0 && (
            <div className="resource-group">
              <button
                className="identical-toggle"
                onClick={() => setShowIdentical((s) => !s)}
              >
                {showIdentical ? '▼' : '▶'} {identical.length} identical resource{identical.length !== 1 ? 's' : ''}
              </button>
              {showIdentical && (
                <div className="identical-list">
                  {identical.map((name) => (
                    <SimpleResourceRow key={name} name={name} variant="identical" />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function SimpleResourceRow({
  name,
  variant,
}: {
  name: string;
  variant: 'added' | 'removed' | 'identical';
}) {
  const cls = {
    added: 'resource-row resource-added',
    removed: 'resource-row resource-removed',
    identical: 'resource-row resource-identical',
  }[variant];

  return (
    <div className={cls}>
      <span className="resource-name">{name}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main report
// ---------------------------------------------------------------------------

interface OrgDiffReportProps {
  result: SnapshotComparisonResult;
  leftLabel: string;
  rightLabel: string;
}

export function OrgDiffReport({ result, leftLabel, rightLabel }: OrgDiffReportProps) {
  const allIdentical =
    result.totalChanged === 0 &&
    result.totalAdded === 0 &&
    result.totalRemoved === 0;

  return (
    <div className="org-diff-report">
      <SummaryBar result={result} />

      {allIdentical ? (
        <p className="no-diff">
          ✓ No configuration differences found between the two snapshots.
        </p>
      ) : (
        <>
          <div className="diff-legend">
            <span className="legend-item legend-changed">± Changed</span>
            <span className="legend-item legend-added">+ Added</span>
            <span className="legend-item legend-removed">− Removed</span>
            <span className="legend-item legend-identical">= Identical</span>
          </div>
          <div className="type-sections">
            {result.byType.map((comparison) => (
              <ResourceTypeSection
                key={comparison.type}
                comparison={comparison}
                leftLabel={leftLabel}
                rightLabel={rightLabel}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
