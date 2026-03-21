import { useRef, useState, useCallback } from "react";
import { useScanStore } from "../store/scanStore";
import ScoreRing from "../components/ScoreRing";
import BreakdownChart from "../components/BreakdownChart";
import IngredientList from "../components/IngredientList";
import BrandProfile from "../components/BrandProfile";
import AlternativesList from "../components/AlternativesList";

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

  const { status, error, scanResults, scan, reset } = useScanStore();

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
  if (status === "done" && scanResults.length > 0) {
    return (
      <div className="max-w-lg mx-auto px-4 py-6 pb-24 space-y-6">
        <button
          onClick={handleNewScan}
          className="text-green-700 font-medium hover:text-green-900 transition-colors"
        >
          &larr; New Scan
        </button>

        {scanResults.length > 1 && (
          <p className="text-center text-sm text-green-600 font-medium">
            {scanResults.length} products detected
          </p>
        )}

        {scanResults.map((result, index) => (
          <div key={index} className="space-y-4">
            {/* Product header */}
            <div className="text-center">
              <h2 className="font-display text-2xl font-bold text-green-900">
                {result.product?.product_name}
              </h2>
              <p className="text-green-600">{result.product?.brand}</p>
            </div>

            {/* Score ring */}
            <div className="flex justify-center">
              <ScoreRing score={result.score} />
            </div>

            {/* Breakdown */}
            <div className="p-5 rounded-2xl bg-white shadow-sm">
              <BreakdownChart breakdown={result.breakdown} />
            </div>

            {/* Ingredients */}
            <div className="p-5 rounded-2xl bg-white shadow-sm">
              <IngredientList ingredients={result.ingredientResults} />
            </div>

            {/* Brand profile */}
            <div className="p-5 rounded-2xl bg-white shadow-sm">
              <BrandProfile profile={result.brandProfile} brand={result.product?.brand} />
            </div>

            {/* Alternatives */}
            <div className="p-5 rounded-2xl bg-white shadow-sm">
              <AlternativesList alternatives={result.alternatives} currentScore={result.score} />
            </div>

            {index < scanResults.length - 1 && (
              <hr className="border-cream-300" />
            )}
          </div>
        ))}
      </div>
    );
  }

  // Scanner view
  return (
    <div className="max-w-lg mx-auto px-4 py-6 pb-24 flex flex-col items-center gap-6">
      <div className="text-center">
        <h1 className="font-display text-3xl font-bold text-green-900">EcoScan</h1>
        <p className="text-green-600 mt-1">Scan a product to check its sustainability</p>
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
          <div className="absolute inset-0 bg-green-950/60 flex flex-col items-center justify-center text-white">
            <div className="w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin mb-3" />
            <p className="font-medium">
              {status === "scanning" ? "Scanning product..." : "Analyzing sustainability..."}
            </p>
          </div>
        )}
      </div>

      {/* Error */}
      {status === "error" && (
        <div className="w-full p-4 rounded-xl bg-red-50 text-red-800 text-sm">
          <p className="font-medium">Scan failed</p>
          <p>{error}</p>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3 w-full">
        {cameraActive ? (
          <button
            onClick={capturePhoto}
            className="flex-1 py-3 px-6 rounded-xl bg-green-700 text-white font-semibold hover:bg-green-800 transition-colors"
          >
            Capture Photo
          </button>
        ) : (
          <>
            <button
              onClick={startCamera}
              disabled={status === "scanning" || status === "analyzing"}
              className="flex-1 py-3 px-6 rounded-xl bg-green-700 text-white font-semibold hover:bg-green-800 transition-colors disabled:opacity-50"
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

    </div>
  );
}
