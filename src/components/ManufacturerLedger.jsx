import React, { useState } from 'react';

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
  shoesCatalog = [] 
}) {
  
  const [activeRowForPicker, setActiveRowForPicker] = useState(null);
  const manufacturerShoes = shoesCatalog.filter(shoe => (shoe.manufacturer || 'Міла') === manufacturerName);

  const handleAddRow = () => {
    setRows([...rows, { 
      id: Date.now(), 
      type: 'item', 
      date: '', 
      shoeId: '',         
      quantity: 1, 
      customCostUSD: '',  
      patternCostUAH: 0,
      rowRate: exchangeRate || 45.0, 
      isPaid: false, 
      photo: ''           
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
        
        // Коли вибираємо з випадаючого списку — підтягуємо ціну та фото
        if (field === 'shoeId' && value) {
          const found = shoesCatalog.find(s => s.id === value);
          if (found) {
            updated.customCostUSD = found.defaultCostUSD;
            updated.photo = found.photo || '';
          }
        }
        return updated;
      }
      return row;
    }));
  };

  const selectShoeFromPicker = (shoe) => {
    if (!activeRowForPicker) return;
    setRows(rows.map(row => {
      if (row.id === activeRowForPicker) {
        return {
          ...row,
          shoeId: shoe.id,
          customCostUSD: shoe.defaultCostUSD,
          photo: shoe.photo || ''
        };
      }
      return row;
    }));
    setActiveRowForPicker(null);
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
      const rRate = Number(row.rowRate) || 0;

      totalPairs += qty;
      const uah = (qty * costUSD * rRate) + patternUAH;
      totalUSD += qty * costUSD;
      totalUAH += uah;
    } else if (row.type === 'subtotal') {
      totalUAH += Number(row.manualSumUAH) || 0;
    }
  });

  const effectiveDeposit = (Number(deposit) || 0) - (Number(initialDebt) || 0);
  const remainingBalance = paymentMode === 'prepaid' ? totalUAH - effectiveDeposit : totalUAH;

  return (
    <div className="app-container" style={{ position: 'relative' }}>
      
      {/* МОДАЛЬНЕ ВІКНО ВИБОРУ МОДЕЛІ ЗА ФОТО */}
      {activeRowForPicker && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ background: '#fff', borderRadius: '1rem', padding: '1.5rem', maxWidth: '600px', width: '100%', maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '800', margin: 0, color: '#111827' }}>Виберіть модель за фото ({manufacturerName})</h3>
              <button onClick={() => setActiveRowForPicker(null)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', fontWeight: 'bold', cursor: 'pointer', color: '#6b7280' }}>×</button>
            </div>

            {manufacturerShoes.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#6b7280', padding: '2rem 0' }}>У каталозі немає моделей для цього виробника.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '1rem' }}>
                {manufacturerShoes.map(shoe => (
                  <div 
                    key={shoe.id} 
                    onClick={() => selectShoeFromPicker(shoe)}
                    style={{ border: '2px solid #e5e7eb', borderRadius: '0.75rem', padding: '0.5rem', cursor: 'pointer', textAlign: 'center', background: '#f9fafb', transition: 'all 0.2s' }}
                    onMouseOver={(e) => e.currentTarget.style.borderColor = '#4f46e5'}
                    onMouseOut={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}
                  >
                    <div style={{ width: '100%', height: '110px', borderRadius: '0.5rem', overflow: 'hidden', background: '#e5e7eb', marginBottom: '0.5rem' }}>
                      {shoe.photo ? (
                        <img src={shoe.photo} alt={shoe.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', color: '#6b7280' }}>немає фото</div>
                      )}
                    </div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{shoe.name}</div>
                    <div style={{ fontSize: '0.7rem', color: '#4f46e5', fontWeight: '700' }}>{shoe.id ? `арт: ${shoe.id}` : 'без арт.'}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

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
                <th style={{ width: '40px', textAlign: 'center' }}>№</th>
                <th style={{ width: '50px', textAlign: 'center' }} title="Статус оплати">✓</th>
                <th style={{ width: '90px' }}>Дата</th>
                <th>Фото + Артикул — Назва</th>
                <th style={{ width: '65px', textAlign: 'center' }}>К-ть</th>
                <th style={{ width: '90px', textAlign: 'right' }}>Ціна ($)</th>
                <th style={{ width: '90px', textAlign: 'right' }}>Лекало (грн)</th>
                <th style={{ width: '90px', textAlign: 'right' }}>Курс</th>
                <th style={{ width: '120px', textAlign: 'right' }}>Сума (грн)</th>
                <th style={{ width: '40px', textAlign: 'center' }}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => {
                if (row.type === 'subtotal') {
                  const isCollapsed = row.isCollapsed || false;

                  return (
                    <tr key={row.id} style={{ background: '#fffbeb', borderTop: '2px solid #fde68a', borderBottom: '2px solid #fde68a' }}>
                      <td colSpan="8" style={{ padding: '0.75rem 1rem' }}>
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
                            style={{ width: '90px', padding: '0.3rem', border: '2px solid #f59e0b', borderRadius: '0.3rem', fontWeight: '900', color: '#92400e', textAlign: 'right', background: '#fff' }}
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

                const qty = Number(row.quantity) || 0;
                const costUSD = Number(row.customCostUSD) || 0;
                const patternUAH = Number(row.patternCostUAH) || 0;
                const rRate = Number(row.rowRate) || 0;
                const isPaid = row.isPaid || false;

                const rowTotalUSD = qty * costUSD;
                const rowTotalUAH = (rowTotalUSD * rRate) + patternUAH;

                return (
                  <tr 
                    key={row.id} 
                    style={{ 
                      background: isPaid ? '#f3f4f6' : 'transparent', 
                      color: isPaid ? '#4b5563' : 'inherit',
                      transition: 'background 0.2s'
                    }}
                  >
                    <td style={{ textAlign: 'center', fontWeight: '600', color: '#9ca3af' }}>{index + 1}</td>
                    
                    <td style={{ textAlign: 'center' }}>
                      <input 
                        type="checkbox" 
                        checked={isPaid}
                        onChange={(e) => handleRowChange(row.id, 'isPaid', e.target.checked)}
                        style={{ width: '18px', height: '18px', accentColor: '#16a34a', cursor: 'pointer' }}
                        title="Позначити як оплачено"
                      />
                    </td>

                    <td>
                      <input 
                        type="text" 
                        value={row.date} 
                        placeholder="ДД.ММ" 
                        onChange={(e) => handleRowChange(row.id, 'date', e.target.value)}
                        className="input-field"
                        style={{ opacity: isPaid ? 0.7 : 1 }}
                      />
                    </td>

                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', opacity: isPaid ? 0.7 : 1 }}>
                        
                        {/* КЛІК НА ФОТО ВІДКРИВАЄ КАТАЛОГ */}
                        <div 
                          onClick={() => setActiveRowForPicker(row.id)}
                          style={{ position: 'relative', width: '42px', height: '42px', flexShrink: '0', cursor: 'pointer', borderRadius: '0.5rem', border: '2px dashed #4f46e5', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f3ff' }}
                          title="Натисніть, щоб вибрати модель за фото"
                        >
                          {row.photo ? (
                            <img src={row.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <span style={{ fontSize: '0.55rem', fontWeight: 'bold', color: '#4f46e5' }}>фото</span>
                          )}
                        </div>

                        {/* Випадаючий список: спочатку Артикул, потім Назва */}
                        <div style={{ flex: 1 }}>
                          <select 
                            value={row.shoeId || ''} 
                            onChange={(e) => handleRowChange(row.id, 'shoeId', e.target.value)}
                            className="input-field"
                            style={{ fontWeight: '600', fontSize: '0.85rem', width: '100%' }}
                          >
                            <option value="">-- Виберіть модель --</option>
                            {manufacturerShoes.map(shoe => (
                              <option key={shoe.id} value={shoe.id}>
                                {shoe.id ? `${shoe.id} — ` : 'без арт. — '} {shoe.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </td>

                    <td style={{ textAlign: 'center' }}>
                      <input 
                        type="number" 
                        min="1" 
                        value={row.quantity} 
                        onChange={(e) => handleRowChange(row.id, 'quantity', Number(e.target.value))}
                        className="input-field"
                        style={{ textAlign: 'center', fontWeight: 'bold', color: isPaid ? '#4b5563' : '#4f46e5' }}
                      />
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <input 
                        type="number" 
                        step="0.01"
                        placeholder="0"
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

                    <td style={{ textAlign: 'right' }}>
                      <input 
                        type="number" 
                        step="0.01"
                        value={row.rowRate !== undefined ? row.rowRate : ''} 
                        onChange={(e) => handleRowChange(row.id, 'rowRate', Number(e.target.value))}
                        className="input-field"
                        style={{ textAlign: 'right', fontWeight: 'bold', color: '#4f46e5' }}
                      />
                    </td>

                    <td style={{ textAlign: 'right', fontWeight: '700' }}>
                      <span style={{ color: isPaid ? '#16a34a' : '#4f46e5', fontWeight: '800' }}>
                        {rowTotalUAH.toFixed(0)} грн {isPaid && '✓'}
                      </span>
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