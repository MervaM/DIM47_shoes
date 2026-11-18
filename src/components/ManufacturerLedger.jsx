import React, { useState, useRef } from 'react';

export default function ManufacturerLedger({ 
  manufacturerName, 
  paymentMode = 'prepaid', 
  rows, 
  setRows, 
  depositsList = [], 
  setDepositsList, 
  exchangeRate, 
  setExchangeRate, 
  initialDebt, 
  setInitialDebt,
  shoesCatalog = [] 
}) {
  
  const [activeRowForPicker, setActiveRowForPicker] = useState(null);
  const [newDepositDate, setNewDepositDate] = useState('');
  const [newDepositAmount, setNewDepositAmount] = useState('');
  const rowRefs = useRef({}); 
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
      paidAt: '', 
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

  const handleAddDeposit = () => {
    if (!newDepositAmount) return;
    const item = {
      id: Date.now(),
      date: newDepositDate || new Date().toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit' }),
      amount: Number(newDepositAmount) || 0
    };
    setDepositsList([...depositsList, item]);
    setNewDepositAmount('');
    setNewDepositDate('');
  };

  const handleDeleteDeposit = (id) => {
    setDepositsList(depositsList.filter(d => d.id !== id));
  };

  const handleRowChange = (id, field, value) => {
    setRows(rows.map(row => {
      if (row.id === id) {
        const updated = { ...row, [field]: value };
        
        if (field === 'shoeId' && value) {
          const found = shoesCatalog.find(s => s.id === value);
          if (found) {
            updated.customCostUSD = found.defaultCostUSD;
            updated.photo = found.photo || '';
          }
        }

        if (field === 'isPaid') {
          updated.paidAt = value 
            ? new Date().toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit', year: '2-digit' }) 
            : '';
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
  let shoesOnlyUAH = 0;  
  let totalPatternsUAH = 0; 
  let paidPairs = 0;
  let paidUAH = 0;    
  let unpaidUAH = 0;  

  const paidItemsList = [];
  const unpaidItemsList = [];

  rows.forEach(row => {
    if (row.type === 'item') {
      const qty = Number(row.quantity) || 0;
      const costUSD = Number(row.customCostUSD) || 0;
      const patternUAH = Number(row.patternCostUAH) || 0;
      const rRate = Number(row.rowRate) || 0;
      const isPaid = row.isPaid || false;

      totalPairs += qty;
      const rowUSD = qty * costUSD;
      const shoePartUAH = rowUSD * rRate;
      const rowFullUAH = shoePartUAH + patternUAH;

      totalUSD += rowUSD;
      shoesOnlyUAH += shoePartUAH;
      totalPatternsUAH += patternUAH;

      const shoeInfo = shoesCatalog.find(s => s.id === row.shoeId);
      const enrichedRow = {
        ...row,
        shoeName: shoeInfo ? shoeInfo.name : 'Без назви',
        shoeArticle: shoeInfo?.id || '',
        shoePartUAH,
        calculatedUAH: rowFullUAH,
        calculatedUSD: rowUSD
      };

      if (isPaid) {
        paidPairs += qty;
        paidUAH += rowFullUAH;
        paidItemsList.push(enrichedRow);
      } else {
        unpaidUAH += rowFullUAH;
        unpaidItemsList.push(enrichedRow);
      }
    } else if (row.type === 'subtotal') {
      const subVal = Number(row.manualSumUAH) || 0;
      unpaidUAH += subVal;
    }
  });

  const totalDepositsSum = depositsList.reduce((sum, d) => sum + Number(d.amount), 0);
  const totalUAH = shoesOnlyUAH + totalPatternsUAH;
  const remainingBalance = paymentMode === 'prepaid' 
    ? (totalDepositsSum > 0 ? totalDepositsSum - paidUAH : unpaidUAH) 
    : unpaidUAH;

  return (
    <div className="app-container" style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '100%', overflowX: 'hidden' }}>
      
      {/* МОДАЛЬНЕ ВІКНО ВИБОРУ МОДЕЛІ ЗА ФОТО */}
      {activeRowForPicker && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ background: '#fff', borderRadius: '1rem', padding: '1.25rem', maxWidth: '600px', width: '100%', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '800', margin: 0, color: '#111827' }}>Виберіть модель ({manufacturerName})</h3>
              <button onClick={() => setActiveRowForPicker(null)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', fontWeight: 'bold', cursor: 'pointer', color: '#6b7280' }}>×</button>
            </div>

            {manufacturerShoes.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#6b7280', padding: '2rem 0' }}>У каталозі немає моделей для цього виробника.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '0.75rem' }}>
                {manufacturerShoes.map(shoe => (
                  <div 
                    key={shoe.id} 
                    onClick={() => selectShoeFromPicker(shoe)}
                    style={{ border: '2px solid #e5e7eb', borderRadius: '0.75rem', padding: '0.4rem', cursor: 'pointer', textAlign: 'center', background: '#f9fafb' }}
                  >
                    <div style={{ width: '100%', height: '90px', borderRadius: '0.5rem', overflow: 'hidden', background: '#e5e7eb', marginBottom: '0.4rem' }}>
                      {shoe.photo ? (
                        <img src={shoe.photo} alt={shoe.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', color: '#6b7280' }}>немає фото</div>
                      )}
                    </div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{shoe.name}</div>
                    <div style={{ fontSize: '0.65rem', color: '#4f46e5', fontWeight: '700' }}>{shoe.id ? `арт: ${shoe.id}` : 'без арт.'}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ОСНОВНА КАРТКА ОБЛІКУ */}
      <div className="card" style={{ padding: '1rem' }}>
        
        {/* ШАПКА З АВАНСАМИ ТА ПІДСУМКАМИ */}
        <div className="header-box" style={{ padding: '0 0 1rem 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#4f46e5', textTransform: 'uppercase' }}>Виробник</span>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#111827', margin: '0.1rem 0 0 0' }}>{manufacturerName}</h2>
            </div>
            <span style={{ fontSize: '0.75rem', padding: '0.3rem 0.75rem', background: '#eef2ff', color: '#4f46e5', borderRadius: '9999px', fontWeight: 'bold' }}>
              {paymentMode === 'prepaid' ? '✨ По авансу' : '💼 Після видачі'}
            </span>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem', background: '#f9fafb', padding: '0.75rem', borderRadius: '0.75rem', border: '1px solid #e5e7eb' }}>
            
            {paymentMode === 'prepaid' && (
              <div style={{ background: '#ffffff', padding: '0.6rem', borderRadius: '0.5rem', border: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#16a34a' }}>💰 Аванси (з датами):</span>
                
                <div style={{ display: 'flex', gap: '0.3rem' }}>
                  <input 
                    type="text" 
                    placeholder="ДД.ММ" 
                    value={newDepositDate} 
                    onChange={(e) => setNewDepositDate(e.target.value)}
                    style={{ width: '65px', padding: '0.2rem 0.3rem', fontSize: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.3rem', textAlign: 'center' }}
                  />
                  <input 
                    type="number" 
                    placeholder="Сума грн" 
                    value={newDepositAmount} 
                    onChange={(e) => setNewDepositAmount(e.target.value)}
                    style={{ flex: 1, padding: '0.2rem 0.4rem', fontSize: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.3rem', fontWeight: 'bold' }}
                  />
                  <button 
                    type="button" 
                    onClick={handleAddDeposit}
                    style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '0.2rem 0.5rem', borderRadius: '0.3rem', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    +
                  </button>
                </div>

                {depositsList.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', maxHeight: '70px', overflowY: 'auto', marginTop: '0.2rem' }}>
                    {depositsList.map(dep => (
                      <div key={dep.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', background: '#f0fdf4', padding: '0.1rem 0.3rem', borderRadius: '0.25rem' }}>
                        <span>📅 {dep.date}: <strong>{dep.amount} грн</strong></span>
                        <button onClick={() => handleDeleteDeposit(dep.id)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontWeight: 'bold' }}>×</button>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ fontSize: '0.7rem', color: '#4b5563', fontWeight: '700', textAlign: 'right', borderTop: '1px dashed #e5e7eb', paddingTop: '0.2rem' }}>
                  Разом авансів: {totalDepositsSum} грн
                </div>
              </div>
            )}

            <div style={{ background: '#f0fdf4', padding: '0.6rem', borderRadius: '0.5rem', border: '1px solid #bbf7d0', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#16a34a' }}>Оплачено:</span>
              <span style={{ fontSize: '1.1rem', fontWeight: '900', color: '#15803d' }}>
                {paidUAH.toFixed(0)} грн
              </span>
            </div>

            <div style={{ background: '#f5f3ff', padding: '0.6rem', borderRadius: '0.5rem', border: '1px solid #ede9fe', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#4f46e5' }}>
                {totalDepositsSum > 0 ? 'Залишок авансу:' : 'Залишок / Борг:'}
              </span>
              <span style={{ fontSize: '1.1rem', fontWeight: '900', color: remainingBalance < 0 ? '#dc2626' : (remainingBalance === 0 ? '#16a34a' : '#312e81') }}>
                {remainingBalance.toFixed(0)} грн
              </span>
            </div>
          </div>
        </div>

        {/* ТАБЛИЧНИЙ ВИГЛЯД З ГАЛОЧКАМИ СПЕРЕДУ */}
        <div style={{ overflowX: 'auto', background: '#ffffff', borderRadius: '0.5rem', border: '1px solid #e5e7eb' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc', color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ padding: '0.6rem 0.5rem', textAlign: 'center', width: '50px' }}>✓</th>
                <th style={{ padding: '0.6rem 0.5rem', textAlign: 'center', width: '40px' }}>№</th>
                <th style={{ padding: '0.6rem 0.75rem', width: '90px' }}>Дата</th>
                <th style={{ padding: '0.6rem 0.75rem' }}>Модель / Артикул — Назва</th>
                <th style={{ padding: '0.6rem 0.75rem', textAlign: 'center', width: '60px' }}>К-ть</th>
                <th style={{ padding: '0.6rem 0.75rem', textAlign: 'right', width: '110px' }}>Долар ($)</th>
                <th style={{ padding: '0.6rem 0.75rem', textAlign: 'right', width: '80px' }}>Курс</th>
                <th style={{ padding: '0.6rem 0.75rem', textAlign: 'right', width: '120px' }}>Вартість в грн</th>
                <th style={{ padding: '0.6rem 0.5rem', width: '40px' }}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => {
                if (row.type === 'subtotal') {
                  const isCollapsed = row.isCollapsed || false;

                  return (
                    <tr key={row.id} style={{ background: '#fffbeb', borderBottom: '1px solid #fde68a' }}>
                      <td></td>
                      <td colSpan="6" style={{ padding: '0.6rem 0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <button 
                            onClick={() => handleRowChange(row.id, 'isCollapsed', !isCollapsed)}
                            style={{ background: '#f59e0b', color: '#fff', border: 'none', padding: '0.15rem 0.4rem', borderRadius: '0.3rem', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 'bold' }}
                          >
                            {isCollapsed ? '▶' : '▼'}
                          </button>
                          <span style={{ fontWeight: '700', color: '#92400e', fontSize: '0.8rem' }}>Підсумок:</span>
                          {!isCollapsed && (
                            <input 
                              type="text" 
                              placeholder="Опис / формула..."
                              value={row.note || ''}
                              onChange={(e) => handleRowChange(row.id, 'note', e.target.value)}
                              style={{ flex: 1, padding: '0.2rem 0.4rem', border: '1px solid #d97706', borderRadius: '0.3rem', fontSize: '0.8rem', background: '#fff' }}
                            />
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '0.6rem 0.75rem', textAlign: 'right' }}>
                        <input 
                          type="number" 
                          value={row.manualSumUAH !== undefined ? row.manualSumUAH : 0} 
                          onChange={(e) => handleRowChange(row.id, 'manualSumUAH', Number(e.target.value))}
                          style={{ width: '90px', padding: '0.25rem', border: '2px solid #f59e0b', borderRadius: '0.3rem', fontWeight: '900', color: '#92400e', textAlign: 'right', background: '#fff' }}
                        />
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button onClick={() => handleDeleteRow(row.id)} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '1.2rem', cursor: 'pointer', fontWeight: 'bold' }}>×</button>
                      </td>
                    </tr>
                  );
                }

                const qty = Number(row.quantity) || 0;
                const costUSD = Number(row.customCostUSD) || 0;
                const patternUAH = Number(row.patternCostUAH) || 0;
                const rRate = Number(row.rowRate) || 0;
                const isPaid = row.isPaid || false;
                
                const isEditing = row.isEditing !== undefined ? row.isEditing : !row.shoeId;
                const rowUSD = qty * costUSD;
                const shoePartUAH = rowUSD * rRate;
                const rowFullUAH = shoePartUAH + patternUAH;
                const shoeInfo = shoesCatalog.find(s => s.id === row.shoeId);
                const displayName = shoeInfo ? `${shoeInfo.id ? '[' + shoeInfo.id + '] ' : ''}${shoeInfo.name}` : 'Модель не вибрана';

                return (
                  <tr 
                    key={row.id} 
                    ref={el => rowRefs.current[row.id] = el}
                    style={{ 
                      background: isPaid ? '#f1f5f9' : '#ffffff', 
                      color: isPaid ? '#475569' : '#0f172a',
                      borderBottom: '1px solid #e2e8f0',
                      transition: 'background 0.2s'
                    }}
                  >
                    {!isEditing ? (
                      /* === ТАБЛИЧНИЙ РЯДОК ПЕРЕГЛЯДУ З ГАЛОЧКОЮ СПЕРЕДУ === */
                      <>
                        <td style={{ padding: '0.6rem 0.5rem', textAlign: 'center' }}>
                          <input 
                            type="checkbox"
                            checked={isPaid}
                            onChange={(e) => handleRowChange(row.id, 'isPaid', e.target.checked)}
                            style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#16a34a' }}
                            title="Позначити як оплачено"
                          />
                        </td>
                        <td style={{ padding: '0.6rem 0.5rem', textAlign: 'center', fontWeight: '700', color: '#94a3b8' }}>
                          {index + 1}
                        </td>
                        <td style={{ padding: '0.6rem 0.75rem', fontWeight: '600' }}>
                          {row.date || '—'}
                        </td>
                        <td style={{ padding: '0.6rem 0.75rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '0.3rem', overflow: 'hidden', background: '#e2e8f0', flexShrink: 0 }}>
                              {row.photo ? (
                                <img src={row.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : (
                                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.5rem', color: '#64748b' }}>фото</div>
                              )}
                            </div>
                            <span style={{ fontWeight: '700', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '260px' }}>
                              {displayName}
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: '0.6rem 0.75rem', textAlign: 'center', fontWeight: '700' }}>
                          {qty}
                        </td>
                        <td style={{ padding: '0.6rem 0.75rem', textAlign: 'right', fontWeight: '600' }}>
                          ${costUSD} {patternUAH > 0 ? `+${patternUAH}` : ''}
                        </td>
                        <td style={{ padding: '0.6rem 0.75rem', textAlign: 'right', fontWeight: '600', color: '#4f46e5' }}>
                          {rRate}
                        </td>
                        <td style={{ padding: '0.6rem 0.75rem', textAlign: 'right', fontWeight: '900', color: isPaid ? '#15803d' : '#0f172a' }}>
                          {rowFullUAH.toFixed(0)} грн {isPaid && '(оплачено)'}
                        </td>
                        <td style={{ padding: '0.6rem 0.5rem', textAlign: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.2rem' }}>
                            <button 
                              type="button"
                              onClick={() => handleRowChange(row.id, 'isEditing', true)}
                              style={{ background: 'none', border: 'none', color: '#4f46e5', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}
                              title="Редагувати"
                            >
                              ✎
                            </button>
                            <button onClick={() => handleDeleteRow(row.id)} style={{ background: 'none', border: 'none', color: '#cbd5e1', fontSize: '1.1rem', cursor: 'pointer' }} onMouseOver={(e) => e.target.style.color = '#ef4444'} onMouseOut={(e) => e.target.style.color = '#cbd5e1'}>×</button>
                          </div>
                        </td>
                      </>
                    ) : (
                      /* === РЕЖИМ РЕДАГУВАННЯ РЯДКА === */
                      <td colSpan="9" style={{ padding: '0.75rem', background: '#f8fafc' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#4f46e5' }}>✏️ Редагування позиції #{index + 1}</span>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <button type="button" onClick={() => handleRowChange(row.id, 'isEditing', false)} style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '0.2rem 0.6rem', borderRadius: '0.3rem', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer' }}>✓ Готово</button>
                              <button type="button" onClick={() => handleDeleteRow(row.id)} style={{ background: '#fee2e2', color: '#dc2626', border: 'none', padding: '0.2rem 0.4rem', borderRadius: '0.3rem', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer' }}>Видалити</button>
                            </div>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '80px 45px 1fr 60px 100px 80px 100px', gap: '0.5rem', alignItems: 'center' }}>
                            <input 
                              type="text" 
                              value={row.date} 
                              placeholder="ДД.ММ" 
                              onChange={(e) => handleRowChange(row.id, 'date', e.target.value)}
                              className="input-field"
                              style={{ textAlign: 'center', fontSize: '0.8rem', padding: '0.25rem' }}
                            />

                            <div 
                              onClick={() => setActiveRowForPicker(row.id)}
                              style={{ width: '35px', height: '35px', cursor: 'pointer', borderRadius: '0.3rem', border: '2px dashed #4f46e5', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f3ff' }}
                            >
                              {row.photo ? <img src={row.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '0.5rem', color: '#4f46e5' }}>фото</span>}
                            </div>

                            <select 
                              value={row.shoeId || ''} 
                              onChange={(e) => handleRowChange(row.id, 'shoeId', e.target.value)}
                              className="input-field"
                              style={{ fontSize: '0.8rem', padding: '0.25rem', fontWeight: '600' }}
                            >
                              <option value="">-- Виберіть модель --</option>
                              {manufacturerShoes.map(shoe => (
                                <option key={shoe.id} value={shoe.id}>
                                  {shoe.id ? `${shoe.id} — ` : ''} {shoe.name}
                                </option>
                              ))}
                            </select>

                            <input 
                              type="number" 
                              min="1" 
                              value={row.quantity} 
                              onChange={(e) => handleRowChange(row.id, 'quantity', Number(e.target.value))}
                              className="input-field"
                              style={{ textAlign: 'center', fontSize: '0.8rem', padding: '0.25rem' }}
                            />

                            <input 
                              type="number" 
                              step="0.01"
                              placeholder="Ціна $"
                              value={row.customCostUSD} 
                              onChange={(e) => handleRowChange(row.id, 'customCostUSD', Number(e.target.value))}
                              className="input-field"
                              style={{ textAlign: 'right', fontSize: '0.8rem', padding: '0.25rem' }}
                            />

                            <input 
                              type="number" 
                              step="0.01"
                              value={row.rowRate} 
                              onChange={(e) => handleRowChange(row.id, 'rowRate', Number(e.target.value))}
                              className="input-field"
                              style={{ textAlign: 'right', fontSize: '0.8rem', padding: '0.25rem', fontWeight: 'bold', color: '#4f46e5' }}
                            />

                            <input 
                              type="number" 
                              placeholder="Лекало грн"
                              value={row.patternCostUAH || ''} 
                              onChange={(e) => handleRowChange(row.id, 'patternCostUAH', Number(e.target.value))}
                              className="input-field"
                              style={{ textAlign: 'right', fontSize: '0.8rem', padding: '0.25rem', color: '#d97706' }}
                            />
                          </div>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>

            {/* РЯДОК ПІДСУМКІВ */}
            <tfoot>
              <tr style={{ background: '#f8fafc', borderTop: '2px solid #cbd5e1', fontWeight: '800' }}>
                <td colSpan="5" style={{ padding: '0.75rem 1rem', color: '#334155', textTransform: 'uppercase', fontSize: '0.8rem' }}>
                  РАЗОМ:
                </td>
                <td style={{ textAlign: 'center', padding: '0.75rem 0.5rem', color: '#0f172a' }}>
                  {totalPairs} шт
                </td>
                <td colSpan="2" style={{ textAlign: 'right', padding: '0.75rem 0.75rem', color: '#0f172a', fontSize: '0.9rem' }}>
                  ${totalUSD.toFixed(2)} {totalPatternsUAH > 0 ? `+ (${totalPatternsUAH} лекала)` : ''}
                </td>
                <td style={{ textAlign: 'right', padding: '0.75rem 1rem', fontSize: '1rem' }}>
                  <span style={{ color: unpaidUAH === 0 ? '#16a34a' : '#dc2626' }}>
                    {totalUAH.toFixed(0)} грн {paidUAH > 0 && `(оплачено ${paidUAH.toFixed(0)})`}
                  </span>
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* КНОПКИ КЕРУВАННЯ ВНИЗУ */}
        <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={handleAddRow} className="btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
              + Додати пару
            </button>
            <button onClick={handleAddSubtotal} className="btn-warning" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
              + Підсумок
            </button>
          </div>

          <button 
            type="button"
            onClick={() => {
              const nowStr = new Date().toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit', year: '2-digit' });
              setRows(rows.map(r => r.type === 'item' ? { ...r, isPaid: true, paidAt: nowStr } : r));
            }}
            style={{ 
              background: unpaidUAH === 0 ? '#16a34a' : '#4f46e5', 
              color: '#ffffff', 
              border: 'none',
              padding: '0.55rem 1.25rem', 
              borderRadius: '0.5rem', 
              cursor: 'pointer', 
              fontWeight: '900',
              fontSize: '0.9rem',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}
          >
            {shoesOnlyUAH.toFixed(0)} грн {unpaidUAH === 0 ? '✓ (оплачено)' : '• Оплатити всі'}
          </button>
        </div>

      </div>

      {/* НИЖНІЙ ЧЕК / РЕЄСТР ОПЛАЧЕНИХ ЗАМОВЛЕНЬ ( ТІЛЬКИ ДАТА ТА СУМА ) */}
      <div className="card" style={{ border: '2px solid #86efac', background: '#f0fdf4', padding: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <div>
            <span style={{ fontSize: '0.7rem', fontWeight: '800', color: '#16a34a', textTransform: 'uppercase' }}>
              🧾 Фінансовий чек
            </span>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '900', color: '#14532d', margin: 0 }}>
              Оплачені замовлення
            </h3>
          </div>

          <div style={{ background: '#16a34a', color: '#ffffff', padding: '0.4rem 0.85rem', borderRadius: '0.6rem', fontWeight: '900', fontSize: '0.95rem' }}>
            {paidUAH.toFixed(0)} грн ({paidPairs} пар)
          </div>
        </div>

        {paidItemsList.length === 0 ? (
          <div style={{ padding: '1.25rem', textAlign: 'center', color: '#15803d', fontSize: '0.85rem', background: '#ffffff', borderRadius: '0.5rem' }}>
            Ще немає оплачених позицій. Поставте галочку зліва у будь-якому рядку вище.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {paidItemsList.map((item) => (
              <div 
                key={item.id} 
                onClick={() => scrollToRow(item.id)}
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
                  📅 {item.date || '—'}
                </div>
                <div style={{ fontWeight: '900', color: '#16a34a', fontSize: '1rem' }}>
                  +{item.calculatedUAH.toFixed(0)} грн (оплачено)
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}