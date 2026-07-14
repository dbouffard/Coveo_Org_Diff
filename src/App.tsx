import { useRef, useState } from 'react';
import './App.css';
import { isCoveoSnapshot, compareSnapshots } from './snapshotUtils';
import type { CoveoSnapshot, SnapshotComparisonResult } from './snapshotUtils';
import { OrgDiffReport } from './OrgDiffReport';

// ---------------------------------------------------------------------------
// Sample snapshots (realistic Coveo format)
// ---------------------------------------------------------------------------

const SAMPLE_NON_PROD: CoveoSnapshot = {
  id: 'nonprod-snapshot-aaaaaa',
  orgId: 'myorgnonprodabc123',
  resources: {
    SOURCE: {
      WebCrawler: {
        resourceName: 'WebCrawler',
        id: 'nonprod-src-001',
        name: 'Web Crawler',
        sourceType: 'WEB',
        pushEnabled: false,
        logicalIndex: 'default',
        urls: ['https://example.com'],
      },
      Salesforce: {
        resourceName: 'Salesforce',
        id: 'nonprod-src-002',
        name: 'Salesforce',
        sourceType: 'SALESFORCE',
        pushEnabled: true,
        logicalIndex: 'default',
        credentials: { username: 'admin@example.com' },
      },
    },
    QUERY_PIPELINE: {
      Default: {
        resourceName: 'Default',
        id: 'nonprod-pipe-001',
        name: 'Default',
        condition: null,
        splitTestEnabled: false,
      },
    },
    EXTENSION: {
      BoostFreshContent: {
        resourceName: 'BoostFreshContent',
        id: 'nonprod-ext-001',
        name: 'Boost Fresh Content',
        content: 'document.add_meta_data({"boost": 1.0})',
        enabled: true,
      },
    },
    FIELD: {
      author: {
        resourceName: 'author',
        name: 'author',
        type: 'STRING',
        includedInQuery: true,
        mergeWithLexicon: false,
      },
      date: {
        resourceName: 'date',
        name: 'date',
        type: 'DATE',
        includedInQuery: false,
        mergeWithLexicon: false,
      },
    },
  },
};

const SAMPLE_PROD: CoveoSnapshot = {
  id: 'prod-snapshot-bbbbbb',
  orgId: 'myorgprodxyz789',
  resources: {
    SOURCE: {
      WebCrawler: {
        resourceName: 'WebCrawler',
        id: 'prod-src-001',
        name: 'Web Crawler',
        sourceType: 'WEB',
        pushEnabled: true, // changed: false → true
        logicalIndex: 'default',
        urls: ['https://example.com', 'https://blog.example.com'], // changed: added URL
      },
      SharePoint: {
        // added in prod
        resourceName: 'SharePoint',
        id: 'prod-src-003',
        name: 'SharePoint',
        sourceType: 'SHAREPOINT',
        pushEnabled: false,
        logicalIndex: 'default',
      },
      // Salesforce removed in prod
    },
    QUERY_PIPELINE: {
      Default: {
        resourceName: 'Default',
        id: 'prod-pipe-001',
        name: 'Default',
        condition: 'country == "CA"', // changed
        splitTestEnabled: false,
      },
      Mobile: {
        // added in prod
        resourceName: 'Mobile',
        id: 'prod-pipe-002',
        name: 'Mobile',
        condition: 'userAgent contains "Mobile"',
        splitTestEnabled: false,
      },
    },
    EXTENSION: {
      BoostFreshContent: {
        resourceName: 'BoostFreshContent',
        id: 'prod-ext-001',
        name: 'Boost Fresh Content',
        content: 'document.add_meta_data({"boost": 2.5})', // changed
        enabled: true,
      },
    },
    FIELD: {
      author: {
        resourceName: 'author',
        name: 'author',
        type: 'STRING',
        includedInQuery: true, // same
        mergeWithLexicon: false,
      },
      date: {
        resourceName: 'date',
        name: 'date',
        type: 'DATE',
        includedInQuery: false, // same
        mergeWithLexicon: false,
      },
    },
  },
};

// ---------------------------------------------------------------------------
// File upload panel
// ---------------------------------------------------------------------------

interface FileUploadPanelProps {
  label: string;
  fileName: string | null;
  error: string | null;
  onFileChange: (file: File) => void;
}

function FileUploadPanel({ label, fileName, error, onFileChange }: FileUploadPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) onFileChange(file);
  }

  return (
    <section className="upload-panel">
      <h2 className="upload-label">{label}</h2>
      <div
        className={`drop-zone${error ? ' drop-zone-error' : ''}${fileName ? ' drop-zone-loaded' : ''}`}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
        role="button"
        tabIndex={0}
        aria-label={`Upload ${label} snapshot file`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".json,application/json"
          className="file-input-hidden"
          onChange={handleChange}
        />
        {fileName ? (
          <span className="drop-zone-filename">📄 {fileName}</span>
        ) : (
          <>
            <span className="drop-zone-icon">📂</span>
            <span className="drop-zone-text">Click to select a JSON snapshot file</span>
          </>
        )}
      </div>
      {error && <p className="error-message">⚠ {error}</p>}
    </section>
  );
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

interface SnapshotState {
  fileName: string;
  snapshot: CoveoSnapshot;
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

export default function App() {
  const [left, setLeft] = useState<SnapshotState | null>(null);
  const [right, setRight] = useState<SnapshotState | null>(null);
  const [leftError, setLeftError] = useState<string | null>(null);
  const [rightError, setRightError] = useState<string | null>(null);
  const [result, setResult] = useState<SnapshotComparisonResult | null>(null);

  async function handleFile(
    file: File,
    side: 'left' | 'right',
  ) {
    const setError = side === 'left' ? setLeftError : setRightError;
    const setState = side === 'left' ? setLeft : setRight;
    setError(null);
    setResult(null);

    try {
      const text = await readFileAsText(file);
      const parsed: unknown = JSON.parse(text);
      if (!isCoveoSnapshot(parsed)) {
        setError('File does not appear to be a Coveo organization snapshot (missing "resources" key).');
        setState(null);
        return;
      }
      setState({ fileName: file.name, snapshot: parsed });
    } catch {
      setError('Invalid JSON file — could not parse.');
      setState(null);
    }
  }

  function handleCompare() {
    if (!left || !right) return;
    setResult(compareSnapshots(left.snapshot, right.snapshot));
  }

  function handleLoadSample() {
    setLeft({ fileName: 'non-prod-sample.json', snapshot: SAMPLE_NON_PROD });
    setRight({ fileName: 'prod-sample.json', snapshot: SAMPLE_PROD });
    setLeftError(null);
    setRightError(null);
    setResult(null);
  }

  const leftLabel = left?.snapshot.orgId
    ? `Non-Prod (${left.snapshot.orgId})`
    : 'Non-Prod';
  const rightLabel = right?.snapshot.orgId
    ? `Prod (${right.snapshot.orgId})`
    : 'Prod';

  return (
    <div className="app">
      <header className="app-header">
        <h1>Coveo Org Diff</h1>
        <p className="subtitle">
          Upload two Coveo organization JSON snapshots to compare their
          configurations.
        </p>
      </header>

      <main className="app-main">
        <div className="upload-row">
          <FileUploadPanel
            label="Non-Prod Snapshot"
            fileName={left?.fileName ?? null}
            error={leftError}
            onFileChange={(f) => handleFile(f, 'left')}
          />
          <FileUploadPanel
            label="Prod Snapshot"
            fileName={right?.fileName ?? null}
            error={rightError}
            onFileChange={(f) => handleFile(f, 'right')}
          />
        </div>

        <div className="action-row">
          <button
            className="btn btn-primary"
            onClick={handleCompare}
            disabled={!left || !right}
          >
            Compare
          </button>
          <button className="btn btn-secondary" onClick={handleLoadSample}>
            Load sample data
          </button>
        </div>

        {result !== null && (
          <section className="diff-section">
            <h2 className="diff-section-title">Comparison Report</h2>
            <OrgDiffReport
              result={result}
              leftLabel={leftLabel}
              rightLabel={rightLabel}
            />
          </section>
        )}
      </main>

      <footer className="app-footer">
        <p>Coveo Org Diff — organization snapshot comparison tool</p>
      </footer>
    </div>
  );
}
