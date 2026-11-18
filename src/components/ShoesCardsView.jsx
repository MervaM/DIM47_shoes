import React, { useState } from 'react';

export default function ShoesCardsView({ exchangeRate = 45 }) {
  // Список моделей тепер можна доповнювати самостійно
  const [shoes, setShoes] = useState([
    { id: 'b35', name: 'Б35 (шкіра/замша)', defaultCostUSD: 35, retailPriceUSD: 63, photo: '' },
    { id: 'moli', name: 'Молі', defaultCostUSD: 33, retailPriceUSD: 59.4, photo: '' },
    { id: 'y14', name: 'Y14', defaultCostUSD: 45, retailPriceUSD: 81, photo: '' }
  ]);

  // Стан для форми додавання нової моделі
  const [isAdding, setIsAdding] = useState(false);
  const [newShoe, setNewShoe] = useState({
    id: '',
    name: '',
    defaultCostUSD: '',
    retailPriceUSD: '',
    photo: ''
  });

  const handleAddShoe = (e) => {
    e.preventDefault();
    if (!newShoe.name || !newShoe.id) return;

    setShoes([...shoes, {
      ...newShoe,
      defaultCostUSD: Number(newShoe.defaultCostUSD) || 0,
      retailPriceUSD: Number(newShoe.retailPriceUSD) || 0
    }]);

    // Очищуємо форму і закриваємо її
    setNewShoe({ id: '', name: '', defaultCostUSD: '', retailPriceUSD: '', photo: '' });
    setIsAdding(false);
  };

  const handleDeleteShoe = (id) => {
    setShoes(shoes.filter(shoe => shoe.id !== id));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Шапка розділу з кнопкою додавання */}
      <div className="card" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#4f46e5', textTransform: 'uppercase' }}>
            Каталог продукції DIM47
          </span>
          <h2 style={{ fontSize: '1.75rem', fontWeight: '800', color: '#111827', margin: '0.2rem 0 0.5rem 0' }}>
            Моделі взуття та ціни
          </h2>
          <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
            Керування моделями, собівартість та ціни продажу (курс: {exchangeRate} грн/$)
          </p>
        </div>

        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="btn-primary"
          style={{ background: '#4f46e5', color: '#fff', padding: '0.6rem 1.25rem', borderRadius: '0.75rem', fontWeight: '700', border: 'none', cursor: 'pointer' }}
        >
          {isAdding ? 'Скасувати' : '+ Додати модель'}
        </button>
      </div>

      {/* Форма додавання нової моделі (з'являється при натисканні) */}
      {isAdding && (
        <form onSubmit={handleAddShoe} className="card" style={{ padding: '1.5rem', background: '#f9fafb', display: 'flex', flexDirection: 'column', gap: '1rem', border: '2px dashed #4f46e5' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: '800', color: '#111827', margin: 0 }}>
            ➕ Створити нову модель взуття
          </h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#4b5563', display: 'block', marginBottom: '0.25rem' }}>Артикул / ID</label>
              <input 
                type="text" 
                placeholder="напр. b36" 
                value={newShoe.id} 
                onChange={(e) => setNewShoe({...newShoe, id: e.target.value})}
                className="input-field"
                required
              />
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#4b5563', display: 'block', marginBottom: '0.25rem' }}>Назва моделі</label>
              <input 
                type="text" 
                placeholder="напр. Лофери класичні" 
                value={newShoe.name} 
                onChange={(e) => setNewShoe({...newShoe, name: e.target.value})}
                className="input-field"
                required
              />
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#4b5563', display: 'block', marginBottom: '0.25rem' }}>Собівартість ($)</label>
              <input 
                type="number" 
                step="0.01"
                placeholder="35" 
                value={newShoe.defaultCostUSD} 
                onChange={(e) => setNewShoe({...newShoe, defaultCostUSD: e.target.value})}
                className="input-field"
                required
              />
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#4b5563', display: 'block', marginBottom: '0.25rem' }}>Ціна продажу ($)</label>
              <input 
                type="number" 
                step="0.01"
                placeholder="70" 
                value={newShoe.retailPriceUSD} 
                onChange={(e) => setNewShoe({...newShoe, retailPriceUSD: e.target.value})}
                className="input-field"
                required
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#4b5563', display: 'block', marginBottom: '0.25rem' }}>Посилання на фото (необов'язково)</label>
            <input 
              type="text" 
              placeholder="https://..." 
              value={newShoe.photo} 
              onChange={(e) => setNewShoe({...newShoe, photo: e.target.value})}
              className="input-field"
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button 
              type="button" 
              onClick={() => setIsAdding(false)}
              style={{ background: '#e5e7eb', color: '#374151', padding: '0.5rem 1rem', borderRadius: '0.5rem', border: 'none', fontWeight: '600', cursor: 'pointer' }}
            >
              Скасувати
            </button>
            <button 
              type="submit"
              style={{ background: '#16a34a', color: '#fff', padding: '0.5rem 1.25rem', borderRadius: '0.5rem', border: 'none', fontWeight: '700', cursor: 'pointer' }}
            >
              Зберегти модель
            </button>
          </div>
        </form>
      )}

      {/* Сітка карток взуття */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
        {shoes.map(shoe => {
          const costUSD = Number(shoe.defaultCostUSD) || 0;
          const costUAH = costUSD * exchangeRate;
          const retailUSD = Number(shoe.retailPriceUSD) || 0;
          const retailUAH = retailUSD * exchangeRate;

          return (
            <div key={shoe.id} className="card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
              
              {/* Кнопка видалення картки */}
              <button 
                onClick={() => handleDeleteShoe(shoe.id)}
                title="Видалити модель"
                style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', width: '28px', height: '28px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', zIndex: 2 }}
              >
                ×
              </button>

              {/* Фото моделі */}
              <div style={{ width: '100%', height: '180px', background: '#f3f4f6', borderBottom: '1px solid #e5e7eb', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {shoe.photo ? (
                  <img src={shoe.photo} alt={shoe.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ color: '#9ca3af', fontSize: '0.85rem', fontWeight: '600' }}>📷 Немає фото</span>
                )}
              </div>

              {/* Інформація */}
              <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1, justifyContent: 'space-between' }}>
                <div>
                  <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#9ca3af', textTransform: 'uppercase' }}>
                    Артикул: {shoe.id}
                  </span>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: '800', color: '#111827', margin: '0.2rem 0 0 0' }}>
                    {shoe.name}
                  </h3>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', background: '#f9fafb', padding: '0.75rem', borderRadius: '0.75rem', border: '1px solid #e5e7eb' }}>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: '#6b7280', display: 'block', fontWeight: '600' }}>Вартість ($):</span>
                    <span style={{ fontSize: '1rem', fontWeight: '800', color: '#4f46e5' }}>${costUSD.toFixed(2)}</span>
                    <span style={{ fontSize: '0.7rem', color: '#9ca3af', display: 'block' }}>({costUAH.toFixed(0)} грн)</span>
                  </div>

                  <div>
                    <span style={{ fontSize: '0.7rem', color: '#6b7280', display: 'block', fontWeight: '600' }}>Ціна продажу:</span>
                    <span style={{ fontSize: '1rem', fontWeight: '800', color: '#16a34a' }}>${retailUSD.toFixed(2)}</span>
                    <span style={{ fontSize: '0.7rem', color: '#9ca3af', display: 'block' }}>({retailUAH.toFixed(0)} грн)</span>
                  </div>
                </div>
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
}