import AppHeader from "./AppHeader";
import EraFilter from "./EraFilter";
import Toast from "./Toast";

export default function AppShell({ children }) {
  return (
    <main className="relative h-screen w-screen overflow-hidden bg-slate-100 font-sans text-slate-950">
      {children}

      <section className="pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-center px-3 pt-3 sm:px-5 sm:pt-5">
        <AppHeader />
      </section>

      <section className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-center px-3 pb-4 sm:pb-6">
        <EraFilter />
      </section>

      <Toast />
    </main>
  );
}
