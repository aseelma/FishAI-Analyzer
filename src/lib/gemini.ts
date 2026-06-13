import { GoogleGenAI, Type } from "@google/genai";
import speciesData from "../constants/fish_species.json";

let aiInstance: any = null;

function getAI() {
  if (typeof window !== "undefined") {
    return null;
  }
  if (!aiInstance) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is required server-side.");
    }
    aiInstance = new GoogleGenAI({ apiKey: key });
  }
  return aiInstance;
}

export interface FishAnalysisResult {
  total_count: number;
  total_weight_kg: number;
  fish: Array<{
    species: string;
    family: string;
    group: string;
    count: number;
    confidence: number;
    estimated_length_cm: number;
    estimated_weight_kg: number;
    possible_species?: Array<{ name: string; confidence: number }>;
  }>;
}

export async function analyzeFishImage(imageData: string, mimeType: string, imageUrl?: string, groundTruthSpecies?: string): Promise<FishAnalysisResult> {
  // If running browser-side in React, delegate execution to the secure backend proxy
  if (typeof window !== "undefined") {
    const response = await fetch("/api/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image_url: imageUrl || (imageData.startsWith("http") ? imageData : undefined),
        imageUrl: imageUrl || (imageData.startsWith("http") ? imageData : undefined),
        image_data: !imageData.startsWith("http") ? imageData : undefined,
        mimeType,
        groundTruthSpecies
      }),
    });
    if (!response.ok) {
      const errRes = await response.json().catch(() => ({}));
      throw new Error(errRes.error || errRes.details || `Failed to analyze image (Status: ${response.status})`);
    }
    return response.json();
  }

  const allowedSpecies = speciesData.fish_species.join(", ");
  const allowedGroups = [
    "Tuna/tuna-like",
    "Reef fish",
    "Molluscs/crustaceans",
    "Large pelagics",
    "Shark/Rays",
    "Small pelagics"
  ];

  let groundTruthInstruction = "";
  if (groundTruthSpecies) {
    groundTruthInstruction = `
    
    CRITICAL GROUND-TRUTH RULES:
    The ground-truth Swahili/English species name identified in the Zanzibar study for this image is: "${groundTruthSpecies}".
    1. You MUST set the primary 'species' field to exactly "${groundTruthSpecies}".
    2. Do NOT assume counts or weights from the study. You MUST count the actual fish visible in the image and estimate dynamic lengths and weights visually.
    3. Since some study sheets had columns labeled "Other" due to dropdown limits, you must determine and assign the biologically correct family and group for ${groundTruthSpecies} using your rich scientific knowledge.
    `;
  }

  const response = await getAI().models.generateContent({
    model: "gemini-flash-latest",
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
          
          You are a professional Marine Biologist expert in Zanzibar & East African marine fisheries. 
          The user has reported issues regarding inaccurate family name assignments and unrealistic length/weight measurements, and incorrect "Other" classifications. You MUST fix this.
          
          ${groundTruthInstruction}
          
          TAXONOMY & SIZING RULES (Use this key to match species to their correct Families, Groups, and realistic biological sizes):
          - Kibua kawaida (Indian mackerel) -> Family: "Scombridae", Group: "Small pelagics", Length: 15-28cm, Weight: 0.15-0.35kg.
          - Nguru / Narrow-barred Spanish mackerel -> Family: "Scombridae", Group: "Large pelagics", Length: 40-120cm, Weight: 1.0-15.0kg.
          - Kawakawa (Mackerel tuna) -> Family: "Scombridae", Group: "Tuna/tuna-like", Length: 25-80cm, Weight: 0.8-7.0kg.
          - Yellowfin tuna / Skipjack tuna / Longtail tuna -> Family: "Scombridae", Group: "Tuna/tuna-like", Length: 45-150cm, Weight: 1.5-60.0kg.
          - Changu Nyazi / Spangled emperor / Sky emperor / Orange-striped emperor / Thumbprint emperor / Pink ear emperor / Slender emperor -> Family: "Lethrinidae", Group: "Reef fish", Length: 15-60cm, Weight: 0.15-4.5kg.
          - Chewa / Coral hind / Brownspotted grouper / Netfin grouper -> Family: "Serranidae", Group: "Reef fish", Length: 15-100cm, Weight: 0.2-15.0kg.
          - Kolekole / Kolekole kawaida / Bluefin trevally / Karambisi / African pompano / Brassy trevally -> Family: "Carangidae", Group: "Large pelagics", Length: 20-120cm, Weight: 0.3-30.0kg.
          - Pono / Parrotfish / Blue-barred parrotfish / Marbled parrotfish -> Family: "Scaridae", Group: "Reef fish", Length: 15-50cm, Weight: 0.2-3.0kg.
          - Janja / Mangrove red snapper / Emperor red snapper / Bigeye snapper / One-spot snapper -> Family: "Lutjanidae", Group: "Reef fish", Length: 15-80cm, Weight: 0.2-9.0kg.
          - Great barracuda / Pickhandle barracuda -> Family: "Sphyraenidae", Group: "Large pelagics", Length: 40-140cm, Weight: 1.0-15.0kg.
          - Obtuse barracuda -> Family: "Sphyraenidae", Group: "Small pelagics", Length: 15-30cm, Weight: 0.1-0.4kg.
          - Pweza / Big blue octopus / Octopus -> Family: "Octopodidae", Group: "Molluscs/crustaceans", Length: 30-90cm, Weight: 0.5-5.0kg.
          - Ngisi / Common squid -> Family: "Loliginidae", Group: "Molluscs/crustaceans", Length: 15-70cm, Weight: 0.2-1.5kg.
          - Cuttlefish -> Family: "Sepiidae", Group: "Molluscs/crustaceans", Length: 15-50cm, Weight: 0.3-2.0kg.
          - Barred moray / Indian white-spotted moray -> Family: "Muraenidae", Group: "Reef fish", Length: 50-100cm, Weight: 0.5-3.0kg.
          - Blue and gold fusilier -> Family: "Caesionidae", Group: "Reef fish", Length: 15-30cm, Weight: 0.15-0.5kg.
          - Common silver-biddy -> Family: "Gerreidae", Group: "Reef fish", Length: 10-25cm, Weight: 0.1-0.35kg.
          - Convict surgeonfish -> Family: "Acanthuridae", Group: "Reef fish", Length: 15-40cm, Weight: 0.15-0.5kg.
          - Dorab wolf-herring -> Family: "Chirocentridae", Group: "Small pelagics", Length: 30-100cm, Weight: 0.3-3.0kg.
          - Flathead locust lobster -> Family: "Scyllaridae", Group: "Molluscs/crustaceans", Length: 15-20cm, Weight: 0.15-0.4kg.
          - Goldstripe sardinella -> Family: "Clupeidae", Group: "Small pelagics", Length: 8-18cm, Weight: 0.01-0.08kg.
          - Honeycomb stingray / Ribbontail stingray -> Family: "Dasyatidae", Group: "Shark/Rays", Length: 30-120cm, Weight: 1.5-18.0kg.
          - Zanzibar guitarfish -> Family: "Rhinobatidae", Group: "Shark/Rays", Length: 40-100cm, Weight: 1.0-9.0kg.
          - Sea catfish -> Family: "Ariidae", Group: "Reef fish", Length: 20-80cm, Weight: 0.2-6.5kg.
          
          BIOLOGICAL SPECIES RESOLUTION KEY (For "Other" group rows, you MUST use the correct specific biological group and family. Do not use unclassfied family or generic empty groups):
          - Kufi -> Family: "Siganidae" (Rabbitfish), Group: "Reef fish"
          - Baramamba -> Family: "Lethrinidae" (Emperors) or "Lutjanidae" (Snappers), Group: "Reef fish"
          - Bawe -> Family: "Balistidae" (Triggerfishes) or "Acanthuridae" (Surgeonfishes), Group: "Reef fish"
          - Banahare -> Family: "Mullidae" (Goatfishes), Group: "Reef fish"
          - Bubla -> Family: "Kyphosidae" (Sea chubs), Group: "Reef fish"
          - Chandaza -> Family: "Gerreidae" (Mojarras/Silver-biddies), Group: "Reef fish"
          - Changu Nyazi -> Family: "Lethrinidae" (Emperors), Group: "Reef fish"
          - Chewa / Tobwe -> Family: "Serranidae" (Groupers), Group: "Reef fish"
          - Fatundu -> Family: "Lutjanidae" (Snappers), Group: "Reef fish"
          - Gingeurembo / Komba / Mrongo -> Family: "Haemulidae" (Grunts/Sweetlips), Group: "Reef fish"
          - Gombo / Kande / Kande sharifu / Kikande / Sleek unicornfish -> Family: "Acanthuridae" (Surgeonfishes), Group: "Reef fish"
          - Janja / Heria mboga / Paramamba -> Family: "Lutjanidae" (Snappers), Group: "Reef fish"
          - Koana / Mchonwe -> Family: "Mullidae" (Goatfishes), Group: "Reef fish"
          - Karambisi / Kolekole / Kolekole kawaida / Kona / African pompano / Brassy trevally -> Family: "Carangidae" (Jacks/Trevallys), Group: "Large pelagics"
          - Kibua kawaida -> Family: "Scombridae" (Mackerels/Tunas), Group: "Small pelagics"
          - Mboo ya mvuvi -> Family: "Fistulariidae" (Cornetfishes), Group: "Reef fish"
          - Mdungi -> Family: "Holocentridae" (Soldierfishes/Squirrelfishes), Group: "Reef fish"
          - Mishe / Moran / Morani -> Family: "Lethrinidae" (Emperors), Group: "Reef fish"
          - Mkunga -> Family: "Muraenidae" (Moray eels), Group: "Reef fish"
          - Ngisi -> Family: "Loliginidae" (Squids), Group: "Molluscs/crustaceans"
          - Nguru -> Family: "Scombridae" (Mackerels), Group: "Large pelagics"
          - Nungu -> Family: "Diodontidae" (Porcupinefishes), Group: "Reef fish"
          - Nyangusi / Scalloped spiny lobster -> Family: "Palinuridae" (Spiny lobsters), Group: "Molluscs/crustaceans"
          - Papa Joza -> Family: "Carcharhinidae" (Requiem sharks) or "Triakidae", Group: "Shark/Rays"
          - Paragunda -> Family: "Sphyraenidae" (Barracudas), Group: "Large pelagics"
          - Pono -> Family: "Scaridae" (Parrotfishes), Group: "Reef fish"
          - Pope -> Family: "Tetraodontidae" (Pufferfishes), Group: "Reef fish"
          - Pweza -> Family: "Octopodidae" (Octopuses), Group: "Molluscs/crustaceans"
          - Sasare -> Family: "Belonidae" (Needlefishes), Group: "Large pelagics"
          - Songoro -> Family: "Rachycentridae" (Cobias), Group: "Large pelagics"
          - Sumeno -> Family: "Sphyraenidae" or "Pristidae", Group: "Large pelagics"
          - Taa pungu -> Family: "Myliobatidae" (Eagle rays), Group: "Shark/Rays"
          
          BIOLOGICAL RATIO CALCULATION RULE:
          The weight MUST scale cubically or realistically with the length of the fish. 
          A tiny or medium fish CANNOT weigh an absurd amount, and a huge fish cannot weigh a tiny fraction.
          For example:
          - A 20-25cm fish (e.g. Kibua kawaida, Janja, Small Snappers) typically weighs between 0.15kg to 0.4kg. NEVER output several kilograms for a 20cm fish!
          - A 50cm fish of deep body shape (snapper, emperor, grouper) typically weighs around 1.5kg to 3.5kg.
          - A 100cm large fish (Tuna, Marlin, Barracuda, large Trevally) typically weighs 10.0kg to 25.0kg.
          Double-check that the estimated_weight_kg aligns perfectly with estimated_length_cm biology before outputting!
          
          CRITICAL INSTRUCTION: 
          Users are reporting that your primary identification is often less accurate than your secondary suggestions.
          YOU MUST FIX THIS. 
          Step-by-Step Verification:
          1. Analyze the fish features (tail, fins, mouth, spots, stripes).
          2. Find all matching candidates in the allowed list: [${allowedSpecies}].
          3. Perform a side-by-side comparison.
          4. PROMOTING THE TRUTH: The absolute most accurate species MUST be in the primary 'species' field. 
          5. If you have any doubt, pick the biologically closest relative from the list as primary.
          
          GROUPING INSTRUCTION:
          If you see multiple fish of the same species, YOU MUST GROUP THEM into a single object in the 'fish' array and set the 'count' field. 
          For example, if there are 38 identical fish, return ONE object for that species with "count": 38.
          All measurement fields (length, weight) in the 'fish' array should be PER INDIVIDUAL fish in that group.
          
          1. COUNT: Count every individual fish precisely from looking at the image pixels. The 'total_count' MUST BE the sum of all 'count' fields.
          2. WEIGHT: The 'total_weight_kg' MUST BE the sum of all fish weights (count * individual_weight).
          3. SPECIES: Use the EXACT name from the list for the 'species' field. 
              - DO NOT hallucinate names. Only use strings from the provided list.
              - CRITICAL: The 'name' field in 'possible_species' MUST ONLY contain a species name from the list. NEVER include words like "Confidence", "number", "Value", or any technical descriptions.
              - STRING LIMIT: Each 'species' and 'name' MUST BE UNDER 64 CHARACTERS. 
              - NO REPETITION: Do not repeat words or names within a field (e.g., no "tuna tuna tuna").
              - ALWAYS provide 3-5 alternative species in the 'possible_species' list, sorted by likelihood.
          4. CATEGORIES: Identify the Family and Group. Group MUST be one of: ${allowedGroups.join(", ")}.
          
          Return ONLY this JSON structure (with NO markdown comments inside):
          {
            "total_count": 5,
            "total_weight_kg": 1.75,
            "fish": [
              {
                "species": "Exact name from the list",
                "family": "Scientific family",
                "group": "Group name",
                "count": 5,
                "confidence": 0.95,
                "estimated_length_cm": 25.5,
                "estimated_weight_kg": 0.35,
                "possible_species": [{"name": "Name from list", "confidence": 0.85}]
              }
            ]
          }`,
        },
      ],
    },
    config: {
      responseMimeType: "application/json",
      maxOutputTokens: 2048,
      temperature: 0.1,
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
                count: { type: Type.NUMBER },
                confidence: { type: Type.NUMBER },
                estimated_length_cm: { type: Type.NUMBER },
                estimated_weight_kg: { type: Type.NUMBER },
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
              required: ["species", "family", "group", "count", "confidence", "estimated_length_cm", "estimated_weight_kg"],
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
