import { GoogleGenAI } from "@google/genai";
import { Note } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const summarizeNotes = async (notes: Note[]): Promise<string> => {
  if (notes.length === 0) return "No notes to summarize.";

  const notesText = notes.map(n => {
    const timeStr = new Date(n.timestamp).toISOString().substr(11, 8); // HH:MM:SS approx
    return `[${timeStr}] ${n.text}`;
  }).join("\n");

  const prompt = `
    You are an expert meeting assistant. 
    Review the following timestamped notes taken during a recording.
    Please provide a concise summary of the key points, action items, and a structured meeting minute.
    
    Notes:
    ${notesText}
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: "Format the output using Markdown. Be professional and concise.",
      }
    });
    return response.text || "Could not generate summary.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Error generating summary. Please check your API key.";
  }
};