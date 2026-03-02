import React, { useState } from 'react';
import { useCollection } from '../../../hooks/useCollection';
import { COLLECTIONS } from '../../../lib/firebase';
import type { Puzzle, QuizPuzzle, CodePuzzle, QuizQuestion } from '../../../types/firestore.types';
import Button from '../../shared/Button';
import './PuzzleForm.css';

interface PuzzleFormProps {
  puzzle?: Puzzle;
  onSuccess: () => void;
  onCancel: () => void;
}

interface QuizQuestionForm {
  SV: number;
  type: 'one-select' | 'multiple-choice';
  correctAnswers: string[];
  incorrectOptions: string[];
}

export default function PuzzleForm({ puzzle, onSuccess, onCancel }: PuzzleFormProps) {
  const { create, update } = useCollection<Puzzle>(COLLECTIONS.PUZZLE);
  const [loading, setLoading] = useState(false);

  // Determine initial puzzle type
  const initialType = puzzle?.Type || 'Quiz';

  // Initialize form data based on puzzle type
  const [puzzleType, setPuzzleType] = useState<'Quiz' | 'Code'>(initialType);
  const [name, setName] = useState(puzzle?.Name || '');
  const [topic, setTopic] = useState(puzzle?.Topic || '');
  const [reward, setReward] = useState(puzzle?.Reward?.toString() || '100');

  // Quiz-specific fields
  const [threshold, setThreshold] = useState(
    puzzle && puzzle.Type === 'Quiz' ? ((puzzle as QuizPuzzle).Threshold * 100).toString() : '70'
  );
  const [questions, setQuestions] = useState<QuizQuestionForm[]>(() => {
    if (puzzle && puzzle.Type === 'Quiz') {
      return (puzzle as QuizPuzzle).Questions.map((q) => ({
        SV: q.SV,
        type: q.type,
        correctAnswers: q.type === 'one-select' ? (q.answer ? [q.answer] : []) : (q.answers || []),
        incorrectOptions: q.other,
      }));
    }
    return [
      {
        SV: 10,
        type: 'one-select',
        correctAnswers: [''],
        incorrectOptions: ['', '', ''],
      },
    ];
  });

  // Code-specific fields
  const [solution, setSolution] = useState(
    puzzle && puzzle.Type === 'Code' ? (puzzle as CodePuzzle).solution : ''
  );
  const [attempts, setAttempts] = useState(
    puzzle && puzzle.Type === 'Code' ? (puzzle as CodePuzzle).Attempts.toString() : '3'
  );
  const [conditions, setConditions] = useState<string[]>(
    puzzle && puzzle.Type === 'Code' ? (puzzle as CodePuzzle).conditions : ['']
  );

  const handleTypeChange = (newType: 'Quiz' | 'Code') => {
    setPuzzleType(newType);
  };

  // Quiz question handlers
  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        SV: 10,
        type: 'one-select',
        correctAnswers: [''],
        incorrectOptions: ['', '', ''],
      },
    ]);
  };

  const removeQuestion = (index: number) => {
    if (questions.length <= 1) {
      alert('A quiz must have at least 1 question');
      return;
    }
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const updateQuestion = (index: number, field: keyof QuizQuestionForm, value: any) => {
    const newQuestions = [...questions];
    newQuestions[index] = { ...newQuestions[index], [field]: value };
    setQuestions(newQuestions);
  };

  const addCorrectAnswer = (questionIndex: number) => {
    const newQuestions = [...questions];
    newQuestions[questionIndex].correctAnswers.push('');
    setQuestions(newQuestions);
  };

  const removeCorrectAnswer = (questionIndex: number, answerIndex: number) => {
    const newQuestions = [...questions];
    if (newQuestions[questionIndex].correctAnswers.length <= 1) {
      alert('A question must have at least 1 correct answer');
      return;
    }
    newQuestions[questionIndex].correctAnswers = newQuestions[questionIndex].correctAnswers.filter(
      (_, i) => i !== answerIndex
    );
    setQuestions(newQuestions);
  };

  const updateCorrectAnswer = (questionIndex: number, answerIndex: number, value: string) => {
    const newQuestions = [...questions];
    newQuestions[questionIndex].correctAnswers[answerIndex] = value;
    setQuestions(newQuestions);
  };

  const addIncorrectOption = (questionIndex: number) => {
    const newQuestions = [...questions];
    newQuestions[questionIndex].incorrectOptions.push('');
    setQuestions(newQuestions);
  };

  const removeIncorrectOption = (questionIndex: number, optionIndex: number) => {
    const newQuestions = [...questions];
    if (newQuestions[questionIndex].incorrectOptions.length <= 1) {
      alert('A question must have at least 1 incorrect option');
      return;
    }
    newQuestions[questionIndex].incorrectOptions = newQuestions[questionIndex].incorrectOptions.filter(
      (_, i) => i !== optionIndex
    );
    setQuestions(newQuestions);
  };

  const updateIncorrectOption = (questionIndex: number, optionIndex: number, value: string) => {
    const newQuestions = [...questions];
    newQuestions[questionIndex].incorrectOptions[optionIndex] = value;
    setQuestions(newQuestions);
  };

  // Code condition handlers
  const addCondition = () => {
    setConditions([...conditions, '']);
  };

  const removeCondition = (index: number) => {
    if (conditions.length <= 1) {
      alert('A code puzzle must have at least 1 condition');
      return;
    }
    setConditions(conditions.filter((_, i) => i !== index));
  };

  const updateCondition = (index: number, value: string) => {
    const newConditions = [...conditions];
    newConditions[index] = value;
    setConditions(newConditions);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate common fields
      if (!name.trim()) {
        alert('Please enter a puzzle name');
        setLoading(false);
        return;
      }

      if (!topic.trim()) {
        alert('Please enter a topic');
        setLoading(false);
        return;
      }

      const rewardNum = parseInt(reward, 10);
      if (isNaN(rewardNum) || rewardNum < 0) {
        alert('Please enter a valid reward value');
        setLoading(false);
        return;
      }

      let puzzleData: Omit<Puzzle, 'id'>;

      if (puzzleType === 'Quiz') {
        // Validate quiz-specific fields
        const thresholdNum = parseFloat(threshold) / 100;
        if (isNaN(thresholdNum) || thresholdNum < 0 || thresholdNum > 1) {
          alert('Please enter a valid threshold (0-100)');
          setLoading(false);
          return;
        }

        // Convert QuizQuestionForm to QuizQuestion
        const quizQuestions: QuizQuestion[] = questions.map((q) => {
          const correctAnswers = q.correctAnswers.filter((a) => a.trim() !== '');
          const incorrectOptions = q.incorrectOptions.filter((o) => o.trim() !== '');

          if (correctAnswers.length === 0) {
            throw new Error('Each question must have at least one correct answer');
          }

          if (incorrectOptions.length === 0) {
            throw new Error('Each question must have at least one incorrect option');
          }

          if (q.type === 'one-select') {
            return {
              SV: q.SV,
              type: 'one-select',
              answer: correctAnswers[0],
              other: incorrectOptions,
            };
          } else {
            return {
              SV: q.SV,
              type: 'multiple-choice',
              answers: correctAnswers,
              other: incorrectOptions,
            };
          }
        });

        puzzleData = {
          Type: 'Quiz',
          Name: name.trim(),
          Topic: topic.trim(),
          Reward: rewardNum,
          Threshold: thresholdNum,
          Questions: quizQuestions,
        } as QuizPuzzle;
      } else {
        // Code puzzle
        if (!solution.trim()) {
          alert('Please enter a solution');
          setLoading(false);
          return;
        }

        const attemptsNum = parseInt(attempts, 10);
        if (isNaN(attemptsNum) || attemptsNum < 1) {
          alert('Please enter a valid number of attempts');
          setLoading(false);
          return;
        }

        const validConditions = conditions.filter((c) => c.trim() !== '');
        if (validConditions.length === 0) {
          alert('Please enter at least one condition');
          setLoading(false);
          return;
        }

        puzzleData = {
          Type: 'Code',
          Name: name.trim(),
          Topic: topic.trim(),
          Reward: rewardNum,
          solution: solution.trim(),
          Attempts: attemptsNum,
          conditions: validConditions,
        } as CodePuzzle;
      }

      if (puzzle?.id) {
        // Update existing puzzle
        await update(puzzle.id, puzzleData);
        alert('Puzzle updated successfully!');
      } else {
        // Create new puzzle
        await create(puzzleData);
        alert('Puzzle created successfully!');
      }

      onSuccess();
    } catch (error) {
      alert('Error saving puzzle: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="puzzle-form">
      {/* Basic Information */}
      <div className="form-section">
        <h4 className="form-section-title">Basic Information</h4>

        <div className="form-field">
          <label htmlFor="puzzleType" className="form-label">
            Puzzle Type *
          </label>
          <select
            id="puzzleType"
            value={puzzleType}
            onChange={(e) => handleTypeChange(e.target.value as 'Quiz' | 'Code')}
            required
            className="form-input"
          >
            <option value="Quiz">Quiz Puzzle</option>
            <option value="Code">Code Puzzle</option>
          </select>
        </div>

        <div className="form-field">
          <label htmlFor="name" className="form-label">
            Puzzle Name *
          </label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="form-input"
            placeholder="e.g., Database Design Quiz"
          />
        </div>

        <div className="form-field">
          <label htmlFor="topic" className="form-label">
            Topic *
          </label>
          <input
            type="text"
            id="topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            required
            className="form-input"
            placeholder="e.g., CS, Math, Algorithms"
          />
        </div>

        <div className="form-field">
          <label htmlFor="reward" className="form-label">
            Reward (Points) *
          </label>
          <input
            type="number"
            id="reward"
            value={reward}
            onChange={(e) => setReward(e.target.value)}
            required
            min="0"
            className="form-input"
            placeholder="100"
          />
        </div>
      </div>

      {/* Quiz-specific fields */}
      {puzzleType === 'Quiz' && (
        <>
          <div className="form-section">
            <h4 className="form-section-title">Quiz Settings</h4>

            <div className="form-field">
              <label htmlFor="threshold" className="form-label">
                Passing Threshold (%) *
              </label>
              <input
                type="number"
                id="threshold"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                required
                min="0"
                max="100"
                className="form-input"
                placeholder="70"
              />
              <span className="form-hint">
                Percentage of total score required to pass (0-100)
              </span>
            </div>
          </div>

          <div className="form-section">
            <div className="form-section-header">
              <h4 className="form-section-title">Questions ({questions.length})</h4>
              <Button type="button" size="sm" onClick={addQuestion}>
                ➕ Add Question
              </Button>
            </div>

            {questions.map((question, qIndex) => (
              <div key={qIndex} className="question-editor">
                <div className="question-header">
                  <span className="question-number">Question {qIndex + 1}</span>
                  {questions.length > 1 && (
                    <Button
                      type="button"
                      size="sm"
                      variant="danger"
                      onClick={() => removeQuestion(qIndex)}
                    >
                      🗑️ Remove Question
                    </Button>
                  )}
                </div>

                <div className="question-settings">
                  <div className="form-field">
                    <label className="form-label">Score Value *</label>
                    <input
                      type="number"
                      value={question.SV}
                      onChange={(e) =>
                        updateQuestion(qIndex, 'SV', parseInt(e.target.value, 10) || 0)
                      }
                      required
                      min="1"
                      className="form-input"
                      placeholder="10"
                    />
                  </div>

                  <div className="form-field">
                    <label className="form-label">Question Type *</label>
                    <select
                      value={question.type}
                      onChange={(e) =>
                        updateQuestion(qIndex, 'type', e.target.value as 'one-select' | 'multiple-choice')
                      }
                      required
                      className="form-input"
                    >
                      <option value="one-select">One Select (Single Correct Answer)</option>
                      <option value="multiple-choice">Multiple Choice (Multiple Correct Answers)</option>
                    </select>
                  </div>
                </div>

                {/* Correct Answers */}
                <div className="answer-section">
                  <div className="answer-section-header">
                    <label className="form-label">✓ Correct Answer(s)</label>
                    {question.type === 'multiple-choice' && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => addCorrectAnswer(qIndex)}
                      >
                        ➕ Add Correct Answer
                      </Button>
                    )}
                  </div>

                  {question.correctAnswers.map((answer, aIndex) => (
                    <div key={aIndex} className="answer-input-group">
                      <input
                        type="text"
                        value={answer}
                        onChange={(e) => updateCorrectAnswer(qIndex, aIndex, e.target.value)}
                        required
                        className="form-input answer-input-correct"
                        placeholder={`Correct answer ${aIndex + 1}`}
                      />
                      {question.type === 'multiple-choice' && question.correctAnswers.length > 1 && (
                        <Button
                          type="button"
                          size="sm"
                          variant="danger"
                          onClick={() => removeCorrectAnswer(qIndex, aIndex)}
                        >
                          🗑️
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Incorrect Options */}
                <div className="answer-section">
                  <div className="answer-section-header">
                    <label className="form-label">✗ Incorrect Options</label>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => addIncorrectOption(qIndex)}
                    >
                      ➕ Add Incorrect Option
                    </Button>
                  </div>

                  {question.incorrectOptions.map((option, oIndex) => (
                    <div key={oIndex} className="answer-input-group">
                      <input
                        type="text"
                        value={option}
                        onChange={(e) => updateIncorrectOption(qIndex, oIndex, e.target.value)}
                        required
                        className="form-input answer-input-incorrect"
                        placeholder={`Incorrect option ${oIndex + 1}`}
                      />
                      {question.incorrectOptions.length > 1 && (
                        <Button
                          type="button"
                          size="sm"
                          variant="danger"
                          onClick={() => removeIncorrectOption(qIndex, oIndex)}
                        >
                          🗑️
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Code-specific fields */}
      {puzzleType === 'Code' && (
        <>
          <div className="form-section">
            <h4 className="form-section-title">Code Challenge Settings</h4>

            <div className="form-field">
              <label htmlFor="attempts" className="form-label">
                Attempts Allowed *
              </label>
              <input
                type="number"
                id="attempts"
                value={attempts}
                onChange={(e) => setAttempts(e.target.value)}
                required
                min="1"
                className="form-input"
                placeholder="3"
              />
            </div>

            <div className="form-field">
              <label htmlFor="solution" className="form-label">
                Solution Code *
              </label>
              <textarea
                id="solution"
                value={solution}
                onChange={(e) => setSolution(e.target.value)}
                required
                className="form-textarea code-textarea"
                placeholder="Enter the solution code..."
                rows={8}
              />
            </div>
          </div>

          <div className="form-section">
            <div className="form-section-header">
              <h4 className="form-section-title">Conditions / Test Cases ({conditions.length})</h4>
              <Button type="button" size="sm" onClick={addCondition}>
                ➕ Add Condition
              </Button>
            </div>

            {conditions.map((condition, index) => (
              <div key={index} className="condition-editor">
                <div className="condition-header">
                  <span className="condition-label">Condition {index + 1}</span>
                  {conditions.length > 1 && (
                    <Button
                      type="button"
                      size="sm"
                      variant="danger"
                      onClick={() => removeCondition(index)}
                    >
                      🗑️
                    </Button>
                  )}
                </div>
                <textarea
                  value={condition}
                  onChange={(e) => updateCondition(index, e.target.value)}
                  required
                  className="form-textarea code-textarea"
                  placeholder="Enter condition or test case..."
                  rows={4}
                />
              </div>
            ))}
          </div>
        </>
      )}

      <div className="form-actions">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : puzzle ? 'Update Puzzle' : 'Create Puzzle'}
        </Button>
      </div>
    </form>
  );
}

