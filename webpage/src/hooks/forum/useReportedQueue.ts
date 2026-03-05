import { useEffect, useState } from "react";
import { collection, limit, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { db } from "../../lib/firebase";
import type { ForumMessage } from "../../types/forum.types";
import { mapForumMessage } from "./mapForumMessage";

export function useReportedQueue(enabled: boolean) {
  const [messages, setMessages] = useState<ForumMessage[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setMessages([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    const queueQuery = query(
      collection(db, "chat", "global", "messages"),
      where("status", "==", "active"),
      where("hasOpenReports", "==", true),
      orderBy("lastReportedAt", "desc"),
      limit(100)
    );

    const unsubscribe = onSnapshot(
      queueQuery,
      (snapshot) => {
        setMessages(snapshot.docs.map(mapForumMessage));
        setError(null);
        setLoading(false);
      },
      (err) => {
        console.error("[forum] reported queue listener error", err);
        setError("Failed to load reported queue");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [enabled]);

  return { messages, loading, error };
}
