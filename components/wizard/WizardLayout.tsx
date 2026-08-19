interface Props {
  title: string;
  subtitle?: string;
  stepIndex: number; // 0-based
  totalSteps: number;
  onBack?: () => void;
  children: React.ReactNode;
}

export default function WizardLayout({ title, subtitle, stepIndex, totalSteps, onBack, children }: Props) {
  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <div className="mb-3 flex gap-1.5">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i <= stepIndex ? "bg-indigo-700" : "bg-stone-200"
              }`}
            />
          ))}
        </div>
        <div className="flex items-center gap-2">
          {onBack && (
            <button
              onClick={onBack}
              aria-label="Back"
              className="rounded-full p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
            >
              ←
            </button>
          )}
          <h2 className="text-xl font-semibold text-stone-900">{title}</h2>
        </div>
        {subtitle && <p className="mt-1 text-sm text-stone-500">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}
