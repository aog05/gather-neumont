export function isOverlayRoute(pathname: string): boolean {
  return (
    pathname === "/login" ||
    pathname === "/sign-in" ||
    pathname === "/create-account" ||
    pathname === "/admin" ||
    pathname === "/onboarding" ||
    pathname.startsWith("/onboarding/") ||
    pathname === "/account" ||
    pathname.startsWith("/account/")
  );
}

