import React from 'react';

export default function ManufacturerLedger({ 
  manufacturerName, 
  paymentMode = 'prepaid', 
  rows, 
  setRows, 
  deposit, 
  setDeposit, 
  exchangeRate, 
  setExchangeRate, 
  initialDebt, 
  setInitialDebt,
  shoesCatalog = [] // Приймаємо загальний каталог
}) {
  
  // Фільтруємо моделі спеціально для цього виробника
  const manufacturerShoes = shoesCatalog.filter(shoe => (shoe.manufacturer || 'Міла') === manufacturerName);
  const defaultShoe = manufacturerShoes[0] || shoesCatalog[0] || { id: 'default', name: 'Модель', defaultCostUSD: 0 };

  const handleAddRow = () => {
    setRows([...rows, { 
      id: Date.now(), 
      type: 'item', 
      date: '', 
      shoeId: defaultShoe.id, 
      quantity: 1, 
      customCostUSD: defaultShoe.defaultCostUSD,
      patternCostUAH: 0 
    }]);
  };

  const handleAddSubtotal = () => {
    setRows([...rows, { 
      id: Date.now(), 
      type: 'subtotal', 
      note: '',          
      manualSumUAH: 0,   
      isCollapsed: false 
    }]);
  };

  const handleRowChange = (id, field, value) => {
    setRows(rows.map(row => {
      if (row.id === id) {
        const updated = { ...row, [field]: value };
        if (field === 'shoeId') {
          const found = shoesCatalog.find(s => s.id === value);
          if (found) updated.customCostUSD = found.defaultCostUSD;
        }
        return updated;
      }
      return row;
    }));
  };

  const handleDeleteRow = (id) => {
    setRows(rows.filter(row => row.id !== id));
  };

  let totalPairs = 0;
  let totalUSD = 0;
  let totalUAH = 0;
  
  rows.forEach(row => {
    if (row.type === 'item') {
      const qty = Number(row.quantity) || 0;
      const costUSD = Number(row.customCostUSD) || 0;
      const patternUAH = Number(row.patternCostUAH) || 0;

      totalPairs += qty;
      const uah = (qty * costUSD * Number(exchangeRate)) + patternUAH;
      totalUSD += qty * costUSD;
      totalUAH += uah;
    } else if (row.type === 'subtotal') {
      totalUAH += Number(row.manualSumUAH) || 0;
    }
  });

  const effectiveDeposit = (Number(deposit) || 0) - (Number(initialDebt) || 0);
  const remainingBalance = paymentMode === 'prepaid' ? totalUAH - effectiveDeposit : totalUAH;

  return (
    <div className="app-container">
      <div className="card">
        
        {/* ШАПКА */}
        <div className="header-box">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#4f46e5', textTransform: 'uppercase' }}>Виробник</span>
              <h2 style={{ fontSize: '1.75rem', fontWeight: '800', color: '#111827', margin: '0.2rem 0 0 0' }}>{manufacturerName}</h2>
            </div>
            <span style={{ fontSize: '0.75rem', padding: '0.35rem 0.85rem', background: '#eef2ff', color: '#4f46e5', borderRadius: '9999px', fontWeight: 'bold' }}>
              {paymentMode === 'prepaid' ? '✨ Робота по авансу' : '💼 Оплата після видачі'}
            </span>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', background: '#ffffff', padding: '1rem', borderRadius: '0.75rem', border: '1px solid #e5e7eb' }}>
            {paymentMode === 'prepaid' && (
              <>
                <div>
                  <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', marginBottom: '0.3rem' }}>Попередній борг (грн):</span>
                  <input 
                    type="number" 
                    value={initialDebt} 
                    onChange={(e) => setInitialDebt(Number(e.target.value))}
                    className="input-field"
                    style={{ fontWeight: 'bold', color: '#dc2626', textAlign: 'right' }}
                  />
                </div>
                <div>
                  <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', marginBottom: '0.3rem' }}>Сума авансу (грн):</span>
                  <input 
                    type="number" 
                    value={deposit} 
                    onChange={(e) => setDeposit(Number(e.target.value))}
                    className="input-field"
                    style={{ fontWeight: 'bold', color: '#16a34a', textAlign: 'right' }}
                  />
                </div>
              </>
            )}
            <div>
              <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', marginBottom: '0.3rem' }}>Курс ($):</span>
              <input 
                type="number" 
                step="0.1" 
                value={exchangeRate} 
                onChange={(e) => setExchangeRate(Number(e.target.value))}
                className="input-field"
                style={{ fontWeight: 'bold', textAlign: 'right' }}
              />
            </div>
            <div style={{ background: '#f5f3ff', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #ede9fe', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#4f46e5' }}>
                {paymentMode === 'prepaid' ? 'Залишок від авансу:' : 'До сплати загалом:'}
              </span>
              <span style={{ fontSize: '1.25rem', fontWeight: '800', color: '#312e81', marginTop: '0.1rem' }}>
                {remainingBalance.toFixed(0)} грн
              </span>
            </div>
          </div>
        </div>

        {/* ТАБЛИЦЯ */}
        <div style={{ overflowX: 'auto' }}>
          <table className="table-custom">
            <thead>
              <tr>
                <th style={{ width: '50px', textAlign: 'center' }}>№</th>
                <th style={{ width: '100px' }}>Дата</th>
                <th>Фото + Назва пари</th>
                <th style={{ width: '75px', textAlign: 'center' }}>К-ть</th>
                <th style={{ width: '95px', textAlign: 'right' }}>Ціна ($)</th>
                <th style={{ width: '95px', textAlign: 'right' }}>Лекало (грн)</th>
                <th style={{ width: '80px', textAlign: 'right' }}>Курс</th>
                <th style={{ width: '130px', textAlign: 'right' }}>Сума (грн)</th>
                <th style={{ width: '50px', textAlign: 'center' }}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => {
                if (row.type === 'subtotal') {
                  const isCollapsed = row.isCollapsed || false;

                  return (
                    <tr key={row.id} style={{ background: '#fffbeb', borderTop: '2px solid #fde68a', borderBottom: '2px solid #fde68a' }}>
                      <td colSpan="7" style={{ padding: '0.75rem 1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <button 
                            onClick={() => handleRowChange(row.id, 'isCollapsed', !isCollapsed)}
                            style={{ background: '#f59e0b', color: '#fff', border: 'none', padding: '0.2rem 0.5rem', borderRadius: '0.3rem', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' }}
                          >
                            {isCollapsed ? '▶ Розгорнути' : '▼ Згорнути'}
                          </button>

                          <span style={{ fontWeight: '600', color: '#92400e', whiteSpace: 'nowrap' }}>Проміжний підсумок:</span>

                          {!isCollapsed && (
                            <input 
                              type="text" 
                              placeholder="Введіть формулу або опис (напр. (4 800) + ($150*46,2))"
                              value={row.note || ''}
                              onChange={(e) => handleRowChange(row.id, 'note', e.target.value)}
                              style={{ flex: 1, padding: '0.3rem 0.5rem', border: '1px solid #d97706', borderRadius: '0.3rem', fontSize: '0.85rem', background: '#fff' }}
                            />
                          )}
                        </div>
                      </td>

                      <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.3rem' }}>
                          <input 
                            type="number" 
                            value={row.manualSumUAH !== undefined ? row.manualSumUAH : 0} 
                            onChange={(e) => handleRowChange(row.id, 'manualSumUAH', Number(e.target.value))}
                            style={{ width: '95px', padding: '0.3rem', border: '2px solid #f59e0b', borderRadius: '0.3rem', fontWeight: '900', color: '#92400e', textAlign: 'right', background: '#fff' }}
                          />
                          <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#92400e' }}>грн</span>
                        </div>
                      </td>

                      <td style={{ textAlign: 'center' }}>
                        <button onClick={() => handleDeleteRow(row.id)} style={{ background: 'none', border: 'none', color: '#f87171', fontSize: '1.25rem', cursor: 'pointer', fontWeight: 'bold' }}>×</button>
                      </td>
                    </tr>
                  );
                }

                const selectedShoe = shoesCatalog.find(s => s.id === row.shoeId) || defaultShoe;
                const qty = Number(row.quantity) || 0;
                const costUSD = Number(row.customCostUSD) || 0;
                const patternUAH = Number(row.patternCostUAH) || 0;

                const rowTotalUSD = qty * costUSD;
                const rowTotalUAH = (rowTotalUSD * Number(exchangeRate)) + patternUAH;

                return (
                  <tr key={row.id}>
                    <td style={{ textAlign: 'center', fontWeight: '600', color: '#9ca3af' }}>{index + 1}</td>
                    
                    <td>
                      <input 
                        type="text" 
                        value={row.date} 
                        placeholder="ДД.ММ" 
                        onChange={(e) => handleRowChange(row.id, 'date', e.target.value)}
                        className="input-field"
                      />
                    </td>

                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        {selectedShoe.photo ? (
                          <img src={selectedShoe.photo} alt="" style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '0.5rem', background: '#f3f4f6', border: '1px solid #e5e7eb', flexShrink: 0 }} />
                        ) : (
                          <div style={{ width: '40px', height: '40px', borderRadius: '0.5rem', background: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', color: '#6b7280', flexShrink: 0 }}>фото</div>
                        )}
                        <select 
                          value={row.shoeId} 
                          onChange={(e) => handleRowChange(row.id, 'shoeId', e.target.value)}
                          className="input-field"
                          style={{ fontWeight: '500' }}
                        >
                          {/* Показуємо тільки моделі цього виробника */}
                          {manufacturerShoes.map(shoe => (
                            <option key={shoe.id} value={shoe.id}>{shoe.name}</option>
                          ))}
                        </select>
                      </div>
                    </td>

                    <td style={{ textAlign: 'center' }}>
                      <input 
                        type="number" 
                        min="1" 
                        value={row.quantity} 
                        onChange={(e) => handleRowChange(row.id, 'quantity', Number(e.target.value))}
                        className="input-field"
                        style={{ textAlign: 'center', fontWeight: 'bold', color: '#4f46e5' }}
                      />
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <input 
                        type="number" 
                        value={row.customCostUSD} 
                        onChange={(e) => handleRowChange(row.id, 'customCostUSD', Number(e.target.value))}
                        className="input-field"
                        style={{ textAlign: 'right', fontWeight: '600' }}
                      />
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <input 
                        type="number" 
                        placeholder="0"
                        value={row.patternCostUAH || ''} 
                        onChange={(e) => handleRowChange(row.id, 'patternCostUAH', Number(e.target.value))}
                        className="input-field"
                        style={{ textAlign: 'right', fontWeight: '600', color: '#d97706' }}
                      />
                    </td>

                    <td style={{ textAlign: 'right', fontWeight: '600', color: '#6b7280' }}>
                      {exchangeRate}
                    </td>

                    <td style={{ textAlign: 'right', fontWeight: '700', color: '#111827' }}>
                      <span style={{ color: '#4f46e5', fontWeight: '800' }}>{rowTotalUAH.toFixed(0)} грн</span>
                      <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: '#9ca3af', display: 'block' }}>(${rowTotalUSD.toFixed(2)})</span>
                    </td>

                    <td style={{ textAlign: 'center' }}>
                      <button onClick={() => handleDeleteRow(row.id)} style={{ background: 'none', border: 'none', color: '#d1d5db', fontSize: '1.25rem', cursor: 'pointer', transition: 'color 0.2s' }} onMouseOver={(e) => e.target.style.color = '#ef4444'} onMouseOut={(e) => e.target.style.color = '#d1d5db'}>×</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* НИЖНЯ ПАНЕЛЬ */}
        <div style={{ padding: '1.25rem 1.5rem', background: '#f9fafb', borderTop: '1px solid #e5e7eb', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button onClick={handleAddRow} className="btn-primary">
              + Додати пару
            </button>
            <button onClick={handleAddSubtotal} className="btn-warning">
              + Проміжний підсумок
            </button>
          </div>

          <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', fontSize: '0.875rem', background: '#ffffff', padding: '0.75rem 1.25rem', borderRadius: '0.75rem', border: '1px solid #e5e7eb', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
            <div>Всього пар: <span style={{ fontWeight: '800', color: '#111827' }}>{totalPairs}</span></div>
            <div style={{ borderLeft: '1px solid #e5e7eb', paddingLeft: '1rem' }}>Сума в $: <span style={{ fontWeight: '800', color: '#111827' }}>${totalUSD.toFixed(2)}</span></div>
            <div style={{ borderLeft: '1px solid #e5e7eb', paddingLeft: '1rem', fontSize: '1rem' }}>Загалом у грн: <span style={{ fontWeight: '900', color: '#4f46e5' }}>{totalUAH.toFixed(0)} грн</span></div>
          </div>
        </div>

      </div>
    </div>
  );
}