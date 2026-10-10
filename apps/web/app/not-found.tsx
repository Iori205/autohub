import Link from "next/link";

export default function NotFound() {
  return (
    <main className="container" style={{ paddingTop: 60 }}>
      <div
        style={{
          padding: "72px 20px",
          textAlign: "center",
          border: "1px dashed var(--line2)",
          borderRadius: "var(--r-xl)",
        }}
      >
        <div className="page-title" style={{ marginBottom: 16 }}>
          404
        </div>
        <Link href="/" className="btn btn-primary">
          Нүүр
        </Link>
      </div>
    </main>
  );
}
