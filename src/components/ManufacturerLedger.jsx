import React, { useState, useRef, useEffect } from 'react';

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

const DAYS_LIST = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'));
const MONTHS_LIST = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));

function DayMonthPicker({ isoValue, fallbackMonthKey, onChangeISO, color = '#111827' }) {
  const safeISO = toISODate(isoValue, fallbackMonthKey);
  const [y, m, d] = safeISO.split('-');

  const handleDayChange = (newDay) => {
    onChangeISO(`${y}-${m}-${newDay}`);
  };

  const handleMonthChange = (newMonth) => {
    onChangeISO(`${y}-${newMonth}-${d}`);
  };

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        background: '#ffffff',
        border: '1px solid #cbd5e1',
        borderRadius: '0.35rem',
        padding: '0.15rem 0.25rem',
        gap: '1px'
      }}
    >
      <select
        value={d}
        onChange={(e) => handleDayChange(e.target.value)}
        style={{
          border: 'none',
          background: 'transparent',
          fontSize: '0.78rem',
          fontWeight: '800',
          color,
          cursor: 'pointer',
          padding: '0.1rem 0',
          outline: 'none'
        }}
      >
        {DAYS_LIST.map((day) => (
          <option key={day} value={day}>
            {day}
          </option>
        ))}
      </select>
      <span style={{ fontWeight: '800', fontSize: '0.78rem', color: '#64748b' }}>.</span>
      <select
        value={m}
        onChange={(e) => handleMonthChange(e.target.value)}
        style={{
          border: 'none',
          background: 'transparent',
          fontSize: '0.78rem',
          fontWeight: '800',
          color,
          cursor: 'pointer',
          padding: '0.1rem 0',
          outline: 'none'
        }}
      >
        {MONTHS_LIST.map((mon) => (
          <option key={mon} value={mon}>
            {mon}
          </option>
        ))}
      </select>
    </div>
  );
}

function normalizeMonthKey(rawMonth, fallbackYear = '2026') {
  if (rawMonth === undefined || rawMonth === null || rawMonth === '') {
    return `${fallbackYear}-08`;
  }

  if (typeof rawMonth === 'object') {
    const candidate = rawMonth.value ?? rawMonth.key ?? rawMonth.month ?? rawMonth.label ?? '';
    return normalizeMonthKey(candidate, fallbackYear);
  }

  if (typeof rawMonth === 'number') {
    const mm = String(rawMonth + 1).padStart(2, '0');
    return `${fallbackYear}-${mm}`;
  }

  const str = String(rawMonth).trim().toLowerCase();

  if (/^\d{4}-\d{2}$/.test(str)) {
    return str;
  }

  if (/^\d{4}-\d{1,2}$/.test(str)) {
    const [y, m] = str.split('-');
    return `${y}-${m.padStart(2, '0')}`;
  }

  if (/^\d{1,2}$/.test(str)) {
    const mm = str.padStart(2, '0');
    return `${fallbackYear}-${mm}`;
  }

  if (UKRAINIAN_MONTH_MAP[str]) {
    return `${fallbackYear}-${UKRAINIAN_MONTH_MAP[str]}`;
  }

  return `${fallbackYear}-08`;
}

function toISODate(val, fallbackMonthKey = '2026-08') {
  const [fbYear, fbMonth] = String(fallbackMonthKey || '2026-08').split('-');
  const y = fbYear || '2026';
  const m = fbMonth || '08';

  if (!val || typeof val !== 'string') {
    return `${y}-${m}-01`;
  }

  const trimmed = val.trim();

  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    return trimmed.slice(0, 10);
  }

  const dmMatch = trimmed.match(/^(\d{1,2})\.(\d{1,2})(?:\.(\d{2,4}))?$/);
  if (dmMatch) {
    const dd = String(Math.min(31, Math.max(1, Number(dmMatch[1]) || 1))).padStart(2, '0');
    const mm = String(Math.min(12, Math.max(1, Number(dmMatch[2]) || 1))).padStart(2, '0');
    let rawY = dmMatch[3] || y;
    if (rawY.length === 2) rawY = `20${rawY}`;
    return `${rawY}-${mm}-${dd}`;
  }

  return `${y}-${m}-01`;
}

function formatDayMonth(val) {
  if (!val || typeof val !== 'string') return '';
  const trimmed = val.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    const parts = trimmed.slice(0, 10).split('-');
    return `${parts[2]}.${parts[1]}`;
  }
  if (/^\d{2}\.\d{2}(\.\d{2,4})?$/.test(trimmed)) {
    return trimmed.slice(0, 5);
  }
  return trimmed;
}

function getNextSequentialDate(existingMonthRows, activeMonth, fallbackYear) {
  const [, activeMM] = activeMonth.split('-');
  const year = fallbackYear || activeMonth.split('-')[0] || '2026';

  const itemRows = existingMonthRows.filter((r) => r.type === 'item');
  if (itemRows.length === 0) {
    return { date: `01.${activeMM}`, isoDate: `${year}-${activeMM}-01` };
  }

  let maxDay = 0;
  itemRows.forEach((r) => {
    const iso = toISODate(r.isoDate || r.date, activeMonth);
    const d = Number(iso.slice(8, 10));
    if (d >= 1 && d <= 31 && d > maxDay) {
      maxDay = d;
    }
  });

  const nextDay = maxDay > 0 ? Math.min(31, maxDay + 1) : 1;
  const dayStr = String(nextDay).padStart(2, '0');
  return {
    date: `${dayStr}.${activeMM}`,
    isoDate: `${year}-${activeMM}-${dayStr}`
  };
}

function getOrderMonthFromRow(row, fallbackMonth, fallbackYear) {
  if (row?.isoDate && typeof row.isoDate === 'string' && row.isoDate.includes('-')) {
    const parts = row.isoDate.split('-');
    if (parts.length >= 2) {
      return `${parts[0]}-${parts[1].padStart(2, '0')}`;
    }
  }
  if (row?.date && typeof row.date === 'string' && row.date.includes('.')) {
    const parts = row.date.split('.');
    if (parts.length >= 2) {
      return `${fallbackYear}-${parts[1].padStart(2, '0')}`;
    }
  }
  if (row?.month && /^\d{4}-\d{2}$/.test(String(row.month))) {
    return String(row.month);
  }
  return fallbackMonth;
}

function getPaidMonthFromRow(row, fallbackMonth, fallbackYear) {
  if (row?.paidMonth && /^\d{4}-\d{2}$/.test(String(row.paidMonth))) {
    return String(row.paidMonth);
  }
  if (row?.paidIsoDate && typeof row.paidIsoDate === 'string' && row.paidIsoDate.includes('-')) {
    const parts = row.paidIsoDate.split('-');
    if (parts.length >= 2) {
      return `${parts[0]}-${parts[1].padStart(2, '0')}`;
    }
  }
  const rawPaidDM = row?.paidDate || row?.paidAt;
  if (rawPaidDM && typeof rawPaidDM === 'string' && rawPaidDM.includes('.')) {
    const parts = rawPaidDM.split('.');
    if (parts.length >= 2) {
      return `${fallbackYear}-${parts[1].padStart(2, '0')}`;
    }
  }
  return getOrderMonthFromRow(row, fallbackMonth, fallbackYear);
}

export default function ManufacturerLedger(props) {
  const {
    manufacturerName = 'Міла',
    paymentMode = 'prepaid',
    selectedMonth,
    month,
    currentMonth,
    activeMonth: propActiveMonth,
    selectedYear,
    year,
    currentYear: propCurrentYear,
    rows = [],
    setRows = () => {},
    externalRows = [],
    onUpdateExternalRow = null,
    depositsList = [],
    setDepositsList = () => {},
    onClearAllAdvances = null,
    manualRemaining = null,
    setManualRemaining = () => {},
    carriedAdvanceFromPrev = 0,
    carriedDebtFromPrev = 0,
    exchangeRate = 45.0,
    shoesCatalog = []
  } = props;

  const resolvedYear = String(selectedYear || year || propCurrentYear || '2026');

  const rawMonthInput =
    selectedMonth !== undefined
      ? selectedMonth
      : month !== undefined
      ? month
      : currentMonth !== undefined
      ? currentMonth
      : propActiveMonth !== undefined
      ? propActiveMonth
      : 7;
  const activeMonth = normalizeMonthKey(rawMonthInput, resolvedYear);
  const [, activeMM] = activeMonth.split('-');
  const defaultCalendarDate = `${resolvedYear}-${activeMM}-01`;

  const [activeRowForPicker, setActiveRowForPicker] = useState(null);
  const [newDepositISO, setNewDepositISO] = useState(defaultCalendarDate);
  const [newDepositAmount, setNewDepositAmount] = useState('');

  const [editingDepositId, setEditingDepositId] = useState(null);
  const [editingDepositISO, setEditingDepositISO] = useState(defaultCalendarDate);
  const [editingDepositAmount, setEditingDepositAmount] = useState('');

  const [isEditingRemaining, setIsEditingRemaining] = useState(false);
  const [remainingDraftValue, setRemainingDraftValue] = useState('');

  const [manualSubtotalAmounts, setManualSubtotalAmounts] = useState({});
  const [activatedSubtotalId, setActivatedSubtotalId] = useState(null);
  const [selectedPaySource, setSelectedPaySource] = useState('advance');
  const [paymentISO, setPaymentISO] = useState(defaultCalendarDate);

  const rowRefs = useRef({});

  useEffect(() => {
    const [, mm] = activeMonth.split('-');
    const safeMM = mm || '08';
    const nextDefaultISO = `${resolvedYear}-${safeMM}-01`;
    setNewDepositISO(nextDefaultISO);
    setEditingDepositId(null);
    setEditingDepositISO(nextDefaultISO);
    setIsEditingRemaining(false);
    setActivatedSubtotalId(null);
    setPaymentISO(nextDefaultISO);
  }, [activeMonth, resolvedYear]);

  const manufacturerShoes = shoesCatalog.filter(
    (shoe) => (shoe.manufacturer || 'Міла') === manufacturerName
  );

  const currentMonthOwnRows = rows.filter((r) => {
    if (r.isEditing) return true;
    if (!r.month && !r.isoDate && !r.date) return true;
    const orderMonth = getOrderMonthFromRow(r, activeMonth, resolvedYear);
    return orderMonth === activeMonth;
  });

  const unpaidCarriedFromPrev = externalRows.filter((r) => {
    if (r.type !== 'item' || r.isPaid || r.isEditing) return false;
    const storageM = r._storageMonthKey || activeMonth;
    const orderMonth = getOrderMonthFromRow(r, storageM, resolvedYear);
    return orderMonth < activeMonth;
  });

  const paidInThisMonthFromOtherMonths = externalRows.filter((r) => {
    if (r.type !== 'item' || !r.isPaid || r.isEditing) return false;
    const storageM = r._storageMonthKey || activeMonth;
    const paidMonth = getPaidMonthFromRow(r, storageM, resolvedYear);
    return paidMonth === activeMonth;
  });

  const monthRows = [
    ...unpaidCarriedFromPrev,
    ...paidInThisMonthFromOtherMonths,
    ...currentMonthOwnRows
  ];

  const allCombinedItems = [
    ...rows.filter((r) => r.type === 'item'),
    ...externalRows.filter((r) => r.type === 'item')
  ];

  const monthPaidRows = allCombinedItems.filter((r) => {
    if (!r.isPaid) return false;
    const fallbackM = r._storageMonthKey || activeMonth;
    return getPaidMonthFromRow(r, fallbackM, resolvedYear) === activeMonth;
  });

  const sortedGlobalDeposits = [...depositsList].sort((a, b) => {
    const isoA = toISODate(a.isoDate || a.date, activeMonth);
    const isoB = toISODate(b.isoDate || b.date, activeMonth);
    return isoA.localeCompare(isoB);
  });

  const handleAddRow = () => {
    const nextSeq = getNextSequentialDate(currentMonthOwnRows, activeMonth, resolvedYear);
    setRows([
      ...rows,
      {
        id: Date.now(),
        isoDate: nextSeq.isoDate,
        month: activeMonth,
        date: nextSeq.date,
        type: 'item',
        shoeId: '',
        quantity: 1,
        customCostUSD: '',
        patternCostUAH: 0,
        rowRate: exchangeRate || 45.0,
        isSelectedForPay: false,
        isPaid: false,
        paySource: 'advance',
        paidDate: '',
        paidIsoDate: '',
        paidMonth: '',
        paidAt: '',
        photo: '',
        isEditing: true
      }
    ]);
  };

  const handleAddSubtotal = () => {
    setRows([
      ...rows,
      {
        id: Date.now(),
        isoDate: `${activeMonth}-01`,
        month: activeMonth,
        type: 'subtotal',
        note: '',
        manualSumUAH: 0,
        paidAmountUAH: 0,
        isPaid: false,
        paySource: 'advance',
        isCollapsed: false
      }
    ]);
  };

  const handleAddDeposit = () => {
    const numericAmount = Number(newDepositAmount);
    if (!newDepositAmount || Number.isNaN(numericAmount) || numericAmount <= 0) return;

    const chosenISO = toISODate(newDepositISO, activeMonth);
    const formattedDM = formatDayMonth(chosenISO);
    const depMonth = chosenISO.slice(0, 7);

    const item = {
      id: Date.now(),
      isoDate: chosenISO,
      month: depMonth,
      date: formattedDM,
      amount: numericAmount
    };

    setDepositsList([...depositsList, item]);
    setNewDepositAmount('');
  };

  const startEditDeposit = (dep) => {
    setEditingDepositId(dep.id);
    setEditingDepositISO(toISODate(dep.isoDate || dep.date, activeMonth));
    setEditingDepositAmount(String(dep.amount ?? ''));
  };

  const saveEditDeposit = (id) => {
    const numericAmount = Number(editingDepositAmount);
    if (Number.isNaN(numericAmount) || numericAmount < 0) return;

    const chosenISO = toISODate(editingDepositISO, activeMonth);
    const formattedDM = formatDayMonth(chosenISO);
    const depMonth = chosenISO.slice(0, 7);

    setDepositsList(
      depositsList.map((d) =>
        d.id === id
          ? {
              ...d,
              date: formattedDM,
              isoDate: chosenISO,
              month: depMonth,
              amount: numericAmount
            }
          : d
      )
    );
    setEditingDepositId(null);
  };

  const handleDeleteDeposit = (id) => {
    if (editingDepositId === id) setEditingDepositId(null);
    setDepositsList(depositsList.filter((d) => d.id !== id));
  };

  const handleClearMonthAdvances = async () => {
    setEditingDepositId(null);
    setDepositsList([]);
    setManualRemaining(null);
    if (onClearAllAdvances) {
      await onClearAllAdvances();
    }
  };

  const handleRowChange = (id, field, value) => {
    if (field === 'isSelectedForPay') {
      setActivatedSubtotalId(null);
    }

    const externalTarget = externalRows.find((r) => r.id === id);
    if (externalTarget && onUpdateExternalRow) {
      const patch = { [field]: value };
      if (field === 'isoDate' || field === 'date') {
        const parsedISO = toISODate(value, activeMonth);
        patch.isoDate = parsedISO;
        patch.date = formatDayMonth(parsedISO);
        patch.month = parsedISO.slice(0, 7);
      }
      if (field === 'shoeId' && value) {
        const found = shoesCatalog.find((s) => s.id === value);
        if (found) {
          patch.customCostUSD = found.defaultCostUSD;
          patch.photo = found.photo || '';
        }
      }
      onUpdateExternalRow(externalTarget._storageMonthKey, id, patch);
      return;
    }

    setRows(
      rows.map((row) => {
        if (row.id === id) {
          const updated = { ...row, [field]: value };

          if (field === 'isoDate' || field === 'date') {
            const parsedISO = toISODate(value, activeMonth);
            updated.isoDate = parsedISO;
            updated.date = formatDayMonth(parsedISO);
            updated.month = parsedISO.slice(0, 7);
          }

          if (field === 'shoeId' && value) {
            const found = shoesCatalog.find((s) => s.id === value);
            if (found) {
              updated.customCostUSD = found.defaultCostUSD;
              updated.photo = found.photo || '';
              updated.isEditing = true;
            }
          }

          return updated;
        }
        return row;
      })
    );
  };

  const selectShoeFromPicker = (shoe) => {
    if (!activeRowForPicker) return;

    const externalTarget = externalRows.find((r) => r.id === activeRowForPicker);
    if (externalTarget && onUpdateExternalRow) {
      onUpdateExternalRow(externalTarget._storageMonthKey, activeRowForPicker, {
        shoeId: shoe.id,
        customCostUSD: shoe.defaultCostUSD,
        photo: shoe.photo || ''
      });
      setActiveRowForPicker(null);
      return;
    }

    setRows(
      rows.map((row) => {
        if (row.id === activeRowForPicker) {
          return {
            ...row,
            shoeId: shoe.id,
            customCostUSD: shoe.defaultCostUSD,
            photo: shoe.photo || '',
            isEditing: true
          };
        }
        return row;
      })
    );
    setActiveRowForPicker(null);
  };

  const handleDeleteRow = (id) => {
    const externalTarget = externalRows.find((r) => r.id === id);
    if (externalTarget && onUpdateExternalRow) {
      onUpdateExternalRow(externalTarget._storageMonthKey, id, null);
      return;
    }
    setRows(rows.filter((row) => row.id !== id));
  };

  let unpaidPairs = 0;
  let unpaidUSD = 0;
  let unpaidUAH = 0;
  let unpaidPatternsUAH = 0;

  let checkedPairs = 0;
  let checkedUSD = 0;
  let checkedPatternsUAH = 0;
  let checkedRate = exchangeRate || 45.0;
  let checkedCalculatedUAH = 0;

  monthRows.forEach((row) => {
    if (row.type === 'item' && !row.isPaid) {
      const qty = Number(row.quantity) || 0;
      const costUSD = Number(row.customCostUSD) || 0;
      const patternUAH = Number(row.patternCostUAH) || 0;
      const rRate = Number(row.rowRate) || 0;
      const isChecked = Boolean(row.isSelectedForPay);

      const rowUSD = qty * costUSD;
      const rowFullUAH = rowUSD * rRate + patternUAH;

      unpaidPairs += qty;
      unpaidUSD += rowUSD;
      unpaidPatternsUAH += patternUAH;
      unpaidUAH += rowFullUAH;

      if (isChecked) {
        checkedPairs += qty;
        checkedUSD += rowUSD;
        checkedPatternsUAH += patternUAH;
        if (rRate > 0) checkedRate = rRate;
        checkedCalculatedUAH += rowFullUAH;
      }
    }
  });

  let paidPairs = 0;
  let paidTotalUAH = 0;
  let paidFromAdvanceUAH = 0;
  let paidSeparateUAH = 0;

  monthPaidRows.forEach((row) => {
    const qty = Number(row.quantity) || 0;
    const costUSD = Number(row.customCostUSD) || 0;
    const patternUAH = Number(row.patternCostUAH) || 0;
    const rRate = Number(row.rowRate) || 0;
    const rowFullUAH = qty * costUSD * rRate + patternUAH;

    paidPairs += qty;
    paidTotalUAH += rowFullUAH;
    if (row.paySource === 'separate') {
      paidSeparateUAH += rowFullUAH;
    } else {
      paidFromAdvanceUAH += rowFullUAH;
    }
  });

  const currentMonthDepositsUAH = sortedGlobalDeposits.reduce((sum, dep) => {
    const depMonth = toISODate(dep.isoDate || dep.date, activeMonth).slice(0, 7);
    return depMonth === activeMonth ? sum + (Number(dep.amount) || 0) : sum;
  }, 0);

  const carriedFromPrevUAH = Number(carriedAdvanceFromPrev) || 0;
  const totalAvailableAdvanceUAH = carriedFromPrevUAH + currentMonthDepositsUAH;
  const autoRemainingAdvanceUAH = totalAvailableAdvanceUAH - paidFromAdvanceUAH;

  const hasManualRemaining =
    manualRemaining !== null && manualRemaining !== undefined && !Number.isNaN(Number(manualRemaining));
  const displayedRemainingUAH = hasManualRemaining
    ? Number(manualRemaining)
    : autoRemainingAdvanceUAH;

  const totalDebtWithCarryUAH = unpaidUAH + (Number(carriedDebtFromPrev) || 0);

  const hasCheckedPairs = checkedPairs > 0;
  const isPaymentActivated = hasCheckedPairs && activatedSubtotalId !== null;

  const getSubtotalFinalUAH = (subtotalId) => {
    if (!subtotalId) return checkedCalculatedUAH;
    const rawManual = manualSubtotalAmounts[subtotalId];
    if (rawManual !== undefined && String(rawManual).trim() !== '') {
      const num = Number(rawManual);
      if (!Number.isNaN(num)) return num;
    }
    return checkedCalculatedUAH;
  };

  const handleActivateSubtotal = (subtotalId) => {
    if (!hasCheckedPairs) return;
    setActivatedSubtotalId((prev) => (prev === subtotalId ? null : subtotalId));
  };

  const handleConfirmPayment = () => {
    if (!isPaymentActivated) return;

    const chosenSource = selectedPaySource;
    const finalAmountUAH = getSubtotalFinalUAH(activatedSubtotalId);
    const diffUAH = finalAmountUAH - checkedCalculatedUAH;

    const paidISO = toISODate(paymentISO, activeMonth);
    const paidDM = formatDayMonth(paidISO);
    const paidM = paidISO.slice(0, 7);

    const allTargetRows = monthRows.filter(
      (r) => r.type === 'item' && !r.isPaid && r.isSelectedForPay
    );
    const firstTargetId = allTargetRows[0]?.id;

    setRows((prevRows) =>
      prevRows.map((r) => {
        if (allTargetRows.some((t) => t.id === r.id)) {
          const adjust = r.id === firstTargetId ? diffUAH : 0;
          const nativeOrderMonth = getOrderMonthFromRow(r, activeMonth, resolvedYear);
          return {
            ...r,
            month: nativeOrderMonth,
            patternCostUAH: (Number(r.patternCostUAH) || 0) + adjust,
            isPaid: true,
            paySource: chosenSource,
            isSelectedForPay: false,
            paidDate: paidDM,
            paidIsoDate: paidISO,
            paidMonth: paidM,
            paidAt: paidDM,
            isEditing: false
          };
        }
        if (r.id === activatedSubtotalId && r.type === 'subtotal') {
          return {
            ...r,
            isPaid: true,
            paidAmountUAH: finalAmountUAH,
            paySource: chosenSource,
            paidDate: paidDM,
            paidIsoDate: paidISO,
            paidMonth: paidM,
            paidAt: paidDM
          };
        }
        return r;
      })
    );

    if (onUpdateExternalRow) {
      allTargetRows.forEach((t) => {
        if (t._storageMonthKey) {
          const adjust = t.id === firstTargetId ? diffUAH : 0;
          onUpdateExternalRow(t._storageMonthKey, t.id, {
            patternCostUAH: (Number(t.patternCostUAH) || 0) + adjust,
            isPaid: true,
            paySource: chosenSource,
            isSelectedForPay: false,
            paidDate: paidDM,
            paidIsoDate: paidISO,
            paidMonth: paidM,
            paidAt: paidDM,
            isEditing: false
          });
        }
      });
    }

    if (chosenSource === 'advance' && hasManualRemaining) {
      setManualRemaining(Number(manualRemaining) - finalAmountUAH);
    }

    if (activatedSubtotalId) {
      setManualSubtotalAmounts((prev) => {
        const copy = { ...prev };
        delete copy[activatedSubtotalId];
        return copy;
      });
    }
    setActivatedSubtotalId(null);
  };

  const precomputedSubtotalPaidMap = {};
  let sectionPaidSum = 0;
  let sectionPaidUSD = 0;
  let sectionPaidCount = 0;
  let sectionUnpaidCount = 0;
  let sectionPaySource = 'advance';

  monthRows.forEach((r) => {
    if (r.type === 'item') {
      const qty = Number(r.quantity) || 0;
      const costUSD = Number(r.customCostUSD) || 0;
      const patternUAH = Number(r.patternCostUAH) || 0;
      const rRate = Number(r.rowRate) || 0;
      const fullUAH = qty * costUSD * rRate + patternUAH;

      if (r.isPaid) {
        sectionPaidSum += fullUAH;
        sectionPaidUSD += qty * costUSD;
        sectionPaidCount += qty;
        sectionPaySource = r.paySource || 'advance';
      } else {
        sectionUnpaidCount += qty;
      }
    } else if (r.type === 'subtotal') {
      if (r.isPaid && Number(r.paidAmountUAH) > 0) {
        precomputedSubtotalPaidMap[r.id] = {
          isClosed: true,
          amountUAH: Number(r.paidAmountUAH),
          usd: sectionPaidUSD,
          count: sectionPaidCount,
          source: r.paySource || sectionPaySource
        };
      } else if (sectionPaidCount > 0 && sectionUnpaidCount === 0) {
        precomputedSubtotalPaidMap[r.id] = {
          isClosed: true,
          amountUAH: sectionPaidSum,
          usd: sectionPaidUSD,
          count: sectionPaidCount,
          source: sectionPaySource
        };
      }
      sectionPaidSum = 0;
      sectionPaidUSD = 0;
      sectionPaidCount = 0;
      sectionUnpaidCount = 0;
    }
  });

  let runningPairNumber = 0;
  const activePayAmount = isPaymentActivated ? getSubtotalFinalUAH(activatedSubtotalId) : 0;

  return (
    <div
      className="app-container"
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
        maxWidth: '100%'
      }}
    >
      {activeRowForPicker && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem'
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '1rem',
              padding: '1.25rem',
              maxWidth: '600px',
              width: '100%',
              maxHeight: '85vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem'
              }}
            >
              <h3 style={{ fontSize: '1.1rem', fontWeight: '800', margin: 0, color: '#111827' }}>
                Виберіть модель ({manufacturerName})
              </h3>
              <button
                type="button"
                onClick={() => setActiveRowForPicker(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  color: '#6b7280'
                }}
              >
                ×
              </button>
            </div>

            {manufacturerShoes.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#6b7280', padding: '2rem 0' }}>
                У каталозі немає моделей для цього виробника.
              </p>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
                  gap: '0.75rem'
                }}
              >
                {manufacturerShoes.map((shoe) => (
                  <div
                    key={shoe.id}
                    onClick={() => selectShoeFromPicker(shoe)}
                    style={{
                      border: '2px solid #e5e7eb',
                      borderRadius: '0.75rem',
                      padding: '0.4rem',
                      cursor: 'pointer',
                      textAlign: 'center',
                      background: '#f9fafb'
                    }}
                  >
                    <div
                      style={{
                        width: '100%',
                        height: '90px',
                        borderRadius: '0.5rem',
                        overflow: 'hidden',
                        background: '#e5e7eb',
                        marginBottom: '0.4rem'
                      }}
                    >
                      {shoe.photo ? (
                        <img
                          src={shoe.photo}
                          alt={shoe.name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <div
                          style={{
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.65rem',
                            color: '#6b7280'
                          }}
                        >
                          немає фото
                        </div>
                      )}
                    </div>
                    <div
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 'bold',
                        color: '#111827',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      {shoe.name}
                    </div>
                    <div style={{ fontSize: '0.65rem', color: '#4f46e5', fontWeight: '700' }}>
                      {shoe.id ? `арт: ${shoe.id}` : 'без арт.'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="card" style={{ padding: '1rem' }}>
        <div className="header-box" style={{ padding: '0 0 1rem 0' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '0.75rem',
              flexWrap: 'wrap',
              gap: '0.75rem'
            }}
          >
            <div>
              <span
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 'bold',
                  color: '#4f46e5',
                  textTransform: 'uppercase'
                }}
              >
                Виробник
              </span>
              <h2
                style={{
                  fontSize: '1.5rem',
                  fontWeight: '800',
                  color: '#111827',
                  margin: '0.1rem 0 0 0'
                }}
              >
                {manufacturerName}
              </h2>
            </div>

            <span
              style={{
                fontSize: '0.75rem',
                padding: '0.3rem 0.75rem',
                background: '#eef2ff',
                color: '#4f46e5',
                borderRadius: '9999px',
                fontWeight: 'bold'
              }}
            >
              {paymentMode === 'prepaid' ? '✨ По авансу' : '💼 Після видачі'}
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '0.75rem',
              background: '#f9fafb',
              padding: '0.75rem',
              borderRadius: '0.75rem',
              border: '1px solid #e5e7eb'
            }}
          >
            {paymentMode === 'prepaid' && (
              <div
                style={{
                  background: '#ffffff',
                  padding: '0.65rem',
                  borderRadius: '0.5rem',
                  border: '1px solid #e5e7eb',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.45rem'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#16a34a' }}>
                    💰 Аванси (наскрізний гаманець):
                  </span>

                  <button
                    type="button"
                    onClick={handleClearMonthAdvances}
                    style={{
                      background: '#fef2f2',
                      color: '#dc2626',
                      border: '1px solid #fecaca',
                      borderRadius: '0.35rem',
                      padding: '0.15rem 0.45rem',
                      fontSize: '0.68rem',
                      fontWeight: '700',
                      cursor: 'pointer'
                    }}
                  >
                    Очистити всі аванси
                  </button>
                </div>

                {carriedFromPrevUAH !== 0 && (
                  <div
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: '800',
                      color: carriedFromPrevUAH > 0 ? '#15803d' : '#dc2626',
                      background: carriedFromPrevUAH > 0 ? '#dcfce7' : '#fee2e2',
                      padding: '0.25rem 0.45rem',
                      borderRadius: '0.35rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <span>Перенесено з минулих місяців:</span>
                    <span>
                      {carriedFromPrevUAH > 0
                        ? `+${carriedFromPrevUAH.toFixed(0)} грн`
                        : `${carriedFromPrevUAH.toFixed(0)} грн`}
                    </span>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <DayMonthPicker
                    isoValue={newDepositISO}
                    fallbackMonthKey={activeMonth}
                    onChangeISO={setNewDepositISO}
                  />

                  <input
                    type="number"
                    placeholder="Сума грн"
                    value={newDepositAmount}
                    onChange={(e) => setNewDepositAmount(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddDeposit();
                      }
                    }}
                    style={{
                      minWidth: '75px',
                      flex: 1,
                      padding: '0.25rem 0.45rem',
                      fontSize: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.35rem',
                      fontWeight: 'bold'
                    }}
                  />

                  <button
                    type="button"
                    onClick={handleAddDeposit}
                    style={{
                      flexShrink: 0,
                      background: '#16a34a',
                      color: '#fff',
                      border: 'none',
                      padding: '0.25rem 0.65rem',
                      borderRadius: '0.35rem',
                      fontSize: '0.85rem',
                      fontWeight: 'bold',
                      cursor: 'pointer'
                    }}
                  >
                    +
                  </button>
                </div>

                {sortedGlobalDeposits.length > 0 && (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.25rem',
                      maxHeight: '125px',
                      overflowY: 'auto',
                      marginTop: '0.15rem'
                    }}
                  >
                    {sortedGlobalDeposits.map((dep) => {
                      const depISO = toISODate(dep.isoDate || dep.date, activeMonth);
                      const depMonthKey = depISO.slice(0, 7);
                      const isCurrentMonthDep = depMonthKey === activeMonth;
                      const isEditingThis = editingDepositId === dep.id;

                      if (isEditingThis) {
                        return (
                          <div
                            key={dep.id}
                            style={{
                              display: 'flex',
                              gap: '0.25rem',
                              alignItems: 'center',
                              background: '#fefce8',
                              border: '1px solid #fde047',
                              padding: '0.22rem 0.35rem',
                              borderRadius: '0.3rem',
                              flexWrap: 'wrap'
                            }}
                          >
                            <DayMonthPicker
                              isoValue={editingDepositISO}
                              fallbackMonthKey={activeMonth}
                              onChangeISO={setEditingDepositISO}
                            />
                            <input
                              type="number"
                              value={editingDepositAmount}
                              onChange={(e) => setEditingDepositAmount(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  saveEditDeposit(dep.id);
                                }
                              }}
                              style={{
                                width: '72px',
                                padding: '0.15rem 0.3rem',
                                fontSize: '0.74rem',
                                fontWeight: 'bold',
                                border: '1px solid #cbd5e1',
                                borderRadius: '0.25rem'
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => saveEditDeposit(dep.id)}
                              style={{
                                background: '#16a34a',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '0.25rem',
                                padding: '0.15rem 0.4rem',
                                fontSize: '0.72rem',
                                fontWeight: 'bold',
                                cursor: 'pointer'
                              }}
                            >
                              ✓
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingDepositId(null)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#6b7280',
                                fontSize: '0.8rem',
                                cursor: 'pointer'
                              }}
                            >
                              ✕
                            </button>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={dep.id}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            fontSize: '0.75rem',
                            background: isCurrentMonthDep ? '#f0fdf4' : '#f8fafc',
                            border: isCurrentMonthDep ? '1px solid #bbf7d0' : '1px solid #e2e8f0',
                            padding: '0.22rem 0.4rem',
                            borderRadius: '0.3rem'
                          }}
                        >
                          <span>
                            {formatDayMonth(depISO)}: <strong>{dep.amount} грн</strong>
                            {!isCurrentMonthDep && (
                              <span style={{ fontSize: '0.65rem', color: '#64748b', marginLeft: '0.3rem' }}>
                                ({depMonthKey.slice(5, 7)})
                              </span>
                            )}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <button
                              type="button"
                              onClick={() => startEditDeposit(dep)}
                              title="Редагувати аванс"
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#4f46e5',
                                cursor: 'pointer',
                                fontWeight: 'bold',
                                fontSize: '0.78rem'
                              }}
                            >
                              ✎
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteDeposit(dep.id)}
                              title="Видалити аванс"
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#dc2626',
                                cursor: 'pointer',
                                fontWeight: 'bold'
                              }}
                            >
                              ×
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div
                  style={{
                    fontSize: '0.72rem',
                    color: '#4b5563',
                    fontWeight: '700',
                    textAlign: 'right',
                    borderTop: '1px dashed #e5e7eb',
                    paddingTop: '0.25rem'
                  }}
                >
                  Доступно в {activeMonth.slice(5, 7)} міс.: {totalAvailableAdvanceUAH.toFixed(0)} грн
                  {carriedFromPrevUAH !== 0 &&
                    ` (${carriedFromPrevUAH.toFixed(0)} перен. + ${currentMonthDepositsUAH.toFixed(0)} нов.)`}
                </div>
              </div>
            )}

            <div
              style={{
                background: '#f0fdf4',
                padding: '0.6rem',
                borderRadius: '0.5rem',
                border: '1px solid #bbf7d0',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center'
              }}
            >
              <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#16a34a' }}>
                Оплачено за датою оплати ({activeMonth.slice(5, 7)} міс.):
              </span>
              <span style={{ fontSize: '1.1rem', fontWeight: '900', color: '#15803d' }}>
                {paidTotalUAH.toFixed(0)} грн
              </span>
              <span style={{ fontSize: '0.7rem', color: '#166534', fontWeight: '700' }}>
                {paidPairs} пар (з авансу: {paidFromAdvanceUAH.toFixed(0)} грн • окремо:{' '}
                {paidSeparateUAH.toFixed(0)} грн)
              </span>
            </div>

            <div
              style={{
                background: '#f5f3ff',
                padding: '0.6rem',
                borderRadius: '0.5rem',
                border: '1px solid #ede9fe',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                gap: '0.3rem'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#4f46e5' }}>
                  {paymentMode === 'prepaid' ? 'Залишок авансу:' : 'Борг / Неоплачено:'}
                </span>

                {paymentMode === 'prepaid' && !isEditingRemaining && (
                  <button
                    type="button"
                    onClick={() => {
                      setRemainingDraftValue(String(Math.round(displayedRemainingUAH)));
                      setIsEditingRemaining(true);
                    }}
                    style={{
                      background: '#eef2ff',
                      color: '#4f46e5',
                      border: '1px solid #c7d2fe',
                      borderRadius: '0.3rem',
                      padding: '0.12rem 0.4rem',
                      fontSize: '0.68rem',
                      fontWeight: '700',
                      cursor: 'pointer'
                    }}
                  >
                    ✎ Редагувати
                  </button>
                )}
              </div>

              {paymentMode === 'prepaid' && isEditingRemaining ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                  <input
                    type="number"
                    value={remainingDraftValue}
                    onChange={(e) => setRemainingDraftValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const num = Number(remainingDraftValue);
                        if (!Number.isNaN(num)) {
                          setManualRemaining(num);
                          setIsEditingRemaining(false);
                        }
                      }
                    }}
                    style={{
                      width: '105px',
                      padding: '0.25rem 0.4rem',
                      borderRadius: '0.35rem',
                      border: '2px solid #4f46e5',
                      fontWeight: '900',
                      fontSize: '0.95rem',
                      color: '#312e81',
                      background: '#ffffff'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const num = Number(remainingDraftValue);
                      if (!Number.isNaN(num)) {
                        setManualRemaining(num);
                        setIsEditingRemaining(false);
                      }
                    }}
                    style={{
                      background: '#16a34a',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '0.35rem',
                      padding: '0.25rem 0.55rem',
                      fontSize: '0.75rem',
                      fontWeight: 'bold',
                      cursor: 'pointer'
                    }}
                  >
                    Зберегти
                  </button>
                  {hasManualRemaining && (
                    <button
                      type="button"
                      onClick={() => {
                        setManualRemaining(null);
                        setIsEditingRemaining(false);
                      }}
                      style={{
                        background: '#f3f4f6',
                        color: '#4b5563',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.35rem',
                        padding: '0.25rem 0.45rem',
                        fontSize: '0.72rem',
                        fontWeight: '700',
                        cursor: 'pointer'
                      }}
                    >
                      Авто
                    </button>
                  )}
                </div>
              ) : (
                <span
                  style={{
                    fontSize: '1.1rem',
                    fontWeight: '900',
                    color:
                      paymentMode === 'prepaid'
                        ? displayedRemainingUAH < 0
                          ? '#dc2626'
                          : '#312e81'
                        : totalDebtWithCarryUAH > 0
                        ? '#dc2626'
                        : '#312e81'
                  }}
                >
                  {paymentMode === 'prepaid'
                    ? `${displayedRemainingUAH.toFixed(0)} грн`
                    : `${totalDebtWithCarryUAH.toFixed(0)} грн`}
                </span>
              )}

              {paymentMode === 'prepaid' && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.35rem' }}>
                  <span style={{ fontSize: '0.68rem', color: '#6366f1', fontWeight: '700' }}>
                    {hasManualRemaining
                      ? `Задано вручну (авто: ${autoRemainingAdvanceUAH.toFixed(0)} грн)`
                      : `${totalAvailableAdvanceUAH.toFixed(0)} грн − ${paidFromAdvanceUAH.toFixed(0)} грн (з авансу)`}
                  </span>
                  {hasManualRemaining && !isEditingRemaining && (
                    <button
                      type="button"
                      onClick={() => setManualRemaining(null)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#6366f1',
                        textDecoration: 'underline',
                        fontSize: '0.66rem',
                        fontWeight: '700',
                        cursor: 'pointer',
                        padding: 0
                      }}
                    >
                      Скинути
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div
          style={{
            overflowX: 'auto',
            background: '#ffffff',
            borderRadius: '0.5rem',
            border: '1px solid #e5e7eb'
          }}
        >
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              textAlign: 'left',
              fontSize: '0.85rem'
            }}
          >
            <thead>
              <tr
                style={{
                  background: '#f8fafc',
                  color: '#475569',
                  fontSize: '0.75rem',
                  textTransform: 'uppercase',
                  borderBottom: '2px solid #e2e8f0'
                }}
              >
                <th style={{ padding: '0.6rem 0.5rem', textAlign: 'center', width: '40px' }}>✓</th>
                <th style={{ padding: '0.6rem 0.4rem', textAlign: 'center', width: '42px' }}>№</th>
                <th style={{ padding: '0.6rem 0.4rem', width: '98px' }}>Дата зам.</th>
                <th style={{ padding: '0.6rem 0.5rem', minWidth: '210px' }}>Модель / Артикул</th>
                <th style={{ padding: '0.6rem 0.4rem', textAlign: 'center', width: '64px' }}>К-ть</th>
                <th style={{ padding: '0.6rem 0.4rem', textAlign: 'right', width: '92px' }}>Ціна $</th>
                <th style={{ padding: '0.6rem 0.4rem', textAlign: 'right', width: '82px' }}>Курс</th>
                <th style={{ padding: '0.6rem 0.4rem', textAlign: 'right', width: '92px' }}>Лекало грн</th>
                <th style={{ padding: '0.6rem 0.5rem', textAlign: 'right', width: '140px' }}>Разом грн</th>
                <th style={{ padding: '0.6rem 0.35rem', width: '36px' }}></th>
              </tr>
            </thead>
            <tbody>
              {monthRows.map((row) => {
                if (row.type === 'subtotal') {
                  const closedInfo = precomputedSubtotalPaidMap[row.id];
                  const isClosedSubtotal = Boolean(closedInfo?.isClosed);

                  if (isClosedSubtotal) {
                    return (
                      <tr
                        key={row.id}
                        style={{
                          background: '#ecfdf5',
                          borderBottom: '2px solid #86efac'
                        }}
                      >
                        <td style={{ textAlign: 'center', color: '#16a34a', fontWeight: '900' }}>✓</td>
                        <td colSpan="7" style={{ padding: '0.6rem 0.5rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <span
                              style={{
                                background: '#16a34a',
                                color: '#fff',
                                padding: '0.18rem 0.55rem',
                                borderRadius: '0.35rem',
                                fontSize: '0.74rem',
                                fontWeight: '800'
                              }}
                            >
                              ✓ Оплачено проміжок
                            </span>
                            <span style={{ fontSize: '0.78rem', color: '#166534', fontWeight: '700' }}>
                              ({closedInfo.count} шт • ${closedInfo.usd.toFixed(0)} •{' '}
                              {closedInfo.source === 'advance' ? 'з авансу' : 'окрема оплата'})
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: '0.6rem 0.5rem', textAlign: 'right' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              background: '#16a34a',
                              color: '#ffffff',
                              padding: '0.3rem 0.75rem',
                              borderRadius: '0.45rem',
                              fontWeight: '900',
                              fontSize: '0.88rem',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {closedInfo.amountUAH.toFixed(0)} грн
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleDeleteRow(row.id)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#94a3b8',
                              fontSize: '1.2rem',
                              cursor: 'pointer',
                              fontWeight: 'bold'
                            }}
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    );
                  }

                  const isCollapsed = row.isCollapsed || false;
                  const isThisActivated = activatedSubtotalId === row.id && hasCheckedPairs;
                  const finalAmount = getSubtotalFinalUAH(row.id);
                  const currentInputValue =
                    manualSubtotalAmounts[row.id] !== undefined
                      ? manualSubtotalAmounts[row.id]
                      : hasCheckedPairs
                      ? String(Math.round(checkedCalculatedUAH))
                      : '';

                  const calcSummaryText = hasCheckedPairs
                    ? `$${checkedUSD.toFixed(2)} × ${checkedRate}${
                        checkedPatternsUAH > 0 ? ` + ${checkedPatternsUAH.toFixed(0)} лекала` : ''
                      } = ${checkedCalculatedUAH.toFixed(0)} грн`
                    : 'Постав галочки біля пар для розрахунку проміжку';

                  return (
                    <tr
                      key={row.id}
                      style={{ background: '#fffbeb', borderBottom: '1px solid #fde68a' }}
                    >
                      <td></td>
                      <td colSpan="7" style={{ padding: '0.6rem 0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            onClick={() => handleRowChange(row.id, 'isCollapsed', !isCollapsed)}
                            style={{
                              background: '#f59e0b',
                              color: '#fff',
                              border: 'none',
                              padding: '0.15rem 0.4rem',
                              borderRadius: '0.3rem',
                              cursor: 'pointer',
                              fontSize: '0.7rem',
                              fontWeight: 'bold'
                            }}
                          >
                            {isCollapsed ? '▶' : '▼'}
                          </button>
                          <span style={{ fontWeight: '700', color: '#92400e', fontSize: '0.8rem' }}>
                            Підсумок проміжку:
                          </span>
                          {!isCollapsed && (
                            <>
                              <span style={{ fontSize: '0.75rem', color: '#78350f', fontWeight: '700' }}>
                                {calcSummaryText}
                              </span>
                              <input
                                type="number"
                                value={currentInputValue}
                                onChange={(e) =>
                                  setManualSubtotalAmounts({
                                    ...manualSubtotalAmounts,
                                    [row.id]: e.target.value
                                  })
                                }
                                placeholder="Сума грн"
                                style={{
                                  width: '105px',
                                  padding: '0.2rem 0.45rem',
                                  border: '1px solid #d97706',
                                  borderRadius: '0.3rem',
                                  fontSize: '0.82rem',
                                  background: '#fff',
                                  color: '#78350f',
                                  fontWeight: '800',
                                  textAlign: 'right'
                                }}
                              />
                            </>
                          )}
                        </div>
                      </td>

                      <td style={{ padding: '0.6rem 0.5rem', textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => handleActivateSubtotal(row.id)}
                          disabled={!hasCheckedPairs}
                          style={{
                            background: isThisActivated
                              ? '#16a34a'
                              : hasCheckedPairs
                              ? '#fef3c7'
                              : '#fef9c3',
                            color: isThisActivated ? '#ffffff' : '#92400e',
                            border: isThisActivated ? '2px solid #15803d' : '2px solid #f59e0b',
                            padding: '0.3rem 0.7rem',
                            borderRadius: '0.45rem',
                            fontWeight: '900',
                            fontSize: '0.85rem',
                            cursor: hasCheckedPairs ? 'pointer' : 'default',
                            whiteSpace: 'nowrap',
                            boxShadow: isThisActivated
                              ? '0 0 0 3px rgba(22, 163, 74, 0.25)'
                              : 'none'
                          }}
                        >
                          {hasCheckedPairs
                            ? `${finalAmount.toFixed(0)} грн${isThisActivated ? ' ✓' : ''}`
                            : '0 грн'}
                        </button>
                      </td>

                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => handleDeleteRow(row.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#ef4444',
                            fontSize: '1.2rem',
                            cursor: 'pointer',
                            fontWeight: 'bold'
                          }}
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  );
                }

                runningPairNumber += 1;
                const currentPairNumber = runningPairNumber;

                const qty = Number(row.quantity) || 0;
                const costUSD = Number(row.customCostUSD) || 0;
                const patternUAH = Number(row.patternCostUAH) || 0;
                const rRate = Number(row.rowRate) || 0;
                const isPaid = Boolean(row.isPaid);
                const isChecked = Boolean(row.isSelectedForPay);
                const paySource = row.paySource || 'advance';

                const rowOrderMonth = getOrderMonthFromRow(
                  row,
                  row._storageMonthKey || activeMonth,
                  resolvedYear
                );
                const isFromOtherMonth = rowOrderMonth !== activeMonth;

                const rowUSD = qty * costUSD;
                const shoePartUAH = rowUSD * rRate;
                const rowFullUAH = shoePartUAH + patternUAH;
                const shoeInfo = shoesCatalog.find((s) => s.id === row.shoeId);
                const displayName = shoeInfo
                  ? `${shoeInfo.id ? '[' + shoeInfo.id + '] ' : ''}${shoeInfo.name}`
                  : 'Модель не вибрана';
                const rowISO = toISODate(row.isoDate || row.date, rowOrderMonth);
                const displayDate = formatDayMonth(rowISO);
                const displayPaidDate = formatDayMonth(row.paidIsoDate || row.paidDate || row.paidAt || '');

                return (
                  <tr
                    key={row.id}
                    ref={(el) => (rowRefs.current[row.id] = el)}
                    style={{
                      background: isPaid
                        ? '#f1f5f9'
                        : isChecked
                        ? '#eef2ff'
                        : isFromOtherMonth
                        ? '#fff7ed'
                        : '#ffffff',
                      color: isPaid ? '#64748b' : '#0f172a',
                      borderBottom: '1px solid #e2e8f0',
                      transition: 'background 0.2s'
                    }}
                  >
                    <td style={{ padding: '0.5rem 0.35rem', textAlign: 'center' }}>
                      {isPaid ? (
                        <span style={{ color: '#16a34a', fontWeight: '900', fontSize: '0.9rem' }}>✓</span>
                      ) : (
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) =>
                            handleRowChange(row.id, 'isSelectedForPay', e.target.checked)
                          }
                          style={{
                            width: '18px',
                            height: '18px',
                            cursor: 'pointer',
                            accentColor: '#4f46e5'
                          }}
                        />
                      )}
                    </td>

                    <td
                      style={{
                        padding: '0.5rem 0.35rem',
                        textAlign: 'center',
                        fontWeight: '700',
                        color: '#94a3b8'
                      }}
                    >
                      {currentPairNumber}
                    </td>

                    <td style={{ padding: '0.5rem 0.35rem' }}>
                      {isPaid ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                          <span style={{ fontWeight: '600' }}>{displayDate || '—'}</span>
                          {isFromOtherMonth && (
                            <span style={{ fontSize: '0.62rem', fontWeight: '700', color: '#64748b' }}>
                              зам. {rowOrderMonth.slice(5, 7)}
                            </span>
                          )}
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                          <DayMonthPicker
                            isoValue={rowISO}
                            fallbackMonthKey={rowOrderMonth}
                            onChangeISO={(nextISO) => handleRowChange(row.id, 'isoDate', nextISO)}
                          />

                          {isFromOtherMonth && (
                            <span
                              style={{
                                fontSize: '0.64rem',
                                fontWeight: '800',
                                color: '#c2410c',
                                background: '#ffedd5',
                                padding: '0.08rem 0.3rem',
                                borderRadius: '0.25rem',
                                textAlign: 'center'
                              }}
                            >
                              з {rowOrderMonth.slice(5, 7)}
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    <td style={{ padding: '0.5rem 0.5rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                          <div
                            onClick={() => !isPaid && setActiveRowForPicker(row.id)}
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '0.35rem',
                              overflow: 'hidden',
                              background: '#e2e8f0',
                              border: isPaid ? '1px solid #cbd5e1' : '1px dashed #4f46e5',
                              cursor: isPaid ? 'default' : 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}
                          >
                            {row.photo ? (
                              <img
                                src={row.photo}
                                alt=""
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              />
                            ) : (
                              <span style={{ fontSize: '0.55rem', color: '#4f46e5' }}>фото</span>
                            )}
                          </div>

                          {isPaid ? (
                            <span style={{ fontWeight: '700' }}>{displayName}</span>
                          ) : (
                            <select
                              value={row.shoeId || ''}
                              onChange={(e) => handleRowChange(row.id, 'shoeId', e.target.value)}
                              style={{
                                flex: 1,
                                minWidth: '150px',
                                padding: '0.28rem 0.4rem',
                                border: '1px solid #cbd5e1',
                                borderRadius: '0.35rem',
                                fontSize: '0.8rem',
                                fontWeight: '600',
                                background: '#fff'
                              }}
                            >
                              <option value="">-- Виберіть модель --</option>
                              {manufacturerShoes.map((shoe) => (
                                <option key={shoe.id} value={shoe.id}>
                                  {shoe.id ? `[${shoe.id}] ` : ''}
                                  {shoe.name}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>

                        {isPaid && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                            <span
                              style={{
                                background: '#16a34a',
                                color: '#ffffff',
                                padding: '0.2rem 0.65rem',
                                borderRadius: '0.4rem',
                                fontWeight: '800',
                                fontSize: '0.72rem',
                                display: 'inline-block'
                              }}
                            >
                              ✓ Оплачено
                            </span>

                            {displayPaidDate && (
                              <span
                                style={{
                                  fontSize: '0.7rem',
                                  fontWeight: '800',
                                  color: '#15803d',
                                  background: '#f0fdf4',
                                  border: '1px solid #86efac',
                                  padding: '0.16rem 0.45rem',
                                  borderRadius: '0.35rem'
                                }}
                              >
                                опл. {displayPaidDate}
                              </span>
                            )}

                            <span
                              style={{
                                background: paySource === 'advance' ? '#dcfce7' : '#e0e7ff',
                                color: paySource === 'advance' ? '#166534' : '#3730a3',
                                border: '1px solid #cbd5e1',
                                padding: '0.18rem 0.5rem',
                                borderRadius: '0.35rem',
                                fontSize: '0.7rem',
                                fontWeight: '700'
                              }}
                            >
                              {paySource === 'advance' ? '💰 з авансу' : '💳 окрема оплата'}
                            </span>
                          </div>
                        )}
                      </div>
                    </td>

                    <td style={{ padding: '0.5rem 0.35rem', textAlign: 'center' }}>
                      {isPaid ? (
                        <span style={{ fontWeight: '700' }}>{qty}</span>
                      ) : (
                        <input
                          type="number"
                          min="1"
                          value={row.quantity}
                          onChange={(e) => handleRowChange(row.id, 'quantity', Number(e.target.value))}
                          style={{
                            width: '54px',
                            padding: '0.25rem 0.3rem',
                            border: '1px solid #cbd5e1',
                            borderRadius: '0.35rem',
                            fontSize: '0.8rem',
                            fontWeight: '700',
                            textAlign: 'center',
                            background: '#fff'
                          }}
                        />
                      )}
                    </td>

                    <td style={{ padding: '0.5rem 0.35rem', textAlign: 'right' }}>
                      {isPaid ? (
                        <span style={{ fontWeight: '600' }}>${rowUSD.toFixed(0)}</span>
                      ) : (
                        <input
                          type="number"
                          step="0.01"
                          placeholder="$"
                          value={row.customCostUSD}
                          onChange={(e) => handleRowChange(row.id, 'customCostUSD', e.target.value)}
                          style={{
                            width: '82px',
                            padding: '0.25rem 0.35rem',
                            border: '1px solid #cbd5e1',
                            borderRadius: '0.35rem',
                            fontSize: '0.8rem',
                            fontWeight: '700',
                            textAlign: 'right',
                            background: '#fff'
                          }}
                        />
                      )}
                    </td>

                    <td style={{ padding: '0.5rem 0.35rem', textAlign: 'right' }}>
                      {isPaid ? (
                        <span style={{ fontWeight: '600' }}>{rRate}</span>
                      ) : (
                        <input
                          type="number"
                          step="0.01"
                          value={row.rowRate}
                          onChange={(e) => handleRowChange(row.id, 'rowRate', e.target.value)}
                          style={{
                            width: '72px',
                            padding: '0.25rem 0.35rem',
                            border: '1px solid #a5b4fc',
                            borderRadius: '0.35rem',
                            fontSize: '0.8rem',
                            fontWeight: '800',
                            color: '#4f46e5',
                            textAlign: 'right',
                            background: '#fff'
                          }}
                        />
                      )}
                    </td>

                    <td style={{ padding: '0.5rem 0.35rem', textAlign: 'right' }}>
                      {isPaid ? (
                        <span style={{ fontWeight: '600' }}>{patternUAH || 0}</span>
                      ) : (
                        <input
                          type="number"
                          placeholder="0"
                          value={row.patternCostUAH || ''}
                          onChange={(e) => handleRowChange(row.id, 'patternCostUAH', e.target.value)}
                          style={{
                            width: '82px',
                            padding: '0.25rem 0.35rem',
                            border: '1px solid #fcd34d',
                            borderRadius: '0.35rem',
                            fontSize: '0.8rem',
                            fontWeight: '700',
                            color: '#d97706',
                            textAlign: 'right',
                            background: '#fff'
                          }}
                        />
                      )}
                    </td>

                    <td
                      style={{
                        padding: '0.5rem 0.5rem',
                        textAlign: 'right',
                        fontWeight: '900',
                        color: isPaid ? '#15803d' : '#0f172a'
                      }}
                    >
                      <div>{rowFullUAH.toFixed(0)} грн</div>
                      {isPaid && (
                        <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '600' }}>
                          (не сумується)
                        </div>
                      )}
                    </td>

                    <td style={{ padding: '0.5rem 0.25rem', textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={() => handleDeleteRow(row.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#cbd5e1',
                          fontSize: '1.1rem',
                          cursor: 'pointer'
                        }}
                        onMouseOver={(e) => (e.target.style.color = '#ef4444')}
                        onMouseOut={(e) => (e.target.style.color = '#cbd5e1')}
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>

            <tfoot>
              <tr
                style={{
                  background: '#f8fafc',
                  borderTop: '2px solid #cbd5e1',
                  fontWeight: '800'
                }}
              >
                <td style={{ padding: '0.75rem 0.35rem' }}></td>
                <td
                  style={{
                    padding: '0.75rem 0.35rem',
                    textAlign: 'center',
                    color: '#0f172a',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {hasCheckedPairs ? `${checkedPairs} шт` : `${unpaidPairs} шт`}
                </td>
                <td
                  colSpan="3"
                  style={{
                    padding: '0.75rem 0.5rem',
                    color: '#334155',
                    textTransform: 'uppercase',
                    fontSize: '0.8rem'
                  }}
                >
                  {hasCheckedPairs ? 'РАЗОМ (З ГАЛОЧКОЮ):' : 'РАЗОМ (НЕОПЛАЧЕНО):'}
                </td>
                <td style={{ padding: '0.75rem 0.35rem', textAlign: 'right', color: '#0f172a' }}>
                  ${hasCheckedPairs ? checkedUSD.toFixed(2) : unpaidUSD.toFixed(2)}
                </td>
                <td></td>
                <td
                  style={{
                    padding: '0.75rem 0.35rem',
                    textAlign: 'right',
                    color: '#d97706',
                    fontSize: '0.8rem'
                  }}
                >
                  {(hasCheckedPairs ? checkedPatternsUAH : unpaidPatternsUAH) > 0
                    ? `+${(hasCheckedPairs ? checkedPatternsUAH : unpaidPatternsUAH).toFixed(0)}`
                    : '0'}
                </td>
                <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right', fontSize: '0.95rem' }}>
                  <div style={{ color: '#0f172a' }}>
                    {hasCheckedPairs
                      ? `${checkedCalculatedUAH.toFixed(0)} грн`
                      : `${unpaidUAH.toFixed(0)} грн`}
                  </div>
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div
          style={{
            marginTop: '1rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.75rem'
          }}
        >
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={handleAddRow}
              className="btn-primary"
              style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
            >
              + Додати пару
            </button>
            <button
              type="button"
              onClick={handleAddSubtotal}
              className="btn-warning"
              style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
            >
              + Підсумок
            </button>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              flexWrap: 'wrap',
              justifyContent: 'flex-end'
            }}
          >
            <div style={{ fontSize: '0.85rem', fontWeight: '800', color: '#0f172a' }}>
              Неоплачено: {unpaidUAH.toFixed(0)} грн
            </div>

            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontSize: '0.78rem',
                fontWeight: '700',
                color: '#334155',
                background: '#f8fafc',
                padding: '0.25rem 0.5rem',
                borderRadius: '0.45rem',
                border: '1px solid #cbd5e1'
              }}
            >
              <span>Дата опл.:</span>
              <DayMonthPicker
                isoValue={paymentISO}
                fallbackMonthKey={activeMonth}
                onChangeISO={setPaymentISO}
                color="#4f46e5"
              />
            </div>

            <div
              style={{
                display: 'inline-flex',
                background: '#f1f5f9',
                padding: '0.2rem',
                borderRadius: '0.5rem',
                border: '1px solid #cbd5e1'
              }}
            >
              <button
                type="button"
                onClick={() => setSelectedPaySource('advance')}
                style={{
                  background: selectedPaySource === 'advance' ? '#16a34a' : 'transparent',
                  color: selectedPaySource === 'advance' ? '#ffffff' : '#475569',
                  border: 'none',
                  padding: '0.35rem 0.65rem',
                  borderRadius: '0.35rem',
                  fontSize: '0.78rem',
                  fontWeight: '800',
                  cursor: 'pointer'
                }}
              >
                💰 З авансу
              </button>
              <button
                type="button"
                onClick={() => setSelectedPaySource('separate')}
                style={{
                  background: selectedPaySource === 'separate' ? '#4f46e5' : 'transparent',
                  color: selectedPaySource === 'separate' ? '#ffffff' : '#475569',
                  border: 'none',
                  padding: '0.35rem 0.65rem',
                  borderRadius: '0.35rem',
                  fontSize: '0.78rem',
                  fontWeight: '800',
                  cursor: 'pointer'
                }}
              >
                💳 Окрема оплата
              </button>
            </div>

            <button
              type="button"
              onClick={handleConfirmPayment}
              disabled={!isPaymentActivated}
              style={{
                background: isPaymentActivated
                  ? selectedPaySource === 'advance'
                    ? '#16a34a'
                    : '#4f46e5'
                  : '#94a3b8',
                color: '#ffffff',
                border: 'none',
                padding: '0.55rem 1.2rem',
                borderRadius: '0.5rem',
                cursor: isPaymentActivated ? 'pointer' : 'not-allowed',
                fontWeight: '900',
                fontSize: '0.88rem',
                boxShadow: isPaymentActivated ? '0 2px 6px rgba(0,0,0,0.15)' : 'none',
                transition: 'all 0.2s'
              }}
            >
              {isPaymentActivated
                ? `${activePayAmount.toFixed(0)} грн • Оплатити (${
                    selectedPaySource === 'advance' ? 'з авансу' : 'окремо'
                  })`
                : 'Оплатити (тицьни суму в підсумку)'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}