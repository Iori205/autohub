import Link from "next/link";

export default function NotFound() {
  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, textAlign: "center" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>
        <span className="mono faint" style={{ fontSize: 40, fontWeight: 600 }}>404</span>
        <strong style={{ fontSize: 16 }}>Хуудас олдсонгүй</strong>
        <p className="muted" style={{ margin: 0 }}>Таны хайсан хуудас байхгүй эсвэл зөөгдсөн байна.</p>
        <Link href="/" className="btn primary" style={{ marginTop: 6 }}>
          Хянах самбар руу буцах
        </Link>
      </div>
    </div>
  );
}
