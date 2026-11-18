import React, { useState, useRef } from 'react';

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
      photo: '',
      isEditing: true // Новий рядок одразу відкритий для заповнення
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

  const handlePayAllUnpaid = () => {
    const nowStr = new Date().toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit', year: '2-digit' });
    setRows(rows.map(row => {
      if (row.type === 'item' && !row.isPaid) {
        return {
          ...row,
          isPaid: true,
          paidAt: nowStr,
          isEditing: false // Згортаємо в суцільний рядок при оплаті
        };
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

      if (isPaid) {
        paidPairs += qty;
        paidUAH += rowFullUAH;
        const shoeInfo = shoesCatalog.find(s => s.id === row.shoeId);
        paidItemsList.push({
          ...row,
          shoeName: shoeInfo ? shoeInfo.name : 'Без назви',
          shoeArticle: shoeInfo?.id || '',
          shoePartUAH,
          calculatedUAH: rowFullUAH,
          calculatedUSD: rowUSD
        });
      } else {
        unpaidUAH += rowFullUAH;
      }
    } else if (row.type === 'subtotal') {
      const subVal = Number(row.manualSumUAH) || 0;
      unpaidUAH += subVal;
    }
  });

  const totalUAH = shoesOnlyUAH + totalPatternsUAH;
  const effectiveDeposit = (Number(deposit) || 0) - (Number(initialDebt) || 0);
  const remainingBalance = paymentMode === 'prepaid' ? effectiveDeposit - paidUAH : unpaidUAH;

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
        
        {/* ШАПКА */}
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
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', background: '#f9fafb', padding: '0.75rem', borderRadius: '0.75rem', border: '1px solid #e5e7eb' }}>
            {paymentMode === 'prepaid' && (
              <>
                <div>
                  <span style={{ display: 'block', fontSize: '0.7rem', fontWeight: '600', color: '#6b7280', marginBottom: '0.25rem' }}>Борг (грн):</span>
                  <input 
                    type="number" 
                    value={initialDebt} 
                    onChange={(e) => setInitialDebt(Number(e.target.value))}
                    className="input-field"
                    style={{ fontWeight: 'bold', color: '#dc2626', textAlign: 'right', width: '100%' }}
                  />
                </div>
                <div>
                  <span style={{ display: 'block', fontSize: '0.7rem', fontWeight: '600', color: '#6b7280', marginBottom: '0.25rem' }}>Аванс (грн):</span>
                  <input 
                    type="number" 
                    value={deposit} 
                    onChange={(e) => setDeposit(Number(e.target.value))}
                    className="input-field"
                    style={{ fontWeight: 'bold', color: '#16a34a', textAlign: 'right', width: '100%' }}
                  />
                </div>
              </>
            )}

            <div style={{ background: '#f0fdf4', padding: '0.6rem', borderRadius: '0.5rem', border: '1px solid #bbf7d0', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#16a34a' }}>Оплачено:</span>
              <span style={{ fontSize: '1.1rem', fontWeight: '900', color: '#15803d' }}>
                {paidUAH.toFixed(0)} грн
              </span>
            </div>

            <div style={{ background: '#f5f3ff', padding: '0.6rem', borderRadius: '0.5rem', border: '1px solid #ede9fe', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#4f46e5' }}>
                {paymentMode === 'prepaid' ? 'Залишок / Борг:' : 'Не оплачено:'}
              </span>
              <span style={{ fontSize: '1.1rem', fontWeight: '900', color: unpaidUAH === 0 ? '#16a34a' : '#dc2626' }}>
                {unpaidUAH.toFixed(0)} грн
              </span>
            </div>
          </div>
        </div>

        {/* СПИСОК ПОЗИЦІЙ (АДАПТИВНИЙ ПІД ТЕЛЕФОН ТА ПК) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {rows.map((row, index) => {
            if (row.type === 'subtotal') {
              const isCollapsed = row.isCollapsed || false;

              return (
                <div key={row.id} style={{ background: '#fffbeb', border: '2px solid #fde68a', borderRadius: '0.75rem', padding: '0.75rem', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: '1 1 200px' }}>
                    <button 
                      onClick={() => handleRowChange(row.id, 'isCollapsed', !isCollapsed)}
                      style={{ background: '#f59e0b', color: '#fff', border: 'none', padding: '0.25rem 0.5rem', borderRadius: '0.3rem', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 'bold' }}
                    >
                      {isCollapsed ? '▶' : '▼'}
                    </button>
                    <span style={{ fontWeight: '700', color: '#92400e', fontSize: '0.85rem' }}>Підсумок:</span>
                    {!isCollapsed && (
                      <input 
                        type="text" 
                        placeholder="Опис / формула..."
                        value={row.note || ''}
                        onChange={(e) => handleRowChange(row.id, 'note', e.target.value)}
                        style={{ flex: 1, minWidth: '100px', padding: '0.25rem 0.5rem', border: '1px solid #d97706', borderRadius: '0.3rem', fontSize: '0.8rem', background: '#fff' }}
                      />
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <input 
                      type="number" 
                      value={row.manualSumUAH !== undefined ? row.manualSumUAH : 0} 
                      onChange={(e) => handleRowChange(row.id, 'manualSumUAH', Number(e.target.value))}
                      style={{ width: '80px', padding: '0.25rem', border: '2px solid #f59e0b', borderRadius: '0.3rem', fontWeight: '900', color: '#92400e', textAlign: 'right', background: '#fff', fontSize: '0.85rem' }}
                    />
                    <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#92400e' }}>грн</span>
                    <button onClick={() => handleDeleteRow(row.id)} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '1.2rem', cursor: 'pointer', fontWeight: 'bold', padding: '0 0.25rem' }}>×</button>
                  </div>
                </div>
              );
            }

            const qty = Number(row.quantity) || 0;
            const costUSD = Number(row.customCostUSD) || 0;
            const patternUAH = Number(row.patternCostUAH) || 0;
            const rRate = Number(row.rowRate) || 0;
            const isPaid = row.isPaid || false;
            
            // Якщо модель вже вибрана і explicitly не натиснули редагування — показуємо суцільним рядком
            const isEditing = row.isEditing !== undefined ? row.isEditing : !row.shoeId;

            const rowUSD = qty * costUSD;
            const shoePartUAH = rowUSD * rRate;
            const shoeInfo = shoesCatalog.find(s => s.id === row.shoeId);
            const displayName = shoeInfo ? `${shoeInfo.id ? shoeInfo.id + ' — ' : ''}${shoeInfo.name}` : 'Модель не вибрана';

            return (
              <div 
                key={row.id} 
                ref={el => rowRefs.current[row.id] = el}
                style={{ 
                  border: '1px solid ' + (isPaid ? '#bbf7d0' : '#e5e7eb'),
                  background: isPaid ? '#f3f4f6' : '#ffffff', 
                  borderRadius: '0.75rem',
                  padding: '0.75rem',
                  transition: 'all 0.2s',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                }}
              >
                {!isEditing ? (
                  /* === КОМПАКТНИЙ СУЦІЛЬНИЙ РЯДОК (ДЛЯ ТЕЛЕФОНУ ТА ЧИСТОГО ПЕРЕГЛЯДУ) === */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    
                    {/* Верхня лінія: №, Дата, Статус оплати, Кнопки редагування та видалення */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#9ca3af' }}>#{index + 1}</span>
                        {row.date && (
                          <span style={{ fontSize: '0.75rem', fontWeight: '700', background: '#f3f4f6', padding: '0.15rem 0.45rem', borderRadius: '0.35rem', color: '#374151' }}>
                            📅 {row.date}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRowChange(row.id, 'isPaid', !isPaid)}
                          style={{
                            padding: '0.2rem 0.55rem',
                            borderRadius: '0.4rem',
                            border: 'none',
                            fontWeight: 'bold',
                            fontSize: '0.7rem',
                            cursor: 'pointer',
                            background: isPaid ? '#16a34a' : '#fee2e2',
                            color: isPaid ? '#ffffff' : '#b91c1c'
                          }}
                        >
                          {isPaid ? '✅ Оплачено' : '⏳ Не плачено'}
                        </button>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <button 
                          type="button"
                          onClick={() => handleRowChange(row.id, 'isEditing', true)}
                          style={{ background: '#eef2ff', color: '#4f46e5', border: 'none', padding: '0.25rem 0.55rem', borderRadius: '0.4rem', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer' }}
                          title="Редагувати рядок"
                        >
                          ✎ Змінити
                        </button>
                        <button 
                          type="button"
                          onClick={() => handleDeleteRow(row.id)} 
                          style={{ background: 'none', border: 'none', color: '#9ca3af', fontSize: '1.15rem', cursor: 'pointer', padding: '0 0.2rem' }}
                        >
                          ×
                        </button>
                      </div>
                    </div>

                    {/* Середня лінія: Фото + Артикул та Назва */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', opacity: isPaid ? 0.75 : 1 }}>
                      <div style={{ width: '44px', height: '44px', borderRadius: '0.5rem', overflow: 'hidden', background: '#f3f4f6', flexShrink: 0, border: '1px solid #e5e7eb' }}>
                        {row.photo ? (
                          <img src={row.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', color: '#9ca3af' }}>фото</div>
                        )}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: '800', fontSize: '0.9rem', color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {displayName}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#4b5563', marginTop: '0.15rem' }}>
                          <strong>{qty} шт.</strong> × ${costUSD} <span style={{ color: '#9ca3af' }}>|</span> Курс: <strong>{rRate}</strong>
                          {patternUAH > 0 && <span style={{ color: '#d97706', fontWeight: '700' }}> + {patternUAH} грн лекало</span>}
                        </div>
                      </div>

                      {/* Права частина: Сума */}
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontWeight: '900', fontSize: '0.95rem', color: isPaid ? '#16a34a' : '#4f46e5' }}>
                          {shoePartUAH.toFixed(0)} грн {isPaid && '✓'}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#6b7280', fontWeight: '600' }}>
                          (${rowUSD.toFixed(2)})
                        </div>
                      </div>
                    </div>

                  </div>
                ) : (
                  /* === РЕЖИМ РЕДАГУВАННЯ (ПОЛЯ ВВОДУ) === */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f3f4f6', paddingBottom: '0.4rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#4f46e5' }}>✏️ Редагування позиції #{index + 1}</span>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button 
                          type="button"
                          onClick={() => handleRowChange(row.id, 'isEditing', false)}
                          style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '0.25rem 0.75rem', borderRadius: '0.4rem', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer' }}
                        >
                          ✓ Готово
                        </button>
                        <button 
                          type="button"
                          onClick={() => handleDeleteRow(row.id)}
                          style={{ background: '#fee2e2', color: '#dc2626', border: 'none', padding: '0.25rem 0.5rem', borderRadius: '0.4rem', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer' }}
                        >
                          Видалити
                        </button>
                      </div>
                    </div>

                    {/* Ряд 1: Дата + Модель за фото */}
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <input 
                        type="text" 
                        value={row.date} 
                        placeholder="ДД.ММ" 
                        onChange={(e) => handleRowChange(row.id, 'date', e.target.value)}
                        className="input-field"
                        style={{ width: '75px', textAlign: 'center', fontSize: '0.8rem' }}
                      />

                      <div 
                        onClick={() => setActiveRowForPicker(row.id)}
                        style={{ width: '40px', height: '40px', flexShrink: 0, cursor: 'pointer', borderRadius: '0.5rem', border: '2px dashed #4f46e5', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f3ff' }}
                        title="Натисніть, щоб вибрати за фото"
                      >
                        {row.photo ? (
                          <img src={row.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <span style={{ fontSize: '0.55rem', fontWeight: 'bold', color: '#4f46e5' }}>фото</span>
                        )}
                      </div>

                      <select 
                        value={row.shoeId || ''} 
                        onChange={(e) => handleRowChange(row.id, 'shoeId', e.target.value)}
                        className="input-field"
                        style={{ fontWeight: '600', fontSize: '0.8rem', flex: 1, minWidth: 0 }}
                      >
                        <option value="">-- Виберіть модель --</option>
                        {manufacturerShoes.map(shoe => (
                          <option key={shoe.id} value={shoe.id}>
                            {shoe.id ? `${shoe.id} — ` : 'без арт. — '} {shoe.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Ряд 2: Кількість, Ціна ($), Лекало (грн), Курс */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
                      <div>
                        <label style={{ fontSize: '0.65rem', color: '#6b7280', display: 'block', fontWeight: 'bold' }}>К-ть</label>
                        <input 
                          type="number" 
                          min="1" 
                          value={row.quantity} 
                          onChange={(e) => handleRowChange(row.id, 'quantity', Number(e.target.value))}
                          className="input-field"
                          style={{ width: '100%', textAlign: 'center', fontWeight: 'bold', padding: '0.3rem' }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: '0.65rem', color: '#6b7280', display: 'block', fontWeight: 'bold' }}>Ціна ($)</label>
                        <input 
                          type="number" 
                          step="0.01"
                          placeholder="0"
                          value={row.customCostUSD} 
                          onChange={(e) => handleRowChange(row.id, 'customCostUSD', Number(e.target.value))}
                          className="input-field"
                          style={{ width: '100%', textAlign: 'right', padding: '0.3rem' }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: '0.65rem', color: '#d97706', display: 'block', fontWeight: 'bold' }}>Лекало</label>
                        <input 
                          type="number" 
                          placeholder="0"
                          value={row.patternCostUAH || ''} 
                          onChange={(e) => handleRowChange(row.id, 'patternCostUAH', Number(e.target.value))}
                          className="input-field"
                          style={{ width: '100%', textAlign: 'right', color: '#d97706', padding: '0.3rem' }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: '0.65rem', color: '#4f46e5', display: 'block', fontWeight: 'bold' }}>Курс</label>
                        <input 
                          type="number" 
                          step="0.01"
                          value={row.rowRate !== undefined ? row.rowRate : ''} 
                          onChange={(e) => handleRowChange(row.id, 'rowRate', Number(e.target.value))}
                          className="input-field"
                          style={{ width: '100%', textAlign: 'right', fontWeight: 'bold', color: '#4f46e5', padding: '0.3rem' }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ПІДСУМКОВИЙ БЛОК ПІД СПИСКОМ (ЗАВЖДИ ВИДНИЙ НА ТЕЛЕФОНІ) */}
        <div style={{ marginTop: '1.25rem', background: '#f8fafc', border: '2px solid #e2e8f0', borderRadius: '0.75rem', padding: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', textAlign: 'center' }}>
            <div style={{ background: '#fff', padding: '0.4rem', borderRadius: '0.5rem', border: '1px solid #e5e7eb' }}>
              <span style={{ fontSize: '0.65rem', color: '#64748b', display: 'block', fontWeight: 'bold' }}>ВСЬОГО ПАР</span>
              <span style={{ fontSize: '0.95rem', fontWeight: '900', color: '#0f172a' }}>{totalPairs} шт</span>
            </div>
            <div style={{ background: '#fff', padding: '0.4rem', borderRadius: '0.5rem', border: '1px solid #e5e7eb' }}>
              <span style={{ fontSize: '0.65rem', color: '#64748b', display: 'block', fontWeight: 'bold' }}>СУМА В $</span>
              <span style={{ fontSize: '0.95rem', fontWeight: '900', color: '#0f172a' }}>${totalUSD.toFixed(2)}</span>
            </div>
            <div style={{ background: '#fff', padding: '0.4rem', borderRadius: '0.5rem', border: '1px solid #e5e7eb' }}>
              <span style={{ fontSize: '0.65rem', color: '#d97706', display: 'block', fontWeight: 'bold' }}>ЛЕКАЛА</span>
              <span style={{ fontSize: '0.95rem', fontWeight: '900', color: '#d97706' }}>{totalPatternsUAH.toFixed(0)} грн</span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={handleAddRow} className="btn-primary" style={{ padding: '0.5rem 0.85rem', fontSize: '0.8rem' }}>
                + Додати пару
              </button>
              <button onClick={handleAddSubtotal} className="btn-warning" style={{ padding: '0.5rem 0.85rem', fontSize: '0.8rem' }}>
                + Підсумок
              </button>
            </div>

            <button 
              type="button"
              onClick={handlePayAllUnpaid}
              style={{ 
                background: unpaidUAH === 0 ? '#16a34a' : '#4f46e5', 
                color: '#ffffff', 
                border: 'none',
                padding: '0.55rem 1rem', 
                borderRadius: '0.6rem', 
                cursor: 'pointer', 
                fontWeight: '900',
                fontSize: '0.9rem',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
            >
              {shoesOnlyUAH.toFixed(0)} грн {unpaidUAH === 0 ? '✓ Оплачено' : '• Оплатити'}
            </button>
          </div>
        </div>

      </div>

      {/* НИЖНІЙ ЧЕК / РЕЄСТР ОПЛАЧЕНИХ ПАРТІЙ */}
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
            Натисніть кнопку суми вгорі, щоб оплатити партію й перенести в чек.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {paidItemsList.map((item) => (
              <div 
                key={item.id} 
                onClick={() => scrollToRow(item.id)}
                style={{ background: '#ffffff', padding: '0.6rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #bbf7d0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: '800', color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.date && <span style={{ color: '#6b7280', marginRight: '0.3rem' }}>{item.date}</span>}
                    {item.shoeArticle && <span style={{ color: '#4f46e5', marginRight: '0.3rem' }}>[{item.shoeArticle}]</span>}
                    {item.shoeName}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#4b5563' }}>
                    {item.quantity} шт. × ${item.customCostUSD} (курс {item.rowRate})
                    {item.patternCostUAH > 0 && <span style={{ color: '#d97706' }}> + {item.patternCostUAH} лекало</span>}
                  </div>
                </div>
                <div style={{ fontWeight: '900', color: '#16a34a', fontSize: '0.9rem', flexShrink: 0 }}>
                  +{item.calculatedUAH.toFixed(0)} грн
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}