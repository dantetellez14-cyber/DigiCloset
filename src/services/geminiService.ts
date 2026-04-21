import { GoogleGenAI, Type } from "@google/genai";
import { ClosetItem, Category } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function generateOutfitSuggestion(
  closet: ClosetItem[],
  mood?: string,
  occasion?: string,
  weather?: string
) {
  const model = "gemini-3-flash-preview";
  
  const closetSummary = closet.map(item => ({
    id: item.id,
    name: item.name,
    category: item.category,
    color: item.color
  }));

  const prompt = `
    You are a professional fashion stylist for a "girly, aesthetic" app called Digi-Closet.
    Based on the following closet items, suggest 3 stylish outfits.
    
    Context:
    Mood: ${mood || 'Any'}
    Occasion: ${occasion || 'Any'}
    Weather: ${weather || 'Any'}
    
    Closet Items:
    ${JSON.stringify(closetSummary)}
    
    Return the response as a JSON array of outfit objects.
    Each outfit object should have:
    - name: A cute, creative name for the outfit.
    - itemIds: An array of IDs from the closet items provided.
    - description: A brief explanation of why this outfit works.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              itemIds: { 
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              description: { type: Type.STRING }
            },
            required: ["name", "itemIds", "description"]
          }
        }
      }
    });
    return JSON.parse(response.text || "[]");
  } catch (error) {
    console.error("Error generating outfit:", error);
    return [];
  }
}

export async function chatWithStylist(
  closet: ClosetItem[],
  messages: { role: 'user' | 'model'; text: string }[]
) {
  const model = "gemini-3-flash-preview";
  
  const closetSummary = closet.map(item => ({
    id: item.id,
    name: item.name,
    category: item.category,
    color: item.color
  }));

  const systemInstruction = `
    You are a high-end fashion concierge for "Digi-Closet", a chique, baby-pink aesthetic app.
    Your tone is professional, sophisticated, and helpful (like a personal stylist in a luxury boutique).
    
    You have access to the user's closet:
    ${JSON.stringify(closetSummary)}
    
    When asked to recommend something to compliment an outfit, look at the available items in the closet.
    When asked to create a new outfit, suggest a combination of items from the closet.
    
    If you suggest specific items, mention them by name.
    Keep your responses concise but elegant.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: messages.map(m => ({ role: m.role, parts: [{ text: m.text }] })),
      config: {
        systemInstruction,
      }
    });

    return response.text || "I apologize, I couldn't curate a response at this moment.";
  } catch (error) {
    console.error("Error in stylist chat:", error);
    return "The atelier is currently busy. Please try again shortly.";
  }
}

export async function generateImage(prompt: string): Promise<string | null> {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            text: `A high-quality, professional fashion product photo of: ${prompt}. Minimalist aesthetic, clean white background, studio lighting.`,
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: "3:4",
        },
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (error) {
    console.error("Error generating image:", error);
    return null;
  }
}
