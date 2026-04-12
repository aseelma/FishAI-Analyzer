import { GoogleGenAI, Type } from "@google/genai";
import speciesData from "../constants/fish_species.json";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface FishAnalysisResult {
  total_count: number;
  total_weight_kg: number;
  fish: Array<{
    species: string;
    family: string;
    group: string;
    confidence: number;
    estimated_length_cm: number;
    estimated_weight_kg: number;
    bounding_box?: [number, number, number, number]; // [ymin, xmin, ymax, xmax]
    possible_species?: Array<{ name: string; confidence: number }>;
  }>;
}

export async function analyzeFishImage(imageData: string, mimeType: string): Promise<FishAnalysisResult> {
  const allowedSpecies = speciesData.fish_species.join(", ");
  const allowedGroups = [
    "Tuna/tuna-like",
    "Reef fish",
    "Molluscs/crustaceans",
    "Large pelagics",
    "Shark/Rays",
    "Small pelagics"
  ];

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: {
      parts: [
        {
          inlineData: {
            mimeType,
            data: imageData,
          },
        },
        {
          text: `Identify and count every single fish in this image with extreme biological accuracy.
          
          CRITICAL INSTRUCTION: 
          Users have reported that the correct species often appears in your 'possible_species' list instead of the primary 'species' field. 
          You MUST re-evaluate your top choice. Before finalizing, compare your primary candidate with the alternatives. If an alternative fits the visual evidence better, promote it to the primary 'species' field.
          
          1. COUNT: Count every individual fish precisely. The 'total_count' must match the number of fish you find.
          2. SPECIES: For each fish, you MUST pick the EXACT name from this list: [${allowedSpecies}]. 
             - Examine body shape, fin patterns, and specific markings (spots, stripes).
             - If a fish is not exactly in the list, you MUST choose the closest biological match from the list.
             - CRITICAL: The 'name' field in 'possible_species' MUST ONLY contain a species name from the list. NEVER include words like "Confidence", "number", "Value", or any technical descriptions.
          3. CATEGORIES: Identify the Family and Group. Group MUST be one of: ${allowedGroups.join(", ")}.
          
          Return ONLY this JSON structure:
          {
            "total_count": number,
            "total_weight_kg": number,
            "fish": [
              {
                "species": "Exact name from the list",
                "family": "Scientific family",
                "group": "Group name",
                "confidence": number (0-1),
                "estimated_length_cm": number,
                "estimated_weight_kg": number,
                "bounding_box": [ymin, xmin, ymax, xmax],
                "possible_species": [{"name": "Name from list", "confidence": number}]
              }
            ]
          }`,
        },
      ],
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          total_count: { type: Type.NUMBER },
          total_weight_kg: { type: Type.NUMBER },
          fish: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                species: { type: Type.STRING },
                family: { type: Type.STRING },
                group: { 
                  type: Type.STRING,
                  enum: allowedGroups
                },
                confidence: { type: Type.NUMBER },
                estimated_length_cm: { type: Type.NUMBER },
                estimated_weight_kg: { type: Type.NUMBER },
                bounding_box: {
                  type: Type.ARRAY,
                  items: { type: Type.NUMBER },
                },
                possible_species: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                      confidence: { type: Type.NUMBER },
                    },
                  },
                },
              },
              required: ["species", "family", "group", "confidence", "estimated_length_cm", "estimated_weight_kg"],
            },
          },
        },
        required: ["total_count", "total_weight_kg", "fish"],
      },
    },
  });

  const text = response.text;
  try {
    return JSON.parse(text);
  } catch (e) {
    console.error("Failed to parse AI response as JSON:", text);
    
    // Attempt to fix common truncation issues (unterminated strings or objects)
    let fixedText = text.trim();
    
    // If it ends with a partial string or property, try to close it
    if (fixedText.endsWith('"')) {
      // Might be a truncated string value
    }
    
    // Basic recovery: find the last complete object in the array if possible
    // or just throw a more descriptive error
    throw new Error(`AI returned malformed JSON: ${e instanceof Error ? e.message : 'Unknown error'}`);
  }
}
