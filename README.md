# EcoScan — Sustainability Sheriff

An AI-powered sustainability scanner that lets you photograph any consumer product and receive a detailed bounty score (0-100) based on ingredient safety, environmental impact, brand ethics, health impact, and packaging.

## Features

- **Product Scanning** — Capture a photo via camera or upload an image. Gemini Vision identifies the product, extracts ingredients, and reads nutrition facts from the label.
- **Sustainability Scoring** — Each product earns a weighted bounty score across five categories: Ingredients (30%), Environment (25%), Brand Ethics (20%), Health (15%), and Packaging (10%).
- **Ingredient Analysis** — Color-coded ingredient cards (safe/moderate/harmful) with safety scores, confidence levels, and links to authoritative sources (EWG, FDA, PubChem).
- **Nutrition Facts** — Extracted nutrition panel with color-coded % Daily Value indicators (green/yellow/red).
- **Brand Profile** — Certifications, labor practices, carbon reporting, and overall ethics score sourced via Google Search grounding.
- **Greener Alternatives** — AI-suggested alternative products that score higher, with specific improvement reasons.
- **Data Validation** — Cross-references Gemini results against Open Food Facts to correct inaccurate nutrition data. Confidence levels flag unreliable scores and exclude low-confidence categories from the total score.
- **Shared Product Cache** — Firebase Firestore stores scan results so the same product gets the same score across all clients.
- **Scan History** — Local history of all scanned products, viewable from the History tab.
- **Source Transparency** — Every score links back to the web sources used, including Gemini's grounding metadata and per-item source URLs.

## Tech Stack

- **Framework**: React 18 with hooks
- **Styling**: Tailwind CSS v4
- **State Management**: Zustand
- **Routing**: React Router
- **AI**: Google Gemini API (`gemini-2.0-flash`) — vision analysis + Google Search grounding
- **Validation**: Open Food Facts API (free, no key required)
- **Database**: Firebase Firestore (shared product cache)
- **Storage**: localStorage (scan history)
- **Build**: Vite

## Getting Started

### Prerequisites

- Node.js 18+
- A Google Gemini API key
- A Firebase project with Firestore enabled

### Installation

```bash
npm install
```

### Environment Variables

Create a `.env` file in the project root:

```
VITE_GEMINI_API_KEY=your-gemini-api-key

VITE_FIREBASE_API_KEY=your-firebase-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
```

### Firebase Setup

1. Create a project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable **Firestore Database** in test mode
3. Register a web app and copy the config values into `.env`

The `product_scans` collection is created automatically on the first scan.

### Run

```bash
npm run dev
```

## Project Structure

```
src/
  components/
    AlternativesList.jsx   # Greener alternative product suggestions
    BrandProfile.jsx       # Brand certifications & ethics display
    BreakdownChart.jsx     # Expandable score breakdown with reasoning
    DataQualityBanner.jsx  # Confidence level indicator
    IngredientList.jsx     # Filterable, color-coded ingredient cards
    NavBar.jsx             # Bottom navigation
    NutritionFacts.jsx     # Nutrition facts panel with %DV colors
    ScoreRing.jsx          # Animated circular score visualization
    SourcesList.jsx        # Collected web sources and references
  lib/
    firebase.js            # Firebase initialization
    gemini.js              # Gemini API calls (vision + search grounding)
    history.js             # localStorage scan history
    openFoodFacts.js       # Open Food Facts API validation
    productCache.js        # Firestore shared product cache
    score.js               # Score computation & breakdown reasoning
    validate.js            # Response validation & confidence assessment
  pages/
    ScannerPage.jsx        # Main scanner + results view
    HistoryPage.jsx        # Scan history list
  store/
    scanStore.js           # Zustand state & scan orchestration
```

## How Scoring Works

1. **Gemini Vision** identifies the product and extracts ingredients + nutrition from the image
2. **Gemini + Google Search** assesses each ingredient's safety and the brand's sustainability practices, each with a confidence level
3. **Open Food Facts** cross-validates nutrition data, correcting values that deviate >30%
4. **Validation** clamps scores, flags low-confidence data, and excludes unreliable categories
5. **Score computation** uses only confident categories, redistributing weights proportionally
6. Results are cached in Firestore so all clients see consistent scores

### Score Tiers

| Score | Tier |
|-------|------|
| 80-100 | High Bounty — seek these out |
| 50-79 | Moderate — room to improve |
| 0-49 | Low Bounty — avoid if possible |
