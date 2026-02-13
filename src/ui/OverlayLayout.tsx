import { useEffect, useRef, useState } from "react";
import { useLocation, useOutlet } from "react-router-dom";
import GamePage from "../Game.tsx";
import { useAuth } from "../features/auth/AuthContext";
import ProfileHUD from "./profile/ProfileHUD";
import QuizPanel from "./quiz/QuizPanel";
import { appEvents } from "../events/appEvents";
import { isOverlayRoute } from "../utils/overlayRoutes";
import "../styles/quiz-ui.css";

export default function OverlayLayout() {
  const auth = useAuth();
  const location = useLocation();
  const outlet = useOutlet();
  const [isDailyQuizOpen, setIsDailyQuizOpen] = useState(false);
  const pathname = location.pathname;
  const isOverlayVisible = isOverlayRoute(pathname);
  const overlayRootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOverlayVisible) return;
    if (isDailyQuizOpen) setIsDailyQuizOpen(false);
    // Ensure key events are captured even when no input is focused.
    overlayRootRef.current?.focus();
  }, [isDailyQuizOpen, isOverlayVisible, outlet]);

  useEffect(() => {
    appEvents.emitDailyQuizOpenChanged(isDailyQuizOpen);
  }, [isDailyQuizOpen]);

  useEffect(() => {
    const off = appEvents.onOpenDailyQuiz(() => {
      if (isOverlayVisible) return;
      setIsDailyQuizOpen(true);
    });
    return off;
  }, [isOverlayVisible]);

  useEffect(() => {
    function onDailyQuizStart(_event: Event) {
      console.log("[quiz] dailyQuiz:start received");
      appEvents.emitOpenDailyQuiz();
    }

    window.addEventListener("dailyQuiz:start", onDailyQuizStart);
    return () => {
      window.removeEventListener("dailyQuiz:start", onDailyQuizStart);
    };
  }, []);

  function stopKeys(e: React.KeyboardEvent) {
    // Always stop propagation so Phaser key listeners don't run.
    e.stopPropagation();
    // Also stop any other native listeners on the same target during bubbling.
    // (Not supported in all browsers, but safe to attempt.)
    (e.nativeEvent as any)?.stopImmediatePropagation?.();

    const target = e.target as HTMLElement | null;
    const tag = target?.tagName?.toLowerCase();
    const isEditable =
      tag === "input" ||
      tag === "textarea" ||
      tag === "select" ||
      Boolean(target && (target as any).isContentEditable);

    // Only prevent default when the user isn't typing into an editable control.
    if (!isEditable) {
      e.preventDefault();
    }
  }

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <GamePage />

      {!isOverlayVisible ? <ProfileHUD /> : null}

      {!isOverlayVisible ? (
        <QuizPanel isOpen={isDailyQuizOpen} onClose={() => setIsDailyQuizOpen(false)} />
      ) : null}

      {auth.mode === "guest" ? (
        <div
          style={{
            position: "fixed",
            top: 12,
            right: 12,
            zIndex: 50,
            pointerEvents: "none",
            padding: "6px 10px",
            borderRadius: 999,
            border: "1px solid rgba(255, 255, 255, 0.16)",
            background: "rgba(0, 0, 0, 0.45)",
            color: "rgba(255, 255, 255, 0.9)",
            fontSize: 12,
            lineHeight: 1,
            backdropFilter: "blur(6px)",
          }}
        >
          Guest — progress not saved
        </div>
      ) : null}

      {isOverlayVisible ? (
        <div
          ref={overlayRootRef}
          tabIndex={-1}
          onKeyDownCapture={stopKeys}
          onKeyUpCapture={stopKeys}
          onKeyPressCapture={stopKeys}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 10,
            pointerEvents: "auto",
            outline: "none",
          }}
        >
          {outlet}
        </div>
      ) : null}
    </div>
  );
}
