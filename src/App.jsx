import React from 'react';
import MonthView from './components/MonthView';
import './App.css';

function App() {
  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <header className="max-w-6xl mx-auto px-6 mb-6">
        <h1 className="text-xs font-semibold tracking-wider text-indigo-600 uppercase">
          DIM47 • Система обліку та звітності
        </h1>
      </header>
      
      <main>
        <MonthView />
      </main>
    </div>
  );
}

export default App;