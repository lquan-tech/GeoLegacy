import { Globe2, Plus, Search } from "lucide-react";
import { useChronoStore } from "../store/useStore";
import Tooltip from "./Tooltip";
import UserMenu from "./UserMenu";

export default function AppHeader() {
  const searchQuery = useChronoStore((state) => state.searchQuery);
  const setSearchQuery = useChronoStore((state) => state.setSearchQuery);
  const openAddSite = useChronoStore((state) => state.openAddSite);

  return (
    <header className="pointer-events-auto flex w-full items-center gap-3 rounded-xl border border-slate-200/80 bg-white/84 px-3 py-2 text-slate-950 shadow-panel backdrop-blur-xl md:max-w-4xl md:px-4">
      <div className="flex min-w-0 items-center gap-2 pr-1">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-teal-200 bg-teal-50 text-teal-700 shadow-[0_0_18px_rgba(13,148,136,0.16)]">
          <Globe2 size={19} />
        </span>
        <div className="min-w-0 max-w-[86px] sm:max-w-none">
          <p className="truncate text-sm font-black tracking-wide text-slate-950">GeoLegacy</p>
          <p className="hidden truncate text-[11px] font-medium text-slate-500 sm:block">
            Community heritage atlas
          </p>
        </div>
      </div>

      <label className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/90 px-3 transition focus-within:border-teal-400 focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(20,184,166,0.12)]">
        <Search size={17} className="shrink-0 text-slate-500" />
        <input
          type="search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search"
          className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
        />
      </label>

      <Tooltip label="Add historical site">
        <button
          type="button"
          onClick={openAddSite}
          className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg border border-teal-500 bg-teal-600 px-3 text-sm font-bold text-white shadow-[0_0_18px_rgba(13,148,136,0.28)] transition hover:bg-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200"
          aria-label="Add historical site"
        >
          <Plus size={18} strokeWidth={2.5} />
          <span className="hidden sm:inline">Add Site</span>
        </button>
      </Tooltip>

      <UserMenu />
    </header>
  );
}
