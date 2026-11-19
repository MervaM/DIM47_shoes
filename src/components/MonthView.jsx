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

function calculateCarryOverForManufacturer(allMonthsMap, currentMonthKey, manufacturer) {
  let depositsSum = 0;
  let paidFromAdvanceUAH = 0;
  let unpaidDebtUAH = 0;

  const sortedKeys = Object.keys(allMonthsMap || {}).sort();

  sortedKeys.forEach((key) => {
    const mData = allMonthsMap[key] || {};
    const parts = key.split('-');
    const mIdx = parts[1] ? Math.max(0, Number(parts[1]) - 1) : 0;

    if (manufacturer === 'Міла') {
      if (key < currentMonthKey) {
        const mDeposits = getDepositsForMonth(mData, key, mIdx);
        mDeposits.forEach((d) => {
          depositsSum += Number(d.amount) || 0;
        });
      }

      const rows = Array.isArray(mData.milaRows) ? mData.milaRows : [];
      rows.forEach((row) => {
        if (row.type !== 'item' || row.isEditing) return;
        const qty = Number(row.quantity) || 0;
        const costUSD = Number(row.customCostUSD) || 0;
        const patternUAH = Number(row.patternCostUAH) || 0;
        const rate = Number(row.rowRate) || Number(mData.milaRate) || 45;
        const rowFullUAH = qty * costUSD * rate + patternUAH;

        if (row.isPaid) {
          const paidM = getRowPaidMonth(row, key);
          if (paidM < currentMonthKey && row.paySource !== 'separate') {
            paidFromAdvanceUAH += rowFullUAH;
          }
        } else if (key < currentMonthKey) {
          unpaidDebtUAH += rowFullUAH;
        }
      });
    } else if (manufacturer === 'Валерій') {
      if (key < currentMonthKey) {
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
    }
  });

  return {
    carriedAdvance: depositsSum - paidFromAdvanceUAH,
    carriedDebt: unpaidDebtUAH
  };
}

function collectPaidRowsForMonth(allMonthsMap, targetMonthKey) {
  const milaPaid = [];
  const valeraPaid = [];

  Object.keys(allMonthsMap || {}).forEach((key) => {
    const mData = allMonthsMap[key] || {};

    const mRows = Array.isArray(mData.milaRows) ? mData.milaRows : [];
    mRows.forEach((row) => {
      if (row.type === 'item' && row.isPaid) {
        if (getRowPaidMonth(row, key) === targetMonthKey) {
          milaPaid.push({
            ...row,
            rowRate: Number(row.rowRate) || Number(mData.milaRate) || 45
          });
        }
      }
    });

    const vRows = Array.isArray(mData.valeraRows) ? mData.valeraRows : [];
    vRows.forEach((row) => {
      if (row.type === 'item' && row.isPaid) {
        if (getRowPaidMonth(row, key) === targetMonthKey) {
          valeraPaid.push({
            ...row,
            rowRate: Number(row.rowRate) || Number(mData.valeraRate) || 45
          });
        }
      }
    });
  });

  return { milaPaid, valeraPaid };
}

function getUnpaidFromPreviousMonths(allMonthsMap, currentMonthKey, manufacturerKey) {
  const carried = [];
  Object.keys(allMonthsMap || {})
    .sort()
    .forEach((k) => {
      if (k < currentMonthKey) {
        const list = allMonthsMap[k]?.[manufacturerKey] || [];
        list.forEach((r) => {
          if (r.type === 'item' && !r.isPaid) {
            carried.push({ ...r, _originMonth: k });
          }
        });
      }
    });
  return carried;
}

export default function MonthView() {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth()); // 0-11
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const [activeTab, setActiveTab] = useState('summary');
  const [isLoading, setIsLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState('saved');

  // Усі місяці з бази
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

  // Синхронізація та збереження даних у хмару
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
      const nextMonths = { ...(currentRoot.months || {}) };

      // Якщо якась пара була перенесена з попереднього місяця і оплачена в поточному —
      // видаляємо її дубль з попереднього місяця, щоб не висіла там як неоплачена
      const currentMilaIds = new Set(milaRows.map((r) => r.id));
      const currentValeraIds = new Set(valeraRows.map((r) => r.id));

      Object.keys(nextMonths).forEach((k) => {
        if (k < monthKey && nextMonths[k]) {
          if (Array.isArray(nextMonths[k].milaRows)) {
            nextMonths[k].milaRows = nextMonths[k].milaRows.filter((r) => !currentMilaIds.has(r.id));
          }
          if (Array.isArray(nextMonths[k].valeraRows)) {
            nextMonths[k].valeraRows = nextMonths[k].valeraRows.filter((r) => !currentValeraIds.has(r.id));
          }
        }
      });

      nextMonths[monthKey] = updatedMonthObj;

      const payloadToSave = {
        ...currentRoot,
        shoesCatalog,
        months: nextMonths
      };

      const { error } = await supabase
        .from('app_state')
        .upsert({ id: 1, data: payloadToSave });

      if (error) {
        console.error('Помилка збереження:', error);
        setSyncStatus('error');
      } else {
        setAllMonthsMap(nextMonths);
        setSyncStatus('saved');
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [milaDepositsList, milaInitialDebt, milaRate, milaRows, valeraRate, valeraRows, expenses, shoesCatalog, monthKey, isLoading]);

  const milaCarry = calculateCarryOverForManufacturer(allMonthsMap, monthKey, 'Міла');
  const valeraCarry = calculateCarryOverForManufacturer(allMonthsMap, monthKey, 'Валерій');
  const paidByDateMap = collectPaidRowsForMonth(allMonthsMap, monthKey);

  // Неоплачені пари з попередніх місяців, які перетягуються в поточний
  const carriedUnpaidMila = getUnpaidFromPreviousMonths(allMonthsMap, monthKey, 'milaRows').filter(
    (c) => !milaRows.some((r) => r.id === c.id)
  );
  const carriedUnpaidValera = getUnpaidFromPreviousMonths(allMonthsMap, monthKey, 'valeraRows').filter(
    (c) => !valeraRows.some((r) => r.id === c.id)
  );

  const combinedMilaRows = [...carriedUnpaidMila, ...milaRows];
  const combinedValeraRows = [...carriedUnpaidValera, ...valeraRows];

  const handleSetMilaRows = (nextRows) => {
    const cleaned = nextRows.map(({ _originMonth, ...rest }) => rest);
    setMilaRows(cleaned);
  };

  const handleSetValeraRows = (nextRows) => {
    const cleaned = nextRows.map(({ _originMonth, ...rest }) => rest);
    setValeraRows(cleaned);
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
              milaPaidRows={paidByDateMap.milaPaid}
              valeraPaidRows={paidByDateMap.valeraPaid}
              milaRows={combinedMilaRows}
              valeraRows={combinedValeraRows}
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
              rows={combinedMilaRows}
              setRows={handleSetMilaRows}
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
              rows={combinedValeraRows}
              setRows={handleSetValeraRows}
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