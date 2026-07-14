import { useState } from 'react';
import './App.css';
import { diffValues, countChanges } from './diffUtils';
import type { DiffEntry } from './diffUtils';
import { DiffTree } from './DiffTree';

const SAMPLE_LEFT = JSON.stringify(
  {
    organizationId: 'myorg',
    sources: [
      { id: 'source1', name: 'Web Source', type: 'WEB', pushEnabled: false },
      { id: 'source2', name: 'Salesforce', type: 'SALESFORCE', pushEnabled: true },
    ],
    pipelines: [
      { id: 'pipe1', name: 'Default Pipeline', condition: '' },
    ],
    extensions: [],
  },
  null,
  2,
);

const SAMPLE_RIGHT = JSON.stringify(
  {
    organizationId: 'myorg',
    sources: [
      { id: 'source1', name: 'Web Source', type: 'WEB', pushEnabled: true },
      { id: 'source3', name: 'SharePoint', type: 'SHAREPOINT', pushEnabled: false },
    ],
    pipelines: [
      { id: 'pipe1', name: 'Default Pipeline', condition: 'country == "CA"' },
      { id: 'pipe2', name: 'Mobile Pipeline', condition: '' },
    ],
    extensions: [{ id: 'ext1', name: 'Boost Extension' }],
  },
  null,
  2,
);

function parseJson(raw: string): { value: unknown; error: string | null } {
  try {
    return { value: JSON.parse(raw), error: null };
  } catch (e) {
    return { value: null, error: (e as Error).message };
  }
}

export default function App() {
  const [leftText, setLeftText] = useState('');
  const [rightText, setRightText] = useState('');
  const [diffResult, setDiffResult] = useState<DiffEntry[] | null>(null);
  const [leftError, setLeftError] = useState<string | null>(null);
  const [rightError, setRightError] = useState<string | null>(null);

  function handleCompare() {
    const left = parseJson(leftText);
    const right = parseJson(rightText);

    setLeftError(left.error);
    setRightError(right.error);

    if (left.error || right.error) {
      setDiffResult(null);
      return;
    }

    const result = diffValues(left.value, right.value);
    setDiffResult(result);
  }

  function handleLoadSample() {
    setLeftText(SAMPLE_LEFT);
    setRightText(SAMPLE_RIGHT);
    setDiffResult(null);
    setLeftError(null);
    setRightError(null);
  }

  const changeCount = diffResult ? countChanges(diffResult) : 0;

  return (
    <div className="app">
      <header className="app-header">
        <h1>Coveo Org Diff</h1>
        <p className="subtitle">
          Compare two Coveo organization JSON snapshots and inspect the
          differences.
        </p>
      </header>

      <main className="app-main">
        <div className="input-row">
          <section className="input-panel">
            <h2>Original Snapshot</h2>
            <textarea
              className={`json-input${leftError ? ' input-error' : ''}`}
              placeholder="Paste the original organization JSON snapshot here…"
              value={leftText}
              onChange={(e) => {
                setLeftText(e.target.value);
                setLeftError(null);
              }}
              spellCheck={false}
            />
            {leftError && (
              <p className="error-message">⚠ Invalid JSON: {leftError}</p>
            )}
          </section>

          <section className="input-panel">
            <h2>New Snapshot</h2>
            <textarea
              className={`json-input${rightError ? ' input-error' : ''}`}
              placeholder="Paste the new organization JSON snapshot here…"
              value={rightText}
              onChange={(e) => {
                setRightText(e.target.value);
                setRightError(null);
              }}
              spellCheck={false}
            />
            {rightError && (
              <p className="error-message">⚠ Invalid JSON: {rightError}</p>
            )}
          </section>
        </div>

        <div className="action-row">
          <button className="btn btn-primary" onClick={handleCompare}>
            Compare
          </button>
          <button className="btn btn-secondary" onClick={handleLoadSample}>
            Load sample data
          </button>
        </div>

        {diffResult !== null && (
          <section className="diff-section">
            <div className="diff-header">
              <h2>Differences</h2>
              {diffResult.length === 0 ? (
                <span className="badge badge-same">✓ No differences found</span>
              ) : (
                <span className="badge badge-changes">
                  {changeCount} change{changeCount !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            {diffResult.length === 0 ? (
              <p className="no-diff">
                The two snapshots are identical.
              </p>
            ) : (
              <>
                <div className="diff-legend">
                  <span className="legend-item legend-added">+ Added</span>
                  <span className="legend-item legend-removed">− Removed</span>
                  <span className="legend-item legend-changed">± Changed</span>
                </div>
                <div className="diff-container">
                  <DiffTree entries={diffResult} />
                </div>
              </>
            )}
          </section>
        )}
      </main>

      <footer className="app-footer">
        <p>Coveo Org Diff — JSON snapshot comparison tool</p>
      </footer>
    </div>
  );
}
