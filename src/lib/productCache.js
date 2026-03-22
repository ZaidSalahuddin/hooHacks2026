import { db } from "./firebase";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

const COLLECTION = "product_scans";

/**
 * Normalize a product name or brand to a stable, canonical form.
 * Strips volume/size info, punctuation, trademark symbols, extra whitespace,
 * so "Red Bull Energy Drink 8.4 fl oz (250ml)" → "red bull energy drink".
 */
function normalize(str) {
  return (str || "")
    .toLowerCase()
    // Remove trademark/copyright symbols
    .replace(/[®™©]/g, "")
    // Remove size/volume patterns: "8.4 fl oz", "250ml", "12oz", "1.5L", "16.9 fluid ounces", "330 ml", "2 liter"
    .replace(/\d+\.?\d*\s*(fl\.?\s*oz|oz|ml|l|cl|liters?|gallons?|pints?|quarts?|g|kg|lb|lbs)\b/gi, "")
    // Remove parenthetical content like "(250ml)" or "(pack of 12)"
    .replace(/\(.*?\)/g, "")
    // Remove common size/count descriptors
    .replace(/\b(single|pack|can|bottle|box|count|ct|pk)\b/gi, "")
    // Remove punctuation except hyphens within words
    .replace(/[^a-z0-9\s-]/g, "")
    // Collapse whitespace
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Generate a consistent key from product name + brand.
 * Aggressively normalizes so the same product always matches
 * regardless of how Gemini phrases the name.
 */
function productKey(productName, brand) {
  const normName = normalize(productName);
  const normBrand = normalize(brand);

  // Remove brand from product name if it's redundant (e.g. "Red Bull Red Bull Energy Drink")
  const nameWithoutBrand = normBrand
    ? normName.replace(new RegExp(`\\b${normBrand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, "g"), "").replace(/\s+/g, " ").trim()
    : normName;

  const key = `${normBrand}::${nameWithoutBrand || normName}`;
  // Replace characters not allowed in Firestore doc IDs
  return key.replace(/[/\\]/g, "_");
}

/**
 * Look up a previously scanned product in Firestore.
 * Returns the cached scan data or null if not found.
 */
export async function getCachedProduct(productName, brand) {
  try {
    const key = productKey(productName, brand);
    const snap = await getDoc(doc(db, COLLECTION, key));
    if (snap.exists()) {
      console.log("[OriginTrail] Cache hit:", key);
      return snap.data();
    }
    console.log("[OriginTrail] Cache miss:", key);
    return null;
  } catch (err) {
    console.warn("[OriginTrail] Cache lookup failed, proceeding with fresh scan:", err.message);
    return null;
  }
}

/**
 * Save a scan result to Firestore so other clients get the same score.
 */
export async function cacheProduct(productName, brand, scanData) {
  try {
    const key = productKey(productName, brand);
    await setDoc(doc(db, COLLECTION, key), {
      ...scanData,
      product_name: productName,
      brand,
      cached_at: serverTimestamp(),
    });
    console.log("[OriginTrail] Cached product:", key);
  } catch (err) {
    console.warn("[OriginTrail] Failed to cache product:", err.message);
  }
}
