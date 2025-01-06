// Change from require to import
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { ChatOpenAI } from "@langchain/openai";
import pRetry from "p-retry";  // Use import syntax for p-retry

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const chatModel = new ChatOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Retry logic function using p-retry library
const summarizeWithRetry = async (text, attempt = 1) => {
  try {
    const response = await chatModel.invoke(
      `Summarize the following text:\n\n${text}`
    );
    return response.content;
  } catch (error) {
    if (error.response && error.response.status === 429 && attempt < 5) {
      const delay = Math.pow(2, attempt) * 1000;  // Exponential backoff
      console.log(`Rate limit exceeded. Retrying in ${delay / 1000}s...`);
      await new Promise((resolve) => setTimeout(resolve, delay));  // Wait before retrying
      return summarizeWithRetry(text, attempt + 1);  // Retry
    } else {
      throw error;  // Rethrow if error is not 429 or max attempts exceeded
    }
  }
};

app.post("/summarize", async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: "Text is required for summarization." });
    }

    const summary = await summarizeWithRetry(text);  // Call the retry function
    res.json({ summary });
  } catch (error) {
    console.error("Error summarizing text:", error);
    res.status(500).json({ error: "Failed to summarize the text." });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
