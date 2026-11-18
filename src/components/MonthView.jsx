import React, { useState, useEffect, useRef } from 'react';
import ManufacturerLedger from './ManufacturerLedger';
import SummaryView from './SummaryView';
import ShoesCardsView from './ShoesCardsView';
import { supabase } from '../supabaseClient';

const DEFAULT_STATE = {
  milaDeposit: 5000,
  milaInitialDebt: 1200,
  milaRate: 45.0,
  milaRows: [
    { id: 1, type: 'item', date: '01.09', shoeId: 'b35', quantity: 2, customCostUSD: 35 }
  ],
  valeraRate: 45.0,
  valeraRows: [
    { id: 1, type: 'item', date: '02.09', shoeId: 'moli', quantity: 3, customCostUSD: 33 }
  ],
  expenses: [
    { id: 1, date: '05.09', category: 'Реклама', description: 'Таргет Instagram / Meta', amount: 2500 },
    { id: 2, date: '10.09', category: 'Бухгалтер', description: 'Ведення ФОП та звітність', amount: 1500 }
  ]
};

export default function MonthView() {
  const [activeTab, setActiveTab] = useState('summary');
  const [isLoading, setIsLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState('saved');

  // Стани даних
  const [milaDeposit, setMilaDeposit] = useState(DEFAULT_STATE.milaDeposit);
  const [milaInitialDebt, setMilaInitialDebt] = useState(DEFAULT_STATE.milaInitialDebt);
  const [milaRate, setMilaRate] = useState(DEFAULT_STATE.milaRate);
  const [milaRows, setMilaRows] = useState(DEFAULT_STATE.milaRows);

  const [valeraRate, setValeraRate] = useState(DEFAULT_STATE.valeraRate);
  const [valeraRows, setValeraRows] = useState(DEFAULT_STATE.valeraRows);

  const [expenses, setExpenses] = useState(DEFAULT_STATE.expenses);

  const isRemoteUpdate = useRef(false);

  const applyDataToState = (data) => {
    if (!data) return;
    isRemoteUpdate.current = true;
    if (data.milaDeposit !== undefined) setMilaDeposit(data.milaDeposit);
    if (data.milaInitialDebt !== undefined) setMilaInitialDebt(data.milaInitialDebt);
    if (data.milaRate !== undefined) setMilaRate(data.milaRate);
    if (data.milaRows !== undefined) setMilaRows(data.milaRows);
    if (data.valeraRate !== undefined) setValeraRate(data.valeraRate);
    if (data.valeraRows !== undefined) setValeraRows(data.valeraRows);
    if (data.expenses !== undefined) setExpenses(data.expenses);
  };

  useEffect(() => {
    async function loadInitialData() {
      setSyncStatus('loading');
      const { data, error } = await supabase
        .from('app_state')
        .select('data')
        .eq('id', 1)
        .maybeSingle();

      if (error) {
        console.error('Помилка завантаження з Supabase:', error);
        setSyncStatus('error');
      } else if (data && data.data) {
        applyDataToState(data.data);
        setSyncStatus('saved');
      } else {
        await supabase.from('app_state').insert([{ id: 1, data: DEFAULT_STATE }]);
        setSyncStatus('saved');
      }
      setIsLoading(false);
    }

    loadInitialData();

    const channel = supabase
      .channel('app_state_changes')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'app_state', filter: 'id=eq.1' },
        (payload) => {
          if (payload.new && payload.new.data) {
            applyDataToState(payload.new.data);
            setSyncStatus('saved');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (isLoading) return;

    if (isRemoteUpdate.current) {
      isRemoteUpdate.current = false;
      return;
    }

    setSyncStatus('saving');
    const timer = setTimeout(async () => {
      const currentState = {
        milaDeposit,
        milaInitialDebt,
        milaRate,
        milaRows,
        valeraRate,
        valeraRows,
        expenses
      };

      const { error } = await supabase
        .from('app_state')
        .upsert({ id: 1, data: currentState });

      if (error) {
        console.error('Помилка збереження:', error);
        setSyncStatus('error');
      } else {
        setSyncStatus('saved');
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [milaDeposit, milaInitialDebt, milaRate, milaRows, valeraRate, valeraRows, expenses, isLoading]);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', fontFamily: 'system-ui, sans-serif', color: '#4f46e5', fontWeight: 'bold' }}>
        ⏳ Завантаження даних із хмари...
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '72rem', margin: '0 auto', padding: '1.5rem', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem', background: '#ffffff', padding: '1.5rem', borderRadius: '1rem', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#4f46e5', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              DIM47 • Система обліку та звітності
            </span>
            <h1 style={{ fontSize: '1.875rem', fontWeight: '900', color: '#111827', margin: '0.25rem 0 0 0' }}>
              Облік виробництва та витрат: Вересень 2026
            </h1>
          </div>

          <div style={{ fontSize: '0.75rem', fontWeight: '600', padding: '0.35rem 0.75rem', borderRadius: '9999px', background: syncStatus === 'error' ? '#fef2f2' : '#f3f4f6', color: syncStatus === 'error' ? '#dc2626' : '#4b5563' }}>
            {syncStatus === 'loading' && '⏳ Синхронізація...'}
            {syncStatus === 'saving' && '💾 Збереження...'}
            {syncStatus === 'saved' && '✅ Збережено в хмарі'}
            {syncStatus === 'error' && '⚠️ Помилка підключення до бази'}
          </div>
        </div>
        
        {/* Перемикач сторінок */}
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
          <button 
            onClick={() => setActiveTab('catalog')}
            className={`tab-btn ${activeTab === 'catalog' ? 'active' : ''}`}
          >
            👟 Каталог взуття
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

      {activeTab === 'catalog' && (
        <ShoesCardsView exchangeRate={milaRate} />
      )}
    </div>
  );
}