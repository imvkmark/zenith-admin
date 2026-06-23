/**
 * 人民币金额转中文大写（财务规范：元角分、零的进位、万/亿单位）
 * 例：1234567.89 -> 壹佰贰拾叁万肆仟伍佰陆拾柒元捌角玖分
 */
const CN_NUMS = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖'];
const CN_INT_RADICE = ['', '拾', '佰', '仟'];
const CN_INT_UNIT = ['', '万', '亿', '兆'];

export function rmbUpper(value: number | string | null | undefined): string {
  const num = typeof value === 'number' ? value : Number(value);
  if (value === null || value === undefined || value === '' || !Number.isFinite(num)) return '';

  const negative = num < 0;
  const moneyStr = Math.abs(num).toFixed(2);
  const [integerNum, decimalNum] = moneyStr.split('.');

  let result = '';

  if (parseInt(integerNum, 10) > 0) {
    let zeroCount = 0;
    const intLen = integerNum.length;
    for (let i = 0; i < intLen; i++) {
      const n = integerNum.substr(i, 1);
      const p = intLen - i - 1;
      const q = Math.floor(p / 4);
      const m = p % 4;
      if (n === '0') {
        zeroCount += 1;
      } else {
        if (zeroCount > 0) result += CN_NUMS[0];
        zeroCount = 0;
        result += CN_NUMS[parseInt(n, 10)] + CN_INT_RADICE[m];
      }
      if (m === 0 && zeroCount < 4) result += CN_INT_UNIT[q];
    }
    result += '元';
  }

  if (decimalNum === '00') {
    result += result === '' ? '零元整' : '整';
  } else {
    const jiao = decimalNum.substr(0, 1);
    const fen = decimalNum.substr(1, 1);
    if (jiao !== '0') {
      result += CN_NUMS[parseInt(jiao, 10)] + '角';
    } else if (result !== '' && fen !== '0') {
      result += CN_NUMS[0];
    }
    if (fen !== '0') result += CN_NUMS[parseInt(fen, 10)] + '分';
  }

  return (negative ? '负' : '') + result;
}
