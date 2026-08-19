import { getPlaces } from "@/lib/places";
import PlannerApp from "@/components/PlannerApp";

export default function Home() {
  const places = getPlaces();

  return (
    <div className="flex-1 bg-stone-50">
      <main className="mx-auto max-w-[1800px] px-4 py-10 sm:px-6 sm:py-16 lg:px-10">
        <header className="mb-10 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">3 Days in Italy</h1>
          <p className="mx-auto mt-2 max-w-xl text-stone-600">
            Tell us your style, and we&apos;ll build a personalized 3-day itinerary from ~100 places across
            Italy.
          </p>
        </header>
        <PlannerApp places={places} />
      </main>
    </div>
  );
}
