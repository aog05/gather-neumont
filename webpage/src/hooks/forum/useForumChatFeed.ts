import { useCallback, useEffect, useMemo, useState } from "react";
import {
  collection,
  documentId,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  startAfter,
  where,
  type QueryDocumentSnapshot,
  type DocumentData,
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import type { ForumMessage } from "../../types/forum.types";
import { mapForumMessage } from "./mapForumMessage";

const PAGE_SIZE = 200;

export function useForumChatFeed() {
  const [liveMessages, setLiveMessages] = useState<ForumMessage[]>([]);
  const [olderMessages, setOlderMessages] = useState<ForumMessage[]>([]);
  const [cursor, setCursor] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const feedQuery = query(
      collection(db, "chat", "global", "messages"),
      where("status", "==", "active"),
      orderBy("createdAt", "desc"),
      orderBy(documentId(), "desc"),
      limit(PAGE_SIZE)
    );

    const unsubscribe = onSnapshot(
      feedQuery,
      (snapshot) => {
        const mapped = snapshot.docs.map(mapForumMessage);
        setLiveMessages(mapped);
        setError(null);
        setLoading(false);

        if (olderMessages.length === 0) {
          setCursor(snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null);
          setHasMore(snapshot.docs.length === PAGE_SIZE);
        }
      },
      (err) => {
        console.error("[forum] feed listener error", err);
        const code = (err as { code?: string }).code;
        const suffix = code ? ` (${code})` : "";
        setError(`Failed to load chat feed${suffix}`);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [olderMessages.length]);

  const loadOlder = useCallback(async () => {
    if (!cursor || !hasMore || loadingOlder) return;
    setLoadingOlder(true);

    try {
      const olderQuery = query(
        collection(db, "chat", "global", "messages"),
        where("status", "==", "active"),
        orderBy("createdAt", "desc"),
        orderBy(documentId(), "desc"),
        startAfter(cursor),
        limit(PAGE_SIZE)
      );
      const olderSnapshot = await getDocs(olderQuery);

      const mapped = olderSnapshot.docs.map(mapForumMessage);
      setOlderMessages((prev) => [...prev, ...mapped]);

      if (olderSnapshot.docs.length > 0) {
        setCursor(olderSnapshot.docs[olderSnapshot.docs.length - 1]);
      }
      if (olderSnapshot.docs.length < PAGE_SIZE) {
        setHasMore(false);
      }
    } catch (err) {
      console.error("[forum] load older failed", err);
      setError("Failed to load older messages");
    } finally {
      setLoadingOlder(false);
    }
  }, [cursor, hasMore, loadingOlder]);

  const messages = useMemo(() => {
    const seen = new Set<string>();
    const merged: ForumMessage[] = [];
    for (const message of [...liveMessages, ...olderMessages]) {
      if (seen.has(message.id)) continue;
      seen.add(message.id);
      merged.push(message);
    }
    return merged;
  }, [liveMessages, olderMessages]);

  return {
    messages,
    loading,
    loadingOlder,
    hasMore,
    error,
    loadOlder,
  };
}
