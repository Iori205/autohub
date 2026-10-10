/** Shown while data loads (SSR / first paint, and later while the API responds). */
export function PageSkeleton({ kpis = true }: { kpis?: boolean }) {
  return (
    <div className="stack" aria-busy="true" aria-label="Ачаалж байна">
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 2 }}>
        <div className="sk flat" style={{ width: 140, height: 10 }} />
        <div className="sk" style={{ width: 220, height: 22 }} />
        <div className="sk flat" style={{ width: 320, height: 10 }} />
      </div>
      {kpis && (
        <div className="kpis">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="panel" style={{ height: 106, padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
              <div className="sk" style={{ width: "40%", height: 10 }} />
              <div className="sk" style={{ width: "62%", height: 20 }} />
              <div className="sk flat" style={{ width: "30%", height: 10 }} />
            </div>
          ))}
        </div>
      )}
      <div className="panel" style={{ padding: "4px 16px" }}>
        {[62, 48, 70, 55, 66, 40, 58, 50].map((w, i) => (
          <div key={i} style={{ display: "flex", gap: 18, alignItems: "center", height: 44, borderBottom: "1px solid var(--divider)" }}>
            <div className="sk flat" style={{ width: 15, height: 15 }} />
            <div className="sk flat" style={{ width: 70, height: 10 }} />
            <div className="sk" style={{ flex: 1, maxWidth: `${w}%`, height: 10 }} />
            <div className="sk flat" style={{ marginLeft: "auto", width: 90, height: 10 }} />
            <div className="sk flat" style={{ width: 76, height: 20, borderRadius: 10 }} />
          </div>
        ))}
      </div>
    </div>
  );
}
