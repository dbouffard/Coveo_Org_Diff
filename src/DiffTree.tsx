import { useState } from 'react';
import type { DiffEntry } from './diffUtils';

interface DiffTreeProps {
  entries: DiffEntry[];
  depth?: number;
}

function formatValue(value: unknown): string {
  if (value === null) return 'null';
  if (typeof value === 'string') return `"${value}"`;
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
}

function DiffNode({ entry, depth }: { entry: DiffEntry; depth: number }) {
  const [collapsed, setCollapsed] = useState(false);
  const hasChildren = entry.children && entry.children.length > 0;
  const label = entry.path.split('.').pop() ?? entry.path;

  const typeClass: Record<string, string> = {
    added: 'diff-added',
    removed: 'diff-removed',
    changed: 'diff-changed',
    unchanged: '',
  };

  const badgeLabel: Record<string, string> = {
    added: '+ added',
    removed: '− removed',
    changed: '± changed',
    unchanged: '',
  };

  return (
    <div className={`diff-node ${typeClass[entry.type]}`} style={{ marginLeft: depth * 16 }}>
      <div
        className="diff-row"
        onClick={() => hasChildren && setCollapsed((c) => !c)}
        style={{ cursor: hasChildren ? 'pointer' : 'default' }}
      >
        {hasChildren && (
          <span className="diff-toggle">{collapsed ? '▶' : '▼'}</span>
        )}
        <span className="diff-key">{label}</span>
        {entry.type !== 'unchanged' && (
          <span className={`diff-badge ${typeClass[entry.type]}`}>
            {badgeLabel[entry.type]}
          </span>
        )}
      </div>

      {!hasChildren && entry.type === 'changed' && (
        <div className="diff-values">
          <span className="diff-removed-val">{formatValue(entry.leftValue)}</span>
          <span className="diff-arrow">→</span>
          <span className="diff-added-val">{formatValue(entry.rightValue)}</span>
        </div>
      )}

      {!hasChildren && entry.type === 'removed' && (
        <div className="diff-values">
          <span className="diff-removed-val">{formatValue(entry.leftValue)}</span>
        </div>
      )}

      {!hasChildren && entry.type === 'added' && (
        <div className="diff-values">
          <span className="diff-added-val">{formatValue(entry.rightValue)}</span>
        </div>
      )}

      {hasChildren && !collapsed && (
        <DiffTree entries={entry.children!} depth={depth + 1} />
      )}
    </div>
  );
}

export function DiffTree({ entries, depth = 0 }: DiffTreeProps) {
  if (entries.length === 0) return null;
  return (
    <div className="diff-tree">
      {entries.map((entry) => (
        <DiffNode key={entry.path} entry={entry} depth={depth} />
      ))}
    </div>
  );
}
