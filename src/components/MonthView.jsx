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

function calculateCarryOverForManufacturer(allMonthsMap, currentMonthKey, manufacturer) {
  let depositsSum = 0;
  let paidFromAdvanceUAH = 0;
  let unpaidDebtUAH = 0;

  const sortedKeys = Object.keys(allMonthsMap || {}).sort();

  sortedKeys.forEach((key) => {
    if (key >= currentMonthKey) return;
    const mData = allMonthsMap[key] || {};
    const parts = key.split('-');
    const mIdx = parts[1] ? Math.max(0, Number(parts[1]) - 1) : 0;

    if (manufacturer === 'Міла') {
      const mDeposits = getDepositsForMonth(mData, key, mIdx);
      mDeposits.forEach((d) => {
        depositsSum += Number(d.amount) || 0;
      });

      const rows = Array.isArray(mData.milaRows) ? mData.milaRows : [];
      rows.forEach((row) => {
        if (row.type !== 'item' || row.isEditing) return;
        const qty = Number(row.quantity) || 0;
        const costUSD = Number(row.customCostUSD) || 0;
        const patternUAH = Number(row.patternCostUAH) || 0;
        const rate = Number(row.rowRate) || Number(mData.milaRate) || 45;
        const rowFullUAH = qty * costUSD * rate + patternUAH;

        if (row.isPaid) {
          if (row.paySource !== 'separate') {
            paidFromAdvanceUAH += rowFullUAH;
          }
        } else {
          unpaidDebtUAH += rowFullUAH;
        }
      });
    } else if (manufacturer === 'Валерій') {
      const rows = Array.isArray(mData.valeraRows) ? mData.valeraRows : [];
      rows.forEach((row) => {
        if (row.type !== 'item' || row.isEditing) return;
        const qty = Number(row.quantity) || 0;
        const costUSD = Number(row.customCostUSD) || 0;
        const patternUAH = Number(row.patternCostUAH) || 0;
        const rate = Number(row.rowRate) || Number(mData.valeraRate) || 45;
        const rowFullUAH = qty * costUSD * rate + patternUAH;

        if (!row.isPaid) {
          unpaidDebtUAH += rowFullUAH;
        }
      });
    }
  });

  return {
    carriedAdvance: depositsSum - paidFromAdvanceUAH,
    carriedDebt: unpaidDebtUAH
  };
}

export default function MonthView() {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth()); // 0-11
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const [activeTab, setActiveTab] = useState('summary');
  const [isLoading, setIsLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState('saved');

  // Усі місяці з бази для розрахунку переносу залишків і боргів
  const [allMonthsMap, setAllMonthsMap] = useState({});

  // Дані для поточного обраного місяця
  const [milaDepositsList, setMilaDepositsList] = useState([]);
  const [milaInitialDebt, setMilaInitialDebt] = useState(0);
  const [milaRate, setMilaRate] = useState(45.0);
  const [milaRows, setMilaRows] = useState([]);

  const [valeraRate, setValeraRate] = useState(45.0);
  const [valeraRows, setValeraRows] = useState([]);

  const [expenses, setExpenses] = useState([]);

  // Загальний каталог взуття (спільний для всіх місяців)
  const [shoesCatalog, setShoesCatalog] = useState([
    { id: 'b35', name: 'Б35 (шкіра/замша)', manufacturer: 'Міла', defaultCostUSD: 35, retailPriceUSD: 63, photo: '' },
    { id: 'moli', name: 'Молі', manufacturer: 'Валерій', defaultCostUSD: 33, retailPriceUSD: 59.4, photo: '' },
    { id: 'y14', name: 'Y14', manufacturer: 'Міла', defaultCostUSD: 45, retailPriceUSD: 81, photo: '' }
  ]);

  const isRemoteUpdate = useRef(false);

  // Унікальний ключ для місяця в базі, напр. "2026-08"
  const monthKey = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;

  // Завантаження даних при зміні місяця або старті
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
        setAllMonthsMap(allMonthsData);
        setMilaDepositsList(loadedDeposits);
        setMilaInitialDebt(monthData.milaInitialDebt ?? 0);
        setMilaRate(monthData.milaRate ?? 45.0);
        setMilaRows(monthData.milaRows ?? []);
        setValeraRate(monthData.valeraRate ?? 45.0);
        setValeraRows(monthData.valeraRows ?? []);
        setExpenses(monthData.expenses ?? []);

        if (data.data.shoesCatalog) {
          setShoesCatalog(data.data.shoesCatalog);
        }

        setSyncStatus('saved');
      }
      setIsLoading(false);
    }

    loadDataForMonth();
  }, [monthKey, selectedMonth]);

  // Збереження даних у хмару при будь-якій зміні
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

    setAllMonthsMap((prev) => ({
      ...prev,
      [monthKey]: updatedMonthObj
    }));

    setSyncStatus('saving');
    const timer = setTimeout(async () => {
      const { data: existingData } = await supabase
        .from('app_state')
        .select('data')
        .eq('id', 1)
        .maybeSingle();

      const currentRoot = existingData?.data || {};
      const months = {
        ...(currentRoot.months || {}),
        [monthKey]: updatedMonthObj
      };

      const payloadToSave = {
        ...currentRoot,
        shoesCatalog,
        months
      };

      const { error } = await supabase
        .from('app_state')
        .upsert({ id: 1, data: payloadToSave });

      if (error) {
        console.error('Помилка збереження:', error);
        setSyncStatus('error');
      } else {
        setSyncStatus('saved');
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [milaDepositsList, milaInitialDebt, milaRate, milaRows, valeraRate, valeraRows, expenses, shoesCatalog, monthKey, isLoading]);

  const milaCarry = calculateCarryOverForManufacturer(allMonthsMap, monthKey, 'Міла');
  const valeraCarry = calculateCarryOverForManufacturer(allMonthsMap, monthKey, 'Валерій');

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
              carriedAdvanceFromPrev={milaCarry.carriedAdvance}
              carriedDebtFromPrev={milaCarry.carriedDebt}
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
              carriedAdvanceFromPrev={valeraCarry.carriedAdvance}
              carriedDebtFromPrev={valeraCarry.carriedDebt}
              exchangeRate={valeraRate}
              setExchangeRate={setValeraRate}
              shoesCatalog={shoesCatalog}
            />
          )}

          {activeTab === 'catalog' && (
            <ShoesCardsView
              shoes={shoesCatalog}
              setShoes={setShoesCatalog}
              exchangeRate={milaRate}
            />
          )}
        </>
      )}
    </div>
  );
}