# 🤠 EcoScan — Frontier Sustainability Scanner

## Overview

**EcoScan** is a frontier-style sustainability scanner that lets folks snap a picture of a product and uncover its true reputation. The app inspects ingredients, investigates company dealings, and delivers a clear **Frontier Reputation Score**—helping users avoid carbon outlaws and choose sheriff-approved goods.

---

## Core Features

### 1. 📷 Bounty Scanner (Home Tab)
- Camera capture or image upload input
- Sends image to Claude Vision API for label/ingredient extraction
- Displays a “scanning bounty” animation while processing
- Shows extracted product name, brand, and raw ingredients list

---

### 2. 🧪 Toxicity Report
- Parses extracted text for ingredient names
- Cross-references each ingredient against:
  - Known harmful/toxic chemical databases (e.g., EWG Skin Deep, Open Food Facts)
  - Allergen and carcinogen lists
  - Environmental impact data (biodegradable, microplastic risk, etc.)

**Flags ingredients as:**
- ✅ Clean Goods  
- ⚠️ Questionable Brew  
- ❌ Poisonous Mix  

Displays detailed per-ingredient breakdown with reason for flag

---

### 3. 🌐 Company Reputation Lookup
- Uses web search to find:
  - Brand sustainability reports
  - Third-party certifications (Fair Trade, B Corp, Cruelty-Free, Organic, Rainforest Alliance)
  - Carbon footprint and supply chain data
  - User reviews and watchdog reports

Summarizes findings in a **"Company Reputation"** section:

- 🤠 Trusted Ranch  
- ⚖️ Mixed Record  
- 🕵️ Shady Outfit  

---

### 4. ⭐ Frontier Reputation Score (Weighted Formula)

The overall score is calculated out of **100** using the following weighted criteria:

| Category              | Weight | Description                              |
|----------------------|--------|------------------------------------------|
| Toxicity Report      | 30%    | Ingredient safety & chemical risk        |
| Trail Damage         | 25%    | Environmental impact & emissions         |
| Company Reputation   | 20%    | Certifications, ethics, transparency     |
| Personal Risk        | 15%    | Health impact on the user                |
| Waste Footprint      | 10%    | Packaging & recyclability                |

---

### 🏆 Reputation Tiers

- 🟢 **80–100 — Sheriff Approved**  
  *“A fine choice for the frontier.”*

- 🟡 **50–79 — Neutral Drifter**  
  *“Ain’t perfect, but it’ll do.”*

- 🔴 **0–49 — Carbon Outlaw**  
  *“This one’s causin’ trouble.”*

---

### 5. 🔁 Better Trails Ahead
- Suggests 3–5 alternative products that score higher
- Each alternative shows:
  - Product name & brand
  - Frontier score
  - Key improvements
  - Link to learn more or purchase

---

### 6. 📂 Frontier Logbook (History Tab)
- Persists all past scans using localStorage (or backend DB)
- Each history entry shows:
  - Product thumbnail
  - Product name
  - Scan date & time
  - Frontier Reputation score with tier
- Supports:
  - Search/filter by name or score
  - Re-opening past scans
  - Deleting entries

---

## App Architecture

### Frontend
- **Framework**: React (with hooks)
- **Styling**: Tailwind CSS
- **State Management**: React Context API or Zustand
- **Routing**: React Router (Scanner, Results, Logbook, Settings)
- **Storage**: localStorage + IndexedDB for images

---

### Backend / API Layer

- **AI Image Analysis**: Claude Vision API  
  - Extracts product name, brand, ingredients  

- **Web Search**: Claude API with web search tool  
  - Fetches company reputation + ingredient data  

- **Score Calculator**: Client-side weighted formula  

---

## Data Flow

```
User captures photo
        ↓
Image → Claude Vision API
        ↓
Extract: product name, brand, ingredients list
        ↓
Web Search: company reputation + ingredient data
        ↓
Score Calculator (weighted formula)
        ↓
Display: Score + Breakdown + Alternatives
        ↓
Save to Frontier Logbook
```

---

## UI Structure

```
┌─────────────────────────────────┐
│      🤠 EcoScan Saloon          │
│     [Logo]  [Score Badge]       │
├─────────────────────────────────┤
│   📷 Bounty Scanner             │
│   ┌─────────────────────────┐   │
│   │   Camera / Upload Area  │   │
│   │   [ Tap to Scan ]       │   │
│   └─────────────────────────┘   │
│                                 │
├─────────────────────────────────┤
│   📊 Results                    │
│                                 │
│   Product: Dove Body Wash       │
│   Outfit: Unilever              │
│                                 │
│   ⭐ Reputation: 62 / 100       │
│   🟡 Neutral Drifter            │
│                                 │
│   Reputation Ledger             │
│   ● Toxicity Report     72      │
│   ● Trail Damage        55      │
│   ● Company Reputation  60      │
│   ● Personal Risk       70      │
│   ● Waste Footprint     45      │
│                                 │
│   Ingredient Flags              │
│   ✅ Water — Clean              │
│   ⚠️ Sodium Laureth — Moderate  │
│   ❌ Fragrance — Harmful        │
│                                 │
│   Better Trails Ahead           │
│   1. Dr. Bronner's — 88         │
│   2. Blueland — 91              │
│                                 │
├─────────────────────────────────┤
│   📂 Frontier Logbook           │
│                                 │
│   🔍 Search scans...            │
│                                 │
│   Dove Body Wash — 62 🟡        │
│   Nutella — 38 🔴               │
└─────────────────────────────────┘
```

---

## Claude API Integration

### Image Analysis Prompt
```
You are a sustainability inspector on the frontier.

Given a product image:
1. Identify product name and brand
2. Extract full ingredients list exactly
3. Return JSON:
{
  "product_name": "...",
  "brand": "...",
  "ingredients": [...]
}
```

---

### Web Search Prompts

**Company reputation:**
```
Search for "[Brand Name] sustainability practices, certifications, environmental impact"
```

**Ingredient safety:**
```
Search for "[Ingredient Name] safety, health effects, environmental impact"
```

---

## Score Computation (JavaScript)

```javascript
function computeScore({ toxicity, trailDamage, companyReputation, personalRisk, wasteFootprint }) {
  return Math.round(
    toxicity * 0.30 +
    trailDamage * 0.25 +
    companyReputation * 0.20 +
    personalRisk * 0.15 +
    wasteFootprint * 0.10
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
  "tier": "Neutral Drifter",
  "breakdown": {
    "toxicity": 72,
    "trail_damage": 55,
    "company_reputation": 60,
    "personal_risk": 70,
    "waste_footprint": 45
  }
}
```

---

## Aesthetic Direction

- **Theme**: Wild West frontier + modern UI  
- **Colors**: Dusty browns, desert gold, muted greens  
- **Typography**: Western display + clean sans-serif  
- **UI Elements**: Wanted posters, stamps, badges  
- **Motion**: Dust particles, score animations  

---

## Future Enhancements

- [ ] Barcode scanning
- [ ] User accounts
- [ ] Community ratings
- [ ] Notifications for recalls
- [ ] Browser extension
- [ ] Carbon offset suggestions
- [ ] Export reports

---

*Built with frontier justice · Keeping the West green 🤠*