
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import ollama from "ollama";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    message: "Resonance API is running!",
  });
});

app.post("/api/moods/interpret", async (req, res) => {
  const { description } = req.body;

  if (
    typeof description !== "string" ||
    !description.trim()
  ) {
    return res.status(400).json({
      error: "Please describe your mood.",
    });
  }

  try {
    const response = await ollama.chat({
      model: "llama3.2:3b",
      messages: [
        {
          role: "system",
          content: `You are Resonance, a music mood interpreter.
Analyze the user's description and return ONLY valid JSON with:
{
  "mood": "a short mood phrase",
  "tags": ["tag1", "tag2", "tag3"],
  "energy": 1,
  "tempo": "slow"
}
Use exactly 3 tags, an energy number from 1 to 5,
and tempo must be slow, medium, or fast.
Do not recommend specific songs.`
        },
        {
          role: "user",
          content: description.trim()
        }
      ],
      format: "json"
    });

    const interpretation = JSON.parse(response.message.content);

    return res.json(interpretation);
  } catch (error) {
    console.error("Mood interpretation failed:", error);

    return res.status(500).json({
      error: "Couldn't interpret your mood. Check that Ollama is running and the model is installed."
    });
  }
});

app.listen(PORT, "127.0.0.1", () => {
  console.log(`Resonance API running at http://127.0.0.1:${PORT}`);
});
