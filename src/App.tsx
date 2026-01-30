import { BrowserRouter, Routes, Route } from "react-router-dom";
import GamePage from "./Game.tsx";

import "./index.css";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<GamePage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
