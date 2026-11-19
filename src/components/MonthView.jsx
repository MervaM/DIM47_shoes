import React, { useState, useEffect, useRef } from 'react';
import ManufacturerLedger from './ManufacturerLedger';
import SummaryView from './SummaryView';
import ShoesCardsView from './ShoesCardsView';
import { supabase } from '../supabaseClient';

const MONTHS_UKR = [
  'Січень', 'Лютий', 'Березень', 'Квітень', 'Травень', 'Червень',
  'Липень', 'Серпень', 'Вересень', 'Жовтень', 'Листопад', 'Грудень'
];

function getDepositsForMonth(monthData, monthKey, monthIndex) {
  if (Array.isArray(monthData?.milaDepositsList)) {
    return monthData.milaDepositsList;
  }
  if (Number(monthData?.milaDeposit) > 0) {
    return [
      {
        id: `legacy_${monthKey}`,
        isoDate: `${monthKey}-01`,
        month: monthKey,
        date: `01.${String(monthIndex + 1).padStart(2, '0')}`,
        amount: Number(monthData.milaDeposit)
      }
    ];
  }
  return [];
}

export default function MonthView() {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const [activeTab, setActiveTab] = useState('summary');
  const [isLoading, setIsLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState('saved');

  const [milaDepositsList, setMilaDepositsList] = useState([]);
  const [milaInitialDebt, setMilaInitialDebt] = useState(0);
  const [milaRate, setMilaRate] = useState(45.0);
  const [milaRows, setMilaRows] = useState([]);

  const [valeraRate, setValeraRate] = useState(45.0);
  const [valeraRows, setValeraRows] = useState([]);

  const [expenses, setExpenses] = useState([]);

  // Каталог підтягується тільки з бази
  const [shoesCatalog, setShoesCatalog] = useState([]);

  const isRemoteUpdate = useRef(false);
  const catalogDirty = useRef(false);

  const monthKey = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;

  useEffect(() => {
    async function loadDataForMonth() {
      setIsLoading(true);
      setSyncStatus('loading');

      const { data, error } = await supabase
        .from('app_state')
        .select('data')
        .eq('id', 1)
        .maybeSingle();

      if (error) {
        console.error('Помилка завантаження:', error);
        setSyncStatus('error');
      } else if (data && data.data) {
        const allMonthsData = data.data.months || {};
        const monthData = allMonthsData[monthKey] || {};
        const loadedDeposits = getDepositsForMonth(monthData, monthKey, selectedMonth);

        isRemoteUpdate.current = true;
        setMilaDepositsList(loadedDeposits);
        setMilaInitialDebt(monthData.milaInitialDebt ?? 0);
        setMilaRate(monthData.milaRate ?? 45.0);
        setMilaRows(monthData.milaRows ?? []);
        setValeraRate(monthData.valeraRate ?? 45.0);
        setValeraRows(monthData.valeraRows ?? []);
        setExpenses(monthData.expenses ?? []);

        if (Array.isArray(data.data.shoesCatalog)) {
          setShoesCatalog(data.data.shoesCatalog);
        }

        setSyncStatus('saved');
      }
      setIsLoading(false);
    }

    loadDataForMonth();
  }, [monthKey, selectedMonth]);

  useEffect(() => {
    if (isLoading) return;
    if (isRemoteUpdate.current) {
      isRemoteUpdate.current = false;
      return;
    }

    const depositsTotal = milaDepositsList.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);

    const updatedMonthObj = {
      milaDepositsList,
      milaDeposit: depositsTotal,
      milaInitialDebt,
      milaRate,
      milaRows,
      valeraRate,
      valeraRows,
      expenses
    };

    setSyncStatus('saving');
    const timer = setTimeout(async () => {
      const { data: existingData } = await supabase
        .from('app_state')
        .select('data')
        .eq('id', 1)
        .maybeSingle();

      const currentRoot = existingData?.data || {};
      const nextMonths = {
        ...(currentRoot.months || {}),
        [monthKey]: updatedMonthObj
      };

      // Каталог у базі оновлюється ТІЛЬКИ якщо ти сама його змінила у вкладці "Каталог взуття"
      const nextCatalog = catalogDirty.current
        ? shoesCatalog
        : (currentRoot.shoesCatalog ?? shoesCatalog);

      const payloadToSave = {
        ...currentRoot,
        shoesCatalog: nextCatalog,
        months: nextMonths
      };

      const { error } = await supabase
        .from('app_state')
        .upsert({ id: 1, data: payloadToSave });

      if (error) {
        console.error('Помилка збереження:', error);
        setSyncStatus('error');
      } else {
        catalogDirty.current = false;
        setSyncStatus('saved');
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [milaDepositsList, milaInitialDebt, milaRate, milaRows, valeraRate, valeraRows, expenses, shoesCatalog, monthKey, isLoading]);

  const handleSetShoesCatalog = (updater) => {
    catalogDirty.current = true;
    setShoesCatalog(updater);
  };

  return (
    <div style={{ maxWidth: '72rem', margin: '0 auto', padding: '1.5rem', fontFamily: 'system-ui, sans-serif' }}>
      <div
        className="sticky-top-header"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          marginBottom: '2rem',
          background: '#ffffff',
          padding: '1.5rem',
          borderRadius: '1rem',
          border: '1px solid #e5e7eb',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#4f46e5', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              DIM47 • Система обліку та звітності
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '1.75rem', fontWeight: '900', color: '#111827', margin: 0 }}>
                Облік виробництва та витрат:
              </h1>

              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  style={{ padding: '0.4rem 0.75rem', borderRadius: '0.5rem', border: '2px solid #4f46e5', fontWeight: 'bold', fontSize: '1rem', color: '#4f46e5', background: '#f5f3ff' }}
                >
                  {MONTHS_UKR.map((m, idx) => (
                    <option key={idx} value={idx}>{m}</option>
                  ))}
                </select>

                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  style={{ padding: '0.4rem 0.75rem', borderRadius: '0.5rem', border: '2px solid #4f46e5', fontWeight: 'bold', fontSize: '1rem', color: '#4f46e5', background: '#f5f3ff' }}
                >
                  {[2025, 2026, 2027, 2028].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div style={{ fontSize: '0.75rem', fontWeight: '600', padding: '0.35rem 0.75rem', borderRadius: '9999px', background: syncStatus === 'error' ? '#fef2f2' : '#f3f4f6', color: syncStatus === 'error' ? '#dc2626' : '#4b5563' }}>
            {syncStatus === 'loading' && '⏳ Завантаження...'}
            {syncStatus === 'saving' && '💾 Збереження...'}
            {syncStatus === 'saved' && '✅ Збережено в хмарі'}
            {syncStatus === 'error' && '⚠️ Помилка бази'}
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', background: '#f3f4f6', padding: '0.35rem', borderRadius: '0.75rem', width: 'fit-content', gap: '0.25rem' }}>
          <button onClick={() => setActiveTab('summary')} className={`tab-btn ${activeTab === 'summary' ? 'active' : ''}`}>
            📊 Загальна звітність
          </button>
          <button onClick={() => setActiveTab('mila')} className={`tab-btn ${activeTab === 'mila' ? 'active' : ''}`}>
            Міла (Аванс)
          </button>
          <button onClick={() => setActiveTab('valera')} className={`tab-btn ${activeTab === 'valera' ? 'active' : ''}`}>
            Валерій (Після видачі)
          </button>
          <button onClick={() => setActiveTab('catalog')} className={`tab-btn ${activeTab === 'catalog' ? 'active' : ''}`}>
            👟 Каталог взуття
          </button>
        </div>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#4f46e5', fontWeight: 'bold' }}>⏳ Завантаження даних місяця...</div>
      ) : (
        <>
          {activeTab === 'summary' && (
            <SummaryView
              monthKey={monthKey}
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
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
              rows={milaRows}
              setRows={setMilaRows}
              depositsList={milaDepositsList}
              setDepositsList={setMilaDepositsList}
              initialDebt={milaInitialDebt}
              setInitialDebt={setMilaInitialDebt}
              exchangeRate={milaRate}
              setExchangeRate={setMilaRate}
              shoesCatalog={shoesCatalog}
            />
          )}

          {activeTab === 'valera' && (
            <ManufacturerLedger
              manufacturerName="Валерій"
              paymentMode="postpaid"
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
              rows={valeraRows}
              setRows={setValeraRows}
              exchangeRate={valeraRate}
              setExchangeRate={setValeraRate}
              shoesCatalog={shoesCatalog}
            />
          )}

          {activeTab === 'catalog' && (
            <ShoesCardsView
              shoes={shoesCatalog}
              setShoes={handleSetShoesCatalog}
              exchangeRate={milaRate}
            />
          )}
        </>
      )}
    </div>
  );
}