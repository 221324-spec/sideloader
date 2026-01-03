function chunkToWords(num) {
  const ones = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
  const teens = ['ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
  const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

  if (num === 0) return '';

  let words = '';

  if (num >= 100) {
    words += ones[Math.floor(num / 100)] + ' hundred ';
    num %= 100;
  }

  if (num >= 20) {
    words += tens[Math.floor(num / 10)] + ' ';
    num %= 10;
  } else if (num >= 10) {
    words += teens[num - 10] + ' ';
    return words.trim();
  }

  if (num > 0) {
    words += ones[num] + ' ';
  }

  return words.trim();
}

function numberToWords(amount) {
  if (amount === 0) return 'zero';

  const [integerPart, decimalPart] = amount.toString().split('.');

  let words = '';
  let num = parseInt(integerPart);

  if (num >= 1000000) {
    words += chunkToWords(Math.floor(num / 1000000)) + ' million ';
    num %= 1000000;
  }

  if (num >= 1000) {
    words += chunkToWords(Math.floor(num / 1000)) + ' thousand ';
    num %= 1000;
  }

  if (num > 0) {
    words += chunkToWords(num) + ' ';
  }

  words = words.trim();

  if (decimalPart && parseInt(decimalPart) > 0) {
    words += ' and ' + chunkToWords(parseInt(decimalPart)) + ' fils';
  }

  return words.trim();
}

module.exports = { numberToWords };