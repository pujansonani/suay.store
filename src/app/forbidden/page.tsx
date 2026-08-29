import { FullPageState } from "@/components/ui/states";

export const metadata = { title: "Access denied" };

export default function ForbiddenPage() {
  return (
    <FullPageState
      variant="forbidden"
      title="You do not have access to this area"
      description="Your account does not have permission to view this page. If you believe this is a mistake, contact the person who set up your account."
      primaryHref="/"
      primaryLabel="Back to Suay"
    />
  );
}
