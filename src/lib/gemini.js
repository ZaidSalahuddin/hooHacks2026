import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  extractJSON,
  normalizeAnalysisResult,
  normalizeBrandDetectionResult,
  normalizeBrandProfileResult,
  normalizeBrandValidationResult,
  normalizeClassificationResult,
  normalizeIngredientAnalysisResult,
  normalizeIngredientDetectionResult,
  normalizeIngredientValidationResult,
  normalizeProductCandidatesResult,
} from "./geminiUtils";

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

const visionModel = genAI.getGenerativeModel({
  model: "gemini-2.0-flash",
  generationConfig: { responseMimeType: "application/json" },
});

const searchModel = genAI.getGenerativeModel({
  model: "gemini-2.0-flash",
  tools: [{ googleSearch: {} }],
});

function getUserFacingVisionError(fallbackMessage) {
  return new Error(fallbackMessage);
}

async function runVisionJSON(promptParts, fallbackMessage) {
  try {
    const result = await visionModel.generateContent(promptParts);
    return extractJSON(result.response.text());
  } catch {
    throw getUserFacingVisionError(fallbackMessage);
  }
}

export async function identifyDistinctProducts(imageBase64, mimeType = "image/jpeg") {
  const prompt = `You are a product identification agent.

Look at this image and determine how many visually distinctive packaged consumer products are present.

Respond with ONLY this JSON object:
{
  "product_count": number,
  "products": [
    {
      "product_name": "string",
      "distinctive_features": ["feature1", "feature2"],
      "confidence": number 0-100
    }
  ]
}`;

  try {
    const data = await runVisionJSON(
      [
        prompt,
        {
          inlineData: {
            mimeType,
            data: imageBase64,
          },
        },
      ],
      "We could not clearly identify the product in this image. Please retake the photo with one product centered in frame."
    );

    return normalizeProductCandidatesResult(data);
  } catch {
    throw new Error("We could not clearly identify the product in this image. Please retake the photo with one product centered in frame.");
  }
}

export async function identifyBrands(imageBase64, mimeType = "image/jpeg") {
  const prompt = `You are a brand identification agent.

Read the packaging in this image and identify the visible product brand names.

Respond with ONLY this JSON object:
{
  "brands": [
    {
      "brand": "string",
      "confidence": number 0-100,
      "evidence": "brief explanation"
    }
  ]
}`;

  try {
    const data = await runVisionJSON(
      [
        prompt,
        {
          inlineData: {
            mimeType,
            data: imageBase64,
          },
        },
      ],
      "We could not clearly identify the brand from this image. Please retake the photo with the front label visible."
    );

    return normalizeBrandDetectionResult(data);
  } catch {
    throw new Error("We could not clearly identify the brand from this image. Please retake the photo with the front label visible.");
  }
}

export async function identifyIngredients(imageBase64, mimeType = "image/jpeg") {
  const prompt = `You are an ingredient extraction agent.

Read the ingredient list exactly as printed on the product image.

Respond with ONLY this JSON object:
{
  "ingredients": ["ingredient 1", "ingredient 2"],
  "confidence": number 0-100,
  "readability": "clear" or "partial" or "unreadable"
}`;

  try {
    const data = await runVisionJSON(
      [
        prompt,
        {
          inlineData: {
            mimeType,
            data: imageBase64,
          },
        },
      ],
      "We could not read the ingredient list from this image. Please retake the photo with the ingredients panel clearly visible."
    );

    return normalizeIngredientDetectionResult(data);
  } catch {
    throw new Error("We could not read the ingredient list from this image. Please retake the photo with the ingredients panel clearly visible.");
  }
}

export async function classifyImageContent(imageBase64, mimeType = "image/jpeg") {
  const prompt = `You are an image classification agent.

Analyze this product packaging image and determine what label content is clearly visible.

Respond with ONLY this JSON object:
{
  "hasBrandLabel": true or false,
  "hasIngredientList": true or false,
  "confidence": number 0-100
}`;

  try {
    const data = await runVisionJSON(
      [prompt, { inlineData: { mimeType, data: imageBase64 } }],
      "We could not classify the content of this image."
    );
    return normalizeClassificationResult(data);
  } catch {
    // Default to assuming both are present if classification fails
    return { hasBrandLabel: true, hasIngredientList: true, confidence: 0 };
  }
}

export async function validateBrand(product, imageBase64, mimeType = "image/jpeg") {
  const prompt = `You are a brand validation agent.

Validate whether the proposed brand and optional product name match the packaging shown in the image.

If the proposed product name is missing or incomplete, infer the most likely product name from the packaging.

Reject vague, generic, or mismatched brand identifications.

Respond with ONLY this JSON object:
{
  "valid": true or false,
  "confidence": number 0-100,
  "reason": "brief user-facing reason",
  "issues": ["issue1", "issue2"],
  "normalized_brand": "string",
  "normalized_product_name": "string"
}`;

  try {
    const data = await runVisionJSON(
      [
        prompt,
        `Candidate product JSON: ${JSON.stringify(product)}`,
        {
          inlineData: {
            mimeType,
            data: imageBase64,
          },
        },
      ],
      "We could not verify the product brand from this image. Please retake the photo with the label clearly visible."
    );

    return normalizeBrandValidationResult(data);
  } catch {
    throw new Error("We could not verify the product brand from this image. Please retake the photo with the label clearly visible.");
  }
}

export async function validateIngredients(product, imageBase64, mimeType = "image/jpeg") {
  const prompt = `You are an ingredient validation agent.

Validate whether the extracted ingredient list is readable, plausible, and matches the product image and validated brand/product context.

Reject ingredient lists that are missing, too short to be useful, clearly malformed, or unrelated to the packaging.

Respond with ONLY this JSON object:
{
  "valid": true or false,
  "confidence": number 0-100,
  "reason": "brief user-facing reason",
  "issues": ["issue1", "issue2"],
  "normalized_ingredients": ["ingredient 1", "ingredient 2"]
}`;

  try {
    const data = await runVisionJSON(
      [
        prompt,
        `Candidate product JSON: ${JSON.stringify(product)}`,
        {
          inlineData: {
            mimeType,
            data: imageBase64,
          },
        },
      ],
      "We could not verify the ingredient list from this image. Please retake the photo with the ingredients panel clearly visible."
    );

    return normalizeIngredientValidationResult(data);
  } catch {
    throw new Error("We could not verify the ingredient list from this image. Please retake the photo with the ingredients panel clearly visible.");
  }
}

export async function researchBrand(brand) {
  const prompt = `You are a brand research agent. Use web search to research the sustainability and ethics profile of the brand "${brand}".

Respond with ONLY this JSON object:
{
  "certifications": ["list any: B Corp, Fair Trade, Organic, Cruelty-Free, Rainforest Alliance"],
  "carbonReport": true or false,
  "laborPractices": "brief summary",
  "overallEthicsScore": number 0-100
}`;

  try {
    const result = await searchModel.generateContent(prompt);
    return normalizeBrandProfileResult(extractJSON(result.response.text()));
  } catch {
    throw new Error("We could not research the brand sustainability profile. Please try again.");
  }
}

export async function analyzeIngredients(brand, ingredients) {
  const safeIngredients = Array.isArray(ingredients) ? ingredients : [];
  const ingredientList = safeIngredients.join(", ");

  const prompt = `You are an ingredient analysis agent. Analyze the safety and environmental impact of these ingredients from the brand "${brand}".

Ingredients: ${ingredientList}

Respond with ONLY this JSON object:
{
  "ingredients": [
    { "name": "ingredient name", "flag": "safe" or "moderate" or "harmful", "reason": "brief reason", "score": number 0-100 }
  ],
  "alternatives": [
    { "name": "product name", "brand": "brand name", "score": number 0-100, "improvements": ["improvement1", "improvement2"] }
  ]
}

For each ingredient, assess EWG safety rating, health effects, allergen status, and environmental impact.
Include ALL ingredients listed above. Suggest 3-5 more sustainable product alternatives.`;

  try {
    const result = await searchModel.generateContent(prompt);
    return normalizeIngredientAnalysisResult(extractJSON(result.response.text()));
  } catch {
    throw new Error("We could not analyze the ingredient safety. Please try again.");
  }
}

export async function analyzeProduct(brand, ingredients) {
  const safeIngredients = Array.isArray(ingredients) ? ingredients : [];
  const ingredientList = safeIngredients.join(", ");

  const prompt = `You are a sustainability scoring agent. Analyze the following product data using web search.

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

  try {
    const result = await searchModel.generateContent(prompt);
    return normalizeAnalysisResult(extractJSON(result.response.text()));
  } catch {
    throw new Error("We could not finish the sustainability analysis. Please try again.");
  }
}
