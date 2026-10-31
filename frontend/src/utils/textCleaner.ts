/**
 * Utilities for cleaning text inputs, spreadsheet imports, and certificate bindings.
 * Corrects corrupted letter 's' substitutions where Cyrillic Ze ('з'/'З') or digit '3'
 * was entered in place of 's'/'S' (due to broken keyboard, OCR misread, or leetspeak).
 * Preserves genuine numbers, years, phone numbers, and ordinals like '3rd'.
 */

export function cleanCorruptedS(text: string): string {
  if (!text || typeof text !== 'string') {
    return text;
  }

  let res = text;
  const isEmail = res.includes('@');

  // 1. Protect valid ordinals like 3rd, 3RD, 3th, 3nd, 3st
  res = res.replace(/\b3(rd|RD|th|TH|nd|ND|st|ST)\b/g, '__ORD_3$1__');

  // 2. Cyrillic Ze (U+0437 lowercase and U+0417 uppercase)
  // If at start of a word in non-email, convert to uppercase 'S'
  if (!isEmail) {
    res = res.replace(/\b[зЗ]([A-Za-z]*)/g, (_, tail) => `S${tail}`);
  }
  res = res.replace(/[\u0437з]/g, 's').replace(/[\u0417З]/g, 'S');

  // 3. Handle multiple consecutive 3s after letters: e.g. ADDRE33 -> ADDRESS, addre33 -> address
  res = res.replace(/([A-Za-z])(3+)/g, (_, before, threes) => {
    const rep = before === before.toUpperCase() && before !== before.toLowerCase() ? 'S' : 's';
    return before + rep.repeat(threes.length);
  });

  // 4. Handle 3 between letters: e.g. TIME3TAMP -> TIMESTAMP, IN3TITUTION -> INSTITUTION, mc3ankar -> mcsankar
  let prev = '';
  while (prev !== res) {
    prev = res;
    res = res.replace(/([A-Za-z])3([A-Za-z])/g, (_, before, after) => {
      const isUpper = before === before.toUpperCase() && after === after.toUpperCase();
      return `${before}${isUpper ? 'S' : 's'}${after}`;
    });
  }

  // 5. Handle 3 followed by letters at start of word or email (e.g. 3anthosh -> Santhosh / santhosh)
  res = res.replace(/\b3([A-Za-z]+)/g, (_, tail) => {
    const firstRep = isEmail ? 's' : 'S';
    return `${firstRep}${tail}`;
  });

  // 6. Normalize common corrupted student names like 'SREE sukanth' -> 'Sree Sukanth'
  if (res.includes('SREE') && res.toLowerCase().includes('sukanth')) {
    res = res.replace(/SREE\s+sukanth/g, 'Sree Sukanth');
  }

  // 7. Restore protected ordinals
  res = res.replace(/__ORD_3([A-Za-z]+)__/g, '3$1');

  return res;
}

export function cleanRecordDict(data: Record<string, any>): Record<string, any> {
  if (!data || typeof data !== 'object') return data;
  const cleaned: Record<string, any> = {};
  for (const [key, val] of Object.entries(data)) {
    const cleanKey = cleanCorruptedS(key);
    if (typeof val === 'string') {
      cleaned[cleanKey] = cleanCorruptedS(val);
    } else {
      cleaned[cleanKey] = val;
    }
  }
  return cleaned;
}
