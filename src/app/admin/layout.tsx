export default function AdminSectionLayout({ children }: { children: React.ReactNode }) {
  // The panel chrome is applied by the (panel) group; the sign-in page sits
  // outside it so an unauthenticated visitor never sees the navigation.
  return children;
}
