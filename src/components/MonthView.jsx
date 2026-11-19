import React, { useState, useEffect, useRef, useCallback } from 'react';
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

function getRowOrderMonth(row, fallbackMonthKey) {
  const fallbackYear = fallbackMonthKey.split('-')[0] || '2026';
  if (row?.isoDate && typeof row.isoDate === 'string' && row.isoDate.includes('-')) {
    const parts = row.isoDate.split('-');
    if (parts.length >= 2) {
      return `${parts[0]}-${parts[1].padStart(2, '0')}`;
    }
  }
  if (row?.date && typeof row.date === 'string' && row.date.includes('.')) {
    const parts = row.date.split('.');
    if (parts.length >= 2) {
      return `${fallbackYear}-${parts[1].padStart(2, '0')}`;
    }
  }
  if (row?.month && /^\d{4}-\d{2}$/.test(String(row.month))) {
    return String(row.month);
  }
  return fallbackMonthKey;
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
  return getRowOrderMonth(row, fallbackMonthKey);
}

/**
 * Рахує перенесений залишок авансу ланцюжком з усіх попередніх місяців до targetMonthKey
 */
function calculateChainedAdvance(allMonthsMap, targetMonthKey) {
  const keysSet = new Set(Object.keys(allMonthsMap || {}));

  const [targetYearStr, targetMonthStr] = targetMonthKey.split('-');
  const targetYear = Number(targetYearStr) || 2026;
  const targetMonthNum = Number(targetMonthStr) || 1;

  for (let m = 1; m < targetMonthNum; m++) {
    keysSet.add(`${targetYear}-${String(m).padStart(2, '0')}`);
  }

  const orderedPrevKeys = Array.from(keysSet)
    .filter((k) => k < targetMonthKey)
    .sort();

  let runningAdvance = 0;

  orderedPrevKeys.forEach((key) => {
    const mData = allMonthsMap?.[key] || {};
    const parts = key.split('-');
    const mIdx = parts[1] ? Math.max(0, Number(parts[1]) - 1) : 0;

    const mDeposits = getDepositsForMonth(mData, key, mIdx);
    const monthDepositsSum = mDeposits.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);

    let monthPaidFromAdvanceUAH = 0;

    Object.keys(allMonthsMap || {}).forEach((sourceKey) => {
      const sourceData = allMonthsMap[sourceKey] || {};
      const rows = Array.isArray(sourceData.milaRows) ? sourceData.milaRows : [];

      rows.forEach((row) => {
        if (row.type !== 'item' || row.isEditing || !row.isPaid) return;
        if (row.paySource === 'separate') return;

        const paidM = getRowPaidMonth(row, sourceKey);
        if (paidM === key) {
          const qty = Number(row.quantity) || 0;
          const costUSD = Number(row.customCostUSD) || 0;
          const patternUAH = Number(row.patternCostUAH) || 0;
          const rate = Number(row.rowRate) || Number(sourceData.milaRate) || 45;
          monthPaidFromAdvanceUAH += qty * costUSD * rate + patternUAH;
        }
      });
    });

    runningAdvance = Math.max(0, runningAdvance + monthDepositsSum - monthPaidFromAdvanceUAH);
  });

  return runningAdvance;
}

function collectCrossMonthRows(allMonthsMap, fieldName, currentMonthKey) {
  const seenIds = new Set();
  const result = [];
  const sortedKeys = Object.keys(allMonthsMap || {}).sort();

  sortedKeys.forEach((key) => {
    if (key === currentMonthKey) return;
    const mData = allMonthsMap[key] || {};
    const list = Array.isArray(mData[fieldName]) ? mData[fieldName] : [];
    list.forEach((r) => {
      if (!r || seenIds.has(r.id)) return;
      seenIds.add(r.id);
      result.push({ ...r, _storageMonthKey: key });
    });
  });

  return result;
}

function buildMonthPayload({
  milaDepositsList,
  milaInitialDebt,
  milaRate,
  milaRows,
  valeraRate,
  valeraRows,
  expenses
}) {
  const depositsTotal = (milaDepositsList || []).reduce(
    (sum, d) => sum + (Number(d.amount) || 0),
    0
  );

  return {
    milaDepositsList: milaDepositsList || [],
    milaDeposit: depositsTotal,
    milaInitialDebt: milaInitialDebt ?? 0,
    milaRate: milaRate ?? 45.0,
    milaRows: milaRows || [],
    valeraRate: valeraRate ?? 45.0,
    valeraRows: valeraRows || [],
    expenses: expenses || []
  };
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

  const canAutoSave = useRef(false);
  const catalogDirty = useRef(false);
  const loadedMonthKeyRef = useRef(null);
  const latestMonthPayloadRef = useRef(null);
  const latestCatalogRef = useRef([]);

  const monthKey = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;

  useEffect(() => {
    latestCatalogRef.current = shoesCatalog;
  }, [shoesCatalog]);

  useEffect(() => {
    latestMonthPayloadRef.current = buildMonthPayload({
      milaDepositsList,
      milaInitialDebt,
      milaRate,
      milaRows,
      valeraRate,
      valeraRows,
      expenses
    });
  }, [
    milaDepositsList,
    milaInitialDebt,
    milaRate,
    milaRows,
    valeraRate,
    valeraRows,
    expenses
  ]);

  const persistMonthToSupabase = useCallback(async (targetKey, monthObj, overrideCatalog) => {
    if (!targetKey || !monthObj) return;

    setSyncStatus('saving');

    const { data: existingData, error: readError } = await supabase
      .from('app_state')
      .select('data')
      .eq('id', 1)
      .maybeSingle();

    if (readError) {
      console.error('Помилка читання перед збереженням:', readError);
      setSyncStatus('error');
      return;
    }

    const currentRoot = existingData?.data || {};
    const nextMonths = {
      ...(currentRoot.months || {}),
      [targetKey]: monthObj
    };

    const nextCatalog =
      overrideCatalog !== undefined
        ? overrideCatalog
        : catalogDirty.current
        ? latestCatalogRef.current
        : currentRoot.shoesCatalog ?? latestCatalogRef.current;

    const payloadToSave = {
      ...currentRoot,
      shoesCatalog: nextCatalog,
      months: nextMonths
    };

    const { error: writeError } = await supabase
      .from('app_state')
      .upsert({ id: 1, data: payloadToSave });

    if (writeError) {
      console.error('Помилка збереження:', writeError);
      setSyncStatus('error');
    } else {
      if (overrideCatalog !== undefined || catalogDirty.current) {
        catalogDirty.current = false;
      }
      setAllMonthsMap(nextMonths);
      setSyncStatus('saved');
    }
  }, []);

  useEffect(() => {
    let isCancelled = false;

    async function loadDataForMonth() {
      // Якщо ми вже працювали з попереднім місяцем — зберігаємо його одразу перед перемиканням
      const prevKey = loadedMonthKeyRef.current;
      const prevPayload = latestMonthPayloadRef.current;
      if (prevKey && prevKey !== monthKey && prevPayload) {
        await persistMonthToSupabase(prevKey, prevPayload);
      }

      if (isCancelled) return;

      canAutoSave.current = false;
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
      const mIdx = Math.max(0, Number(monthKey.split('-')[1] || 1) - 1);
      const loadedDeposits = getDepositsForMonth(monthData, monthKey, mIdx);
      const loadedInitDebt = monthData.milaInitialDebt ?? 0;
      const loadedMilaRate = monthData.milaRate ?? 45.0;
      const loadedMilaRows = Array.isArray(monthData.milaRows) ? monthData.milaRows : [];
      const loadedValeraRate = monthData.valeraRate ?? 45.0;
      const loadedValeraRows = Array.isArray(monthData.valeraRows) ? monthData.valeraRows : [];
      const loadedExpenses = Array.isArray(monthData.expenses) ? monthData.expenses : [];
      const loadedCatalog = Array.isArray(rootData.shoesCatalog) ? rootData.shoesCatalog : [];

      setAllMonthsMap(allMonthsData);
      setMilaDepositsList(loadedDeposits);
      setMilaInitialDebt(loadedInitDebt);
      setMilaRate(loadedMilaRate);
      setMilaRows(loadedMilaRows);
      setValeraRate(loadedValeraRate);
      setValeraRows(loadedValeraRows);
      setExpenses(loadedExpenses);
      setShoesCatalog(loadedCatalog);
      latestCatalogRef.current = loadedCatalog;

      latestMonthPayloadRef.current = buildMonthPayload({
        milaDepositsList: loadedDeposits,
        milaInitialDebt: loadedInitDebt,
        milaRate: loadedMilaRate,
        milaRows: loadedMilaRows,
        valeraRate: loadedValeraRate,
        valeraRows: loadedValeraRows,
        expenses: loadedExpenses
      });

      loadedMonthKeyRef.current = monthKey;

      setSyncStatus('saved');
      setIsLoading(false);
      setTimeout(() => {
        if (!isCancelled) canAutoSave.current = true;
      }, 100);
    }

    loadDataForMonth();

    return () => {
      isCancelled = true;
    };
  }, [monthKey, persistMonthToSupabase]);

  // Автозбереження при змінах усередині поточного місяця
  useEffect(() => {
    if (isLoading || !canAutoSave.current) return;

    const updatedMonthObj = buildMonthPayload({
      milaDepositsList,
      milaInitialDebt,
      milaRate,
      milaRows,
      valeraRate,
      valeraRows,
      expenses
    });

    latestMonthPayloadRef.current = updatedMonthObj;

    setAllMonthsMap((prev) => ({
      ...prev,
      [monthKey]: updatedMonthObj
    }));

    setSyncStatus('saving');
    const currentMonthKey = monthKey;

    const timer = setTimeout(() => {
      persistMonthToSupabase(currentMonthKey, updatedMonthObj);
    }, 300);

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
    isLoading,
    persistMonthToSupabase
  ]);

  const handleSetShoesCatalog = (updater) => {
    catalogDirty.current = true;
    setShoesCatalog((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      latestCatalogRef.current = next;
      if (latestMonthPayloadRef.current) {
        persistMonthToSupabase(monthKey, latestMonthPayloadRef.current, next);
      }
      return next;
    });
  };

  const handleUpdateExternalRow = async (fieldName, storageMonthKey, rowId, patchOrDelete) => {
    const targetMonthObj = allMonthsMap[storageMonthKey];
    if (!targetMonthObj) return;

    const existingList = Array.isArray(targetMonthObj[fieldName]) ? targetMonthObj[fieldName] : [];
    const nextList =
      patchOrDelete === null
        ? existingList.filter((r) => r.id !== rowId)
        : existingList.map((r) => (r.id === rowId ? { ...r, ...patchOrDelete } : r));

    const nextTargetMonthObj = {
      ...targetMonthObj,
      [fieldName]: nextList
    };

    const nextAllMonths = {
      ...allMonthsMap,
      [storageMonthKey]: nextTargetMonthObj
    };
    setAllMonthsMap(nextAllMonths);

    await persistMonthToSupabase(storageMonthKey, nextTargetMonthObj);
  };

  const carriedAdvanceFromPrev = calculateChainedAdvance(allMonthsMap, monthKey);
  const externalMilaRows = collectCrossMonthRows(allMonthsMap, 'milaRows', monthKey);
  const externalValeraRows = collectCrossMonthRows(allMonthsMap, 'valeraRows', monthKey);

  const milaOrderedThisMonth = milaRows.filter(
    (r) => r.type === 'item' && getRowOrderMonth(r, monthKey) === monthKey
  );
  const valeraOrderedThisMonth = valeraRows.filter(
    (r) => r.type === 'item' && getRowOrderMonth(r, monthKey) === monthKey
  );

  const milaPaidThisMonth = [
    ...milaRows.filter((r) => r.type === 'item' && r.isPaid && getRowPaidMonth(r, monthKey) === monthKey),
    ...externalMilaRows.filter(
      (r) => r.type === 'item' && r.isPaid && getRowPaidMonth(r, r._storageMonthKey || monthKey) === monthKey
    )
  ];
  const valeraPaidThisMonth = [
    ...valeraRows.filter((r) => r.type === 'item' && r.isPaid && getRowPaidMonth(r, monthKey) === monthKey),
    ...externalValeraRows.filter(
      (r) => r.type === 'item' && r.isPaid && getRowPaidMonth(r, r._storageMonthKey || monthKey) === monthKey
    )
  ];

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
              milaPaidRows={milaPaidThisMonth}
              valeraPaidRows={valeraPaidThisMonth}
              milaRows={milaOrderedThisMonth}
              valeraRows={valeraOrderedThisMonth}
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
              externalRows={externalMilaRows}
              onUpdateExternalRow={(storageMonthKey, rowId, patch) =>
                handleUpdateExternalRow('milaRows', storageMonthKey, rowId, patch)
              }
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
              externalRows={externalValeraRows}
              onUpdateExternalRow={(storageMonthKey, rowId, patch) =>
                handleUpdateExternalRow('valeraRows', storageMonthKey, rowId, patch)
              }
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