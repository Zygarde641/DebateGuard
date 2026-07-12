import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing.jsx';
import SessionRoom from './pages/SessionRoom.jsx';
import FallacyGuide from './pages/FallacyGuide.jsx';
import './index.css';

// No StrictMode: its double-mounted dev effects would open two mic/socket sessions.
ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/session" element={<SessionRoom />} />
      <Route path="/fallacies" element={<FallacyGuide />} />
    </Routes>
  </BrowserRouter>,
);
