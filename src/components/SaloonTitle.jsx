export default function SaloonTitle({ text, className = "text-3xl" }) {
  return (
    <div className="relative inline-flex items-center justify-center px-8 py-3">
      <img
        src="/saloonsign.png"
        alt=""
        className="absolute inset-0 w-full h-full"
        style={{ objectFit: "fill" }}
      />
      <h1 className={`relative font-display font-bold text-white drop-shadow-md mt-4 ${className}`}>
        {text}
      </h1>
    </div>
  );
}
