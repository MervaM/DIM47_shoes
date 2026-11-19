import React, { useState, useRef } from 'react';

export default function ShoesCardsView({ shoes = [], setShoes, exchangeRate = 45 }) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [originalId, setOriginalId] = useState(null);
  const formRef = useRef(null);

  const [formData, setFormData] = useState({
    id: '',
    name: '',
    manufacturer: 'Міла',
    defaultCostUSD: '',
    retailPriceUAH: '',
    photo: ''
  });

  const scrollToForm = () => {
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 50);
  };

  const handleOpenAdd = () => {
    setEditingIndex(null);
    setOriginalId(null);
    setFormData({
      id: '',
      name: '',
      manufacturer: 'Міла',
      defaultCostUSD: '',
      retailPriceUAH: '',
      photo: ''
    });
    setIsAdding(true);
    scrollToForm();
  };

  const handleOpenEdit = (shoe, idx) => {
    setEditingIndex(idx);
    setOriginalId(shoe.id);
    setFormData({
      id: shoe.id || '',
      name: shoe.name || '',
      manufacturer: shoe.manufacturer || 'Міла',
      defaultCostUSD: shoe.defaultCostUSD ?? '',
      retailPriceUAH:
        shoe.retailPriceUAH !== undefined && shoe.retailPriceUAH !== null
          ? shoe.retailPriceUAH
          : shoe.retailPriceUSD
          ? Number(shoe.retailPriceUSD) * exchangeRate
          : '',
      photo: shoe.photo || ''
    });
    setIsAdding(true);
    scrollToForm();
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData((prev) => ({ ...prev, photo: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleSaveShoe = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    const costUSD = Number(formData.defaultCostUSD) || 0;
    const retailUAH = Number(formData.retailPriceUAH) || 0;
    const trimmedId = String(formData.id || '').trim();

    if (editingIndex !== null && shoes[editingIndex]) {
      const targetShoe = shoes[editingIndex];
      if (
        trimmedId &&
        trimmedId !== originalId &&
        shoes.some((s, i) => i !== editingIndex && s.id === trimmedId)
      ) {
        alert('Модель з таким артикулом вже існує!');
        return;
      }

      const updatedShoe = {
        ...targetShoe,
        id: trimmedId || targetShoe.id || `shoe_${Date.now()}`,
        name: formData.name.trim(),
        manufacturer: formData.manufacturer,
        defaultCostUSD: costUSD,
        retailPriceUAH: retailUAH,
        photo: formData.photo
      };

      setShoes(shoes.map((shoe, i) => (i === editingIndex ? updatedShoe : shoe)));
    } else {
      if (trimmedId && shoes.some((s) => s.id === trimmedId)) {
        alert('Модель з таким артикулом вже існує!');
        return;
      }

      setShoes([
        ...shoes,
        {
          id: trimmedId || `shoe_${Date.now()}`,
          name: formData.name.trim(),
          manufacturer: formData.manufacturer,
          defaultCostUSD: costUSD,
          retailPriceUAH: retailUAH,
          photo: formData.photo
        }
      ]);
    }

    setIsAdding(false);
    setEditingIndex(null);
    setOriginalId(null);
    setFormData({
      id: '',
      name: '',
      manufacturer: 'Міла',
      defaultCostUSD: '',
      retailPriceUAH: '',
      photo: ''
    });
  };

  const handleDeleteShoe = (idx) => {
    setShoes(shoes.filter((_, i) => i !== idx));
    if (editingIndex === idx) {
      setIsAdding(false);
      setEditingIndex(null);
      setOriginalId(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div
        className="card"
        style={{
          padding: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}
      >
        <div>
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 'bold',
              color: '#4f46e5',
              textTransform: 'uppercase'
            }}
          >
            Каталог продукції DIM47
          </span>
          <h2
            style={{
              fontSize: '1.75rem',
              fontWeight: '800',
              color: '#111827',
              margin: '0.2rem 0 0.5rem 0'
            }}
          >
            Моделі взуття та ціни за виробниками
          </h2>
          <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
            Собівартість у $, ціна продажу у гривнях (курс: {exchangeRate} грн/$)
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          style={{
            background: '#4f46e5',
            color: '#fff',
            padding: '0.6rem 1.25rem',
            borderRadius: '0.75rem',
            fontWeight: '700',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          {isAdding && editingIndex === null ? 'Скасувати' : '+ Додати модель'}
        </button>
      </div>

      {isAdding && (
        <form
          ref={formRef}
          onSubmit={handleSaveShoe}
          className="card"
          style={{
            padding: '1.5rem',
            background: '#f9fafb',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            border: '2px dashed #4f46e5'
          }}
        >
          <h3 style={{ fontSize: '1.125rem', fontWeight: '800', color: '#111827', margin: 0 }}>
            {editingIndex !== null
              ? `✏️ Редагувати модель: ${formData.name || originalId || ''}`
              : '➕ Створити нову модель взуття'}
          </h3>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '1rem'
            }}
          >
            <div>
              <label
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 'bold',
                  color: '#4b5563',
                  display: 'block',
                  marginBottom: '0.25rem'
                }}
              >
                Артикул / ID (необов&apos;язково)
              </label>
              <input
                type="text"
                placeholder="напр. 79-4"
                value={formData.id}
                onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                className="input-field"
              />
            </div>

            <div>
              <label
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 'bold',
                  color: '#4b5563',
                  display: 'block',
                  marginBottom: '0.25rem'
                }}
              >
                Назва моделі
              </label>
              <input
                type="text"
                placeholder="напр. Кросівки 012"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input-field"
                required
              />
            </div>

            <div>
              <label
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 'bold',
                  color: '#4b5563',
                  display: 'block',
                  marginBottom: '0.25rem'
                }}
              >
                Виробник
              </label>
              <select
                value={formData.manufacturer}
                onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                className="input-field"
                style={{ fontWeight: 'bold', color: '#4f46e5' }}
              >
                <option value="Міла">Міла</option>
                <option value="Валерій">Валерій</option>
              </select>
            </div>

            <div>
              <label
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 'bold',
                  color: '#4b5563',
                  display: 'block',
                  marginBottom: '0.25rem'
                }}
              >
                Собівартість ($)
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="37"
                value={formData.defaultCostUSD}
                onChange={(e) => setFormData({ ...formData, defaultCostUSD: e.target.value })}
                className="input-field"
                required
              />
            </div>

            <div>
              <label
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 'bold',
                  color: '#4b5563',
                  display: 'block',
                  marginBottom: '0.25rem'
                }}
              >
                Ціна продажу (грн)
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="3150"
                value={formData.retailPriceUAH}
                onChange={(e) => setFormData({ ...formData, retailPriceUAH: e.target.value })}
                className="input-field"
                required
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label
              style={{
                fontSize: '0.75rem',
                fontWeight: 'bold',
                color: '#4b5563',
                display: 'block'
              }}
            >
              Фото моделі з комп&apos;ютера
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                style={{ fontSize: '0.85rem', color: '#374151' }}
              />
              {formData.photo && (
                <span style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 'bold' }}>
                  ✅ Фото завантажено
                </span>
              )}
            </div>
            {formData.photo && (
              <div
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '0.5rem',
                  overflow: 'hidden',
                  border: '1px solid #d1d5db',
                  marginTop: '0.25rem'
                }}
              >
                <img
                  src={formData.photo}
                  alt="Preview"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
            )}
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.75rem',
              marginTop: '0.5rem'
            }}
          >
            <button
              type="button"
              onClick={() => {
                setIsAdding(false);
                setEditingIndex(null);
                setOriginalId(null);
              }}
              style={{
                background: '#e5e7eb',
                color: '#374151',
                padding: '0.5rem 1rem',
                borderRadius: '0.5rem',
                border: 'none',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Скасувати
            </button>
            <button
              type="submit"
              style={{
                background: '#16a34a',
                color: '#fff',
                padding: '0.5rem 1.25rem',
                borderRadius: '0.5rem',
                border: 'none',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              {editingIndex !== null ? 'Зберегти зміни' : 'Створити модель'}
            </button>
          </div>
        </form>
      )}

      {/* Сітка карток */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '1.25rem'
        }}
      >
        {shoes.map((shoe, idx) => {
          const costUSD = Number(shoe.defaultCostUSD) || 0;
          const costUAH = costUSD * exchangeRate;

          const retailUAH =
            shoe.retailPriceUAH !== undefined && shoe.retailPriceUAH !== null
              ? Number(shoe.retailPriceUAH) || 0
              : Number(shoe.retailPriceUSD || 0) * exchangeRate;

          const retailUSDEquivalent = exchangeRate > 0 ? retailUAH / exchangeRate : 0;

          return (
            <div
              key={`${shoe.id || 'shoe'}_${idx}`}
              className="card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                position: 'relative'
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: '10px',
                  right: '10px',
                  display: 'flex',
                  gap: '6px',
                  zIndex: 2
                }}
              >
                <button
                  type="button"
                  onClick={() => handleOpenEdit(shoe, idx)}
                  title="Редагувати картку"
                  style={{
                    background: 'rgba(0,0,0,0.6)',
                    color: '#fff',
                    border: 'none',
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.8rem'
                  }}
                >
                  ✎
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteShoe(idx)}
                  title="Видалити модель"
                  style={{
                    background: 'rgba(0,0,0,0.6)',
                    color: '#fff',
                    border: 'none',
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.9rem'
                  }}
                >
                  ×
                </button>
              </div>

              <div
                style={{
                  position: 'absolute',
                  top: '10px',
                  left: '10px',
                  background: (shoe.manufacturer || 'Міла') === 'Міла' ? '#4f46e5' : '#d97706',
                  color: '#fff',
                  padding: '0.2rem 0.6rem',
                  borderRadius: '9999px',
                  fontSize: '0.7rem',
                  fontWeight: 'bold',
                  zIndex: 2
                }}
              >
                {shoe.manufacturer || 'Міла'}
              </div>

              <div
                style={{
                  width: '100%',
                  height: '180px',
                  background: '#f3f4f6',
                  borderBottom: '1px solid #e5e7eb',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {shoe.photo ? (
                  <img
                    src={shoe.photo}
                    alt={shoe.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <span style={{ color: '#9ca3af', fontSize: '0.85rem', fontWeight: '600' }}>
                    📷 Немає фото
                  </span>
                )}
              </div>

              <div
                style={{
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  flex: 1,
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  {shoe.id && (
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 'bold',
                        color: '#6b7280',
                        display: 'block',
                        marginBottom: '0.1rem'
                      }}
                    >
                      Артикул: {shoe.id}
                    </span>
                  )}
                  <h3
                    style={{
                      fontSize: '1.125rem',
                      fontWeight: '800',
                      color: '#111827',
                      margin: 0
                    }}
                  >
                    {shoe.name}
                  </h3>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '0.75rem',
                    background: '#f9fafb',
                    padding: '0.75rem',
                    borderRadius: '0.75rem',
                    border: '1px solid #e5e7eb'
                  }}
                >
                  <div>
                    <span
                      style={{
                        fontSize: '0.7rem',
                        color: '#6b7280',
                        display: 'block',
                        fontWeight: '600'
                      }}
                    >
                      Собівартість:
                    </span>
                    <span style={{ fontSize: '1rem', fontWeight: '800', color: '#4f46e5' }}>
                      ${costUSD.toFixed(2)}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: '#9ca3af', display: 'block' }}>
                      ({costUAH.toFixed(0)} грн)
                    </span>
                  </div>

                  <div>
                    <span
                      style={{
                        fontSize: '0.7rem',
                        color: '#6b7280',
                        display: 'block',
                        fontWeight: '600'
                      }}
                    >
                      Ціна продажу:
                    </span>
                    <span style={{ fontSize: '1rem', fontWeight: '800', color: '#16a34a' }}>
                      {retailUAH.toFixed(0)} грн
                    </span>
                    <span style={{ fontSize: '0.7rem', color: '#9ca3af', display: 'block' }}>
                      (${retailUSDEquivalent.toFixed(2)})
                    </span>
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
