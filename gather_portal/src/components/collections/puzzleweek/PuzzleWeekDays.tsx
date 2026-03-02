import React, { useState, useEffect } from 'react';
import { PuzzleWeekService } from '../../../services/puzzleweek.service';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db, COLLECTIONS } from '../../../lib/firebase';
import type { PuzzleDay, Puzzle, Player } from '../../../types/firestore.types';
import Button from '../../shared/Button';
import LoadingSpinner from '../../shared/LoadingSpinner';
import './PuzzleWeekDays.css';

interface PuzzleWeekDaysProps {
  weekId: string;
  onClose: () => void;
}

interface DayWithDetails extends PuzzleDay {
  puzzleDetails?: Puzzle;
  topScoresWithNames?: Array<{ score: number; playerName: string }>;
}

// Parse week ID format: {Month}{Year}{WeekNumber}
// Example: "Feb20263" → { month: "February", year: 2026, weekNumber: 3 }
function parseWeekId(weekId: string): { month: string; year: number; weekNumber: number } | null {
  const match = weekId.match(/^([A-Za-z]+)(\d{4})(\d+)$/);
  if (!match) return null;

  const monthAbbr = match[1];
  const year = parseInt(match[2], 10);
  const weekNumber = parseInt(match[3], 10);

  const monthMap: Record<string, string> = {
    Jan: 'January',
    Feb: 'February',
    Mar: 'March',
    Apr: 'April',
    May: 'May',
    Jun: 'June',
    Jul: 'July',
    Aug: 'August',
    Sep: 'September',
    Oct: 'October',
    Nov: 'November',
    Dec: 'December',
  };

  const month = monthMap[monthAbbr] || monthAbbr;

  return { month, year, weekNumber };
}

export default function PuzzleWeekDays({ weekId, onClose }: PuzzleWeekDaysProps) {
  const [days, setDays] = useState<DayWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const puzzleWeekService = new PuzzleWeekService();

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const weekInfo = parseWeekId(weekId);

  const [dayData, setDayData] = useState<Record<string, string>>({
    Monday: '',
    Tuesday: '',
    Wednesday: '',
    Thursday: '',
    Friday: '',
    Saturday: '',
    Sunday: '',
  });

  useEffect(() => {
    loadDays();
  }, [weekId]);

  const loadDays = async () => {
    try {
      setLoading(true);
      const fetchedDays = await puzzleWeekService.getWeekDays(weekId);

      const dayMap: Record<string, string> = {
        Monday: '',
        Tuesday: '',
        Wednesday: '',
        Thursday: '',
        Friday: '',
        Saturday: '',
        Sunday: '',
      };

      // Fetch puzzle details and player names for each day
      const daysWithDetails: DayWithDetails[] = await Promise.all(
        fetchedDays.map(async (day) => {
          // Update dayMap
          if (day.id && dayMap.hasOwnProperty(day.id)) {
            dayMap[day.id] = day.puzzle || '';
          }

          // Fetch puzzle details
          let puzzleDetails: Puzzle | undefined;
          if (day.puzzle) {
            try {
              const puzzleDoc = await getDoc(doc(db, COLLECTIONS.PUZZLE, day.puzzle));
              if (puzzleDoc.exists()) {
                puzzleDetails = { id: puzzleDoc.id, ...puzzleDoc.data() } as Puzzle;
              }
            } catch (error) {
              console.error(`Error fetching puzzle ${day.puzzle}:`, error);
            }
          }

          // Fetch player names for top scores
          let topScoresWithNames: Array<{ score: number; playerName: string }> = [];
          if (day.topScore && day.topTen && day.topScore.length > 0) {
            topScoresWithNames = await Promise.all(
              day.topScore.map(async (score, index) => {
                const playerId = day.topTen[index];
                let playerName = 'Unknown Player';

                if (playerId) {
                  try {
                    const playerDoc = await getDoc(doc(db, COLLECTIONS.PLAYER, playerId));
                    if (playerDoc.exists()) {
                      const playerData = playerDoc.data() as Player;
                      playerName = playerData.Username || 'Unknown Player';
                    }
                  } catch (error) {
                    console.error(`Error fetching player ${playerId}:`, error);
                  }
                }

                return { score, playerName };
              })
            );
          }

          return {
            ...day,
            puzzleDetails,
            topScoresWithNames,
          };
        })
      );

      setDayData(dayMap);
      setDays(daysWithDetails);
    } catch (error) {
      console.error('Error loading days:', error);
      alert('Failed to load days: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleDayChange = (day: string, puzzleId: string) => {
    setDayData({
      ...dayData,
      [day]: puzzleId,
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Save each day
      for (const [day, puzzleId] of Object.entries(dayData)) {
        if (puzzleId.trim()) {
          await puzzleWeekService.setWeekDay(weekId, day, {
            PuzzleId: puzzleId.trim(),
          });
        } else {
          // If puzzle ID is empty, delete the day
          try {
            await puzzleWeekService.deleteWeekDay(weekId, day);
          } catch (err) {
            // Ignore error if day doesn't exist
          }
        }
      }

      alert('Days saved successfully!');
      onClose();
    } catch (error) {
      alert('Error saving days: ' + (error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading days..." />;
  }

  return (
    <div className="puzzleweek-days">
      <div className="days-header">
        <h4 className="days-title">
          {weekInfo
            ? `${weekInfo.month} ${weekInfo.year} - Week ${weekInfo.weekNumber}`
            : `Week: ${weekId}`}
        </h4>
        <p className="days-hint">
          View puzzle assignments and scores for each day of the week.
        </p>
      </div>

      <div className="days-list">
        {daysOfWeek.map((dayName) => {
          const dayDetails = days.find((d) => d.id === dayName);

          return (
            <div key={dayName} className="day-card">
              <div className="day-card-header">
                <h5 className="day-name">{dayName}</h5>
                {dayDetails?.puzzle ? (
                  <span className="day-status day-status-assigned">Assigned</span>
                ) : (
                  <span className="day-status day-status-empty">No Puzzle</span>
                )}
              </div>

              {dayDetails?.puzzle && dayDetails.puzzleDetails ? (
                <div className="day-card-content">
                  {/* Puzzle Info */}
                  <div className="day-puzzle-info">
                    <div className="day-info-row">
                      <span className="day-info-label">Puzzle:</span>
                      <span className="day-info-value">{dayDetails.puzzleDetails.Name}</span>
                    </div>
                    <div className="day-info-row">
                      <span className="day-info-label">Type:</span>
                      <span className={`day-puzzle-type day-type-${dayDetails.puzzleDetails.Type.toLowerCase()}`}>
                        {dayDetails.puzzleDetails.Type}
                      </span>
                    </div>
                    <div className="day-info-row">
                      <span className="day-info-label">Topic:</span>
                      <span className="day-info-value">{dayDetails.puzzleDetails.Topic}</span>
                    </div>
                    <div className="day-info-row">
                      <span className="day-info-label">Reward:</span>
                      <span className="day-info-value">{dayDetails.puzzleDetails.Reward} points</span>
                    </div>
                    <div className="day-info-row">
                      <span className="day-info-label">Puzzle ID:</span>
                      <span className="day-info-value day-puzzle-id">{dayDetails.puzzle}</span>
                    </div>
                  </div>

                  {/* Quiz Questions (for Quiz type) */}
                  {dayDetails.puzzleDetails.Type === 'Quiz' && (
                    <div className="day-quiz-details">
                      <h6 className="day-section-title">
                        Quiz Questions ({(dayDetails.puzzleDetails as any).Questions?.length || 0})
                      </h6>
                      <div className="day-quiz-threshold">
                        Passing Threshold: {((dayDetails.puzzleDetails as any).Threshold * 100).toFixed(0)}%
                      </div>
                      {(dayDetails.puzzleDetails as any).Questions?.map((q: any, index: number) => (
                        <div key={index} className="day-quiz-question">
                          <div className="day-quiz-question-header">
                            <span className="day-quiz-question-num">Q{index + 1}</span>
                            <span className="day-quiz-question-score">Score: {q.SV}</span>
                            <span className={`day-quiz-question-type day-type-${q.type}`}>
                              {q.type}
                            </span>
                          </div>
                          <div className="day-quiz-answers">
                            <div className="day-quiz-correct">
                              ✓ {q.type === 'one-select' ? q.answer : q.answers?.join(', ')}
                            </div>
                            <div className="day-quiz-incorrect">
                              ✗ {q.other?.join(', ')}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Code Details (for Code type) */}
                  {dayDetails.puzzleDetails.Type === 'Code' && (
                    <div className="day-code-details">
                      <h6 className="day-section-title">Code Challenge</h6>
                      <div className="day-info-row">
                        <span className="day-info-label">Attempts:</span>
                        <span className="day-info-value">{(dayDetails.puzzleDetails as any).Attempts}</span>
                      </div>
                      <div className="day-info-row">
                        <span className="day-info-label">Conditions:</span>
                        <span className="day-info-value">
                          {(dayDetails.puzzleDetails as any).conditions?.length || 0} test cases
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Score Details */}
                  {dayDetails.topScoresWithNames && dayDetails.topScoresWithNames.length > 0 && (
                    <div className="day-scores">
                      <h6 className="day-section-title">
                        Top Scores ({dayDetails.topScoresWithNames.length})
                      </h6>
                      <table className="day-scores-table">
                        <thead>
                          <tr>
                            <th>Rank</th>
                            <th>Player</th>
                            <th>Score</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dayDetails.topScoresWithNames.slice(0, 5).map((entry, index) => (
                            <tr key={index}>
                              <td className="day-rank">#{index + 1}</td>
                              <td className="day-player">{entry.playerName}</td>
                              <td className="day-score">{entry.score}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ) : (
                <div className="day-card-empty">
                  <p>No puzzle assigned for this day</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="days-actions">
        <Button type="button" variant="secondary" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  );
}

