import { LlmAgent } from '@google/adk';

const MODEL = 'gemini-2.0-flash';

// --- Vision agents (no tools) ---

export const identifyDistinctProductsAgent = new LlmAgent({
  name: 'identifyDistinctProducts',
  model: MODEL,
  instruction: `You are a product identification agent.

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
}`,
});

export const classifyImageContentAgent = new LlmAgent({
  name: 'classifyImageContent',
  model: MODEL,
  instruction: `You are an image classification agent.

Analyze this product packaging image and determine what label content is clearly visible.

Respond with ONLY this JSON object:
{
  "hasBrandLabel": true or false,
  "hasIngredientList": true or false,
  "confidence": number 0-100
}`,
});

export const identifyBrandsAgent = new LlmAgent({
  name: 'identifyBrands',
  model: MODEL,
  instruction: `You are a brand identification agent.

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
}`,
});

export const identifyIngredientsAgent = new LlmAgent({
  name: 'identifyIngredients',
  model: MODEL,
  instruction: `You are an ingredient extraction agent.

Read the ingredient list exactly as printed on the product image.

Respond with ONLY this JSON object:
{
  "ingredients": ["ingredient 1", "ingredient 2"],
  "confidence": number 0-100,
  "readability": "clear" or "partial" or "unreadable"
}`,
});

export const validateBrandAgent = new LlmAgent({
  name: 'validateBrand',
  model: MODEL,
  instruction: `You are a brand validation agent.

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
}`,
});

export const validateIngredientsAgent = new LlmAgent({
  name: 'validateIngredients',
  model: MODEL,
  instruction: `You are an ingredient validation agent.

Validate whether the extracted ingredient list is readable, plausible, and matches the product image and validated brand/product context.

Reject ingredient lists that are missing, too short to be useful, clearly malformed, or unrelated to the packaging.

Respond with ONLY this JSON object:
{
  "valid": true or false,
  "confidence": number 0-100,
  "reason": "brief user-facing reason",
  "issues": ["issue1", "issue2"],
  "normalized_ingredients": ["ingredient 1", "ingredient 2"]
}`,
});

// --- Search agents (googleSearch must be the ONLY tool) ---

export const researchBrandAgent = new LlmAgent({
  name: 'researchBrand',
  model: MODEL,
  instruction: `You are a brand research agent. Use web search to research the sustainability and ethics profile of the brand provided by the user.

Respond with ONLY this JSON object:
{
  "certifications": ["list any: B Corp, Fair Trade, Organic, Cruelty-Free, Rainforest Alliance"],
  "carbonReport": true or false,
  "laborPractices": "brief summary",
  "overallEthicsScore": number 0-100
}`,
  tools: [{ googleSearch: {} }],
});

export const analyzeIngredientsAgent = new LlmAgent({
  name: 'analyzeIngredients',
  model: MODEL,
  instruction: `You are an ingredient analysis agent. Analyze the safety and environmental impact of the ingredients provided by the user.

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
Include ALL ingredients listed. Suggest 3-5 more sustainable product alternatives.`,
  tools: [{ googleSearch: {} }],
});
