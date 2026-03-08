import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../../lib/firebase";
import type { ForumMessage } from "../../types/forum.types";
import { mapForumMessageData } from "./mapForumMessage";

export function useForumPinnedMessage() {
  const [pinnedMessageId, setPinnedMessageId] = useState<string | null>(null);
  const [pinnedMessage, setPinnedMessage] = useState<ForumMessage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeMessage: (() => void) | null = null;

    const unsubscribePinned = onSnapshot(
      doc(db, "chat", "global", "meta", "pinned"),
      (snapshot) => {
        const data = snapshot.data() as { messageId?: unknown } | undefined;
        const nextMessageId =
          typeof data?.messageId === "string" && data.messageId.trim().length > 0
            ? data.messageId
            : null;

        setPinnedMessageId(nextMessageId);
        if (!nextMessageId) {
          setPinnedMessage(null);
          setLoading(false);
          if (unsubscribeMessage) {
            unsubscribeMessage();
            unsubscribeMessage = null;
          }
          return;
        }

        if (unsubscribeMessage) {
          unsubscribeMessage();
          unsubscribeMessage = null;
        }

        unsubscribeMessage = onSnapshot(
          doc(db, "chat", "global", "messages", nextMessageId),
          (messageSnap) => {
            if (!messageSnap.exists()) {
              setPinnedMessage(null);
              setLoading(false);
              return;
            }
            const mapped = mapForumMessageData(
              messageSnap.id,
              messageSnap.data() as Record<string, unknown>
            );
            setPinnedMessage(mapped.status === "active" ? mapped : null);
            setLoading(false);
          },
          () => {
            setPinnedMessage(null);
            setLoading(false);
          }
        );
      },
      () => {
        setPinnedMessageId(null);
        setPinnedMessage(null);
        setLoading(false);
      }
    );

    return () => {
      unsubscribePinned();
      if (unsubscribeMessage) {
        unsubscribeMessage();
      }
    };
  }, []);

  return {
    pinnedMessageId,
    pinnedMessage,
    loading,
  };
}
