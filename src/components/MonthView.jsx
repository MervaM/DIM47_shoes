import React, { useState, useEffect, useRef, useCallback } from 'react';
import ManufacturerLedger from './ManufacturerLedger';
import SummaryView from './SummaryView';
import ShoesCardsView from './ShoesCardsView';
import { supabase } from '../supabaseClient';

const MONTHS_UKR = [
  'Січень', 'Лютий', 'Березень', 'Квітень', 'Травень', 'Червень',
  'Липень', 'Серпень', 'Вересень', 'Жовтень', 'Листопад', 'Грудень'
];

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

function extractGlobalDeposits(rootData) {
  if (Array.isArray(rootData?.globalMilaDeposits)) {
    return rootData.globalMilaDeposits;
  }
  const seen = new Set();
  const collected = [];
  const monthsObj = rootData?.months || {};

  Object.keys(monthsObj)
    .sort()
    .forEach((mKey) => {
      const list = monthsObj[mKey]?.milaDepositsList;
      if (Array.isArray(list)) {
        list.forEach((dep) => {
          if (!dep || seen.has(dep.id)) return;
          seen.add(dep.id);
          const iso =
            dep.isoDate && /^\d{4}-\d{2}-\d{2}/.test(dep.isoDate)
              ? dep.isoDate.slice(0, 10)
              : `${mKey}-01`;
          collected.push({
            ...dep,
            isoDate: iso,
            month: iso.slice(0, 7)
          });
        });
      }
    });

  return collected;
}

function collectAllMilaRows(allMonthsMap) {
  const seenIds = new Set();
  const all = [];
  Object.keys(allMonthsMap || {})
    .sort()
    .forEach((k) => {
      const list = Array.isArray(allMonthsMap[k]?.milaRows) ? allMonthsMap[k].milaRows : [];
      list.forEach((r) => {
        if (!r || seenIds.has(r.id)) return;
        seenIds.add(r.id);
        all.push({ ...r, _storageMonthKey: k });
      });
    });
  return all;
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
  milaManualRemaining,
  milaInitialDebt,
  milaRate,
  milaRows,
  valeraRate,
  valeraRows,
  expenses
}) {
  return {
    milaManualRemaining:
      milaManualRemaining !== null && milaManualRemaining !== undefined && milaManualRemaining !== ''
        ? Number(milaManualRemaining)
        : null,
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
  const [globalMilaDeposits, setGlobalMilaDeposits] = useState([]);

  const [milaManualRemaining, setMilaManualRemaining] = useState(null);
  const [milaInitialDebt, setMilaInitialDebt] = useState(0);
  const [milaRate, setMilaRate] = useState(45.0);
  const [milaRows, setMilaRows] = useState([]);

  const [valeraRate, setValeraRate] = useState(45.0);
  const [valeraRows, setValeraRows] = useState([]);

  const [expenses, setExpenses] = useState([]);
  const [shoesCatalog, setShoesCatalog] = useState([]);

  const isDirtyRef = useRef(false);
  const isReadyToSaveRef = useRef(false);
  const catalogDirtyRef = useRef(false);
  const depositsDirtyRef = useRef(false);
  const saveTimerRef = useRef(null);
  const writeQueueRef = useRef(Promise.resolve());

  const currentMonthKeyRef = useRef('');
  const latestPayloadRef = useRef(null);
  const latestCatalogRef = useRef([]);
  const latestDepositsRef = useRef([]);

  const monthKey = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;
  currentMonthKeyRef.current = monthKey;
  latestCatalogRef.current = shoesCatalog;
  latestDepositsRef.current = globalMilaDeposits;

  const enqueueSave = useCallback((targetKey, monthObj, overrideCatalog, overrideDeposits) => {
    if (!targetKey || !monthObj) return Promise.resolve();

    setSyncStatus('saving');

    const task = writeQueueRef.current.then(async () => {
      const { data: existingData, error: readError } = await supabase
        .from('app_state')
        .select('data')
        .eq('id', 1)
        .maybeSingle();

      if (readError) {
        console.error('Помилка читання перед записом:', readError);
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
          : catalogDirtyRef.current
          ? latestCatalogRef.current
          : currentRoot.shoesCatalog ?? latestCatalogRef.current;

      const nextDeposits =
        overrideDeposits !== undefined
          ? overrideDeposits
          : depositsDirtyRef.current
          ? latestDepositsRef.current
          : currentRoot.globalMilaDeposits ?? latestDepositsRef.current;

      const { error: writeError } = await supabase
        .from('app_state')
        .upsert({
          id: 1,
          data: {
            ...currentRoot,
            shoesCatalog: nextCatalog,
            globalMilaDeposits: nextDeposits,
            months: nextMonths
          }
        });

      if (writeError) {
        console.error('Помилка запису:', writeError);
        setSyncStatus('error');
      } else {
        catalogDirtyRef.current = false;
        depositsDirtyRef.current = false;
        setAllMonthsMap(nextMonths);
        setSyncStatus('saved');
      }
    });

    writeQueueRef.current = task.catch(() => {});
    return task;
  }, []);

  const flushPendingChanges = useCallback(async () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    if (isDirtyRef.current && latestPayloadRef.current && currentMonthKeyRef.current) {
      isDirtyRef.current = false;
      await enqueueSave(currentMonthKeyRef.current, latestPayloadRef.current);
    }
  }, [enqueueSave]);

  const handleSetGlobalMilaDeposits = (updater) => {
    depositsDirtyRef.current = true;
    setGlobalMilaDeposits((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      latestDepositsRef.current = next;
      const payloadToKeep =
        latestPayloadRef.current ||
        buildMonthPayload({
          milaManualRemaining,
          milaInitialDebt,
          milaRate,
          milaRows,
          valeraRate,
          valeraRows,
          expenses
        });
      enqueueSave(monthKey, payloadToKeep, undefined, next);
      return next;
    });
  };

  const handleClearAllAdvancesEverywhere = async () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    isDirtyRef.current = false;
    depositsDirtyRef.current = false;

    setGlobalMilaDeposits([]);
    latestDepositsRef.current = [];
    setMilaManualRemaining(null);
    setMilaInitialDebt(0);

    const cleanedCurrentMilaRows = (milaRows || []).map((r) =>
      r.isPaid && r.paySource !== 'separate' ? { ...r, paySource: 'separate' } : r
    );
    setMilaRows(cleanedCurrentMilaRows);
    setSyncStatus('saving');

    const task = writeQueueRef.current.then(async () => {
      const { data: existingData, error: readError } = await supabase
        .from('app_state')
        .select('data')
        .eq('id', 1)
        .maybeSingle();

      if (readError) {
        console.error('Помилка читання при очищенні авансів:', readError);
        setSyncStatus('error');
        return;
      }

      const currentRoot = existingData?.data || {};
      const rawMonths = currentRoot.months || {};
      const cleanedMonths = {};

      Object.keys(rawMonths).forEach((k) => {
        const mObj = rawMonths[k] || {};
        const cleanedRows = Array.isArray(mObj.milaRows)
          ? mObj.milaRows.map((r) =>
              r && r.isPaid && r.paySource !== 'separate'
                ? { ...r, paySource: 'separate' }
                : r
            )
          : [];

        cleanedMonths[k] = {
          ...mObj,
          milaRows: cleanedRows,
          milaDepositsList: [],
          milaDeposit: 0,
          milaManualRemaining: null,
          milaInitialDebt: 0,
          milaCarriedAdvance: 0
        };
      });

      cleanedMonths[monthKey] = buildMonthPayload({
        milaManualRemaining: null,
        milaInitialDebt: 0,
        milaRate,
        milaRows: cleanedCurrentMilaRows,
        valeraRate,
        valeraRows,
        expenses
      });

      const { error: writeError } = await supabase
        .from('app_state')
        .upsert({
          id: 1,
          data: {
            ...currentRoot,
            globalMilaDeposits: [],
            milaDepositsList: [],
            milaDeposit: 0,
            milaManualRemaining: null,
            months: cleanedMonths
          }
        });

      if (writeError) {
        console.error('Помилка очищення авансів:', writeError);
        setSyncStatus('error');
      } else {
        latestPayloadRef.current = cleanedMonths[monthKey];
        setAllMonthsMap(cleanedMonths);
        setSyncStatus('saved');
      }
    });

    writeQueueRef.current = task.catch(() => {});
    await task;
  };

  useEffect(() => {
    let cancelled = false;

    async function loadMonth() {
      isReadyToSaveRef.current = false;
      setIsLoading(true);
      setSyncStatus('loading');

      await writeQueueRef.current;
      if (cancelled) return;

      const { data, error } = await supabase
        .from('app_state')
        .select('data')
        .eq('id', 1)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        console.error('Помилка завантаження місяця:', error);
        setSyncStatus('error');
        setIsLoading(false);
        return;
      }

      const rootData = data?.data || {};
      const allMonthsData = rootData.months || {};
      const monthData = allMonthsData[monthKey] || {};

      const loadedGlobalDeposits = extractGlobalDeposits(rootData);
      const loadedManualRemaining =
        monthData.milaManualRemaining !== null &&
        monthData.milaManualRemaining !== undefined &&
        monthData.milaManualRemaining !== ''
          ? Number(monthData.milaManualRemaining)
          : null;
      const loadedInitDebt = monthData.milaInitialDebt ?? 0;
      const loadedMilaRate = monthData.milaRate ?? 45.0;
      const loadedMilaRows = Array.isArray(monthData.milaRows) ? monthData.milaRows : [];
      const loadedValeraRate = monthData.valeraRate ?? 45.0;
      const loadedValeraRows = Array.isArray(monthData.valeraRows) ? monthData.valeraRows : [];
      const loadedExpenses = Array.isArray(monthData.expenses) ? monthData.expenses : [];
      const loadedCatalog = Array.isArray(rootData.shoesCatalog) ? rootData.shoesCatalog : [];

      setAllMonthsMap(allMonthsData);
      setGlobalMilaDeposits(loadedGlobalDeposits);
      setMilaManualRemaining(loadedManualRemaining);
      setMilaInitialDebt(loadedInitDebt);
      setMilaRate(loadedMilaRate);
      setMilaRows(loadedMilaRows);
      setValeraRate(loadedValeraRate);
      setValeraRows(loadedValeraRows);
      setExpenses(loadedExpenses);
      setShoesCatalog(loadedCatalog);

      latestPayloadRef.current = buildMonthPayload({
        milaManualRemaining: loadedManualRemaining,
        milaInitialDebt: loadedInitDebt,
        milaRate: loadedMilaRate,
        milaRows: loadedMilaRows,
        valeraRate: loadedValeraRate,
        valeraRows: loadedValeraRows,
        expenses: loadedExpenses
      });

      isDirtyRef.current = false;
      setSyncStatus('saved');
      setIsLoading(false);

      requestAnimationFrame(() => {
        if (!cancelled) {
          isReadyToSaveRef.current = true;
        }
      });
    }

    loadMonth();

    return () => {
      cancelled = true;
    };
  }, [monthKey]);

  useEffect(() => {
    if (isLoading || !isReadyToSaveRef.current) return;

    const payload = buildMonthPayload({
      milaManualRemaining,
      milaInitialDebt,
      milaRate,
      milaRows,
      valeraRate,
      valeraRows,
      expenses
    });

    latestPayloadRef.current = payload;
    isDirtyRef.current = true;

    setAllMonthsMap((prev) => ({
      ...prev,
      [monthKey]: payload
    }));

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    setSyncStatus('saving');
    const targetKey = monthKey;

    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null;
      isDirtyRef.current = false;
      enqueueSave(targetKey, payload);
    }, 250);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [
    milaManualRemaining,
    milaInitialDebt,
    milaRate,
    milaRows,
    valeraRate,
    valeraRows,
    expenses,
    monthKey,
    isLoading,
    enqueueSave
  ]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (isDirtyRef.current && latestPayloadRef.current && currentMonthKeyRef.current) {
        enqueueSave(currentMonthKeyRef.current, latestPayloadRef.current);
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [enqueueSave]);

  const handleSelectMonth = async (newMonthIdx) => {
    if (newMonthIdx === selectedMonth) return;
    await flushPendingChanges();
    setSelectedMonth(newMonthIdx);
  };

  const handleSelectYear = async (newYearVal) => {
    if (newYearVal === selectedYear) return;
    await flushPendingChanges();
    setSelectedYear(newYearVal);
  };

  const handleTabChange = async (nextTab) => {
    if (nextTab === activeTab) return;
    await flushPendingChanges();
    setActiveTab(nextTab);
  };

  const handleSetShoesCatalog = (updater) => {
    catalogDirtyRef.current = true;
    setShoesCatalog((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      latestCatalogRef.current = next;
      const payloadToKeep =
        latestPayloadRef.current ||
        buildMonthPayload({
          milaManualRemaining,
          milaInitialDebt,
          milaRate,
          milaRows,
          valeraRate,
          valeraRows,
          expenses
        });
      enqueueSave(monthKey, payloadToKeep, next);
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

    setAllMonthsMap((prev) => ({
      ...prev,
      [storageMonthKey]: nextTargetMonthObj
    }));

    await enqueueSave(storageMonthKey, nextTargetMonthObj);
  };

  const externalMilaRows = collectCrossMonthRows(allMonthsMap, 'milaRows', monthKey);
  const externalValeraRows = collectCrossMonthRows(allMonthsMap, 'valeraRows', monthKey);

  const allMilaItemsAcrossMonths = collectAllMilaRows({
    ...allMonthsMap,
    [monthKey]: { ...(allMonthsMap[monthKey] || {}), milaRows }
  }).filter((r) => r.type === 'item');

  const depositsBeforeCurrentMonth = globalMilaDeposits.reduce((sum, dep) => {
    const depMonth =
      dep.isoDate && /^\d{4}-\d{2}/.test(dep.isoDate)
        ? dep.isoDate.slice(0, 7)
        : dep.month || monthKey;
    return depMonth < monthKey ? sum + (Number(dep.amount) || 0) : sum;
  }, 0);

  const hasAnyDepositsBefore = globalMilaDeposits.some((dep) => {
    const depMonth =
      dep.isoDate && /^\d{4}-\d{2}/.test(dep.isoDate)
        ? dep.isoDate.slice(0, 7)
        : dep.month || monthKey;
    return depMonth < monthKey;
  });

  const advanceSpentBeforeCurrentMonth = allMilaItemsAcrossMonths.reduce((sum, r) => {
    if (!r.isPaid || r.paySource === 'separate') return sum;
    const paidM = getRowPaidMonth(r, r._storageMonthKey || monthKey);
    if (paidM < monthKey) {
      const qty = Number(r.quantity) || 0;
      const costUSD = Number(r.customCostUSD) || 0;
      const patternUAH = Number(r.patternCostUAH) || 0;
      const rRate = Number(r.rowRate) || 0;
      return sum + qty * costUSD * rRate + patternUAH;
    }
    return sum;
  }, 0);

  const carriedAdvanceFromPrev = hasAnyDepositsBefore
    ? depositsBeforeCurrentMonth - advanceSpentBeforeCurrentMonth
    : 0;

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
                  onChange={(e) => handleSelectMonth(Number(e.target.value))}
                  style={{ padding: '0.4rem 0.75rem', borderRadius: '0.5rem', border: '2px solid #4f46e5', fontWeight: 'bold', fontSize: '1rem', color: '#4f46e5', background: '#f5f3ff' }}
                >
                  {MONTHS_UKR.map((m, idx) => (
                    <option key={idx} value={idx}>{m}</option>
                  ))}
                </select>

                <select
                  value={selectedYear}
                  onChange={(e) => handleSelectYear(Number(e.target.value))}
                  style={{ padding: '0.4rem 0.75rem', borderRadius: '0.5rem', border: '2px solid #4f46e5', fontWeight: 'bold', fontSize: '1rem', color: '#4f46e5', background: '#f5f3ff' }}
                >
                  {[2025, 2026, 2027, 2028].map((y) => (
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
          <button type="button" onClick={() => handleTabChange('summary')} className={`tab-btn ${activeTab === 'summary' ? 'active' : ''}`}>
            📊 Загальна звітність
          </button>
          <button type="button" onClick={() => handleTabChange('mila')} className={`tab-btn ${activeTab === 'mila' ? 'active' : ''}`}>
            Міла (Аванс)
          </button>
          <button type="button" onClick={() => handleTabChange('valera')} className={`tab-btn ${activeTab === 'valera' ? 'active' : ''}`}>
            Валерій (Після видачі)
          </button>
          <button type="button" onClick={() => handleTabChange('catalog')} className={`tab-btn ${activeTab === 'catalog' ? 'active' : ''}`}>
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
              depositsList={globalMilaDeposits}
              setDepositsList={handleSetGlobalMilaDeposits}
              onClearAllAdvances={handleClearAllAdvancesEverywhere}
              manualRemaining={milaManualRemaining}
              setManualRemaining={setMilaManualRemaining}
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