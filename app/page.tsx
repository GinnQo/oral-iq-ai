export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "48px",
        fontFamily: "Arial, Helvetica, sans-serif",
        background: "#f8fafc",
      }}
    >
      <div
        style={{
          maxWidth: "900px",
          margin: "0 auto",
          padding: "40px",
          background: "#ffffff",
          borderRadius: "18px",
          boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)",
        }}
      >
        <h1 style={{ marginBottom: "12px", fontSize: "36px" }}>
          OralIQ AI
        </h1>

        <p
          style={{
            marginBottom: "28px",
            fontSize: "18px",
            color: "#475569",
          }}
        >
          AI-assisted oral presentation assessment for teachers and students.
        </p>

        <a
          href="/presentation-grader"
          style={{
            display: "inline-block",
            padding: "14px 22px",
            borderRadius: "10px",
            background: "#0f172a",
            color: "#ffffff",
            textDecoration: "none",
            fontWeight: 700,
          }}
        >
          Open Presentation Grader
        </a>
      </div>
    </main>
  );
}
