
import { useState } from "react";
import { createRoot } from "react-dom/client";

type MoodResult = {
  mood: string;
  tags: string[];
  energy: number;
  tempo: "slow" | "medium" | "fast";
};

function App() {
  const [mood, setMood] = useState("");
  const [result, setResult] = useState<MoodResult | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!mood.trim()) {
      setMessage("Tell us how you're feeling first.");
      setResult(null);
      return;
    }

    setLoading(true);
    setMessage("");
    setResult(null);

    try {
      const response = await fetch(
        "http://127.0.0.1:3000/api/moods/interpret",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ description: mood }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Something went wrong.");
      }

      setResult(data as MoodResult);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Couldn't connect to Resonance. Check that the backend and Ollama are running."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#101010",
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Inter, system-ui, sans-serif",
        padding: 24,
        boxSizing: "border-box",
      }}
    >
      <p style={{ color: "#1DB954", letterSpacing: 4, textAlign: "center" }}>
        YOUR PERSONAL MUSIC CURATOR
      </p>

      <h1 style={{ fontSize: "clamp(48px, 10vw, 88px)", margin: "12px 0" }}>
        Resonance.
      </h1>

      <p style={{ color: "#aaa", textAlign: "center" }}>
        Your feelings, translated into music.
      </p>

      <textarea
        value={mood}
        onChange={(event) => setMood(event.target.value)}
        placeholder="Describe how you're feeling..."
        style={{
          width: "min(100%, 500px)",
          minHeight: 120,
          marginTop: 32,
          padding: 18,
          borderRadius: 14,
          border: "1px solid #333",
          background: "#1a1a1a",
          color: "#fff",
          fontSize: 16,
          resize: "vertical",
          boxSizing: "border-box",
        }}
      />

      <button
        onClick={handleSubmit}
        disabled={loading}
        style={{
          marginTop: 16,
          padding: "14px 28px",
          borderRadius: 999,
          border: "none",
          background: loading ? "#777" : "#1DB954",
          color: "#000",
          fontSize: 16,
          fontWeight: 700,
          cursor: loading ? "wait" : "pointer",
        }}
      >
        {loading ? "Finding your sound..." : "Find my sound"}
      </button>

      {message && (
        <p role="alert" style={{ color: "#ff8585", marginTop: 20 }}>
          {message}
        </p>
      )}

      {result && (
        <section
          aria-live="polite"
          style={{
            width: "min(100%, 500px)",
            boxSizing: "border-box",
            marginTop: 32,
            padding: 24,
            border: "1px solid #303030",
            borderRadius: 18,
            background: "#181818",
          }}
        >
          <p style={{ color: "#1DB954", letterSpacing: 2, fontSize: 12 }}>
            YOUR MOOD, DECODED
          </p>

          <h2 style={{ fontSize: 32, margin: "8px 0 20px" }}>
            {result.mood}
          </h2>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {result.tags.map((tag) => (
              <span
                key={tag}
                style={{
                  padding: "8px 12px",
                  borderRadius: 999,
                  background: "#252525",
                  color: "#ddd",
                  fontSize: 14,
                }}
              >
                {tag}
              </span>
            ))}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 16,
              marginTop: 24,
            }}
          >
            <div>
              <p style={{ color: "#888", fontSize: 13 }}>ENERGY</p>
              <p style={{ fontSize: 20, margin: 0 }}>
                {result.energy}/5
              </p>
            </div>

            <div>
              <p style={{ color: "#888", fontSize: 13 }}>TEMPO</p>
              <p
                style={{
                  fontSize: 20,
                  margin: 0,
                  textTransform: "capitalize",
                }}
              >
                {result.tempo}
              </p>
            </div>
          </div>

          <p style={{ color: "#888", fontSize: 13, marginTop: 24 }}>
            Next up: matching your mood with music.
          </p>
        </section>
      )}
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
