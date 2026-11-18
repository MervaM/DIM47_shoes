import React from 'react';
import { shoesCatalog } from '../data/shoesCatalog';

export default function ShoesCardsView({ exchangeRate = 45 }) {
  return (
    <div className="app-container" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Шапка розділу */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#4f46e5', textTransform: 'uppercase' }}>
          Каталог продукції DIM47
        </span>
        <h2 style={{ fontSize: '1.75rem', fontWeight: '800', color: '#111827', margin: '0.2rem 0 0.5rem 0' }}>
          Моделі взуття та ціни
        </h2>
        <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
          Актуальний каталог моделей із собівартістю у виробництві та розрахунковою вартістю продажу (курс: {exchangeRate} грн/$)
        </p>
      </div>

      {/* Сітка карток взуття */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
        {shoesCatalog.map(shoe => {
          // Розрахунок орієнтовної вартості продажу (наприклад, з націнкою або фіксована, якщо є в каталозі)
          // Можеш замінити логіку на своє поле, наприклад shoe.retailPriceUSD
          const costUSD = shoe.defaultCostUSD;
          const costUAH = costUSD * exchangeRate;
          const suggestedRetailUSD = costUSD * 1.8; // приклад націнки чи роздрібної ціни
          const suggestedRetailUAH = suggestedRetailUSD * exchangeRate;

          return (
            <div key={shoe.id} className="card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              
              {/* Фото моделі */}
              <div style={{ width: '100%', height: '200px', background: '#f3f4f6', borderBottom: '1px solid #e5e7eb', overflow: 'hidden' }}>
                <img 
                  src={shoe.photo} 
                  alt={shoe.name} 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                />
              </div>

              {/* Інформація */}
              <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1, justifyContent: 'space-between' }}>
                <div>
                  <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#9ca3af', textTransform: 'uppercase' }}>Артикул: {shoe.id}</span>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: '800', color: '#111827', margin: '0.2rem 0 0 0' }}>
                    {shoe.name}
                  </h3>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', background: '#f9fafb', padding: '0.75rem', borderRadius: '0.75rem', border: '1px solid #e5e7eb' }}>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: '#6b7280', display: 'block', fontWeight: '600' }}>Вартість (виробництво):</span>
                    <span style={{ fontSize: '1rem', fontWeight: '800', color: '#4f46e5' }}>${costUSD.toFixed(2)}</span>
                    <span style={{ fontSize: '0.7rem', color: '#9ca3af', display: 'block' }}>({costUAH.toFixed(0)} грн)</span>
                  </div>

                  <div>
                    <span style={{ fontSize: '0.7rem', color: '#6b7280', display: 'block', fontWeight: '600' }}>Ціна продажу:</span>
                    <span style={{ fontSize: '1rem', fontWeight: '800', color: '#16a34a' }}>${suggestedRetailUSD.toFixed(2)}</span>
                    <span style={{ fontSize: '0.7rem', color: '#9ca3af', display: 'block' }}>({suggestedRetailUAH.toFixed(0)} грн)</span>
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