import { Note } from "../types";

/**
 * 初始化 Gemini AI 客户端
 * 使用动态导入以避免浏览器环境中的 require 错误
 */
let aiInstance: any = null;

const getAIInstance = async () => {
  if (!aiInstance) {
    const { GoogleGenAI } = await import("@google/genai");
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY || process.env.API_KEY;
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
};

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
    const ai = await getAIInstance();
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