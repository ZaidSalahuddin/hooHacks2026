import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

const visionModel = genAI.getGenerativeModel({
  model: "gemini-2.0-flash",
  generationConfig: { responseMimeType: "application/json" },
});

const searchModel = genAI.getGenerativeModel({
  model: "gemini-2.0-flash",
  tools: [{ googleSearch: {} }],
});

function extractJSON(text) {
  // Strip markdown code fences
  let cleaned = text.replace(/```(?:json)?\s*/gi, "").replace(/```\s*/g, "").trim();

  // Try parsing directly
  try {
    return JSON.parse(cleaned);
  } catch {
    // Fall back: find the first { or [ and match to its closing bracket
    const startObj = cleaned.indexOf("{");
    const startArr = cleaned.indexOf("[");
    let start = -1;
    let open, close;

    if (startObj === -1 && startArr === -1) throw new Error("No JSON found in response");

    if (startArr === -1 || (startObj !== -1 && startObj < startArr)) {
      start = startObj;
      open = "{";
      close = "}";
    } else {
      start = startArr;
      open = "[";
      close = "]";
    }

    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let i = start; i < cleaned.length; i++) {
      const ch = cleaned[i];
      if (escaped) { escaped = false; continue; }
      if (ch === "\\") { escaped = true; continue; }
      if (ch === '"') { inString = !inString; continue; }
      if (inString) continue;
      if (ch === open) depth++;
      if (ch === close) depth--;
      if (depth === 0) {
        return JSON.parse(cleaned.slice(start, i + 1));
      }
    }

    throw new Error("Could not parse JSON from response");
  }
}

export async function analyzeProductImage(imageBase64, mimeType = "image/jpeg") {
  const prompt = `You are a sustainability and ingredient analysis assistant.

Given the product image provided:
1. Identify the product name and brand
2. Extract the complete ingredients list exactly as printed

Respond with this JSON schema:
{
  "product_name": "string",
  "brand": "string",
  "ingredients": ["string"]
}`;

  const result = await visionModel.generateContent([
    prompt,
    {
      inlineData: {
        mimeType,
        data: imageBase64,
      },
    },
  ]);

  return extractJSON(result.response.text());
}

export async function analyzeProduct(brand, ingredients) {
  const ingredientList = ingredients.slice(0, 15).join(", ");

  const prompt = `You are a sustainability analysis assistant. Analyze the following product data using web search.

Brand: "${brand}"
Ingredients: ${ingredientList}

Provide a complete sustainability analysis. You MUST respond with ONLY a JSON object, no other text before or after:
{
  "brand_profile": {
    "certifications": ["list any: B Corp, Fair Trade, Organic, Cruelty-Free, Rainforest Alliance"],
    "carbonReport": true or false,
    "laborPractices": "brief summary",
    "overallEthicsScore": number 0-100
  },
  "ingredients": [
    { "name": "ingredient name", "flag": "safe" or "moderate" or "harmful", "reason": "brief reason", "score": number 0-100 }
  ],
  "alternatives": [
    { "name": "product name", "brand": "brand name", "score": number 0-100, "improvements": ["improvement1", "improvement2"] }
  ]
}

For each ingredient, assess EWG safety rating, health effects, allergen status, and environmental impact.
For alternatives, suggest 3-5 more sustainable products.
Include ALL ingredients listed above in the ingredients array.`;

  const result = await searchModel.generateContent(prompt);
  return extractJSON(result.response.text());
}
