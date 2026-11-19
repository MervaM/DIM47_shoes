import React from 'react';

const EXPENSE_CATEGORIES = [
  'Реклама',
  'Повернення',
  'Бухгалтер',
  'Податки / ЄСВ',
  'Пакування / Доставка',
  'Інше'
];

const DAYS_IN_MONTH_LIST = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'));

export default function SummaryView({
  monthKey = '',
  milaPaidRows,
  valeraPaidRows,
  milaRows = [],
  valeraRows = [],
  milaRate = 45,
  valeraRate = 45,
  expenses = [],
  setExpenses = () => {}
}) {
  const defaultMM = monthKey && monthKey.includes('-') ? monthKey.split('-')[1] : '08';

  const calculateStats = (rows = [], defaultRate = 45) => {
    let pairs = 0;
    let uah = 0;
    let usd = 0;
    let patternsUAH = 0;
    let fromAdvanceUAH = 0;
    let separateUAH = 0;

    rows.forEach((row) => {
      if (row.type === 'item') {
        const qty = Number(row.quantity) || 0;
        const costUSD = Number(row.customCostUSD) || 0;
        const patternUAH = Number(row.patternCostUAH) || 0;
        const rate = Number(row.rowRate) || Number(defaultRate) || 45;

        const rowUSD = qty * costUSD;
        const rowUAH = rowUSD * rate + patternUAH;

        pairs += qty;
        usd += rowUSD;
        patternsUAH += patternUAH;
        uah += rowUAH;

        if (row.isPaid) {
          if (row.paySource === 'separate') {
            separateUAH += rowUAH;
          } else {
            fromAdvanceUAH += rowUAH;
          }
        }
      }
    });

    return { pairs, uah, usd, patternsUAH, fromAdvanceUAH, separateUAH };
  };

  const effectiveMilaPaid = Array.isArray(milaPaidRows)
    ? milaPaidRows
    : milaRows.filter((r) => r.type === 'item' && r.isPaid);
  const effectiveValeraPaid = Array.isArray(valeraPaidRows)
    ? valeraPaidRows
    : valeraRows.filter((r) => r.type === 'item' && r.isPaid);

  const milaPaidStats = calculateStats(effectiveMilaPaid, milaRate);
  const valeraPaidStats = calculateStats(effectiveValeraPaid, valeraRate);

  const totalPaidPairs = milaPaidStats.pairs + valeraPaidStats.pairs;
  const productionPaidUAH = milaPaidStats.uah + valeraPaidStats.uah;
  const productionPaidUSD = milaPaidStats.usd + valeraPaidStats.usd;
  const totalPaidPatternsUAH = milaPaidStats.patternsUAH + valeraPaidStats.patternsUAH;

  // Статистика за замовленнями, створеними у поточному місяці
  const milaOrderedStats = calculateStats(milaRows, milaRate);
  const valeraOrderedStats = calculateStats(valeraRows, valeraRate);
  const totalOrderedPairs = milaOrderedStats.pairs + valeraOrderedStats.pairs;

  const unpaidOrderedRows = [
    ...milaRows.filter((r) => r.type === 'item' && !r.isPaid),
    ...valeraRows.filter((r) => r.type === 'item' && !r.isPaid)
  ];
  const unpaidOrderedStats = calculateStats(unpaidOrderedRows, milaRate);

  const extraExpensesUAH = expenses.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const grandTotalUAH = productionPaidUAH + extraExpensesUAH;

  const handleAddExpense = () => {
    setExpenses([
      ...expenses,
      {
        id: Date.now(),
        date: `01.${defaultMM}`,
        category: EXPENSE_CATEGORIES[0],
        description: '',
        amount: 0
      }
    ]);
  };

  const handleExpenseChange = (id, field, value) => {
    setExpenses(expenses.map((exp) => (exp.id === id ? { ...exp, [field]: value } : exp)));
  };

  const handleDeleteExpense = (id) => {
    setExpenses(expenses.filter((exp) => exp.id !== id));
  };

  const getExpenseDay = (dateStr) => {
    const match = String(dateStr || '').match(/^(\d{1,2})/);
    if (match) {
      return String(Math.min(31, Math.max(1, Number(match[1]) || 1))).padStart(2, '0');
    }
    return '01';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* БЛОК 1: ЗАГАЛЬНІ ФІНАНСОВІ ПОКАЗНИКИ */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#111827', margin: '0 0 1.25rem 0' }}>
          📊 Зведена фінансова картина місяця {monthKey ? `(${monthKey})` : ''}
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          <div style={{ background: '#eef2ff', padding: '1.25rem', borderRadius: '1rem', border: '1px solid #e0e7ff' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#4f46e5', textTransform: 'uppercase' }}>
              Видано та оплачено пар
            </span>
            <p style={{ fontSize: '1.85rem', fontWeight: '900', color: '#111827', margin: '0.4rem 0 0.2rem 0' }}>
              {totalPaidPairs} шт.
            </p>
            <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
              Міла: <b>{milaPaidStats.pairs}</b> | Валерій: <b>{valeraPaidStats.pairs}</b>
            </div>
            <div style={{ fontSize: '0.73rem', color: '#4f46e5', fontWeight: '600', marginTop: '0.25rem' }}>
              Замовлено в міс.: {totalOrderedPairs} шт. (неопл.: {unpaidOrderedStats.pairs} шт.)
            </div>
          </div>

          <div style={{ background: '#f0fdf4', padding: '1.25rem', borderRadius: '1rem', border: '1px solid #dcfce7' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#16a34a', textTransform: 'uppercase' }}>
              Виробництво (за датою оплати)
            </span>
            <p style={{ fontSize: '1.85rem', fontWeight: '900', color: '#111827', margin: '0.4rem 0 0.2rem 0' }}>
              {productionPaidUAH.toFixed(0)} грн
            </p>
            <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
              ${productionPaidUSD.toFixed(2)} (Міла: {milaPaidStats.uah.toFixed(0)} | Вал: {valeraPaidStats.uah.toFixed(0)})
            </div>
            {milaPaidStats.uah > 0 && (
              <div style={{ fontSize: '0.72rem', color: '#166534', fontWeight: '600', marginTop: '0.2rem' }}>
                Міла: з авансу {milaPaidStats.fromAdvanceUAH.toFixed(0)} • окремо {milaPaidStats.separateUAH.toFixed(0)} грн
              </div>
            )}
            {totalPaidPatternsUAH > 0 && (
              <div style={{ fontSize: '0.75rem', color: '#d97706', fontWeight: '700', marginTop: '0.2rem' }}>
                в т.ч. лекала: {totalPaidPatternsUAH.toFixed(0)} грн
              </div>
            )}
          </div>

          <div style={{ background: '#fef2f2', padding: '1.25rem', borderRadius: '1rem', border: '1px solid #fee2e2' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#dc2626', textTransform: 'uppercase' }}>
              Операційні витрати
            </span>
            <p style={{ fontSize: '1.85rem', fontWeight: '900', color: '#991b1b', margin: '0.4rem 0 0.2rem 0' }}>
              {extraExpensesUAH.toFixed(0)} грн
            </p>
            <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>Реклама, повернення, сервіси</div>
          </div>

          <div style={{ background: '#111827', padding: '1.25rem', borderRadius: '1rem', color: '#ffffff' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#a5b4fc', textTransform: 'uppercase' }}>
              Разом витрат за місяць
            </span>
            <p style={{ fontSize: '1.85rem', fontWeight: '900', color: '#ffffff', margin: '0.4rem 0 0.2rem 0' }}>
              {grandTotalUAH.toFixed(0)} грн
            </p>
            <div style={{ fontSize: '0.8rem', color: '#9ca3af' }}>Оплачене виробництво + Дод. витрати</div>
          </div>
        </div>
      </div>

      {/* БЛОК 2: ТАБЛИЦЯ ОПЕРАЦІЙНИХ ВИТРАТ */}
      <div className="card">
        <div className="header-box" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#dc2626', textTransform: 'uppercase' }}>
              Додаткові статті бюджету
            </span>
            <h3 style={{ fontSize: '1.35rem', fontWeight: '800', color: '#111827', margin: '0.2rem 0 0 0' }}>
              Витрати (реклама, повернення, бухгалтер, оплати)
            </h3>
          </div>
          <button onClick={handleAddExpense} className="btn-primary">
            + Додати витрату
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="table-custom">
            <thead>
              <tr>
                <th style={{ width: '50px', textAlign: 'center' }}>№</th>
                <th style={{ width: '115px' }}>Дата</th>
                <th style={{ width: '210px' }}>Категорія</th>
                <th>Коментар / Призначення платежу</th>
                <th style={{ width: '150px', textAlign: 'right' }}>Сума (грн)</th>
                <th style={{ width: '50px', textAlign: 'center' }}></th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((exp, index) => {
                const expDay = getExpenseDay(exp.date);
                return (
                  <tr key={exp.id}>
                    <td style={{ textAlign: 'center', fontWeight: '600', color: '#9ca3af' }}>{index + 1}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <select
                          value={expDay}
                          onChange={(e) => handleExpenseChange(exp.id, 'date', `${e.target.value}.${defaultMM}`)}
                          className="input-field"
                          style={{ padding: '0.35rem 0.25rem', fontWeight: '700' }}
                        >
                          {DAYS_IN_MONTH_LIST.map((d) => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                        </select>
                        <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#6b7280' }}>
                          .{defaultMM}
                        </span>
                      </div>
                    </td>
                    <td>
                      <select
                        value={exp.category}
                        onChange={(e) => handleExpenseChange(exp.id, 'category', e.target.value)}
                        className="input-field"
                        style={{ fontWeight: '600', color: '#374151' }}
                      >
                        {EXPENSE_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        type="text"
                        placeholder="Наприклад: Таргет, повернення клієнту, податок..."
                        value={exp.description}
                        onChange={(e) => handleExpenseChange(exp.id, 'description', e.target.value)}
                        className="input-field"
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        value={exp.amount}
                        onChange={(e) => handleExpenseChange(exp.id, 'amount', Number(e.target.value))}
                        className="input-field"
                        style={{ textAlign: 'right', fontWeight: 'bold', color: '#dc2626' }}
                      />
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        onClick={() => handleDeleteExpense(exp.id)}
                        style={{ background: 'none', border: 'none', color: '#d1d5db', fontSize: '1.25rem', cursor: 'pointer' }}
                        onMouseOver={(e) => (e.target.style.color = '#ef4444')}
                        onMouseOut={(e) => (e.target.style.color = '#d1d5db')}
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                );
              })}
              {expenses.length === 0 && (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>
                    Поки немає додаткових витрат. Натисни «+ Додати витрату», щоб внести перший запис.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div style={{ padding: '1rem 1.5rem', background: '#f9fafb', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '1.5rem' }}>
          <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
            Кількість записів: <b>{expenses.length}</b>
          </span>
          <span style={{ fontSize: '1rem', fontWeight: '800', color: '#dc2626' }}>
            Разом дод. витрат: {extraExpensesUAH.toFixed(0)} грн
          </span>
        </div>
      </div>
    </div>
  );
}