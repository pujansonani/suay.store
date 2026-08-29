export default function ClinicSectionLayout({ children }: { children: React.ReactNode }) {
  // The portal chrome is applied by the (portal) group; sign-in, registration
  // and the status screen deliberately sit outside it.
  return children;
}
