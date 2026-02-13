/**
 * QuizResult component - displays correct answer result with points breakdown.
 */

import type { PointsBreakdown, Question } from "../../hooks/useQuiz";
import "./QuizResult.css";

interface QuizResultProps {
  question: Question;
  pointsEarned: number;
  pointsBreakdown: PointsBreakdown;
  explanation?: string;
  correctIndex?: number;
  correctIndices?: number[];
  acceptedAnswers?: string[];
  attemptNumber: number;
  onViewLeaderboard?: () => void;
}

export function QuizResult({
  question,
  pointsEarned,
  pointsBreakdown,
  explanation,
  correctIndex,
  correctIndices,
  acceptedAnswers,
  attemptNumber,
  onViewLeaderboard,
}: QuizResultProps) {
  // Format the correct answer display
  const getCorrectAnswerDisplay = (): string => {
    if (question.type === "mcq" && correctIndex !== undefined) {
      const letter = String.fromCharCode(65 + correctIndex);
      return `${letter}. ${question.choices?.[correctIndex] ?? ""}`;
    }
    if (question.type === "select-all" && correctIndices) {
      return correctIndices
        .map((i) => {
          const letter = String.fromCharCode(65 + i);
          return `${letter}. ${question.choices?.[i] ?? ""}`;
        })
        .join(", ");
    }
    if (question.type === "written" && acceptedAnswers) {
      return acceptedAnswers[0] ?? "";
    }
    return "";
  };

  return (
    <div className="quiz-result">
      <div className="quiz-result-header">
        <span className="quiz-result-icon">✓</span>
        <h2 className="quiz-result-title">Correct!</h2>
      </div>

      <div className="quiz-result-points">
        <span className="quiz-result-points-value">+{pointsEarned}</span>
        <span className="quiz-result-points-label">points</span>
      </div>

      <div className="quiz-result-breakdown">
        <h3>Points Breakdown</h3>
        <div className="quiz-result-breakdown-row">
          <span>Base Points</span>
          <span>{pointsBreakdown.baseAfterMultiplier}</span>
        </div>
        {attemptNumber > 1 && (
          <div className="quiz-result-breakdown-row muted">
            <span>
              Attempt #{attemptNumber} (×{pointsBreakdown.attemptMultiplier})
            </span>
            <span></span>
          </div>
        )}
        {pointsBreakdown.firstTryBonus > 0 && (
          <div className="quiz-result-breakdown-row bonus">
            <span>First Try Bonus</span>
            <span>+{pointsBreakdown.firstTryBonus}</span>
          </div>
        )}
        {pointsBreakdown.speedBonus > 0 && (
          <div className="quiz-result-breakdown-row bonus">
            <span>Speed Bonus</span>
            <span>+{pointsBreakdown.speedBonus}</span>
          </div>
        )}
        <div className="quiz-result-breakdown-row total">
          <span>Total</span>
          <span>{pointsBreakdown.totalPoints}</span>
        </div>
      </div>

      <div className="quiz-result-answer">
        <h3>Correct Answer</h3>
        <p>{getCorrectAnswerDisplay()}</p>
      </div>

      {explanation && (
        <div className="quiz-result-explanation">
          <h3>Explanation</h3>
          <p>{explanation}</p>
        </div>
      )}

      {onViewLeaderboard && (
        <div className="quiz-result-actions">
          <button
            type="button"
            className="quiz-submit-btn quiz-btn-secondary"
            onClick={onViewLeaderboard}
          >
            View Leaderboard
          </button>
        </div>
      )}
    </div>
  );
}
