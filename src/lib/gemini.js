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
  const prompt = `You are a product label analysis assistant. Carefully examine every part of this product image.

STEP 1: Is there a recognizable consumer product in the image?
If NO, respond ONLY with: { "product_found": false }

STEP 2: If YES, extract ALL of the following. Look very carefully at the label text.

PRODUCT INFO:
- Product name and brand

INGREDIENTS LIST:
- Read the ingredients list from the label word by word
- If the ingredients are not visible in the image, use your knowledge of this specific product to provide the known ingredients
- The ingredients array must NOT be empty — every product has ingredients

NUTRITION FACTS:
- Read every line of the Nutrition Facts panel on the label
- If the Nutrition Facts panel is not visible, use your knowledge of this specific product to provide the standard nutrition facts
- You MUST include ALL standard nutrients: serving size, calories, total fat, saturated fat, trans fat, cholesterol, sodium, total carbohydrates, dietary fiber, total sugars, added sugars, and protein
- Also include any vitamins and minerals listed

Respond with this exact JSON structure (all nutrition values must be numbers, not strings):
{
  "product_found": true,
  "product_name": "Product Name",
  "brand": "Brand Name",
  "ingredients": ["ingredient1", "ingredient2", "ingredient3"],
  "nutrition_facts": {
    "serving_size": "8.4 fl oz (250ml)",
    "calories": 110,
    "total_fat_g": 0,
    "saturated_fat_g": 0,
    "trans_fat_g": 0,
    "cholesterol_mg": 0,
    "sodium_mg": 105,
    "total_carbohydrates_g": 28,
    "dietary_fiber_g": 0,
    "total_sugars_g": 27,
    "added_sugars_g": 27,
    "protein_g": 0,
    "vitamins_minerals": [
      { "name": "Niacin", "daily_value_percent": 160 },
      { "name": "Vitamin B6", "daily_value_percent": 360 },
      { "name": "Vitamin B12", "daily_value_percent": 130 },
      { "name": "Pantothenic Acid", "daily_value_percent": 50 }
    ]
  }
}

CRITICAL RULES:
- The "ingredients" array must NEVER be empty
- The "nutrition_facts" object must ALWAYS include all fields shown above
- All numeric values must be actual numbers (e.g. 0, not "0")
- If you cannot read a value from the image, use your knowledge of the product`;

  const result = await visionModel.generateContent([
    prompt,
    {
      inlineData: {
        mimeType,
        data: imageBase64,
      },
    },
  ]);

  const parsed = extractJSON(result.response.text());

  if (!parsed.product_found) {
    throw new Error("No product detected in the image. Please take a photo of a consumer product (food, drink, cosmetic, etc.) and try again.");
  }

  return parsed;
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
    { "name": "ingredient name", "flag": "safe" or "moderate" or "harmful", "reason": "brief reason", "score": number 0-100, "source_url": "URL of the source used for this ingredient's safety assessment (e.g. EWG Skin Deep page, PubChem, FDA, WHO, etc.)", "source_name": "Short name of the source (e.g. EWG, FDA, WHO, PubChem)" }
  ],
  "alternatives": [
    { "name": "product name", "brand": "brand name", "score": number 0-100, "improvements": ["improvement1", "improvement2"] }
  ]
}

For each ingredient, assess EWG safety rating, health effects, allergen status, and environmental impact.
For each ingredient, you MUST include a "source_url" linking to the actual webpage you used for the safety assessment (e.g. https://www.ewg.org/skindeep/ingredients/..., https://pubchem.ncbi.nlm.nih.gov/compound/..., https://www.fda.gov/..., etc.) and a short "source_name" (e.g. "EWG", "PubChem", "FDA").
For alternatives, suggest 3-5 more sustainable products.
Include ALL ingredients listed above in the ingredients array.`;

  const result = await searchModel.generateContent(prompt);
  return extractJSON(result.response.text());
}
