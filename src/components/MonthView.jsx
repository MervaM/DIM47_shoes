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

function getRowPaidMonth(row, fallbackMonthKey) {
  if (row?.paidMonth && /^\d{4}-\d{2}$/.test(String(row.paidMonth))) {
    return String(row.paidMonth);
  }
  if (row?.paidIsoDate && typeof row.paidIsoDate === 'string' && row.paidIsoDate.includes('-')) {
    const parts = row.paidIsoDate.split('-');
    if (parts.length >= 2) {
      return `${parts[0]}-${parts[1].padStart(2, '0')}`;
    }
  }
  const rawDM = row?.paidDate || row?.paidAt;
  const fallbackYear = fallbackMonthKey.split('-')[0] || '2026';
  if (rawDM && typeof rawDM === 'string' && rawDM.includes('.')) {
    const parts = rawDM.split('.');
    if (parts.length >= 2) {
      return `${fallbackYear}-${parts[1].padStart(2, '0')}`;
    }
  }
  if (row?.month && /^\d{4}-\d{2}$/.test(String(row.month))) {
    return String(row.month);
  }
  return fallbackMonthKey;
}

function calculateCarriedAdvance(allMonthsMap, currentMonthKey) {
  let prevDepositsSum = 0;
  let prevPaidFromAdvanceUAH = 0;

  const sortedKeys = Object.keys(allMonthsMap || {}).sort();

  sortedKeys.forEach((key) => {
    const mData = allMonthsMap[key] || {};
    const parts = key.split('-');
    const mIdx = parts[1] ? Math.max(0, Number(parts[1]) - 1) : 0;

    if (key < currentMonthKey) {
      const mDeposits = getDepositsForMonth(mData, key, mIdx);
      mDeposits.forEach((d) => {
        prevDepositsSum += Number(d.amount) || 0;
      });
    }

    const rows = Array.isArray(mData.milaRows) ? mData.milaRows : [];
    rows.forEach((row) => {
      if (row.type !== 'item' || row.isEditing || !row.isPaid) return;
      if (row.paySource === 'separate') return;

      const paidM = getRowPaidMonth(row, key);
      if (paidM < currentMonthKey) {
        const qty = Number(row.quantity) || 0;
        const costUSD = Number(row.customCostUSD) || 0;
        const patternUAH = Number(row.patternCostUAH) || 0;
        const rate = Number(row.rowRate) || Number(mData.milaRate) || 45;
        prevPaidFromAdvanceUAH += qty * costUSD * rate + patternUAH;
      }
    });
  });

  return prevDepositsSum - prevPaidFromAdvanceUAH;
}

export default function MonthView() {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const [activeTab, setActiveTab] = useState('summary');
  const [isLoading, setIsLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState('saved');

  const [allMonthsMap, setAllMonthsMap] = useState({});

  const [milaDepositsList, setMilaDepositsList] = useState([]);
  const [milaInitialDebt, setMilaInitialDebt] = useState(0);
  const [milaRate, setMilaRate] = useState(45.0);
  const [milaRows, setMilaRows] = useState([]);

  const [valeraRate, setValeraRate] = useState(45.0);
  const [valeraRows, setValeraRows] = useState([]);

  const [expenses, setExpenses] = useState([]);
  const [shoesCatalog, setShoesCatalog] = useState([]);

  const skipNextSave = useRef(true);
  const catalogDirty = useRef(false);

  const monthKey = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;

  useEffect(() => {
    let isCancelled = false;

    async function loadDataForMonth() {
      skipNextSave.current = true;
      setIsLoading(true);
      setSyncStatus('loading');

      const { data, error } = await supabase
        .from('app_state')
        .select('data')
        .eq('id', 1)
        .maybeSingle();

      if (isCancelled) return;

      if (error) {
        console.error('Помилка завантаження:', error);
        setSyncStatus('error');
        setIsLoading(false);
        return;
      }

      const rootData = data?.data || {};
      const allMonthsData = rootData.months || {};
      const monthData = allMonthsData[monthKey] || {};
      const loadedDeposits = getDepositsForMonth(monthData, monthKey, selectedMonth);

      setAllMonthsMap(allMonthsData);
      setMilaDepositsList(loadedDeposits);
      setMilaInitialDebt(monthData.milaInitialDebt ?? 0);
      setMilaRate(monthData.milaRate ?? 45.0);
      setMilaRows(Array.isArray(monthData.milaRows) ? monthData.milaRows : []);
      setValeraRate(monthData.valeraRate ?? 45.0);
      setValeraRows(Array.isArray(monthData.valeraRows) ? monthData.valeraRows : []);
      setExpenses(Array.isArray(monthData.expenses) ? monthData.expenses : []);

      if (Array.isArray(rootData.shoesCatalog)) {
        setShoesCatalog(rootData.shoesCatalog);
      }

      setSyncStatus('saved');
      setIsLoading(false);
    }

    loadDataForMonth();

    return () => {
      isCancelled = true;
    };
  }, [monthKey, selectedMonth]);

  useEffect(() => {
    if (isLoading) return;
    if (skipNextSave.current) {
      skipNextSave.current = false;
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

    setAllMonthsMap((prev) => ({
      ...prev,
      [monthKey]: updatedMonthObj
    }));

    setSyncStatus('saving');
    const currentMonthKey = monthKey;

    const timer = setTimeout(async () => {
      const { data: existingData } = await supabase
        .from('app_state')
        .select('data')
        .eq('id', 1)
        .maybeSingle();

      const currentRoot = existingData?.data || {};
      const nextMonths = {
        ...(currentRoot.months || {}),
        [currentMonthKey]: updatedMonthObj
      };

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
        setAllMonthsMap(nextMonths);
        setSyncStatus('saved');
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [
    milaDepositsList,
    milaInitialDebt,
    milaRate,
    milaRows,
    valeraRate,
    valeraRows,
    expenses,
    shoesCatalog,
    monthKey,
    isLoading
  ]);

  const handleSetShoesCatalog = (updater) => {
    catalogDirty.current = true;
    setShoesCatalog(updater);
  };

  const carriedAdvanceFromPrev = calculateCarriedAdvance(allMonthsMap, monthKey);

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
          <button type="button" onClick={() => setActiveTab('summary')} className={`tab-btn ${activeTab === 'summary' ? 'active' : ''}`}>
            📊 Загальна звітність
          </button>
          <button type="button" onClick={() => setActiveTab('mila')} className={`tab-btn ${activeTab === 'mila' ? 'active' : ''}`}>
            Міла (Аванс)
          </button>
          <button type="button" onClick={() => setActiveTab('valera')} className={`tab-btn ${activeTab === 'valera' ? 'active' : ''}`}>
            Валерій (Після видачі)
          </button>
          <button type="button" onClick={() => setActiveTab('catalog')} className={`tab-btn ${activeTab === 'catalog' ? 'active' : ''}`}>
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
              key={`summary-${monthKey}`}
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
              key={`mila-${monthKey}`}
              manufacturerName="Міла"
              paymentMode="prepaid"
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
              rows={milaRows}
              setRows={setMilaRows}
              depositsList={milaDepositsList}
              setDepositsList={setMilaDepositsList}
              carriedAdvanceFromPrev={carriedAdvanceFromPrev}
              initialDebt={milaInitialDebt}
              setInitialDebt={setMilaInitialDebt}
              exchangeRate={milaRate}
              setExchangeRate={setMilaRate}
              shoesCatalog={shoesCatalog}
            />
          )}

          {activeTab === 'valera' && (
            <ManufacturerLedger
              key={`valera-${monthKey}`}
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