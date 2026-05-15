export default function Tooltip({ label, children, side = "bottom" }) {
  const sideClass =
    side === "top"
      ? "bottom-full left-1/2 mb-2 -translate-x-1/2"
      : "left-1/2 top-full mt-2 -translate-x-1/2";

  return (
    <span className="group relative inline-flex">
      {children}
      <span
        role="tooltip"
        className={`pointer-events-none absolute ${sideClass} z-50 whitespace-nowrap rounded-md border border-slate-200 bg-white/95 px-2.5 py-1.5 text-xs font-medium text-slate-700 opacity-0 shadow-panel transition duration-150 group-hover:opacity-100 group-focus-within:opacity-100`}
      >
        {label}
      </span>
    </span>
  );
}
