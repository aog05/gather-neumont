import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from "react-router-dom";
import QuizDevPage from "./pages/QuizDevPage.tsx";
import OverlayLayout from "./ui/OverlayLayout.tsx";
import { useAuth } from "./features/auth/AuthContext.tsx";
import OnboardingLanding from "./pages/onboarding/Landing";
import ProfileStep from "./pages/onboarding/ProfileStep";
import AvatarStep from "./pages/onboarding/AvatarStep";
import MajorStep from "./pages/onboarding/MajorStep";
import SignInPage from "./pages/SignInPage";
import CreateAccountPage from "./pages/CreateAccountPage";
import AccountHub from "./pages/account/AccountHub";
import EditProfile from "./pages/account/EditProfile";
import EditMajor from "./pages/account/EditMajor";
import EditAvatar from "./pages/account/EditAvatar";

import "./index.css";

function OnboardingGuard() {
  const auth = useAuth();
  const location = useLocation();
  const pathname = location.pathname;
  const isAccountRoute = pathname === "/account" || pathname.startsWith("/account/");

  if ((auth.mode === "user" || auth.mode === "admin") && auth.profileComplete === false) {
    if (isAccountRoute) return <Outlet />;
    return <Navigate to="/onboarding/profile" replace />;
  }

  return <Outlet />;
}

function GameIndex() {
  // OverlayLayout always renders the game background; this just represents the "/" child route.
  return null;
}

function AdminPage() {
  const auth = useAuth();

  return (
    <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
      <div style={{ maxWidth: 520, padding: 24 }}>
        <h1>Admin</h1>
        <p>Auth mode: {auth.mode}</p>
        <p>Placeholder admin route.</p>
      </div>
    </div>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<OverlayLayout />}>
          <Route path="login" element={<Navigate to="/sign-in" replace />} />
          <Route path="sign-in" element={<SignInPage />} />
          <Route path="create-account" element={<CreateAccountPage />} />

          <Route path="onboarding">
            <Route index element={<OnboardingLanding />} />
            <Route path="profile" element={<ProfileStep />} />
            <Route path="avatar" element={<AvatarStep />} />
            <Route path="major" element={<MajorStep />} />
          </Route>

          <Route element={<OnboardingGuard />}>
            <Route index element={<GameIndex />} />
            <Route path="account" element={<Outlet />}>
              <Route index element={<AccountHub />} />
              <Route path="profile" element={<EditProfile />} />
              <Route path="major" element={<EditMajor />} />
              <Route path="avatar" element={<EditAvatar />} />
            </Route>
            <Route path="admin" element={<AdminPage />} />
            <Route path="dev/quiz" element={<QuizDevPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
