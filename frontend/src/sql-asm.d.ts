// sql.js's pure-JS (asm.js) build ships no types; the default export is the
// initSqlJs factory. We only use a small surface (see src/lib/sqldb.ts).
declare module "sql.js/dist/sql-asm.js" {
  interface SqlJsStatic {
    Database: new (data?: ArrayLike<number> | Buffer | null) => unknown;
  }
  const initSqlJs: (config?: Record<string, unknown>) => Promise<SqlJsStatic>;
  export default initSqlJs;
}
