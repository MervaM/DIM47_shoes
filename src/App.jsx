import React from 'react';
import MonthView from './components/MonthView';
import './App.css';

function App() {
  return (
    <div className="min-h-screen bg-gray-100 py-4 overflow-x-clip">
      <main>
        <MonthView />
      </main>
    </div>
  );
}

export default App;