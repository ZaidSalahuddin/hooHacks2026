# EcoScan — Implementation To-Do List

## Project Setup
- [ ] Initialize React project (Vite + React)
- [ ] Install dependencies: Tailwind CSS, React Router, Zustand, `@google/generative-ai`
- [ ] Configure Tailwind with custom theme (forest greens, off-whites, terracotta)
- [ ] Add fonts: Playfair Display + DM Sans (Google Fonts)
- [ ] Set up environment variables (`GEMINI_API_KEY`)
- [ ] Set up React Router with tab navigation (Scanner, Results, History, Settings)

## Product Scanner (Home Tab)
- [ ] Camera capture component (use `navigator.mediaDevices.getUserMedia`)
- [ ] Image upload fallback (file input for gallery)
- [ ] Image preview before submitting
- [ ] Scanning animation (loading state while API processes)
- [ ] Send image as base64 to Gemini Vision API
- [ ] Parse response JSON: `{ product_name, brand, ingredients[] }`
- [ ] Display extracted product info

## Gemini API Integration
- [ ] Set up Gemini client with `@google/generative-ai`
- [ ] `analyzeProductImage(imageBase64, mimeType)` — vision extraction
- [ ] `searchBrandSustainability(brand)` — search-grounded brand lookup
- [ ] `searchIngredientSafety(ingredient)` — search-grounded ingredient lookup
- [ ] Error handling for API failures and malformed responses
- [ ] Rate limiting / loading states for multiple ingredient lookups

## Ingredient Analysis
- [ ] Parse ingredients list from vision response
- [ ] Call `searchIngredientSafety()` for each ingredient
- [ ] Flag each ingredient: safe / moderate / harmful
- [ ] Display per-ingredient breakdown with reason
- [ ] Color-coded pill badges (green/yellow/red)

## Sustainability Score
- [ ] Implement `computeScore()` with weighted formula
  - Ingredient Safety: 30%
  - Environmental Impact: 25%
  - Brand Ethics: 20%
  - Health Impact: 15%
  - Packaging: 10%
- [ ] Score tier classification (Excellent / Moderate / Poor)
- [ ] Circular progress ring with animated fill
- [ ] Score counter animation (0 → final value)
- [ ] Score breakdown bar chart

## Brand Profile
- [ ] Call `searchBrandSustainability()` with brand name
- [ ] Display certifications (B Corp, Fair Trade, Cruelty-Free, Organic, Rainforest Alliance)
- [ ] Show carbon report status, labor practices summary
- [ ] Ethics score indicator

## Alternative Products
- [ ] Query Gemini + search for 3–5 higher-scoring alternatives
- [ ] Display product name, brand, score comparison
- [ ] Show key improvements over scanned product
- [ ] Purchase/learn-more links

## Scan History
- [ ] Save scan results to localStorage (use scan history schema from spec)
- [ ] Store image thumbnails in IndexedDB
- [ ] History list view with product thumbnail, name, date, score, color indicator
- [ ] Tap to re-open full scan result
- [ ] Search/filter by product name or score range
- [ ] Delete individual entries
- [ ] Clear all history option

## UI Polish
- [ ] Organic-futuristic theme: deep greens, off-whites, terracotta accents
- [ ] Frosted glass effect on result panels
- [ ] Soft shadows and rounded corners on cards
- [ ] Leaf particle animation on scan completion
- [ ] Responsive layout for mobile and desktop
- [ ] Tab bar with active state indicators

## Future Enhancements (Post-MVP)
- [ ] Barcode scanning (ZXing or QuaggaJS)
- [ ] User accounts with cloud-synced history
- [ ] Community product database with crowdsourced ratings
- [ ] Push notifications for product recalls
- [ ] Browser extension for online shopping
- [ ] Carbon footprint offset suggestions
- [ ] Export history as CSV or PDF
