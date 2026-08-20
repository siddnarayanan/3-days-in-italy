/** @jest-environment jsdom */
import "@testing-library/jest-dom";
import { render, screen, fireEvent, within } from "@testing-library/react";
import TripWizard from "./TripWizard";
import type { Place } from "@/lib/types";

// StepLocation renders a map preview via next/dynamic; Leaflet doesn't run
// meaningfully in jsdom (no real layout engine), so it's mocked out here —
// this test is about the wizard's navigation/state logic, not the map.
jest.mock("@/components/MapView", () => ({
  __esModule: true,
  default: () => null,
}));

function makePlace(overrides: Partial<Place> & Pick<Place, "id" | "city" | "name">): Place {
  return {
    type: "historic_site",
    region: null,
    neighborhood: null,
    description: "",
    tags: [],
    rating: 4,
    priceRange: "€€",
    durationMinutes: 60,
    hoursRaw: null,
    hoursParsed: null,
    seasonalNotes: null,
    bookingRequired: false,
    lat: null,
    lng: null,
    ...overrides,
  };
}

const FIXTURE_PLACES: Place[] = [
  makePlace({ id: "p1", name: "Duomo", city: "Florence", region: "Tuscany", tags: ["art", "historic"], lat: 43.77, lng: 11.25 }),
  makePlace({ id: "p2", name: "Uffizi Gallery", city: "Florence", region: "Tuscany", tags: ["art"], lat: 43.77, lng: 11.26 }),
  makePlace({
    id: "p3",
    name: "Trattoria Sostanza",
    city: "Florence",
    region: "Tuscany",
    type: "restaurant",
    tags: ["food"],
    lat: 43.77,
    lng: 11.25,
  }),
  makePlace({ id: "p4", name: "Colosseum", city: "Rome", region: "Lazio", tags: ["historic", "iconic"], lat: 41.89, lng: 12.49 }),
];

function renderWizard(onSubmit = jest.fn()) {
  render(<TripWizard places={FIXTURE_PLACES} onSubmit={onSubmit} isSubmitting={false} submitError={null} />);
  return onSubmit;
}

// Drives the wizard from a blank start up through (but not including) Review,
// with a specific set of choices, so each test isn't repeating all 6 steps by hand.
async function completeUpToReview() {
  fireEvent.click(screen.getByRole("button", { name: "Florence" }));
  fireEvent.click(await screen.findByRole("button", { name: "Continue" }));

  expect(await screen.findByRole("heading", { name: "Explore beyond Florence?" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /No, just Florence/ }));
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));

  expect(await screen.findByRole("heading", { name: "What pace do you like?" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /Moderate/ }));

  expect(await screen.findByRole("heading", { name: "What are you interested in?" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "art" }));
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));

  expect(await screen.findByRole("heading", { name: "What's your budget?" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "No preference" }));

  expect(await screen.findByRole("heading", { name: "When are you starting?" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Skip" }));

  expect(await screen.findByRole("heading", { name: "Anything else?" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Skip" }));
}

describe("TripWizard", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("walks through every step and submits the expected preferences", async () => {
    const onSubmit = renderWizard();
    expect(screen.getByRole("heading", { name: "Where in Italy?" })).toBeInTheDocument();

    await completeUpToReview();

    expect(await screen.findByRole("heading", { name: "Ready to build your trip?" })).toBeInTheDocument();
    expect(screen.getByText("Florence only")).toBeInTheDocument();
    expect(screen.getByText("Moderate")).toBeInTheDocument();
    expect(screen.getByText("art")).toBeInTheDocument();
    expect(screen.getByText("No preference")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Build my itinerary" }));

    expect(onSubmit).toHaveBeenCalledWith({
      homeBase: "Florence",
      travelRadiusKm: 0,
      pace: "moderate",
      interests: ["art"],
      budget: "any",
      notes: "",
      startDate: null,
    });
  });

  it("supports going back a step via the back arrow", async () => {
    renderWizard();
    fireEvent.click(screen.getByRole("button", { name: "Florence" }));
    fireEvent.click(await screen.findByRole("button", { name: "Continue" }));
    expect(await screen.findByRole("heading", { name: "Explore beyond Florence?" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /No, just Florence/ }));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(await screen.findByRole("heading", { name: "What pace do you like?" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Back" }));

    expect(await screen.findByRole("heading", { name: "Explore beyond Florence?" })).toBeInTheDocument();
  });

  it("lets you jump back to a specific step from the review screen", async () => {
    renderWizard();
    await completeUpToReview();
    expect(await screen.findByRole("heading", { name: "Ready to build your trip?" })).toBeInTheDocument();

    const paceRow = screen.getByText("Pace").parentElement!.parentElement!;
    fireEvent.click(within(paceRow).getByRole("button", { name: "Edit" }));

    expect(await screen.findByRole("heading", { name: "What pace do you like?" })).toBeInTheDocument();
  });

  it("persists progress across a remount (e.g. a page refresh)", async () => {
    const { unmount } = render(
      <TripWizard places={FIXTURE_PLACES} onSubmit={jest.fn()} isSubmitting={false} submitError={null} />
    );
    fireEvent.click(screen.getByRole("button", { name: "Florence" }));
    fireEvent.click(await screen.findByRole("button", { name: "Continue" }));
    expect(await screen.findByRole("heading", { name: "Explore beyond Florence?" })).toBeInTheDocument();
    unmount();

    render(<TripWizard places={FIXTURE_PLACES} onSubmit={jest.fn()} isSubmitting={false} submitError={null} />);

    expect(await screen.findByRole("heading", { name: "Explore beyond Florence?" })).toBeInTheDocument();
  });
});
