import { FullPageState } from "@/components/ui/states";

export const metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <FullPageState
      variant="warning"
      title="We could not find that page"
      description="The page may have moved, or the clinic may no longer be listed on Suay."
      primaryHref="/clinics"
      primaryLabel="Browse clinics"
    />
  );
}
