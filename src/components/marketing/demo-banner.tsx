import { Info } from "lucide-react";

/**
 * States plainly that the data is fictional. A product about trust cannot let
 * someone believe these are real clinics with real availability.
 */
export function DemoBanner() {
  return (
    <div className="border-b border-line bg-navy-600 text-white">
      <div className="container-page flex items-center gap-2 py-1.5 text-[0.75rem]">
        <Info aria-hidden className="size-3.5 shrink-0 text-teal-200" />
        <p>
          <span className="font-medium">Demo environment.</span>{" "}
          <span className="text-navy-100">
            All clinics, practitioners and reviews are fictional sample data. No real payments are
            processed.
          </span>
        </p>
      </div>
    </div>
  );
}
