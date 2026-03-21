import { db } from "./firebase";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

const COLLECTION = "product_scans";

/**
 * Generate a consistent key from product name + brand.
 * Lowercased and trimmed so "Red Bull" from any client matches.
 */
function productKey(productName, brand) {
  const raw = `${productName}::${brand}`.toLowerCase().trim();
  // Replace characters not allowed in Firestore doc IDs
  return raw.replace(/[/\\]/g, "_");
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
      console.log("[EcoScan] Cache hit:", key);
      return snap.data();
    }
    console.log("[EcoScan] Cache miss:", key);
    return null;
  } catch (err) {
    console.warn("[EcoScan] Cache lookup failed, proceeding with fresh scan:", err.message);
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
    console.log("[EcoScan] Cached product:", key);
  } catch (err) {
    console.warn("[EcoScan] Failed to cache product:", err.message);
  }
}
