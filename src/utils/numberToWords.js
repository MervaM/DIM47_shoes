export function numberToWords(n) {
  if (isNaN(n) || n <= 0) return 'нуль гривень';
  
  const units = ['', 'один', 'два', 'три', 'чотири', 'п’ять', 'шість', 'сім', 'вісім', 'дев’ять'];
  const teens = ['десять', 'одинадцять', 'дванадцять', 'тринадцять', 'чотирнадцять', 'п’ятнадцять', 'шістнадцять', 'сімнадцять', 'вісімнадцять', 'дев’ятнадцять'];
  const tens = ['', '', 'двадцять', 'тридцять', 'сорок', 'п’ятдесят', 'шістдесят', 'сімдесят', 'вісімдесят', 'дев’яносто'];
  const hundreds = ['', 'сто', 'двісті', 'триста', 'чотириста', 'п’ятсот', 'шістсот', 'сімсот', 'вісімсот', 'дев’ятсот'];

  function getHundreds(num) {
    let res = '';
    const h = Math.floor(num / 100);
    const t = Math.floor((num % 100) / 10);
    const u = num % 10;

    if (h) res += hundreds[h] + ' ';
    if (t === 1) {
      res += teens[u] + ' ';
    } else {
      if (t) res += tens[t] + ' ';
      if (u) {
        if (u === 1) res += 'одна ';
        else if (u === 2) res += 'дві ';
        else res += units[u] + ' ';
      }
    }
    return res.trim();
  }

  const thousands = Math.floor(n / 1000);
  const remainder = n % 1000;

  let result = '';

  if (thousands > 0) {
    if (thousands === 1) result += 'тисяча ';
    else if (thousands === 2) result += 'дві тисячі ';
    else if (thousands >= 3 && thousands <= 4) result += getHundreds(thousands) + ' тисячі ';
    else result += getHundreds(thousands) + ' тисяч ';
  }

  result += getHundreds(remainder);

  const lastDigit = n % 10;
  const lastTwoDigits = n % 100;
  let currency = 'гривень';
  if (lastTwoDigits < 10 || lastTwoDigits > 20) {
    if (lastDigit === 1) currency = 'гривня';
    else if (lastDigit >= 2 && lastDigit <= 4) currency = 'гривні';
  }

  return (result.charAt(0).toUpperCase() + result.slice(1) + ' ' + currency).trim();
}