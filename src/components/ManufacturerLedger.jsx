import React from 'react';

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

function normalizeMonthKey(rawMonth, fallbackYear = '2026') {
  if (!rawMonth) return `${fallbackYear}-07`;
  if (typeof rawMonth === 'object') {
    const candidate = rawMonth.value || rawMonth.key || rawMonth.month || rawMonth.label || '';
    return normalizeMonthKey(candidate, fallbackYear);
  }
  const str = String(rawMonth).trim().toLowerCase();
  if (/^\d{4}-\d{2}$/.test(str)) return str;
  if (/^\d{4}-\d{1,2}$/.test(str)) {
    const [y, m] = str.split('-');
    return `${y}-${m.padStart(2, '0')}`;
  }
  if (/^\d{1,2}$/.test(str)) return `${fallbackYear}-${str.padStart(2, '0')}`;
  if (UKRAINIAN_MONTH_MAP[str]) return `${fallbackYear}-${UKRAINIAN_MONTH_MAP[str]}`;
  return `${fallbackYear}-07`;
}

function getRowMonthKey(row, fallbackMonth, fallbackYear) {
  if (row?.month) return normalizeMonthKey(row.month, fallbackYear);
  if (row?.isoDate && typeof row.isoDate === 'string' && row.isoDate.includes('-')) {
    const parts = row.isoDate.split('-');
    if (parts.length >= 2) return `${parts[0]}-${parts[1].padStart(2, '0')}`;
  }
  if (row?.date && typeof row.date === 'string' && row.date.includes('.')) {
    const parts = row.date.split('.');
    if (parts.length >= 2) return `${fallbackYear}-${parts[1].padStart(2, '0')}`;
  }
  return fallbackMonth;
}

export default function GeneralSummary(props) {
  const {
    selectedMonth,
    month,
    currentMonth,
    selectedYear,
    year,
    currentYear: propCurrentYear,
    rows = [],
    milaRows = [],
    valeriiRows = [],
    operationalExpenses = [],
    additionalExpenses = [],
    exchangeRate = 45
  } = props;

  const resolvedYear = String(selectedYear || year || propCurrentYear || '2026');
  const rawMonthInput = selectedMonth || month || currentMonth || '07';
  const activeMonth = normalizeMonthKey(rawMonthInput, resolvedYear);

  const combinedRows = [
    ...rows.map((r) => ({ ...r, manufacturer: r.manufacturer || 'Міла' })),
    ...milaRows.map((r) => ({ ...r, manufacturer: 'Міла' })),
    ...valeriiRows.map((r) => ({ ...r, manufacturer: 'Валерій' }))
  ];

  const uniqueRowsMap = new Map();
  combinedRows.forEach((r, idx) => {
    const key = r.id !== undefined ? `${r.manufacturer}_${r.id}` : `${r.manufacturer}_${idx}`;
    uniqueRowsMap.set(key, r);
  });

  const monthItemRows = Array.from(uniqueRowsMap.values()).filter((row) => {
    if (row.type === 'subtotal') return false;
    return getRowMonthKey(row, activeMonth, resolvedYear) === activeMonth;
  });

  let totalPairs = 0;
  let milaPairs = 0;
  let valeriiPairs = 0;

  let totalUSD = 0;
  let totalPatternsUAH = 0;

  let milaTotalUAH = 0;
  let valeriiTotalUAH = 0;

  monthItemRows.forEach((row) => {
    const qty = Number(row.quantity) || 0;
    const costUSD = Number(row.customCostUSD) || 0;
    const patternUAH = Number(row.patternCostUAH) || 0;
    const rate = Number(row.rowRate) || Number(exchangeRate) || 45;

    const rowUSD = qty * costUSD;
    const rowFullUAH = rowUSD * rate + patternUAH;

    totalPairs += qty;
    totalUSD += rowUSD;
    totalPatternsUAH += patternUAH;

    const isValerii = String(row.manufacturer || '')
      .toLowerCase()
      .includes('валер');

    if (isValerii) {
      valeriiPairs += qty;
      valeriiTotalUAH += rowFullUAH;
    } else {
      milaPairs += qty;
      milaTotalUAH += rowFullUAH;
    }
  });

  const footwearTotalUAH = milaTotalUAH + valeriiTotalUAH;

  const opExpensesSum = operationalExpenses
    .filter((item) => {
      const mKey = getRowMonthKey(item, activeMonth, resolvedYear);
      return mKey === activeMonth;
    })
    .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  const addExpensesSum = additionalExpenses
    .filter((item) => {
      const mKey = getRowMonthKey(item, activeMonth, resolvedYear);
      return mKey === activeMonth;
    })
    .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  const totalMonthExpensesUAH = footwearTotalUAH + opExpensesSum + addExpensesSum;

  return (
    <div
      style={{
        background: '#ffffff',
        borderRadius: '1rem',
        padding: '1.25rem',
        border: '1px solid #e5e7eb',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          marginBottom: '1rem'
        }}
      >
        <span style={{ fontSize: '1.15rem' }}>📊</span>
        <h2
          style={{
            margin: 0,
            fontSize: '1.15rem',
            fontWeight: '900',
            color: '#111827'
          }}
        >
          Зведена фінансова картина місяця
        </h2>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem'
        }}
      >
        {/* ВИГОТОВЛЕНО ПАР */}
        <div
          style={{
            background: '#f5f3ff',
            borderRadius: '0.85rem',
            padding: '1rem',
            border: '1px solid #ede9fe'
          }}
        >
          <div
            style={{
              fontSize: '0.7rem',
              fontWeight: '800',
              color: '#4f46e5',
              textTransform: 'uppercase',
              marginBottom: '0.35rem'
            }}
          >
            Виготовлено пар
          </div>
          <div
            style={{
              fontSize: '1.6rem',
              fontWeight: '900',
              color: '#111827',
              lineHeight: 1.15
            }}
          >
            {totalPairs} шт.
          </div>
          <div
            style={{
              fontSize: '0.78rem',
              color: '#6b7280',
              marginTop: '0.35rem',
              fontWeight: '600'
            }}
          >
            Міла: {milaPairs} | Валерій: {valeriiPairs}
          </div>
        </div>

        {/* ВИРОБНИЦТВО (ВЗУТТЯ) */}
        <div
          style={{
            background: '#f0fdf4',
            borderRadius: '0.85rem',
            padding: '1rem',
            border: '1px solid #dcfce7'
          }}
        >
          <div
            style={{
              fontSize: '0.7rem',
              fontWeight: '800',
              color: '#16a34a',
              textTransform: 'uppercase',
              marginBottom: '0.35rem'
            }}
          >
            Виробництво (взуття)
          </div>
          <div
            style={{
              fontSize: '1.6rem',
              fontWeight: '900',
              color: '#111827',
              lineHeight: 1.15
            }}
          >
            {footwearTotalUAH.toFixed(0)} грн
          </div>
          <div
            style={{
              fontSize: '0.75rem',
              color: '#4b5563',
              marginTop: '0.35rem',
              fontWeight: '600'
            }}
          >
            ${totalUSD.toFixed(2)} (Міла: {milaTotalUAH.toFixed(0)} | Вал: {valeriiTotalUAH.toFixed(0)})
          </div>
          {totalPatternsUAH > 0 && (
            <div
              style={{
                fontSize: '0.72rem',
                color: '#d97706',
                marginTop: '0.2rem',
                fontWeight: '700'
              }}
            >
              в т.ч. лекала: {totalPatternsUAH.toFixed(0)} грн
            </div>
          )}
        </div>

        {/* ОПЕРАЦІЙНІ ВИТРАТИ */}
        <div
          style={{
            background: '#fef2f2',
            borderRadius: '0.85rem',
            padding: '1rem',
            border: '1px solid #fee2e2'
          }}
        >
          <div
            style={{
              fontSize: '0.7rem',
              fontWeight: '800',
              color: '#dc2626',
              textTransform: 'uppercase',
              marginBottom: '0.35rem'
            }}
          >
            Операційні витрати
          </div>
          <div
            style={{
              fontSize: '1.6rem',
              fontWeight: '900',
              color: '#991b1b',
              lineHeight: 1.15
            }}
          >
            {opExpensesSum.toFixed(0)} грн
          </div>
          <div
            style={{
              fontSize: '0.75rem',
              color: '#6b7280',
              marginTop: '0.35rem',
              fontWeight: '600'
            }}
          >
            Реклама, повернення, сервіси
          </div>
        </div>

        {/* РАЗОМ ВИТРАТ ЗА МІСЯЦЬ */}
        <div
          style={{
            background: '#0f172a',
            borderRadius: '0.85rem',
            padding: '1rem',
            color: '#ffffff'
          }}
        >
          <div
            style={{
              fontSize: '0.7rem',
              fontWeight: '800',
              color: '#cbd5e1',
              textTransform: 'uppercase',
              marginBottom: '0.35rem'
            }}
          >
            Разом витрат за місяць
          </div>
          <div
            style={{
              fontSize: '1.6rem',
              fontWeight: '900',
              color: '#ffffff',
              lineHeight: 1.15
            }}
          >
            {totalMonthExpensesUAH.toFixed(0)} грн
          </div>
          <div
            style={{
              fontSize: '0.75rem',
              color: '#94a3b8',
              marginTop: '0.35rem',
              fontWeight: '600'
            }}
          >
            Виробництво + Дод. витрати
          </div>
        </div>
      </div>
    </div>
  );
}