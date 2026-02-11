/**
 * WrittenResponse component - handles written/text input questions.
 */

import { useState, useEffect } from "react";
import "./WrittenResponse.css";

interface WrittenResponseProps {
  onSubmit: (answer: unknown) => void;
  disabled?: boolean;
  showIncorrect?: boolean;
  showCorrect?: boolean;
  acceptedAnswers?: string[];
}

export function WrittenResponse({
  onSubmit,
  disabled = false,
  showIncorrect = false,
  showCorrect = false,
  acceptedAnswers = [],
}: WrittenResponseProps) {
  const [text, setText] = useState("");
  const [shake, setShake] = useState(false);

  // Reset when showing new question
  useEffect(() => {
    setText("");
    setShake(false);
  }, []);

  // Trigger shake on incorrect
  useEffect(() => {
    if (showIncorrect) {
      setShake(true);
      const timer = setTimeout(() => setShake(false), 300);
      return () => clearTimeout(timer);
    }
  }, [showIncorrect]);

  const handleSubmit = () => {
    if (!text.trim()) return;
    onSubmit({ text: text.trim() });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && !disabled && text.trim()) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="written-response-container">
      <input
        type="text"
        className={`written-response-input ${shake ? "shake" : ""} ${
          showIncorrect ? "incorrect" : ""
        }`}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type your answer..."
        disabled={disabled}
        autoFocus
      />

      <button
        className="quiz-submit-btn"
        onClick={handleSubmit}
        disabled={disabled || !text.trim()}
      >
        Submit Answer
      </button>
      {showCorrect && acceptedAnswers.length > 0 && (
        <div className="written-response-answers">
          <span className="written-response-label">Accepted Answers</span>
          <div className="written-response-list">
            {acceptedAnswers.map((answer) => (
              <span className="written-response-pill" key={answer}>
                {answer}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
