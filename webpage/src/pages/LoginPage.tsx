import { Navigate } from "react-router-dom";

export default function LoginPage() {
  // Deprecated route: keep the file for compatibility, but redirect to /sign-in.
  return <Navigate to="/sign-in" replace />;
}
