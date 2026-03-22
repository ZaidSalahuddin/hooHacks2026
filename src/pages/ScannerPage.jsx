import { useRef, useState, useCallback } from "react";
import { useScanStore } from "../store/scanStore";
import ScoreRing from "../components/ScoreRing";
import BreakdownChart from "../components/BreakdownChart";
import IngredientList from "../components/IngredientList";
import BrandProfile from "../components/BrandProfile";
import AlternativesList from "../components/AlternativesList";
import NutritionFacts from "../components/NutritionFacts";
import SourcesList from "../components/SourcesList";
import DataQualityBanner from "../components/DataQualityBanner";
import Tumbleweed from "../components/Tumbleweed";
import OrnamentalCard from "../components/OrnamentalCard";

export default function ScannerPage() {
  const fileInputRef = useRef(null);
  const streamRef = useRef(null);
  const videoNodeRef = useRef(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [preview, setPreview] = useState(null);

  // Callback ref: attaches the stream once the video element mounts
  const videoRef = useCallback((node) => {
    videoNodeRef.current = node;
    if (node && streamRef.current) {
      node.srcObject = streamRef.current;
    }
  }, []);

  const { status, error, product, nutritionFacts, nutritionSource, validationWarnings, ingredientResults, brandProfile, score, breakdown, breakdownReasons, groundingSources, dataQuality, alternatives, scan, reset } =
    useScanStore();

  const handleFileSelect = useCallback(
    (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result;
        setPreview(dataUrl);
        const base64 = dataUrl.split(",")[1];
        const mimeType = file.type || "image/jpeg";
        scan(base64, mimeType);
      };
      reader.readAsDataURL(file);
    },
    [scan]
  );

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      setCameraActive(true);
    } catch {
      alert("Could not access camera. Please use the upload option.");
    }
  }, []);

  const capturePhoto = useCallback(() => {
    const video = videoNodeRef.current;
    if (!video) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
    setPreview(dataUrl);
    const base64 = dataUrl.split(",")[1];

    // Stop camera
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraActive(false);

    scan(base64, "image/jpeg");
  }, [scan]);

  const handleNewScan = useCallback(() => {
    reset();
    setPreview(null);
    setCameraActive(false);
  }, [reset]);

  // Results view
  if (status === "done" && score !== null) {
    return (
      <div className="max-w-lg mx-auto px-4 py-6 pb-24 space-y-6">
        <button
          onClick={handleNewScan}
          className="text-green-700 font-medium hover:text-green-900 transition-colors"
        >
          &larr; New Bounty
        </button>

        {/* Product header */}
        <div className="text-center">
          <h2 className="font-display text-2xl font-bold text-green-900">
            {product?.product_name}
          </h2>
          <p className="text-green-600">{product?.brand}</p>
        </div>

        {/* Score ring */}
        <div className="flex justify-center">
          <ScoreRing score={score} />
        </div>

        {/* Data quality banner */}
        <DataQualityBanner dataQuality={dataQuality} />

        {/* Breakdown */}
        <OrnamentalCard>
          <BreakdownChart breakdown={breakdown} reasons={breakdownReasons} />
        </OrnamentalCard>

        {/* Ingredients */}
        <OrnamentalCard>
          <IngredientList ingredients={ingredientResults} />
        </OrnamentalCard>

        {/* Nutrition Facts */}
        {nutritionFacts && (
          <OrnamentalCard>
            <NutritionFacts nutrition={nutritionFacts} source={nutritionSource} />
          </OrnamentalCard>
        )}

        {/* Brand profile */}
        <OrnamentalCard>
          <BrandProfile profile={brandProfile} brand={product?.brand} />
        </OrnamentalCard>

        {/* Alternatives */}
        <OrnamentalCard>
          <AlternativesList alternatives={alternatives} currentScore={score} />
        </OrnamentalCard>

        {/* Evidence */}
        <OrnamentalCard>
          <SourcesList
            groundingSources={groundingSources}
            brandProfile={brandProfile}
            ingredientResults={ingredientResults}
            alternatives={alternatives}
          />
        </OrnamentalCard>
      </div>
    );
  }

  // Scanner view
  return (
    <div className="max-w-lg mx-auto px-4 py-6 pb-24 flex flex-col items-center gap-6">
      <div className="text-center space-y-2">
        <div className="relative inline-flex items-center justify-center px-8 py-3">
          <img src="/saloonsign.png" alt="" className="absolute inset-0 w-full h-full object-fill" />
          <h1 className="relative font-display text-3xl font-bold text-white drop-shadow-md mt-4">Origin Trail</h1>
        </div>
        <p className="text-green-600">Draw your product — get the full bounty report</p>
        <div className="mt-3 p-4 rounded-xl bg-cream-100 border border-cream-300 text-left space-y-2 text-sm text-green-800">
          <p className="font-semibold text-green-900">How it works</p>
          <p>Every product earns a <span className="font-semibold text-gold-600">bounty score</span> from 0–100. A <span className="font-semibold text-gold-600">higher bounty means a more sustainable product</span> — better ingredients, ethical brand practices, and lower environmental impact.</p>
          <div className="flex gap-3 pt-1">
            <div className="flex-1 p-2 rounded-lg bg-gold-50 border border-gold-200 text-center">
              <div className="font-display text-gold-600 text-sm">High Bounty</div>
              <div className="text-xs text-green-700 mt-0.5">80–100 · Seek these out</div>
            </div>
            <div className="flex-1 p-2 rounded-lg bg-yellow-50 border border-yellow-200 text-center">
              <div className="font-display text-yellow-600 text-sm">Moderate</div>
              <div className="text-xs text-green-700 mt-0.5">50–79 · Room to improve</div>
            </div>
            <div className="flex-1 p-2 rounded-lg bg-rust-50 border border-rust-200 text-center">
              <div className="font-display text-rust-600 text-sm">Low Bounty</div>
              <div className="text-xs text-green-700 mt-0.5">0–49 · Avoid if possible</div>
            </div>
          </div>
        </div>
      </div>

      {/* Camera or preview */}
      <div className="w-full aspect-[4/3] rounded-2xl overflow-hidden bg-cream-200 relative">
        {cameraActive ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
        ) : preview ? (
          <img src={preview} alt="Product" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-green-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-16 h-16 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
            </svg>
            <span className="text-sm">No image selected</span>
          </div>
        )}

        {/* Scanning overlay */}
        {(status === "scanning" || status === "analyzing") && (
          <div className="absolute inset-0 bg-green-950/70 flex flex-col items-center justify-center">
            <Tumbleweed status={status} />
          </div>
        )}
      </div>

      {/* Error */}
      {status === "error" && (
        <div className="w-full p-4 rounded-xl bg-red-50 text-red-800 text-sm">
          <p className="font-medium">Trail went cold</p>
          <p>{error}</p>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3 w-full">
        {cameraActive ? (
          <button
            onClick={capturePhoto}
            className="flex-1 py-3 px-6 rounded-xl bg-green-800 text-cream-50 font-semibold hover:bg-green-900 transition-colors"
          >
            Mark Log
          </button>
        ) : (
          <>
            <button
              onClick={startCamera}
              disabled={status === "scanning" || status === "analyzing"}
              className="flex-1 py-3 px-6 rounded-xl bg-green-800 text-cream-50 font-semibold hover:bg-green-900 transition-colors disabled:opacity-50"
            >
              Use Camera
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={status === "scanning" || status === "analyzing"}
              className="flex-1 py-3 px-6 rounded-xl bg-cream-200 text-green-800 font-semibold hover:bg-cream-300 transition-colors disabled:opacity-50"
            >
              Upload Image
            </button>
          </>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Extracted product info while analyzing */}
      {product && status === "analyzing" && (
        <div className="w-full p-4 rounded-xl bg-white shadow-sm text-center">
          <p className="font-semibold text-green-900">{product.product_name}</p>
          <p className="text-sm text-green-600">{product.brand}</p>
          <p className="text-xs text-green-400 mt-1">
            {product.ingredients?.length || 0} ingredients found
          </p>
        </div>
      )}
    </div>
  );
}
