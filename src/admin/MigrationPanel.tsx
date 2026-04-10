/**
 * MigrationPanel — Admin UI for running Firestore collection migrations.
 *
 * Mount this temporarily at a protected route (admin-only).
 * Remove or gate behind FEATURE_FLAGS after migrations are complete.
 *
 * Usage:
 *   <Route path="/admin/migrate" element={<MigrationPanel />} />
 *
 * Only the admin email (j.vandenbol@gmail.com) can trigger live writes.
 * Everyone else sees read-only dry-run output.
 */

import React, { useState } from 'react';
import { runUserMigration } from './migrateUsers';
import { migrateAll, CollectionMigrationResult } from './migrateCollections';
import { useAuth } from '../App';

const ADMIN_EMAIL = 'j.vandenbol@gmail.com';

interface RunResult {
  label: string;
  dryRun: boolean;
  results: CollectionMigrationResult[];
  usersResult?: Awaited<ReturnType<typeof runUserMigration>>;
  error?: string;
  durationMs: number;
}

function ResultRow({ r }: { r: CollectionMigrationResult }) {
  return (
    <div className="bg-surface-soft rounded-lg p-3 space-y-1 text-xs font-mono">
      <div className="flex items-center justify-between">
        <span className="font-bold text-text-primary">{r.collection}</span>
        <div className="flex gap-3 text-text-muted">
          <span>total: <span className="text-text-primary">{r.total}</span></span>
          <span>patched: <span className="text-brand">{r.patched}</span></span>
          <span>skipped: <span className="text-text-secondary">{r.skipped}</span></span>
          {r.errors.length > 0 && (
            <span>errors: <span className="text-red-400">{r.errors.length}</span></span>
          )}
        </div>
      </div>
      {r.errors.length > 0 && (
        <ul className="text-red-400 space-y-0.5 pl-2 border-l border-red-500/30">
          {r.errors.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function MigrationPanel() {
  const { user } = useAuth();
  const isAdmin = user?.email === ADMIN_EMAIL;

  const [running, setRunning] = useState(false);
  const [history, setHistory] = useState<RunResult[]>([]);

  const run = async (dryRun: boolean) => {
    if (running) return;
    setRunning(true);

    const label = dryRun ? 'Dry run' : 'LIVE WRITE';
    const t0 = Date.now();

    try {
      // Users
      const usersResult = await runUserMigration(dryRun);

      // Catches + Sessions + Spots
      const results = await migrateAll(dryRun);

      setHistory((prev) => [
        {
          label,
          dryRun,
          results,
          usersResult,
          durationMs: Date.now() - t0,
        },
        ...prev,
      ]);
    } catch (err: any) {
      setHistory((prev) => [
        {
          label,
          dryRun,
          results: [],
          error: err?.message || String(err),
          durationMs: Date.now() - t0,
        },
        ...prev,
      ]);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-main text-text-primary p-4 md:p-8 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight">Migration Panel</h1>
        <p className="text-xs text-text-muted mt-1">
          Normalizes migrated Flutter documents in{' '}
          <code>users</code>, <code>catches_v2</code>, <code>sessions_v2</code>, <code>spots_v2</code>.
        </p>
      </div>

      {!isAdmin && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 text-xs text-yellow-300">
          Read-only mode — you are not the admin. Dry runs only.
        </div>
      )}

      <div className="flex gap-3 flex-wrap">
        <button
          onClick={() => run(true)}
          disabled={running}
          className="px-5 py-2.5 rounded-xl bg-surface-card border border-border-subtle text-sm font-bold hover:border-brand/40 disabled:opacity-50 transition-all"
        >
          {running ? 'Running…' : 'Dry Run (preview only)'}
        </button>

        {isAdmin && (
          <button
            onClick={() => {
              if (window.confirm('This will write to Firestore. Are you sure?')) {
                run(false);
              }
            }}
            disabled={running}
            className="px-5 py-2.5 rounded-xl bg-brand/20 border border-brand/40 text-brand text-sm font-bold hover:bg-brand/30 disabled:opacity-50 transition-all"
          >
            Live Write (permanent)
          </button>
        )}
      </div>

      {/* Results */}
      {history.map((run, idx) => (
        <div key={idx} className="space-y-3 border border-border-subtle rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className={`text-sm font-bold ${run.dryRun ? 'text-text-muted' : 'text-brand'}`}>
              {run.label}
            </span>
            <span className="text-xs text-text-muted">{run.durationMs}ms</span>
          </div>

          {run.error && (
            <div className="text-red-400 text-xs font-mono bg-red-500/10 rounded p-3">
              {run.error}
            </div>
          )}

          {/* Users result */}
          {run.usersResult && (
            <div className="bg-surface-soft rounded-lg p-3 space-y-1 text-xs font-mono">
              <div className="flex items-center justify-between">
                <span className="font-bold text-text-primary">users</span>
                <div className="flex gap-3 text-text-muted">
                  <span>total: <span className="text-text-primary">{run.usersResult.total}</span></span>
                  <span>patched: <span className="text-brand">{run.usersResult.patched}</span></span>
                  <span>skipped: <span className="text-text-secondary">{run.usersResult.skipped}</span></span>
                </div>
              </div>
            </div>
          )}

          {run.results.map((r) => (
            <ResultRow key={r.collection} r={r} />
          ))}
        </div>
      ))}

      {history.length === 0 && (
        <p className="text-xs text-text-muted">No runs yet. Click Dry Run to preview.</p>
      )}
    </div>
  );
}
