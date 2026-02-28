/**
 * QuizCards component - handles MCQ and Select-All question types.
 * Cards are clickable blocks with hover/selected/wrong states.
 */

import { useState, useEffect } from "react";
import "./QuizCards.css";

interface QuizCardsProps {
  choices: string[];
  type: "mcq" | "select-all";
  onSubmit: (answer: unknown) => void;
  disabled?: boolean;
  wrongIndex?: number; // For MCQ: which index was wrong
  wrongIndices?: number[]; // For select-all: which were selected (wrong)
  showIncorrect?: boolean;
  correctIndex?: number;
  correctIndices?: number[];
  showCorrect?: boolean;
}

export function QuizCards({
  choices,
  type,
  onSubmit,
  disabled = false,
  wrongIndex,
  wrongIndices,
  showIncorrect = false,
  correctIndex,
  correctIndices,
  showCorrect = false,
}: QuizCardsProps) {
  // MCQ: single selection (number | null)
  // Select-all: multiple selection (Set<number>)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(
    new Set()
  );
  const [shakeIndex, setShakeIndex] = useState<number | null>(null);

  // Reset selections when choices change (new question)
  useEffect(() => {
    setSelectedIndex(null);
    setSelectedIndices(new Set());
    setShakeIndex(null);
  }, [choices]);

  // Trigger shake animation on wrong answer
  useEffect(() => {
    if (showIncorrect && wrongIndex !== undefined) {
      setShakeIndex(wrongIndex);
      const timer = setTimeout(() => setShakeIndex(null), 300);
      return () => clearTimeout(timer);
    }
  }, [showIncorrect, wrongIndex]);

  const handleCardClick = (index: number) => {
    if (disabled) return;

    if (type === "mcq") {
      setSelectedIndex(index);
    } else {
      // Toggle selection for select-all
      const newSet = new Set(selectedIndices);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      setSelectedIndices(newSet);
    }
  };

  const handleSubmit = () => {
    if (type === "mcq") {
      if (selectedIndex === null) return;
      onSubmit({ selectedIndex });
    } else {
      onSubmit({ selectedIndices: Array.from(selectedIndices) });
    }
  };

  const canSubmit =
    type === "mcq" ? selectedIndex !== null : selectedIndices.size > 0;

  return (
    <div className="quiz-cards-container">
      <div className="quiz-cards-list">
        {choices.map((choice, index) => {
          const isSelected =
            type === "mcq"
              ? selectedIndex === index
              : selectedIndices.has(index);
          const isWrong =
            showIncorrect &&
            (type === "mcq"
              ? wrongIndex === index
              : wrongIndices?.includes(index));
          const isCorrect =
            showCorrect &&
            (type === "mcq"
              ? correctIndex === index
              : correctIndices?.includes(index));
          const isShaking = shakeIndex === index;

          return (
            <button
              key={index}
              className={`quiz-card ${isSelected ? "selected" : ""} ${
                isWrong ? "wrong" : ""
              } ${isCorrect ? "correct" : ""} ${isShaking ? "shake" : ""}`}
              onClick={() => handleCardClick(index)}
              disabled={disabled}
            >
              <span className="quiz-card-letter">
                {String.fromCharCode(65 + index)}
              </span>
              <span className="quiz-card-text">{choice}</span>
              {isCorrect && <span className="quiz-card-correct">Correct</span>}
              {type === "select-all" && (
                <span className="quiz-card-checkbox">
                  {isSelected ? "✓" : ""}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <button
        className="quiz-submit-btn"
        onClick={handleSubmit}
        disabled={disabled || !canSubmit}
      >
        Submit Answer
      </button>
    </div>
  );
}
