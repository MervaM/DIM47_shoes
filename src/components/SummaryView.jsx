import React from 'react';
import { shoesCatalog } from '../data/shoesCatalog';

const EXPENSE_CATEGORIES = [
  'Реклама',
  'Повернення',
  'Бухгалтер',
  'Податки / ЄСВ',
  'Пакування / Доставка',
  'Інше'
];

export default function SummaryView({ milaRows, valeraRows, milaRate, valeraRate, expenses, setExpenses }) {
  
  const calculateStats = (rows, rate) => {
    let pairs = 0;
    let uah = 0;
    let usd = 0;
    const modelCounts = {};

    rows.forEach(row => {
      if (row.type === 'item') {
        const qty = Number(row.quantity);
        const costUSD = Number(row.customCostUSD);
        pairs += qty;
        usd += qty * costUSD;
        uah += qty * costUSD * Number(rate);

        modelCounts[row.shoeId] = (modelCounts[row.shoeId] || 0) + qty;
      }
    });

    return { pairs, uah, usd, modelCounts };
  };

  const milaStats = calculateStats(milaRows, milaRate);
  const valeraStats = calculateStats(valeraRows, valeraRate);

  const totalPairs = milaStats.pairs + valeraStats.pairs;
  const productionUAH = milaStats.uah + valeraStats.uah;
  const productionUSD = milaStats.usd + valeraStats.usd;

  // Підрахунок додаткових витрат
  const extraExpensesUAH = expenses.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const grandTotalUAH = productionUAH + extraExpensesUAH;

  // Управління рядками витрат
  const handleAddExpense = () => {
    setExpenses([
      ...expenses,
      { id: Date.now(), date: '', category: EXPENSE_CATEGORIES[0], description: '', amount: 0 }
    ]);
  };

  const handleExpenseChange = (id, field, value) => {
    setExpenses(expenses.map(exp => (exp.id === id ? { ...exp, [field]: value } : exp)));
  };

  const handleDeleteExpense = (id) => {
    setExpenses(expenses.filter(exp => exp.id !== id));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* БЛОК 1: ЗАГАЛЬНІ ФІНАНСОВІ ПОКАЗНИКИ */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#111827', margin: '0 0 1.25rem 0' }}>
          📊 Зведена фінансова картина місяця
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          
          <div style={{ background: '#eef2ff', padding: '1.25rem', borderRadius: '1rem', border: '1px solid #e0e7ff' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#4f46e5', textTransform: 'uppercase' }}>Виготовлено пар</span>
            <p style={{ fontSize: '1.85rem', fontWeight: '900', color: '#111827', margin: '0.4rem 0 0.2rem 0' }}>{totalPairs} шт.</p>
            <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>Міла: <b>{milaStats.pairs}</b> | Валерій: <b>{valeraStats.pairs}</b></div>
          </div>

          <div style={{ background: '#f0fdf4', padding: '1.25rem', borderRadius: '1rem', border: '1px solid #dcfce7' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#16a34a', textTransform: 'uppercase' }}>Виробництво (взуття)</span>
            <p style={{ fontSize: '1.85rem', fontWeight: '900', color: '#111827', margin: '0.4rem 0 0.2rem 0' }}>{productionUAH.toFixed(0)} грн</p>
            <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>${productionUSD.toFixed(2)} (Міла: {milaStats.uah.toFixed(0)} | Вал: {valeraStats.uah.toFixed(0)})</div>
          </div>

          <div style={{ background: '#fef2f2', padding: '1.25rem', borderRadius: '1rem', border: '1px solid #fee2e2' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#dc2626', textTransform: 'uppercase' }}>Операційні витрати</span>
            <p style={{ fontSize: '1.85rem', fontWeight: '900', color: '#991b1b', margin: '0.4rem 0 0.2rem 0' }}>{extraExpensesUAH.toFixed(0)} грн</p>
            <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>Реклама, повернення, сервіси</div>
          </div>

          <div style={{ background: '#111827', padding: '1.25rem', borderRadius: '1rem', color: '#ffffff' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#a5b4fc', textTransform: 'uppercase' }}>Разом витрат за місяць</span>
            <p style={{ fontSize: '1.85rem', fontWeight: '900', color: '#ffffff', margin: '0.4rem 0 0.2rem 0' }}>{grandTotalUAH.toFixed(0)} грн</p>
            <div style={{ fontSize: '0.8rem', color: '#9ca3af' }}>Виробництво + Дод. витрати</div>
          </div>

        </div>

        {/* Статистика по моделях */}
        <h3 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#111827', marginBottom: '1rem' }}>
          Розподіл виробництва по моделях
        </h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem' }}>
          {shoesCatalog.map(shoe => {
            const countMila = milaStats.modelCounts[shoe.id] || 0;
            const countValera = valeraStats.modelCounts[shoe.id] || 0;
            const totalShoeCount = countMila + countValera;

            return (
              <div key={shoe.id} style={{ background: '#f9fafb', padding: '0.875rem', borderRadius: '0.75rem', border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                <img src={shoe.photo} alt="" style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '0.5rem', background: '#ffffff', border: '1px solid #e5e7eb', flexShrink: 0 }} />
                <div>
                  <h4 style={{ fontSize: '0.875rem', fontWeight: 'bold', color: '#111827', margin: 0 }}>{shoe.name}</h4>
                  <p style={{ fontSize: '1rem', fontWeight: '800', color: '#4f46e5', margin: '0.15rem 0' }}>{totalShoeCount} пар</p>
                  <p style={{ fontSize: '0.75rem', color: '#9ca3af', margin: 0 }}>Міла: {countMila} | Вал: {countValera}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* БЛОК 2: ТАБЛИЦЯ ОПЕРАЦІЙНИХ ВИТРАТ */}
      <div className="card">
        <div className="header-box" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#dc2626', textTransform: 'uppercase' }}>Додаткові статті бюджету</span>
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
                <th style={{ width: '110px' }}>Дата</th>
                <th style={{ width: '210px' }}>Категорія</th>
                <th>Коментар / Призначення платежу</th>
                <th style={{ width: '150px', textAlign: 'right' }}>Сума (грн)</th>
                <th style={{ width: '50px', textAlign: 'center' }}></th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((exp, index) => (
                <tr key={exp.id}>
                  <td style={{ textAlign: 'center', fontWeight: '600', color: '#9ca3af' }}>{index + 1}</td>
                  <td>
                    <input 
                      type="text" 
                      placeholder="ДД.ММ"
                      value={exp.date} 
                      onChange={(e) => handleExpenseChange(exp.id, 'date', e.target.value)}
                      className="input-field"
                    />
                  </td>
                  <td>
                    <select 
                      value={exp.category} 
                      onChange={(e) => handleExpenseChange(exp.id, 'category', e.target.value)}
                      className="input-field"
                      style={{ fontWeight: '600', color: '#374151' }}
                    >
                      {EXPENSE_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
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
                      onMouseOver={(e) => e.target.style.color = '#ef4444'}
                      onMouseOut={(e) => e.target.style.color = '#d1d5db'}
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
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
          <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Кількість записів: <b>{expenses.length}</b></span>
          <span style={{ fontSize: '1rem', fontWeight: '800', color: '#dc2626' }}>Разом дод. витрат: {extraExpensesUAH.toFixed(0)} грн</span>
        </div>
      </div>

    </div>
  );
}