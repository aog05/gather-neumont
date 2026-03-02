import React, { useState, useEffect } from 'react';
import { useCollection } from '../../../hooks/useCollection';
import { COLLECTIONS, db } from '../../../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import type { Puzzle, QuizPuzzle, CodePuzzle, PuzzleDay, Player } from '../../../types/firestore.types';
import Card from '../../shared/Card';
import DataTable, { Column } from '../../shared/DataTable';
import Button from '../../shared/Button';
import Modal from '../../shared/Modal';
import PuzzleForm from './PuzzleForm';
import './PuzzleList.css';

interface PuzzleWithScores extends Puzzle {
  scoreData?: {
    topScores: Array<{ score: number; playerName: string; playerId: string }>;
    totalCompletions: number;
    usedInWeeks: string[];
  };
}

export default function PuzzleList() {
  const { data: puzzles, loading, error, refresh, remove } = useCollection<Puzzle>(
    COLLECTIONS.PUZZLE
  );
  const [puzzlesWithScores, setPuzzlesWithScores] = useState<PuzzleWithScores[]>([]);
  const [loadingScores, setLoadingScores] = useState(false);
  const [selectedPuzzle, setSelectedPuzzle] = useState<PuzzleWithScores | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Load score data for all puzzles
  useEffect(() => {
    if (puzzles.length > 0) {
      loadScoreData();
    }
  }, [puzzles]);

  const loadScoreData = async () => {
    setLoadingScores(true);
    try {
      const puzzlesWithScoreData: PuzzleWithScores[] = await Promise.all(
        puzzles.map(async (puzzle) => {
          const scoreData = await fetchPuzzleScores(puzzle.id);
          return { ...puzzle, scoreData };
        })
      );
      setPuzzlesWithScores(puzzlesWithScoreData);
    } catch (err) {
      console.error('Error loading score data:', err);
      setPuzzlesWithScores(puzzles);
    } finally {
      setLoadingScores(false);
    }
  };

  const fetchPuzzleScores = async (puzzleId: string) => {
    try {
      // Find all PuzzleDay documents that reference this puzzle
      const puzzleWeeksRef = collection(db, COLLECTIONS.PUZZLE_WEEK);
      const weeksSnapshot = await getDocs(puzzleWeeksRef);

      const allScores: Array<{ score: number; playerName: string; playerId: string }> = [];
      const usedInWeeks: string[] = [];

      for (const weekDoc of weeksSnapshot.docs) {
        const weekId = weekDoc.id;
        const puzzleDaysRef = collection(db, COLLECTIONS.PUZZLE_WEEK, weekId, 'PuzzleDay');
        const daysSnapshot = await getDocs(puzzleDaysRef);

        for (const dayDoc of daysSnapshot.docs) {
          const dayData = dayDoc.data() as PuzzleDay;

          if (dayData.puzzle === puzzleId) {
            usedInWeeks.push(`${weekId}/${dayDoc.id}`);

            // Fetch player names for top scores
            if (dayData.topScore && dayData.topTen) {
              for (let i = 0; i < dayData.topScore.length; i++) {
                const score = dayData.topScore[i];
                const playerId = dayData.topTen[i];

                // Fetch player name
                const playerName = await fetchPlayerName(playerId);
                allScores.push({ score, playerName, playerId });
              }
            }
          }
        }
      }

      // Sort scores descending and get top 10
      allScores.sort((a, b) => b.score - a.score);
      const topScores = allScores.slice(0, 10);

      return {
        topScores,
        totalCompletions: allScores.length,
        usedInWeeks,
      };
    } catch (err) {
      console.error(`Error fetching scores for puzzle ${puzzleId}:`, err);
      return {
        topScores: [],
        totalCompletions: 0,
        usedInWeeks: [],
      };
    }
  };

  const fetchPlayerName = async (playerId: string): Promise<string> => {
    try {
      const playerQuery = query(
        collection(db, COLLECTIONS.PLAYER),
        where('__name__', '==', playerId)
      );
      const playerSnapshot = await getDocs(playerQuery);

      if (!playerSnapshot.empty) {
        const playerData = playerSnapshot.docs[0].data() as Player;
        return playerData.Username || playerData.RealName || 'Unknown Player';
      }
      return 'Unknown Player';
    } catch (err) {
      console.error(`Error fetching player ${playerId}:`, err);
      return 'Unknown Player';
    }
  };

  const columns: Column<PuzzleWithScores>[] = [
    {
      key: 'Type',
      label: 'Type',
      render: (puzzle) => (
        <span className={`puzzle-type puzzle-type-${puzzle.Type?.toLowerCase()}`}>
          {puzzle.Type || 'Unknown'}
        </span>
      ),
    },
    {
      key: 'Name',
      label: 'Name',
      render: (puzzle) => (
        <span className="puzzle-name">
          {puzzle.Name || 'Unnamed Puzzle'}
        </span>
      ),
    },
    {
      key: 'Topic',
      label: 'Topic',
      render: (puzzle) => (
        <span className="puzzle-topic">
          {puzzle.Topic || 'N/A'}
        </span>
      ),
    },
    {
      key: 'Reward',
      label: 'Reward',
      render: (puzzle) => (
        <span className="puzzle-reward">
          {puzzle.Reward || 0} pts
        </span>
      ),
    },
    {
      key: 'scoreData',
      label: 'Completions',
      render: (puzzle) => (
        <span className="puzzle-completions">
          {puzzle.scoreData?.totalCompletions || 0}
        </span>
      ),
    },
    {
      key: 'scoreData',
      label: 'Top Score',
      render: (puzzle) => (
        <span className="puzzle-top-score">
          {puzzle.scoreData?.topScores[0]?.score || 'N/A'}
        </span>
      ),
    },
  ];

  const handleRowClick = (puzzle: PuzzleWithScores) => {
    setSelectedPuzzle(puzzle);
    setIsDetailModalOpen(true);
  };

  const handleEdit = (puzzle: PuzzleWithScores) => {
    setSelectedPuzzle(puzzle);
    setIsEditModalOpen(true);
  };

  const handleDelete = async (puzzle: PuzzleWithScores) => {
    if (window.confirm(`Are you sure you want to delete puzzle "${puzzle.Name}"?`)) {
      try {
        await remove(puzzle.id!);
        alert('Puzzle deleted successfully');
        refresh();
      } catch (err) {
        alert('Failed to delete puzzle: ' + (err as Error).message);
      }
    }
  };

  const handleCloseModals = () => {
    setIsDetailModalOpen(false);
    setIsCreateModalOpen(false);
    setIsEditModalOpen(false);
    setSelectedPuzzle(null);
  };

  const handleFormSuccess = () => {
    handleCloseModals();
    refresh();
  };

  if (error) {
    return (
      <Card title="Puzzles">
        <div className="error-message">
          <p>Error loading puzzles: {error.message}</p>
          <Button onClick={refresh}>Retry</Button>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card
        title="Puzzles"
        actions={
          <>
            <Button onClick={() => setIsCreateModalOpen(true)} size="sm">
              ➕ Create Puzzle
            </Button>
            <Button onClick={refresh} size="sm" variant="secondary">
              🔄 Refresh
            </Button>
            {loadingScores && <span style={{ marginLeft: '10px', fontSize: '12px' }}>Loading scores...</span>}
          </>
        }
      >
        <DataTable
          data={puzzlesWithScores}
          columns={columns}
          loading={loading}
          onRowClick={handleRowClick}
          emptyMessage="No puzzles found"
          actions={(puzzle) => (
            <>
              <Button size="sm" variant="secondary" onClick={() => handleEdit(puzzle)}>
                ✏️ Edit
              </Button>
              <Button size="sm" variant="danger" onClick={() => handleDelete(puzzle)}>
                🗑️ Delete
              </Button>
            </>
          )}
        />
      </Card>

      {/* Detail Modal */}
      {selectedPuzzle && (
        <Modal
          isOpen={isDetailModalOpen}
          onClose={handleCloseModals}
          title={`${selectedPuzzle.Name} (${selectedPuzzle.Type})`}
          size="xl"
        >
          <div className="puzzle-detail">
            {/* Basic Info */}
            <div className="puzzle-detail-section">
              <h4 className="puzzle-detail-heading">Basic Information</h4>
              <div className="puzzle-info-grid">
                <div className="puzzle-info-item">
                  <span className="puzzle-info-label">Type:</span>
                  <span className="puzzle-info-value">{selectedPuzzle.Type}</span>
                </div>
                <div className="puzzle-info-item">
                  <span className="puzzle-info-label">Topic:</span>
                  <span className="puzzle-info-value">{selectedPuzzle.Topic}</span>
                </div>
                <div className="puzzle-info-item">
                  <span className="puzzle-info-label">Reward:</span>
                  <span className="puzzle-info-value">{selectedPuzzle.Reward} points</span>
                </div>
                <div className="puzzle-info-item">
                  <span className="puzzle-info-label">Document ID:</span>
                  <span className="puzzle-info-value">{selectedPuzzle.id}</span>
                </div>
              </div>
            </div>

            {/* Quiz Questions (for Quiz type) */}
            {selectedPuzzle.Type === 'Quiz' && (selectedPuzzle as QuizPuzzle).Questions && (
              <div className="puzzle-detail-section">
                <h4 className="puzzle-detail-heading">Quiz Questions</h4>
                <div className="puzzle-threshold">
                  <span className="puzzle-info-label">Passing Threshold:</span>
                  <span className="puzzle-info-value">
                    {((selectedPuzzle as QuizPuzzle).Threshold * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="quiz-questions-list">
                  {(selectedPuzzle as QuizPuzzle).Questions.map((question, index) => (
                    <div key={index} className="quiz-question-item">
                      <div className="quiz-question-header">
                        <span className="quiz-question-number">Question {index + 1}</span>
                        <span className="quiz-question-score">Score Value: {question.SV}</span>
                        <span className={`quiz-question-type quiz-type-${question.type}`}>
                          {question.type}
                        </span>
                      </div>

                      {/* Correct Answers */}
                      <div className="quiz-question-answers">
                        <div className="quiz-answer-section">
                          <span className="quiz-answer-label">✓ Correct Answer(s):</span>
                          {question.type === 'one-select' && question.answer && (
                            <div className="quiz-answer-correct">{question.answer}</div>
                          )}
                          {question.type === 'multiple-choice' && question.answers && (
                            <div className="quiz-answers-list">
                              {question.answers.map((ans, i) => (
                                <div key={i} className="quiz-answer-correct">{ans}</div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Incorrect Options */}
                        <div className="quiz-answer-section">
                          <span className="quiz-answer-label">✗ Incorrect Options:</span>
                          <div className="quiz-answers-list">
                            {question.other.map((opt, i) => (
                              <div key={i} className="quiz-answer-incorrect">{opt}</div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Code Puzzle Details (for Code type) */}
            {selectedPuzzle.Type === 'Code' && (
              <div className="puzzle-detail-section">
                <h4 className="puzzle-detail-heading">Code Challenge Details</h4>
                <div className="code-puzzle-info">
                  <div className="puzzle-info-item">
                    <span className="puzzle-info-label">Attempts Allowed:</span>
                    <span className="puzzle-info-value">{(selectedPuzzle as CodePuzzle).Attempts}</span>
                  </div>

                  <div className="code-section">
                    <h5>Solution:</h5>
                    <pre className="code-block">{(selectedPuzzle as CodePuzzle).solution}</pre>
                  </div>

                  <div className="code-section">
                    <h5>Conditions ({(selectedPuzzle as CodePuzzle).conditions.length}):</h5>
                    {(selectedPuzzle as CodePuzzle).conditions.map((condition, index) => (
                      <pre key={index} className="code-block">{condition}</pre>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Score Details */}
            {selectedPuzzle.scoreData && (
              <div className="puzzle-detail-section">
                <h4 className="puzzle-detail-heading">Score & Completion Details</h4>

                <div className="puzzle-stats">
                  <div className="puzzle-stat-item">
                    <span className="puzzle-stat-label">Total Completions:</span>
                    <span className="puzzle-stat-value">{selectedPuzzle.scoreData.totalCompletions}</span>
                  </div>
                  <div className="puzzle-stat-item">
                    <span className="puzzle-stat-label">Used in Weeks:</span>
                    <span className="puzzle-stat-value">{selectedPuzzle.scoreData.usedInWeeks.length}</span>
                  </div>
                </div>

                {selectedPuzzle.scoreData.usedInWeeks.length > 0 && (
                  <div className="puzzle-weeks-used">
                    <h5>Assigned to:</h5>
                    <div className="weeks-list">
                      {selectedPuzzle.scoreData.usedInWeeks.map((week, index) => (
                        <span key={index} className="week-badge">{week}</span>
                      ))}
                    </div>
                  </div>
                )}

                {selectedPuzzle.scoreData.topScores.length > 0 && (
                  <div className="puzzle-leaderboard">
                    <h5>Top Scores:</h5>
                    <table className="leaderboard-table">
                      <thead>
                        <tr>
                          <th>Rank</th>
                          <th>Player</th>
                          <th>Score</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedPuzzle.scoreData.topScores.map((entry, index) => (
                          <tr key={index}>
                            <td className="rank-cell">#{index + 1}</td>
                            <td className="player-cell">{entry.playerName}</td>
                            <td className="score-cell">{entry.score}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Create Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={handleCloseModals}
        title="Create New Puzzle"
        size="xl"
      >
        <PuzzleForm onSuccess={handleFormSuccess} onCancel={handleCloseModals} />
      </Modal>

      {/* Edit Modal */}
      {selectedPuzzle && (
        <Modal
          isOpen={isEditModalOpen}
          onClose={handleCloseModals}
          title="Edit Puzzle"
          size="xl"
        >
          <PuzzleForm
            puzzle={selectedPuzzle}
            onSuccess={handleFormSuccess}
            onCancel={handleCloseModals}
          />
        </Modal>
      )}
    </>
  );
}

