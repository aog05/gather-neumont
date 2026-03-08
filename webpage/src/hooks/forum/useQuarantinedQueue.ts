import { useEffect, useState } from "react";
import { collection, limit, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { db } from "../../lib/firebase";
import type { ForumMessage } from "../../types/forum.types";
import { mapForumMessage } from "./mapForumMessage";

export function useQuarantinedQueue(enabled: boolean) {
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
      where("status", "==", "quarantined"),
      orderBy("quarantinedAt", "desc"),
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
        console.error("[forum] quarantined queue listener error", err);
        setError("Failed to load quarantined queue");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [enabled]);

  return { messages, loading, error };
}
