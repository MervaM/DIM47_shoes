import React, { useState, useRef } from 'react';

const UKRAINIAN_MONTH_MAP = {
  'січень': '01',
  'січня': '01',
  'лютий': '02',
  'лютого': '02',
  'березень': '03',
  'березня': '03',
  'квітень': '04',
  'квітня': '04',
  'травень': '05',
  'травня': '05',
  'червень': '06',
  'червня': '06',
  'липень': '07',
  'липня': '07',
  'серпень': '08',
  'серпня': '08',
  'вересень': '09',
  'вересня': '09',
  'жовтень': '10',
  'жовтня': '10',
  'листопад': '11',
  'листопада': '11',
  'грудень': '12',
  'грудня': '12'
};

function getLocalTodayISO() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function normalizeMonthKey(rawMonth, fallbackYear = '2026') {
  if (rawMonth === undefined || rawMonth === null || rawMonth === '') {
    return `${fallbackYear}-08`;
  }

  if (typeof rawMonth === 'object') {
    const candidate = rawMonth.value ?? rawMonth.key ?? rawMonth.month ?? rawMonth.label ?? '';
    return normalizeMonthKey(candidate, fallbackYear);
  }

  if (typeof rawMonth === 'number') {
    // Якщо це індекс місяця від 0 до 11 (наприклад з MonthView)
    const mm = String(rawMonth + 1).padStart(2, '0');
    return `${fallbackYear}-${mm}`;
  }

  const str = String(rawMonth).trim().toLowerCase();

  if (/^\d{4}-\d{2}$/.test(str)) {
    return str;
  }

  if (/^\d{4}-\d{1,2}$/.test(str)) {
    const [y, m] = str.split('-');
    return `${y}-${m.padStart(2, '0')}`;
  }

  if (/^\d{1,2}$/.test(str)) {
    const mm = str.padStart(2, '0');
    return `${fallbackYear}-${mm}`;
  }

  if (UKRAINIAN_MONTH_MAP[str]) {
    return `${fallbackYear}-${UKRAINIAN_MONTH_MAP[str]}`;
  }

  return `${fallbackYear}-08`;
}

function formatDayMonth(val) {
  if (!val || typeof val !== 'string') return '';
  const trimmed = val.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    const parts = trimmed.slice(0, 10).split('-');
    return `${parts[2]}.${parts[1]}`;
  }
  if (/^\d{2}\.\d{2}\.\d{2,4}$/.test(trimmed)) {
    return trimmed.slice(0, 5);
  }
  return trimmed;
}

function getMonthFromRow(row, fallbackMonth, fallbackYear) {
  if (row?.month) {
    return normalizeMonthKey(row.month, fallbackYear);
  }
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
  return fallbackMonth;
}

export default function ManufacturerLedger(props) {
  const {
    manufacturerName = 'Міла',
    paymentMode = 'prepaid',
    selectedMonth,
    month,
    currentMonth,
    activeMonth: propActiveMonth,
    selectedYear,
    year,
    currentYear: propCurrentYear,
    rows = [],
    setRows = () => {},
    depositsList = [],
    setDepositsList = () => {},
    exchangeRate = 45.0,
    shoesCatalog = []
  } = props;

  const todayISO = getLocalTodayISO();
  const resolvedYear = String(selectedYear || year || propCurrentYear || '2026');
  
  // Уніфіковано визначаємо активний місяць з будь-якого пропса
  const rawMonthInput =
    selectedMonth !== undefined ? selectedMonth : (month !== undefined ? month : (currentMonth !== undefined ? currentMonth : (propActiveMonth !== undefined ? propActiveMonth : 7)));
  const activeMonth = normalizeMonthKey(rawMonthInput, resolvedYear);

  const [activeRowForPicker, setActiveRowForPicker] = useState(null);
  const [newDepositDate, setNewDepositDate] = useState(`${activeMonth}-01`);
  const [newDepositAmount, setNewDepositAmount] = useState('');
  const rowRefs = useRef({});

  const manufacturerShoes = shoesCatalog.filter(
    (shoe) => (shoe.manufacturer || 'Міла') === manufacturerName
  );

  const monthRows = rows.filter((r) => {
    if (r.isEditing) return true;
    const rowMonth = getMonthFromRow(r, activeMonth, resolvedYear);
    return rowMonth === activeMonth;
  });

  const monthDeposits = depositsList.filter((d) => {
    const depMonth = getMonthFromRow(d, activeMonth, resolvedYear);
    return depMonth === activeMonth;
  });

  const handleAddRow = () => {
    const initialDate = `${activeMonth}-01`;
    setRows([
      ...rows,
      {
        id: Date.now(),
        isoDate: initialDate,
        month: activeMonth,
        date: formatDayMonth(initialDate),
        type: 'item',
        shoeId: '',
        quantity: 1,
        customCostUSD: '',
        patternCostUAH: 0,
        rowRate: exchangeRate || 45.0,
        isSelectedForPay: false,
        isPaid: false,
        paidAt: '',
        photo: '',
        isEditing: true
      }
    ]);
  };

  const handleAddSubtotal = () => {
    setRows([
      ...rows,
      {
        id: Date.now(),
        isoDate: `${activeMonth}-01`,
        month: activeMonth,
        type: 'subtotal',
        note: '',
        manualSumUAH: 0,
        isCollapsed: false
      }
    ]);
  };

  const handleAddDeposit = () => {
    if (!newDepositAmount) return;
    const chosenDate = newDepositDate || `${activeMonth}-01`;
    const depMonth = getMonthFromRow({ isoDate: chosenDate }, activeMonth, resolvedYear);
    const item = {
      id: Date.now(),
      isoDate: chosenDate,
      month: depMonth,
      date: formatDayMonth(chosenDate),
      amount: Number(newDepositAmount) || 0
    };
    setDepositsList([...depositsList, item]);
    setNewDepositAmount('');
  };

  const handleDeleteDeposit = (id) => {
    setDepositsList(depositsList.filter((d) => d.id !== id));
  };

  const handleRowChange = (id, field, value) => {
    setRows(
      rows.map((row) => {
        if (row.id === id) {
          const updated = { ...row, [field]: value };

          if (field === 'isoDate' && value) {
            updated.date = formatDayMonth(value);
            updated.month = getMonthFromRow({ isoDate: value }, activeMonth, resolvedYear);
          }

          if (field === 'shoeId' && value) {
            const found = shoesCatalog.find((s) => s.id === value);
            if (found) {
              updated.customCostUSD = found.defaultCostUSD;
              updated.photo = found.photo || '';
              updated.isEditing = false;
            }
          }

          if (field === 'isPaid') {
            updated.paidAt = value ? formatDayMonth(todayISO) : '';
            if (value) {
              updated.isSelectedForPay = false;
            }
          }

          return updated;
        }
        return row;
      })
    );
  };

  const selectShoeFromPicker = (shoe) => {
    if (!activeRowForPicker) return;
    setRows(
      rows.map((row) => {
        if (row.id === activeRowForPicker) {
          return {
            ...row,
            shoeId: shoe.id,
            customCostUSD: shoe.defaultCostUSD,
            photo: shoe.photo || '',
            isEditing: false
          };
        }
        return row;
      })
    );
    setActiveRowForPicker(null);
  };

  const handleDeleteRow = (id) => {
    setRows(rows.filter((row) => row.id !== id));
  };

  const scrollToRow = (rowId) => {
    const el = rowRefs.current[rowId];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.style.background = '#fde047';
      setTimeout(() => {
        el.style.background = '';
      }, 1200);
    }
  };

  let totalPairs = 0;
  let totalUSD = 0;
  let totalUAH = 0;
  let totalPatternsUAH = 0;

  let checkedPairs = 0;
  let checkedUSD = 0;
  let checkedPatternsUAH = 0;
  let checkedTotalUAH = 0;

  let paidPairs = 0;
  let paidUAH = 0;
  let unpaidUAH = 0;

  const paidGroupsMap = {};

  monthRows.forEach((row) => {
    if (row.type === 'item') {
      const qty = Number(row.quantity) || 0;
      const costUSD = Number(row.customCostUSD) || 0;
      const patternUAH = Number(row.patternCostUAH) || 0;
      const rRate = Number(row.rowRate) || 0;
      const isPaid = Boolean(row.isPaid);
      const isChecked = Boolean(row.isSelectedForPay);

      const rowUSD = qty * costUSD;
      const shoePartUAH = rowUSD * rRate;
      const rowFullUAH = shoePartUAH + patternUAH;

      totalPairs += qty;
      totalUSD += rowUSD;
      totalPatternsUAH += patternUAH;
      totalUAH += rowFullUAH;

      if (!isPaid && isChecked) {
        checkedPairs += qty;
        checkedUSD += rowUSD;
        checkedPatternsUAH += patternUAH;
        checkedTotalUAH += rowFullUAH;
      }

      if (isPaid) {
        paidPairs += qty;
        paidUAH += rowFullUAH;

        const labelDate = formatDayMonth(row.isoDate || row.date) || '—';
        if (!paidGroupsMap[labelDate]) {
          paidGroupsMap[labelDate] = {
            date: labelDate,
            totalSum: 0,
            rowIds: []
          };
        }
        paidGroupsMap[labelDate].totalSum += rowFullUAH;
        paidGroupsMap[labelDate].rowIds.push(row.id);
      } else {
        unpaidUAH += rowFullUAH;
      }
    } else if (row.type === 'subtotal') {
      const subVal = Number(row.manualSumUAH) || 0;
      unpaidUAH += subVal;
    }
  });

  const paidChecksList = Object.values(paidGroupsMap);
  const totalDepositsSum = monthDeposits.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
  const remainingBalance =
    paymentMode === 'prepaid' && totalDepositsSum > 0
      ? totalDepositsSum - paidUAH
      : Math.max(0, totalUAH - paidUAH);

  const hasCheckedPairs = checkedTotalUAH > 0;
  const showGreenPaidButton = !hasCheckedPairs && paidUAH > 0;

  const handlePaySelectedInterval = () => {
    if (checkedTotalUAH <= 0) return;

    const nowShort = formatDayMonth(todayISO);

    setRows((prevRows) =>
      prevRows.map((r) => {
        const rMonth = getMonthFromRow(r, activeMonth, resolvedYear);
        if (rMonth === activeMonth && r.type === 'item' && !r.isPaid && r.isSelectedForPay) {
          return {
            ...r,
            isPaid: true,
            isSelectedForPay: false,
            paidAt: nowShort,
            isEditing: false
          };
        }
        return r;
      })
    );
  };

  let runningPairNumber = 0;
  const formulaHint = hasCheckedPairs
    ? `$${checkedUSD.toFixed(2)} × курс + ${checkedPatternsUAH.toFixed(0)} лекала = ${checkedTotalUAH.toFixed(0)} грн`
    : 'Постав галочки біля пар для розрахунку проміжку';

  return (
    <div
      className="app-container"
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
        maxWidth: '100%',
        overflowX: 'hidden'
      }}
    >
      {/* МОДАЛЬНЕ ВІКНО ВИБОРУ МОДЕЛІ ЗА ФОТО */}
      {activeRowForPicker && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem'
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '1rem',
              padding: '1.25rem',
              maxWidth: '600px',
              width: '100%',
              maxHeight: '85vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem'
              }}
            >
              <h3 style={{ fontSize: '1.1rem', fontWeight: '800', margin: 0, color: '#111827' }}>
                Виберіть модель ({manufacturerName})
              </h3>
              <button
                onClick={() => setActiveRowForPicker(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  color: '#6b7280'
                }}
              >
                ×
              </button>
            </div>

            {manufacturerShoes.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#6b7280', padding: '2rem 0' }}>
                У каталозі немає моделей для цього виробника.
              </p>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
                  gap: '0.75rem'
                }}
              >
                {manufacturerShoes.map((shoe) => (
                  <div
                    key={shoe.id}
                    onClick={() => selectShoeFromPicker(shoe)}
                    style={{
                      border: '2px solid #e5e7eb',
                      borderRadius: '0.75rem',
                      padding: '0.4rem',
                      cursor: 'pointer',
                      textAlign: 'center',
                      background: '#f9fafb'
                    }}
                  >
                    <div
                      style={{
                        width: '100%',
                        height: '90px',
                        borderRadius: '0.5rem',
                        overflow: 'hidden',
                        background: '#e5e7eb',
                        marginBottom: '0.4rem'
                      }}
                    >
                      {shoe.photo ? (
                        <img
                          src={shoe.photo}
                          alt={shoe.name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <div
                          style={{
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.65rem',
                            color: '#6b7280'
                          }}
                        >
                          немає фото
                        </div>
                      )}
                    </div>
                    <div
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 'bold',
                        color: '#111827',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      {shoe.name}
                    </div>
                    <div style={{ fontSize: '0.65rem', color: '#4f46e5', fontWeight: '700' }}>
                      {shoe.id ? `арт: ${shoe.id}` : 'без арт.'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ОСНОВНА КАРТКА ОБЛІКУ */}
      <div className="card" style={{ padding: '1rem' }}>
        <div className="header-box" style={{ padding: '0 0 1rem 0' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '0.75rem',
              flexWrap: 'wrap',
              gap: '0.75rem'
            }}
          >
            <div>
              <span
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 'bold',
                  color: '#4f46e5',
                  textTransform: 'uppercase'
                }}
              >
                Виробник
              </span>
              <h2
                style={{
                  fontSize: '1.5rem',
                  fontWeight: '800',
                  color: '#111827',
                  margin: '0.1rem 0 0 0'
                }}
              >
                {manufacturerName}
              </h2>
            </div>

            <span
              style={{
                fontSize: '0.75rem',
                padding: '0.3rem 0.75rem',
                background: '#eef2ff',
                color: '#4f46e5',
                borderRadius: '9999px',
                fontWeight: 'bold'
              }}
            >
              {paymentMode === 'prepaid' ? '✨ По авансу' : '💼 Після видачі'}
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '0.75rem',
              background: '#f9fafb',
              padding: '0.75rem',
              borderRadius: '0.75rem',
              border: '1px solid #e5e7eb'
            }}
          >
            {paymentMode === 'prepaid' && (
              <div
                style={{
                  background: '#ffffff',
                  padding: '0.6rem',
                  borderRadius: '0.5rem',
                  border: '1px solid #e5e7eb',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.4rem'
                }}
              >
                <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#16a34a' }}>
                  💰 Аванси ({activeMonth}):
                </span>

                <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.3rem',
                      padding: '0.2rem 0.35rem',
                      background: '#fff',
                      fontSize: '0.75rem',
                      fontWeight: '700',
                      gap: '0.2rem'
                    }}
                  >
                    <span>{formatDayMonth(newDepositDate) || 'ДД.ММ'}</span>
                    <input
                      type="date"
                      value={newDepositDate}
                      onChange={(e) => setNewDepositDate(e.target.value)}
                      style={{
                        border: 'none',
                        background: 'transparent',
                        fontSize: '0.7rem',
                        width: '20px',
                        cursor: 'pointer'
                      }}
                    />
                  </div>

                  <input
                    type="number"
                    placeholder="Сума грн"
                    value={newDepositAmount}
                    onChange={(e) => setNewDepositAmount(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '0.2rem 0.4rem',
                      fontSize: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.3rem',
                      fontWeight: 'bold'
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddDeposit}
                    style={{
                      background: '#16a34a',
                      color: '#fff',
                      border: 'none',
                      padding: '0.2rem 0.5rem',
                      borderRadius: '0.3rem',
                      fontSize: '0.75rem',
                      fontWeight: 'bold',
                      cursor: 'pointer'
                    }}
                  >
                    +
                  </button>
                </div>

                {monthDeposits.length > 0 && (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.2rem',
                      maxHeight: '70px',
                      overflowY: 'auto',
                      marginTop: '0.2rem'
                    }}
                  >
                    {monthDeposits.map((dep) => (
                      <div
                        key={dep.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: '0.75rem',
                          background: '#f0fdf4',
                          padding: '0.1rem 0.3rem',
                          borderRadius: '0.25rem'
                        }}
                      >
                        <span>
                          {formatDayMonth(dep.isoDate || dep.date)}: <strong>{dep.amount} грн</strong>
                        </span>
                        <button
                          onClick={() => handleDeleteDeposit(dep.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#dc2626',
                            cursor: 'pointer',
                            fontWeight: 'bold'
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div
                  style={{
                    fontSize: '0.7rem',
                    color: '#4b5563',
                    fontWeight: '700',
                    textAlign: 'right',
                    borderTop: '1px dashed #e5e7eb',
                    paddingTop: '0.2rem'
                  }}
                >
                  Разом авансів: {totalDepositsSum} грн
                </div>
              </div>
            )}

            <div
              style={{
                background: '#f0fdf4',
                padding: '0.6rem',
                borderRadius: '0.5rem',
                border: '1px solid #bbf7d0',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center'
              }}
            >
              <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#16a34a' }}>
                Оплачено:
              </span>
              <span style={{ fontSize: '1.1rem', fontWeight: '900', color: '#15803d' }}>
                {paidUAH.toFixed(0)} грн
              </span>
              {totalPatternsUAH > 0 && (
                <span style={{ fontSize: '0.7rem', color: '#d97706', fontWeight: '700' }}>
                  в т.ч. лекала: {totalPatternsUAH.toFixed(0)} грн
                </span>
              )}
            </div>

            <div
              style={{
                background: '#f5f3ff',
                padding: '0.6rem',
                borderRadius: '0.5rem',
                border: '1px solid #ede9fe',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center'
              }}
            >
              <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#4f46e5' }}>
                {totalDepositsSum > 0 ? 'Залишок авансу:' : 'Залишок / Борг:'}
              </span>
              <span
                style={{
                  fontSize: '1.1rem',
                  fontWeight: '900',
                  color:
                    remainingBalance < 0
                      ? '#dc2626'
                      : remainingBalance === 0
                      ? '#16a34a'
                      : '#312e81'
                }}
              >
                {remainingBalance.toFixed(0)} грн
              </span>
            </div>
          </div>
        </div>

        {/* ТАБЛИЦЯ ПОЗИЦІЙ */}
        <div
          style={{
            overflowX: 'auto',
            background: '#ffffff',
            borderRadius: '0.5rem',
            border: '1px solid #e5e7eb'
          }}
        >
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              textAlign: 'left',
              fontSize: '0.85rem'
            }}
          >
            <thead>
              <tr
                style={{
                  background: '#f8fafc',
                  color: '#475569',
                  fontSize: '0.75rem',
                  textTransform: 'uppercase',
                  borderBottom: '2px solid #e2e8f0'
                }}
              >
                <th
                  style={{ padding: '0.6rem 0.5rem', textAlign: 'center', width: '44px' }}
                  title="Вибрати пару для оплати"
                >
                  ✓
                </th>
                <th style={{ padding: '0.6rem 0.5rem', textAlign: 'center', width: '55px' }}>№</th>
                <th style={{ padding: '0.6rem 0.75rem', width: '80px' }}>Дата</th>
                <th style={{ padding: '0.6rem 0.75rem' }}>Модель / Артикул — Назва</th>
                <th style={{ padding: '0.6rem 0.75rem', textAlign: 'center', width: '60px' }}>К-ть</th>
                <th style={{ padding: '0.6rem 0.75rem', textAlign: 'right', width: '125px' }}>
                  Долар ($)
                </th>
                <th style={{ padding: '0.6rem 0.75rem', textAlign: 'right', width: '75px' }}>Курс</th>
                <th style={{ padding: '0.6rem 0.75rem', textAlign: 'right', width: '145px' }}>
                  Вартість в грн
                </th>
                <th style={{ padding: '0.6rem 0.5rem', width: '50px' }}></th>
              </tr>
            </thead>
            <tbody>
              {monthRows.map((row) => {
                if (row.type === 'subtotal') {
                  const isCollapsed = row.isCollapsed || false;

                  return (
                    <tr
                      key={row.id}
                      style={{ background: '#fffbeb', borderBottom: '1px solid #fde68a' }}
                    >
                      <td></td>
                      <td colSpan="6" style={{ padding: '0.6rem 0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <button
                            onClick={() => handleRowChange(row.id, 'isCollapsed', !isCollapsed)}
                            style={{
                              background: '#f59e0b',
                              color: '#fff',
                              border: 'none',
                              padding: '0.15rem 0.4rem',
                              borderRadius: '0.3rem',
                              cursor: 'pointer',
                              fontSize: '0.7rem',
                              fontWeight: 'bold'
                            }}
                          >
                            {isCollapsed ? '▶' : '▼'}
                          </button>
                          <span style={{ fontWeight: '700', color: '#92400e', fontSize: '0.8rem' }}>
                            Підсумок проміжку:
                          </span>
                          {!isCollapsed && (
                            <input
                              type="text"
                              readOnly
                              value={row.note || formulaHint}
                              style={{
                                flex: 1,
                                padding: '0.2rem 0.4rem',
                                border: '1px solid #d97706',
                                borderRadius: '0.3rem',
                                fontSize: '0.8rem',
                                background: '#fff',
                                color: '#78350f',
                                fontWeight: '600'
                              }}
                            />
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '0.6rem 0.75rem', textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={handlePaySelectedInterval}
                          disabled={!hasCheckedPairs}
                          title={
                            hasCheckedPairs
                              ? 'Натисніть, щоб оплатити обраний проміжок'
                              : 'Поставте галочку біля пар для розрахунку суми'
                          }
                          style={{
                            background: hasCheckedPairs ? '#16a34a' : '#fef3c7',
                            color: hasCheckedPairs ? '#ffffff' : '#92400e',
                            border: '2px solid #f59e0b',
                            padding: '0.3rem 0.65rem',
                            borderRadius: '0.4rem',
                            fontWeight: '900',
                            fontSize: '0.85rem',
                            cursor: hasCheckedPairs ? 'pointer' : 'default',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {hasCheckedPairs
                            ? `${checkedTotalUAH.toFixed(0)} грн • Оплатити`
                            : '0 грн'}
                        </button>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          onClick={() => handleDeleteRow(row.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#ef4444',
                            fontSize: '1.2rem',
                            cursor: 'pointer',
                            fontWeight: 'bold'
                          }}
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  );
                }

                runningPairNumber += 1;
                const currentPairNumber = runningPairNumber;

                const qty = Number(row.quantity) || 0;
                const costUSD = Number(row.customCostUSD) || 0;
                const patternUAH = Number(row.patternCostUAH) || 0;
                const rRate = Number(row.rowRate) || 0;
                const isPaid = Boolean(row.isPaid);
                const isChecked = Boolean(row.isSelectedForPay);

                const isEditing = row.isEditing !== undefined ? row.isEditing : !row.shoeId;
                const rowUSD = qty * costUSD;
                const shoePartUAH = rowUSD * rRate;
                const rowFullUAH = shoePartUAH + patternUAH;
                const shoeInfo = shoesCatalog.find((s) => s.id === row.shoeId);
                const displayName = shoeInfo
                  ? `${shoeInfo.id ? '[' + shoeInfo.id + '] ' : ''}${shoeInfo.name}`
                  : 'Модель не вибрана';
                const displayDate = formatDayMonth(row.isoDate || row.date) || '—';

                return (
                  <tr
                    key={row.id}
                    ref={(el) => (rowRefs.current[row.id] = el)}
                    style={{
                      background: isPaid
                        ? '#f1f5f9'
                        : isChecked
                        ? '#eef2ff'
                        : '#ffffff',
                      color: isPaid ? '#475569' : '#0f172a',
                      borderBottom: '1px solid #e2e8f0',
                      transition: 'background 0.2s'
                    }}
                  >
                    {!isEditing ? (
                      <>
                        <td style={{ padding: '0.6rem 0.5rem', textAlign: 'center' }}>
                          {isPaid ? (
                            <span
                              title="Оплачено"
                              style={{ color: '#16a34a', fontWeight: '900', fontSize: '0.9rem' }}
                            >
                              ✓
                            </span>
                          ) : (
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) =>
                                handleRowChange(row.id, 'isSelectedForPay', e.target.checked)
                              }
                              style={{
                                width: '18px',
                                height: '18px',
                                cursor: 'pointer',
                                accentColor: '#4f46e5'
                              }}
                              title="Відмітити пару для оплати"
                            />
                          )}
                        </td>
                        <td
                          style={{
                            padding: '0.6rem 0.5rem',
                            textAlign: 'center',
                            fontWeight: '700',
                            color: '#94a3b8'
                          }}
                        >
                          {currentPairNumber}
                        </td>
                        <td style={{ padding: '0.6rem 0.75rem', fontWeight: '600' }}>
                          {displayDate}
                        </td>
                        <td style={{ padding: '0.6rem 0.75rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '0.3rem',
                                overflow: 'hidden',
                                background: '#e2e8f0',
                                flexShrink: 0
                              }}
                            >
                              {row.photo ? (
                                <img
                                  src={row.photo}
                                  alt=""
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                              ) : (
                                <div
                                  style={{
                                    width: '100%',
                                    height: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.5rem',
                                    color: '#64748b'
                                  }}
                                >
                                  фото
                                </div>
                              )}
                            </div>
                            <span
                              style={{
                                fontWeight: '700',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                maxWidth: '260px'
                              }}
                            >
                              {displayName}
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: '0.6rem 0.75rem', textAlign: 'center', fontWeight: '700' }}>
                          {qty}
                        </td>
                        <td style={{ padding: '0.6rem 0.75rem', textAlign: 'right', fontWeight: '600' }}>
                          <div>${rowUSD.toFixed(0)}</div>
                          {patternUAH > 0 && (
                            <div style={{ fontSize: '0.72rem', color: '#d97706', fontWeight: '700' }}>
                              +{patternUAH} лекало
                            </div>
                          )}
                        </td>
                        <td
                          style={{
                            padding: '0.6rem 0.75rem',
                            textAlign: 'right',
                            fontWeight: '600',
                            color: '#4f46e5'
                          }}
                        >
                          {rRate}
                        </td>
                        <td
                          style={{
                            padding: '0.6rem 0.75rem',
                            textAlign: 'right',
                            fontWeight: '900',
                            color: isPaid ? '#15803d' : '#0f172a'
                          }}
                        >
                          <div>{rowFullUAH.toFixed(0)} грн</div>
                          {isPaid && (
                            <div style={{ fontSize: '0.7rem', color: '#15803d' }}>(оплачено)</div>
                          )}
                        </td>
                        <td style={{ padding: '0.6rem 0.5rem', textAlign: 'center' }}>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '0.2rem'
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => handleRowChange(row.id, 'isEditing', true)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#4f46e5',
                                cursor: 'pointer',
                                fontSize: '0.8rem',
                                fontWeight: 'bold'
                              }}
                              title="Редагувати"
                            >
                              ✎
                            </button>
                            <button
                              onClick={() => handleDeleteRow(row.id)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#cbd5e1',
                                fontSize: '1.1rem',
                                cursor: 'pointer'
                              }}
                              onMouseOver={(e) => (e.target.style.color = '#ef4444')}
                              onMouseOut={(e) => (e.target.style.color = '#cbd5e1')}
                            >
                              ×
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <td colSpan="9" style={{ padding: '0.75rem', background: '#f8fafc' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              {!isPaid && (
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) =>
                                    handleRowChange(row.id, 'isSelectedForPay', e.target.checked)
                                  }
                                  style={{
                                    width: '18px',
                                    height: '18px',
                                    cursor: 'pointer',
                                    accentColor: '#4f46e5'
                                  }}
                                  title="Відмітити пару для оплати"
                                />
                              )}
                              <span
                                style={{ fontSize: '0.75rem', fontWeight: '800', color: '#4f46e5' }}
                              >
                                ✏️ Редагування позиції #{currentPairNumber}
                              </span>
                            </div>

                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <button
                                type="button"
                                onClick={() => handleRowChange(row.id, 'isEditing', false)}
                                style={{
                                  background: '#16a34a',
                                  color: '#fff',
                                  border: 'none',
                                  padding: '0.2rem 0.6rem',
                                  borderRadius: '0.3rem',
                                  fontSize: '0.75rem',
                                  fontWeight: 'bold',
                                  cursor: 'pointer'
                                }}
                              >
                                ✓ Готово
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteRow(row.id)}
                                style={{
                                  background: '#fee2e2',
                                  color: '#dc2626',
                                  border: 'none',
                                  padding: '0.2rem 0.4rem',
                                  borderRadius: '0.3rem',
                                  fontSize: '0.75rem',
                                  fontWeight: 'bold',
                                  cursor: 'pointer'
                                }}
                              >
                                Видалити
                              </button>
                            </div>
                          </div>

                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '115px 45px 1fr 60px 100px 80px 100px',
                              gap: '0.5rem',
                              alignItems: 'center'
                            }}
                          >
                            <div
                              className="input-field"
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                fontSize: '0.8rem',
                                fontWeight: '700',
                                padding: '0.25rem 0.45rem',
                                background: '#fff',
                                gap: '0.25rem'
                              }}
                            >
                              <span>{displayDate}</span>
                              <input
                                type="date"
                                value={row.isoDate || ''}
                                onChange={(e) => handleRowChange(row.id, 'isoDate', e.target.value)}
                                style={{
                                  border: 'none',
                                  background: 'transparent',
                                  fontSize: '0.75rem',
                                  width: '22px',
                                  cursor: 'pointer'
                                }}
                              />
                            </div>

                            <div
                              onClick={() => setActiveRowForPicker(row.id)}
                              style={{
                                width: '35px',
                                height: '35px',
                                cursor: 'pointer',
                                borderRadius: '0.3rem',
                                border: '2px dashed #4f46e5',
                                overflow: 'hidden',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: '#f5f3ff'
                              }}
                            >
                              {row.photo ? (
                                <img
                                  src={row.photo}
                                  alt=""
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                              ) : (
                                <span style={{ fontSize: '0.5rem', color: '#4f46e5' }}>фото</span>
                              )}
                            </div>

                            <select
                              value={row.shoeId || ''}
                              onChange={(e) => handleRowChange(row.id, 'shoeId', e.target.value)}
                              className="input-field"
                              style={{ fontSize: '0.8rem', padding: '0.25rem', fontWeight: '600' }}
                            >
                              <option value="">-- Виберіть модель --</option>
                              {manufacturerShoes.map((shoe) => (
                                <option key={shoe.id} value={shoe.id}>
                                  {shoe.id ? `${shoe.id} — ` : ''} {shoe.name}
                                </option>
                              ))}
                            </select>

                            <input
                              type="number"
                              min="1"
                              value={row.quantity}
                              onChange={(e) =>
                                handleRowChange(row.id, 'quantity', Number(e.target.value))
                              }
                              className="input-field"
                              style={{ textAlign: 'center', fontSize: '0.8rem', padding: '0.25rem' }}
                            />

                            <input
                              type="number"
                              step="0.01"
                              placeholder="Ціна $"
                              value={row.customCostUSD}
                              onChange={(e) =>
                                handleRowChange(row.id, 'customCostUSD', Number(e.target.value))
                              }
                              className="input-field"
                              style={{ textAlign: 'right', fontSize: '0.8rem', padding: '0.25rem' }}
                            />

                            <input
                              type="number"
                              step="0.01"
                              value={row.rowRate}
                              onChange={(e) =>
                                handleRowChange(row.id, 'rowRate', Number(e.target.value))
                              }
                              className="input-field"
                              style={{
                                textAlign: 'right',
                                fontSize: '0.8rem',
                                padding: '0.25rem',
                                fontWeight: 'bold',
                                color: '#4f46e5'
                              }}
                            />

                            <input
                              type="number"
                              placeholder="Лекало грн"
                              value={row.patternCostUAH || ''}
                              onChange={(e) =>
                                handleRowChange(row.id, 'patternCostUAH', Number(e.target.value))
                              }
                              className="input-field"
                              style={{
                                textAlign: 'right',
                                fontSize: '0.8rem',
                                padding: '0.25rem',
                                color: '#d97706'
                              }}
                            />
                          </div>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>

            <tfoot>
              <tr
                style={{
                  background: '#f8fafc',
                  borderTop: '2px solid #cbd5e1',
                  fontWeight: '800'
                }}
              >
                <td style={{ padding: '0.75rem 0.5rem' }}></td>
                <td
                  style={{
                    padding: '0.75rem 0.5rem',
                    textAlign: 'center',
                    color: '#0f172a',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {hasCheckedPairs ? `${checkedPairs} шт` : `${totalPairs} шт`}
                </td>
                <td
                  colSpan="2"
                  style={{
                    padding: '0.75rem 0.75rem',
                    color: '#334155',
                    textTransform: 'uppercase',
                    fontSize: '0.8rem'
                  }}
                >
                  {hasCheckedPairs ? 'РАЗОМ (З ГАЛОЧКОЮ):' : 'РАЗОМ:'}
                </td>
                <td></td>
                <td style={{ padding: '0.75rem 0.75rem', textAlign: 'right', color: '#0f172a' }}>
                  <div>${hasCheckedPairs ? checkedUSD.toFixed(2) : totalUSD.toFixed(2)}</div>
                  {(hasCheckedPairs ? checkedPatternsUAH : totalPatternsUAH) > 0 && (
                    <div style={{ fontSize: '0.72rem', color: '#d97706', fontWeight: '700' }}>
                      + {(hasCheckedPairs ? checkedPatternsUAH : totalPatternsUAH).toFixed(0)} грн лекала
                    </div>
                  )}
                </td>
                <td></td>
                <td style={{ padding: '0.75rem 0.75rem', textAlign: 'right', fontSize: '0.95rem' }}>
                  <div
                    onClick={() => hasCheckedPairs && handlePaySelectedInterval()}
                    style={{
                      color: hasCheckedPairs ? '#16a34a' : '#0f172a',
                      cursor: hasCheckedPairs ? 'pointer' : 'default'
                    }}
                  >
                    {hasCheckedPairs
                      ? `${checkedTotalUAH.toFixed(0)} грн`
                      : `${totalUAH.toFixed(0)} грн`}
                  </div>
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div
          style={{
            marginTop: '1rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.75rem'
          }}
        >
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              onClick={handleAddRow}
              className="btn-primary"
              style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
            >
              + Додати пару
            </button>
            <button
              onClick={handleAddSubtotal}
              className="btn-warning"
              style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
            >
              + Підсумок
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div style={{ fontSize: '0.9rem', fontWeight: '800', color: '#0f172a' }}>
              Загальна сума: {totalUAH.toFixed(0)} грн
            </div>

            <button
              type="button"
              onClick={handlePaySelectedInterval}
              style={{
                background: showGreenPaidButton
                  ? '#16a34a'
                  : hasCheckedPairs
                  ? '#4f46e5'
                  : '#94a3b8',
                color: '#ffffff',
                border: 'none',
                padding: '0.55rem 1.25rem',
                borderRadius: '0.5rem',
                cursor: hasCheckedPairs ? 'pointer' : 'default',
                fontWeight: '900',
                fontSize: '0.9rem',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
            >
              {showGreenPaidButton
                ? `${paidUAH.toFixed(0)} грн ✓ (оплачено)`
                : hasCheckedPairs
                ? `${checkedTotalUAH.toFixed(0)} грн • Оплатити`
                : '0 грн • Оплатити'}
            </button>
          </div>
        </div>
      </div>

      {/* НИЖНІЙ ЧЕК */}
      <div
        className="card"
        style={{ border: '2px solid #86efac', background: '#f0fdf4', padding: '1rem' }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.5rem',
            marginBottom: '0.75rem'
          }}
        >
          <div>
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: '800',
                color: '#16a34a',
                textTransform: 'uppercase'
              }}
            >
              🧾 Фінансовий чек
            </span>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '900', color: '#14532d', margin: 0 }}>
              Оплачені замовлення ({activeMonth})
            </h3>
          </div>

          <div
            style={{
              background: '#16a34a',
              color: '#ffffff',
              padding: '0.4rem 0.85rem',
              borderRadius: '0.6rem',
              fontWeight: '900',
              fontSize: '0.95rem'
            }}
          >
            {paidUAH.toFixed(0)} грн ({paidPairs} пар)
          </div>
        </div>

        {paidChecksList.length === 0 ? (
          <div
            style={{
              padding: '1.25rem',
              textAlign: 'center',
              color: '#15803d',
              fontSize: '0.85rem',
              background: '#ffffff',
              borderRadius: '0.5rem'
            }}
          >
            Ще немає оплачених позицій. Поставте галочку біля пар та натисніть оплату.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {paidChecksList.map((chk) => (
              <div
                key={chk.date}
                onClick={() => {
                  if (chk.rowIds.length > 0) {
                    scrollToRow(chk.rowIds[0]);
                  }
                }}
                style={{
                  background: '#ffffff',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '0.5rem',
                  border: '1px solid #bbf7d0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '0.5rem',
                  cursor: 'pointer',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                }}
              >
                <div style={{ fontSize: '0.85rem', fontWeight: '800', color: '#374151' }}>
                  {chk.date} — <strong>{chk.totalSum.toFixed(0)} грн</strong> (оплачено)
                </div>
                <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#16a34a' }}>
                  Перейти до партії ↑
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}