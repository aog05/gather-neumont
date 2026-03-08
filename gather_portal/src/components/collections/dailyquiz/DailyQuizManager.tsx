import React, { useState, useEffect, useCallback } from 'react';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
} from 'firebase/firestore';
import { db, COLLECTIONS } from '../../../lib/firebase';
import Card from '../../shared/Card';
import Button from '../../shared/Button';
import SearchBar from '../../shared/SearchBar';
import './DailyQuizManager.css';

// ─── Types ────────────────────────────────────────────────────────────────────

interface QuizQuestion {
  id: string;
  type: 'mcq' | 'select-all';
  prompt: string;
  choices: string[];
  basePoints: number;
  difficulty?: number;
  tags?: string[];
  explanation?: string;
}

interface ScheduleEntry {
  dateKey: string;
  questionId: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Timezone helpers ─────────────────────────────────────────────────────────

function getMountainDateKey(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Denver',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function getNextMidnightMT(dateKey: string): Date {
  const [y, m, d] = dateKey.split('-').map(Number);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Denver',
    timeZoneName: 'short',
  }).formatToParts(new Date());
  const tzName = parts.find((p) => p.type === 'timeZoneName')?.value ?? 'MST';
  const offsetHours = tzName === 'MDT' ? 6 : 7;
  return new Date(Date.UTC(y, m - 1, d + 1, offsetHours, 0, 0));
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return '0h 0m 0s';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const min = Math.floor((totalSec % 3600) / 60);
  const sec = totalSec % 60;
  return `${h}h ${min}m ${sec}s`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function DailyQuizManager() {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [schedule, setSchedule] = useState<ScheduleEntry | null>(null);
  const [selectedId, setSelectedId] = useState<string>('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [countdown, setCountdown] = useState('');

  const todayKey = getMountainDateKey();
  const midnight = getNextMidnightMT(todayKey);

  // Countdown ticker
  useEffect(() => {
    const tick = () => setCountdown(formatCountdown(midnight.getTime() - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [midnight]);

  // Load questions + today's schedule
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [qSnap, schedSnap] = await Promise.all([
        getDocs(collection(db, COLLECTIONS.QUIZ_QUESTIONS)),
        getDoc(doc(db, COLLECTIONS.QUIZ_SCHEDULE, todayKey)),
      ]);

      const qs: QuizQuestion[] = qSnap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<QuizQuestion, 'id'>),
      }));
      qs.sort((a, b) => a.prompt.localeCompare(b.prompt));
      setQuestions(qs);

      if (schedSnap.exists()) {
        setSchedule(schedSnap.data() as ScheduleEntry);
        setSelectedId((schedSnap.data() as ScheduleEntry).questionId);
      } else {
        setSchedule(null);
        setSelectedId('');
      }
    } catch (e) {
      setError('Failed to load data. Check your connection and permissions.');
    } finally {
      setLoading(false);
    }
  }, [todayKey]);

  useEffect(() => { load(); }, [load]);

  // ── Save ──────────────────────────────────────────────────────────────────

  const handleSet = async () => {
    if (!selectedId) return;
    setSaving(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const nowIso = new Date().toISOString();
      const payload: ScheduleEntry = {
        dateKey: todayKey,
        questionId: selectedId,
        createdAt: schedule?.createdAt ?? nowIso,
        updatedAt: nowIso,
      };
      await setDoc(doc(db, COLLECTIONS.QUIZ_SCHEDULE, todayKey), payload);
      setSchedule(payload);
      setSuccessMsg('Daily quiz updated — live servers will reflect this immediately.');
    } catch {
      setError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    if (!window.confirm(`Remove today's daily quiz (${todayKey})?`)) return;
    setSaving(true);
    setError(null);
    setSuccessMsg(null);
    try {
      await deleteDoc(doc(db, COLLECTIONS.QUIZ_SCHEDULE, todayKey));
      setSchedule(null);
      setSelectedId('');
      setSuccessMsg('Daily quiz cleared — no quiz will be available today.');
    } catch {
      setError('Failed to clear. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // ── Filtered questions ────────────────────────────────────────────────────

  const filtered = questions.filter((q) => {
    const s = search.toLowerCase();
    return (
      q.prompt.toLowerCase().includes(s) ||
      q.type.toLowerCase().includes(s) ||
      (q.tags ?? []).some((t) => t.toLowerCase().includes(s)) ||
      q.id.toLowerCase().includes(s)
    );
  });

  const activeQuestion = questions.find((q) => q.id === schedule?.questionId);
  const selectedQuestion = questions.find((q) => q.id === selectedId);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="dqm-layout">
      {/* Status Card */}
      <Card title="Today's Daily Quiz">
        <div className="dqm-status">
          <div className="dqm-date-row">
            <span className="dqm-label">Date</span>
            <span className="dqm-date">{todayKey}</span>
            <span className="dqm-expiry-badge">
              ⏱ Expires at 12:00 AM MT — {countdown} remaining
            </span>
          </div>

          {loading ? (
            <div className="dqm-loading">Loading…</div>
          ) : schedule ? (
            <div className="dqm-active-quiz">
              <div className="dqm-status-indicator dqm-status-live">● LIVE</div>
              <div className="dqm-question-preview">
                <span className="dqm-label">Active Question</span>
                <p className="dqm-prompt">{activeQuestion?.prompt ?? schedule.questionId}</p>
                <div className="dqm-meta-row">
                  {activeQuestion && (
                    <>
                      <span className={`dqm-badge dqm-type-${activeQuestion.type}`}>
                        {activeQuestion.type.toUpperCase()}
                      </span>
                      <span className="dqm-badge dqm-points">
                        {activeQuestion.basePoints} pts
                      </span>
                      {activeQuestion.difficulty && (
                        <span className="dqm-badge dqm-diff">
                          {'★'.repeat(activeQuestion.difficulty)}{'☆'.repeat(3 - activeQuestion.difficulty)}
                        </span>
                      )}
                    </>
                  )}
                  <span className="dqm-id">ID: {schedule.questionId}</span>
                </div>
              </div>
              <Button variant="danger" size="sm" onClick={handleClear} disabled={saving}>
                🗑 Clear Daily Quiz
              </Button>
            </div>
          ) : (
            <div className="dqm-empty">
              <div className="dqm-status-indicator dqm-status-none">● NO QUIZ SET</div>
              <p className="dqm-empty-text">No quiz is scheduled for today. Select a question below.</p>
            </div>
          )}

          {error && <div className="dqm-error">⚠ {error}</div>}
          {successMsg && <div className="dqm-success">✓ {successMsg}</div>}
        </div>
      </Card>

      {/* Question Picker Card */}
      <Card
        title="Select a Question"
        actions={
          <Button
            onClick={handleSet}
            disabled={!selectedId || saving || selectedId === schedule?.questionId}
          >
            {saving ? 'Saving…' : '✔ Set as Daily Quiz'}
          </Button>
        }
      >
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search by prompt, type, tag, or ID…"
        />

        {selectedQuestion && selectedId !== schedule?.questionId && (
          <div className="dqm-selection-preview">
            <span className="dqm-label">Selected</span>
            <p className="dqm-prompt">{selectedQuestion.prompt}</p>
            <div className="dqm-meta-row">
              <span className={`dqm-badge dqm-type-${selectedQuestion.type}`}>
                {selectedQuestion.type.toUpperCase()}
              </span>
              <span className="dqm-badge dqm-points">{selectedQuestion.basePoints} pts</span>
            </div>
          </div>
        )}

        <div className="dqm-question-list">
          {loading ? (
            <div className="dqm-loading">Loading questions…</div>
          ) : filtered.length === 0 ? (
            <div className="dqm-empty-list">No questions match your search.</div>
          ) : (
            filtered.map((q) => {
              const isActive = q.id === schedule?.questionId;
              const isSelected = q.id === selectedId;
              return (
                <button
                  key={q.id}
                  className={`dqm-question-row ${isSelected ? 'dqm-row-selected' : ''} ${isActive ? 'dqm-row-active' : ''}`}
                  onClick={() => setSelectedId(q.id)}
                >
                  <div className="dqm-row-main">
                    <span className="dqm-row-prompt">{q.prompt}</span>
                    <div className="dqm-row-badges">
                      <span className={`dqm-badge dqm-type-${q.type}`}>{q.type.toUpperCase()}</span>
                      <span className="dqm-badge dqm-points">{q.basePoints} pts</span>
                      {isActive && <span className="dqm-badge dqm-live-badge">LIVE</span>}
                    </div>
                  </div>
                  <span className="dqm-row-id">{q.id}</span>
                </button>
              );
            })
          )}
        </div>
      </Card>
    </div>
  );
}
