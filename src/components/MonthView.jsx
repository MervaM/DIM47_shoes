import React, { useState } from 'react';
import ManufacturerLedger from './ManufacturerLedger';
import SummaryView from './SummaryView';

export default function MonthView() {
  // Головна сторінка за замовчуванням — Загальна звітність
  const [activeTab, setActiveTab] = useState('summary');

  // Дані Міли
  const [milaDeposit, setMilaDeposit] = useState(5000);
  const [milaInitialDebt, setMilaInitialDebt] = useState(1200);
  const [milaRate, setMilaRate] = useState(45.0);
  const [milaRows, setMilaRows] = useState([
    { id: 1, type: 'item', date: '01.09', shoeId: 'b35', quantity: 2, customCostUSD: 35 }
  ]);

  // Дані Валерія
  const [valeraRate, setValeraRate] = useState(45.0);
  const [valeraRows, setValeraRows] = useState([
    { id: 1, type: 'item', date: '02.09', shoeId: 'moli', quantity: 3, customCostUSD: 33 }
  ]);

  // Додаткові витрати (реклама, повернення, бухгалтер тощо)
  const [expenses, setExpenses] = useState([
    { id: 1, date: '05.09', category: 'Реклама', description: 'Таргет Instagram / Meta', amount: 2500 },
    { id: 2, date: '10.09', category: 'Бухгалтер', description: 'Ведення ФОП та звітність', amount: 1500 }
  ]);

  return (
    <div style={{ maxWidth: '72rem', margin: '0 auto', padding: '1.5rem', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem', background: '#ffffff', padding: '1.5rem', borderRadius: '1rem', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
        <div>
          <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#4f46e5', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            DIM47 • Система обліку та звітності
          </span>
          <h1 style={{ fontSize: '1.875rem', fontWeight: '900', color: '#111827', margin: '0.25rem 0 0 0' }}>
            Облік виробництва та витрат: Вересень 2026
          </h1>
        </div>
        
        {/* Перемикач сторінок (Загальна — перша) */}
        <div style={{ display: 'flex', flexWrap: 'wrap', background: '#f3f4f6', padding: '0.35rem', borderRadius: '0.75rem', width: 'fit-content', gap: '0.25rem' }}>
          <button 
            onClick={() => setActiveTab('summary')}
            className={`tab-btn ${activeTab === 'summary' ? 'active' : ''}`}
          >
            📊 Загальна звітність
          </button>
          <button 
            onClick={() => setActiveTab('mila')}
            className={`tab-btn ${activeTab === 'mila' ? 'active' : ''}`}
          >
            Міла (Аванс)
          </button>
          <button 
            onClick={() => setActiveTab('valera')}
            className={`tab-btn ${activeTab === 'valera' ? 'active' : ''}`}
          >
            Валерій (Після видачі)
          </button>
        </div>
      </div>

      {activeTab === 'summary' && (
        <SummaryView 
          milaRows={milaRows}
          valeraRows={valeraRows}
          milaRate={milaRate}
          valeraRate={valeraRate}
          expenses={expenses}
          setExpenses={setExpenses}
        />
      )}

      {activeTab === 'mila' && (
        <ManufacturerLedger 
          manufacturerName="Міла" 
          paymentMode="prepaid"
          rows={milaRows}
          setRows={setMilaRows}
          deposit={milaDeposit}
          setDeposit={setMilaDeposit}
          initialDebt={milaInitialDebt}
          setInitialDebt={setMilaInitialDebt}
          exchangeRate={milaRate}
          setExchangeRate={setMilaRate}
        />
      )}

      {activeTab === 'valera' && (
        <ManufacturerLedger 
          manufacturerName="Валерій" 
          paymentMode="postpaid"
          rows={valeraRows}
          setRows={setValeraRows}
          exchangeRate={valeraRate}
          setExchangeRate={setValeraRate}
        />
      )}
    </div>
  );
}