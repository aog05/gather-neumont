import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from './components/layout/AdminLayout';
import Dashboard from './components/visualizations/Dashboard';
import AnalyticsDashboard from './components/visualizations/AnalyticsDashboard';
import PlayerList from './components/collections/player/PlayerList';
import NPCList from './components/collections/npc/NPCList';
import QuestList from './components/collections/quest/QuestList';
import DialogueList from './components/collections/dialogue/DialogueList';
import PuzzleList from './components/collections/puzzle/PuzzleList';
import PuzzleWeekList from './components/collections/puzzleweek/PuzzleWeekList';
import CosmeticList from './components/collections/cosmetic/CosmeticList';
import SkillTreeList from './components/collections/skilltree/SkillTreeList';
import DailyQuizManager from './components/collections/dailyquiz/DailyQuizManager';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AdminLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="analytics" element={<AnalyticsDashboard />} />
          <Route path="players" element={<PlayerList />} />
          <Route path="npcs" element={<NPCList />} />
          <Route path="dialogue" element={<DialogueList />} />
          <Route path="quests" element={<QuestList />} />
          <Route path="puzzles" element={<PuzzleList />} />
          <Route path="puzzle-weeks" element={<PuzzleWeekList />} />
          <Route path="cosmetics" element={<CosmeticList />} />
          <Route path="skills" element={<SkillTreeList />} />
          <Route path="daily-quiz" element={<DailyQuizManager />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;

