import { ERA_FILTERS, useChronoStore } from "../store/useStore";

export default function EraFilter() {
  const activeEra = useChronoStore((state) => state.activeEra);
  const setActiveEra = useChronoStore((state) => state.setActiveEra);

  return (
    <nav
      aria-label="Era filters"
      className="pointer-events-auto flex max-w-[calc(100vw-32px)] items-center gap-1 overflow-x-auto rounded-xl border border-slate-200/80 bg-white/84 p-1 shadow-panel backdrop-blur-xl"
    >
      {ERA_FILTERS.map((filter) => {
        const isActive = activeEra === filter.id;

        return (
          <button
            key={filter.id}
            type="button"
            onClick={() => setActiveEra(filter.id)}
            className={`h-9 shrink-0 rounded-lg px-3 text-xs font-bold uppercase tracking-wide transition focus:outline-none focus:ring-2 focus:ring-teal-200 ${
              isActive
                ? "bg-teal-600 text-white shadow-[0_0_16px_rgba(13,148,136,0.22)]"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
            }`}
            aria-pressed={isActive}
          >
            {filter.label}
          </button>
        );
      })}
    </nav>
  );
}
