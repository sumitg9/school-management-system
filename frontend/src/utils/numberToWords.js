/**
 * Converts a numeric amount to Indian Rupee Words representation.
 * E.g. 15450 -> "Rupees Fifteen Thousand Four Hundred Fifty Only"
 */

const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen'
];

const TENS = [
  '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
];

function convertLessThanThousand(num) {
  let str = '';
  if (num >= 100) {
    str += ONES[Math.floor(num / 100)] + ' Hundred ';
    num %= 100;
  }
  if (num >= 20) {
    str += TENS[Math.floor(num / 10)] + (num % 10 !== 0 ? ' ' + ONES[num % 10] : '');
  } else if (num > 0) {
    str += ONES[num];
  }
  return str.trim();
}

export function numberToWords(amount) {
  const num = Math.round(Number(amount) || 0);
  if (num === 0) return 'Rupees Zero Only';
  if (num < 0) return 'Negative Rupees ' + numberToWords(Math.abs(num)).replace('Rupees ', '');

  let crore = Math.floor(num / 10000000);
  let remainder = num % 10000000;

  let lakh = Math.floor(remainder / 100000);
  remainder = remainder % 100000;

  let thousand = Math.floor(remainder / 1000);
  remainder = remainder % 1000;

  let hundredRemainder = remainder;

  let parts = [];

  if (crore > 0) {
    parts.push(convertLessThanThousand(crore) + ' Crore');
  }
  if (lakh > 0) {
    parts.push(convertLessThanThousand(lakh) + ' Lakh');
  }
  if (thousand > 0) {
    parts.push(convertLessThanThousand(thousand) + ' Thousand');
  }
  if (hundredRemainder > 0) {
    parts.push(convertLessThanThousand(hundredRemainder));
  }

  const result = parts.join(' ').trim();
  return result ? `Rupees ${result} Only` : 'Rupees Zero Only';
}

export default numberToWords;
