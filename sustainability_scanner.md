# 🌿 EcoScan — Sustainability Scanner Web App

## Overview

**EcoScan** is an AI-powered sustainability scanner that allows users to photograph a product and receive a comprehensive sustainability score. The app analyzes ingredients, searches for online environmental and health data, suggests greener alternatives, and maintains a full scan history.

---

## Core Features

### 1. 📷 Product Scanner (Home Tab)
- Camera capture or image upload input
- Sends image to Claude Vision API for label/ingredient extraction
- Displays a live scanning animation while processing
- Shows extracted product name, brand, and raw ingredients list

### 2. 🧪 Ingredient Analysis
- Parses extracted text for ingredient names
- Cross-references each ingredient against:
  - Known harmful/toxic chemical databases (e.g., EWG Skin Deep, Open Food Facts)
  - Allergen and carcinogen lists
  - Environmental impact data (biodegradable, microplastic risk, etc.)
- Flags ingredients as: ✅ Safe · ⚠️ Moderate · ❌ Harmful
- Displays detailed per-ingredient breakdown with reason for flag

### 3. 🌐 Online Data Lookup
- Uses web search to find:
  - Brand sustainability reports
  - Third-party certifications (Fair Trade, B Corp, Cruelty-Free, Organic, Rainforest Alliance)
  - Carbon footprint and supply chain data
  - User reviews and watchdog reports
- Summarizes findings in a "Brand Profile" section

### 4. 📊 Sustainability Score (Weighted Formula)

The overall score is calculated out of **100** using the following weighted criteria:

| Category                     | Weight | Description                                               |
|-----------------------------|--------|-----------------------------------------------------------|
| Ingredient Safety            | 30%    | Based on % of safe vs harmful ingredients                 |
| Environmental Impact         | 25%    | Packaging, carbon footprint, biodegradability             |
| Brand Ethics & Transparency  | 20%    | Certifications, labor practices, sustainability reports   |
| Health Impact                | 15%    | Nutritional value, allergens, additives (food products)   |
| Packaging & Recyclability    | 10%    | Material type, recyclable/compostable labeling            |

**Score Tiers:**
- 🟢 **80–100** — Excellent: A responsible, sustainable choice
- 🟡 **50–79** — Moderate: Some concerns; room for improvement
- 🔴 **0–49** — Poor: Significant sustainability or health issues

### 5. 🔄 Alternative Products
- Suggests 3–5 alternative products that score higher
- Each alternative shows:
  - Product name & brand
  - Score comparison
  - Key improvements over scanned product
  - Link to purchase or learn more (via web search)

### 6. 📂 History Tab
- Persists all past scans using browser localStorage (or backend DB)
- Each history entry shows:
  - Product thumbnail (captured image or placeholder)
  - Product name
  - Scan date & time
  - Overall sustainability score with color indicator
  - Tap to re-open full scan result
- Supports search/filter by product name or score range
- Option to delete individual entries or clear all history

---

## App Architecture

### Frontend
- **Framework**: React (with hooks)
- **Styling**: Tailwind CSS
- **State Management**: React Context API or Zustand
- **Routing**: React Router (tabs: Scanner, Results, History, Settings)
- **Storage**: localStorage for scan history; IndexedDB for larger image blobs

### Backend / API Layer
- **AI Image Analysis**: Claude API (`claude-sonnet-4-20250514`) with vision input
  - Prompt: Extract product name, brand, and full ingredients list from image
- **Web Search**: Claude API with `web_search_20250305` tool
  - Queries: brand sustainability data, ingredient safety profiles, certifications
- **Score Calculator**: Client-side weighted formula function

### Data Flow

```
User captures photo
        ↓
Image → Claude Vision API
        ↓
Extract: product name, brand, ingredients list
        ↓
Web Search: brand profile + per-ingredient safety data
        ↓
Score Calculator (weighted formula)
        ↓
Display: Score + Breakdown + Alternatives
        ↓
Save to Scan History (localStorage)
```

---

## UI Structure

```
┌─────────────────────────────────┐
│         EcoScan Header          │
│     [Logo]  [Score Badge]       │
├─────────────────────────────────┤
│                                 │
│   [ 📷 Scanner Tab ]            │
│   ┌─────────────────────────┐   │
│   │   Camera / Upload Area  │   │
│   │   [ Tap to Scan ]       │   │
│   └─────────────────────────┘   │
│   ── or ──                      │
│   [ Upload from Gallery ]       │
│                                 │
├─────────────────────────────────┤
│   [ 📊 Results Tab ]            │
│                                 │
│   Product: Dove Body Wash       │
│   Brand: Unilever               │
│   ┌──────────────────────────┐  │
│   │  Overall Score:  62/100  │  │
│   │  🟡 Moderate             │  │
│   └──────────────────────────┘  │
│                                 │
│   Score Breakdown (bar chart)   │
│   ● Ingredients      72/100     │
│   ● Environment      55/100     │
│   ● Brand Ethics     60/100     │
│   ● Health           70/100     │
│   ● Packaging        45/100     │
│                                 │
│   Ingredient Flags              │
│   ✅ Water           — Safe     │
│   ⚠️  Sodium Laureth — Moderate │
│   ❌  Fragrance      — Harmful  │
│                                 │
│   Brand Profile                 │
│   [ B Corp: No ]                │
│   [ Fair Trade: No ]            │
│   [ Carbon Report: Limited ]    │
│                                 │
│   Better Alternatives           │
│   1. Dr. Bronner's  — 88/100   │
│   2. Blueland       — 91/100   │
│   3. Love Beauty    — 74/100   │
│                                 │
├─────────────────────────────────┤
│   [ 📂 History Tab ]            │
│                                 │
│   🔍 Search scans...            │
│                                 │
│   ┌──────────────────────────┐  │
│   │ [img] Dove Body Wash     │  │
│   │       62/100  🟡  Mar 21 │  │
│   └──────────────────────────┘  │
│   ┌──────────────────────────┐  │
│   │ [img] Nutella            │  │
│   │       38/100  🔴  Mar 18 │  │
│   └──────────────────────────┘  │
│                                 │
└─────────────────────────────────┘
```

---

## Claude API Integration

### Image Analysis Prompt
```
You are a sustainability and ingredient analysis assistant.

Given the product image provided:
1. Identify the product name and brand
2. Extract the complete ingredients list exactly as printed
3. Return JSON only:
{
  "product_name": "...",
  "brand": "...",
  "ingredients": ["ingredient1", "ingredient2", ...]
}
```

### Web Search Prompts

**Brand sustainability search:**
```
Search for "[Brand Name] sustainability report, certifications, 
environmental practices, B Corp, Fair Trade, carbon footprint 2024-2025"
```

**Ingredient safety search:**
```
Search for "[Ingredient Name] safety EWG rating, health effects, 
environmental impact, carcinogen risk"
```

### Score Computation (JavaScript)
```javascript
function computeScore({ ingredientSafety, environmentalImpact, brandEthics, healthImpact, packaging }) {
  return Math.round(
    ingredientSafety   * 0.30 +
    environmentalImpact * 0.25 +
    brandEthics        * 0.20 +
    healthImpact       * 0.15 +
    packaging          * 0.10
  );
}
```

---

## Scan History Schema

```json
{
  "id": "uuid",
  "timestamp": "2026-03-21T14:32:00Z",
  "product_name": "Dove Body Wash",
  "brand": "Unilever",
  "image_thumbnail": "base64 or blob URL",
  "score": 62,
  "score_tier": "moderate",
  "breakdown": {
    "ingredient_safety": 72,
    "environmental_impact": 55,
    "brand_ethics": 60,
    "health_impact": 70,
    "packaging": 45
  },
  "flagged_ingredients": [
    { "name": "Sodium Laureth Sulfate", "flag": "moderate", "reason": "Potential skin irritant" },
    { "name": "Fragrance", "flag": "harmful", "reason": "Undisclosed chemicals, allergen risk" }
  ],
  "alternatives": [
    { "name": "Dr. Bronner's Pure Castile Soap", "score": 88 },
    { "name": "Blueland Body Wash", "score": 91 }
  ]
}
```

---

## Aesthetic Direction

- **Theme**: Organic-futuristic — deep forest greens, warm off-whites, earthy terracotta accents
- **Typography**: Display font (e.g., *Canela* or *Playfair Display*) for scores; clean sans-serif (e.g., *DM Sans*) for body text
- **Score Visualization**: Circular progress ring with animated fill on load
- **Ingredient List**: Pill badges color-coded by safety tier
- **Motion**: Subtle leaf particle animation on scan completion; score counter animates from 0 to final value
- **Cards**: Soft shadows, rounded corners, frosted glass effect on result panels

---

## Future Enhancements

- [ ] Barcode scanning (via ZXing or QuaggaJS) for faster product lookup
- [ ] User accounts with cloud-synced history
- [ ] Community product database with crowdsourced ratings
- [ ] Push notifications for product recalls or new sustainability data
- [ ] Browser extension for scanning products while online shopping
- [ ] Carbon footprint offset suggestions (tree planting, donation links)
- [ ] Export history as CSV or PDF report

---

*Built with Claude AI · Powered by web search & vision analysis · Making sustainable choices simpler.*
