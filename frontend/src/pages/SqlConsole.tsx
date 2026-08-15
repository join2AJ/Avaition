import { useEffect, useMemo, useRef, useState } from "react";
import { Play, RotateCcw, Table2, TerminalSquare, AlertTriangle, Check } from "lucide-react";
import { runSql, resetDb, TABLE_NAMES, type QueryResult } from "@/lib/sqldb";

const EXAMPLES: { label: string; sql: string }[] = [
  { label: "Read", sql: "SELECT id, name, category, status, strength\nFROM entities\nORDER BY strength DESC;" },
  { label: "Create", sql: "INSERT INTO entities (id, name, category, status, strength, contract_start, contract_end, aop_linked, approval_stage, created_at)\nVALUES ('ENT-99', 'New Ground Services', 'GHA', 'active', 24, '2026-01-01', '2028-12-31', 1, 'bcas_approved', '2026-08-14');" },
  { label: "Update", sql: "UPDATE entities\nSET status = 'suspended'\nWHERE id = 'ENT-99';" },
  { label: "Delete", sql: "DELETE FROM entities\nWHERE id = 'ENT-99';" },
  { label: "Join", sql: "SELECT a.id, a.pillar_key, e.name AS entity, a.status\nFROM applications a\nJOIN entities e ON e.id = a.entity_id\nORDER BY a.created_at DESC\nLIMIT 20;" },
  { label: "RBAC matrix", sql: "SELECT role_key, vertical, can_create c, can_read r, can_update u, can_delete d\nFROM role_permissions\nWHERE role_key = 'operator';" },
];

export default function SqlConsole() {
  const [sql, setSql] = useState(EXAMPLES[0].sql);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  // Warm the engine on mount so the first query isn't slow.
  useEffect(() => { runSql("SELECT 1;").then(() => setReady(true)).catch(() => setReady(true)); }, []);

  const run = async () => {
    if (busy) return;
    setBusy(true); setError(null); setNotice(null);
    try {
      const r = await runSql(sql);
      setResult(r);
      if (!/^(SELECT|PRAGMA|WITH|EXPLAIN)/i.test(sql.trim())) {
        setNotice(`${r.command} OK — ${r.rowsAffected} row${r.rowsAffected === 1 ? "" : "s"} affected · ${r.elapsedMs.toFixed(1)} ms`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const pickTable = (t: string) => { setSql(`SELECT * FROM ${t}\nLIMIT 50;`); setTimeout(run, 0); taRef.current?.focus(); };

  const onKey = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); run(); }
  };

  const reset = async () => {
    setBusy(true); setError(null);
    await resetDb();
    setNotice("Database reset to seeded demo data.");
    setResult(null);
    setBusy(false);
  };

  const tables = useMemo(() => TABLE_NAMES, []);

  return (
    <div className="sql-page">
      <header className="sql-head">
        <div className="db-title">
          <span className="db-mark"><TerminalSquare size={20} /></span>
          <div>
            <h1>SQL console <span className="sql-badge">Super Admin</span></h1>
            <p className="muted">Run real SQL (SELECT · INSERT · UPDATE · DELETE) against a live in-browser SQLite seeded from the 42-table schema. Changes persist for your session. <b>⌘/Ctrl + Enter</b> to run.</p>
          </div>
        </div>
        <button className="btn btn-ghost sql-reset" onClick={reset} disabled={busy}><RotateCcw size={14} /> Reset data</button>
      </header>

      <div className="sql-layout">
        <aside className="sql-tables card">
          <div className="sql-tables-h"><Table2 size={13} /> Tables <span className="muted">· {tables.length}</span></div>
          <div className="sql-tables-list">
            {tables.map((t) => (
              <button key={t} className="sql-tbtn" onClick={() => pickTable(t)}><code>{t}</code></button>
            ))}
          </div>
        </aside>

        <div className="sql-main">
          <div className="sql-examples">
            {EXAMPLES.map((ex) => (
              <button key={ex.label} className="chip" onClick={() => setSql(ex.sql)}>{ex.label}</button>
            ))}
          </div>

          <textarea
            ref={taRef}
            className="sql-input mono"
            value={sql}
            spellCheck={false}
            onChange={(e) => setSql(e.target.value)}
            onKeyDown={onKey}
            rows={7}
          />

          <div className="sql-actions">
            <button className="btn btn-brand" onClick={run} disabled={busy || !ready}>
              <Play size={14} /> {busy ? "Running…" : ready ? "Run" : "Loading engine…"}
            </button>
            {notice && <span className="sql-ok"><Check size={14} /> {notice}</span>}
            {error && <span className="sql-err"><AlertTriangle size={14} /> {error}</span>}
          </div>

          {result && result.columns.length > 0 && (
            <div className="sql-result card">
              <div className="sql-result-h muted">{result.rows.length} row{result.rows.length === 1 ? "" : "s"} · {result.elapsedMs.toFixed(1)} ms</div>
              <div className="sql-grid-wrap">
                <table className="sql-grid">
                  <thead>
                    <tr>{result.columns.map((c) => <th key={c}>{c}</th>)}</tr>
                  </thead>
                  <tbody>
                    {result.rows.map((row, i) => (
                      <tr key={i}>{row.map((cell, j) => <td key={j}>{cell === null ? <span className="sql-null">NULL</span> : String(cell)}</td>)}</tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {result && result.columns.length === 0 && !error && (
            <div className="sql-result card sql-empty muted">Statement executed — no rows returned.</div>
          )}
        </div>
      </div>

      <p className="db-foot mono">
        Sandbox: a client-side SQLite (sql.js, pure-JS build) seeded from demo data — edits are local to your browser session and reset with the button above.
        In production this same console proxies SQL to the FastAPI backend on PostgreSQL, gated by the Super-Admin role and audit-logged.
      </p>
    </div>
  );
}
