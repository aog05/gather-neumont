import { useState, useEffect, useRef } from "react";
import type { DialogueNode } from "../types/dialogue.types";
import { GameEventBridge } from "../systems/GameEventBridge";
import "./DialogueUI.css";

/**
 * DialogueUI - React component for displaying NPC dialogue
 *
 * Features:
 * - Typewriter text animation
 * - Response button selection
 * - Skip/fast-forward functionality
 * - Close button
 * - Gather-like aesthetic
 */
export default function DialogueUI() {
  const [isVisible, setIsVisible] = useState(false);
  const [currentNode, setCurrentNode] = useState<DialogueNode | null>(null);
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [canAdvance, setCanAdvance] = useState(false);

  const bridgeRef = useRef(GameEventBridge.getInstance());
  const typingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Listen for dialogue events
  useEffect(() => {
    const bridge = bridgeRef.current;

    const handleDialogueStart = (data: { npcId: string; node: DialogueNode }) => {
      console.log("DialogueUI: Dialogue started", data);
      setCurrentNode(data.node);
      setIsVisible(true);
      setCanAdvance(false);
    };

    const handleDialogueUpdate = (data: { node: DialogueNode }) => {
      console.log("DialogueUI: Dialogue updated", data);
      setCurrentNode(data.node);
      setCanAdvance(false);
    };

    const handleDialogueEnd = () => {
      console.log("DialogueUI: Dialogue ended");
      setIsVisible(false);
      setCurrentNode(null);
      setDisplayedText("");
      setIsTyping(false);
      setCanAdvance(false);
    };

    bridge.on("dialogue:start", handleDialogueStart);
    bridge.on("dialogue:update", handleDialogueUpdate);
    bridge.on("dialogue:end", handleDialogueEnd);

    return () => {
      bridge.off("dialogue:start", handleDialogueStart);
      bridge.off("dialogue:update", handleDialogueUpdate);
      bridge.off("dialogue:end", handleDialogueEnd);
    };
  }, []);

  // Typewriter effect
  useEffect(() => {
    if (!currentNode) {
      return;
    }

    // Clear any existing typing animation
    if (typingIntervalRef.current) {
      clearInterval(typingIntervalRef.current);
    }

    setDisplayedText("");
    setIsTyping(true);
    setCanAdvance(false);

    const text = currentNode.text;
    let index = 0;

    typingIntervalRef.current = setInterval(() => {
      if (index < text.length) {
        setDisplayedText(text.slice(0, index + 1));
        index++;
      } else {
        // Typing complete
        clearInterval(typingIntervalRef.current!);
        typingIntervalRef.current = null;
        setIsTyping(false);
        setCanAdvance(true);
      }
    }, 30); // 30ms per character

    return () => {
      if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current);
      }
    };
  }, [currentNode]);

  const handleResponseClick = (responseId: string) => {
    if (!canAdvance) {
      return;
    }

    const bridge = bridgeRef.current;
    bridge.emit("dialogue:response", { responseId });
  };

  const handleClose = () => {
    const bridge = bridgeRef.current;
    bridge.emit("dialogue:close", {});
  };

  const handleSkip = () => {
    if (!currentNode || !isTyping) {
      return;
    }

    // Fast-forward typewriter
    if (typingIntervalRef.current) {
      clearInterval(typingIntervalRef.current);
      typingIntervalRef.current = null;
    }

    setDisplayedText(currentNode.text);
    setIsTyping(false);
    setCanAdvance(true);
  };

  const handleContinue = () => {
    if (!canAdvance || !currentNode) {
      return;
    }

    // For dialogue type nodes with next property
    if (currentNode.type === "dialogue" && currentNode.next) {
      handleResponseClick("continue");
    }
  };

  // Don't render if not visible
  if (!isVisible || !currentNode) {
    return null;
  }

  return (
    <div className="dialogue-overlay" onClick={isTyping ? handleSkip : undefined}>
      <div className="dialogue-box" onClick={(e) => e.stopPropagation()}>
        {/* Header with speaker name */}
        <div className="dialogue-header">
          <div className="dialogue-speaker">{currentNode.speaker}</div>
          <button className="dialogue-close-btn" onClick={handleClose}>
            ×
          </button>
        </div>

        {/* Dialogue content */}
        <div className="dialogue-content">
          <p className="dialogue-text">{displayedText}</p>
          {isTyping && <div className="dialogue-typing-indicator">▸</div>}
        </div>

        {/* Response options or continue button */}
        {!isTyping && canAdvance && (
          <div className="dialogue-responses">
            {currentNode.type === "choice" && currentNode.responses ? (
              // Show response buttons
              currentNode.responses.map((response) => (
                <button
                  key={response.id}
                  className="dialogue-response-btn"
                  onClick={() => handleResponseClick(response.id)}
                >
                  {response.text}
                </button>
              ))
            ) : currentNode.type === "dialogue" && currentNode.next ? (
              // Show continue button
              <button
                className="dialogue-response-btn dialogue-continue-btn"
                onClick={handleContinue}
              >
                Continue →
              </button>
            ) : currentNode.type === "end" ? (
              // End node - show close button
              <button
                className="dialogue-response-btn dialogue-continue-btn"
                onClick={handleClose}
              >
                Close
              </button>
            ) : null}
          </div>
        )}

        {/* Skip hint */}
        {isTyping && (
          <div className="dialogue-hint">Click anywhere to skip</div>
        )}
      </div>
    </div>
  );
}
