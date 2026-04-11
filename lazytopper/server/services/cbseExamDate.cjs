const CBSE_EXAM_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const cbseExamCache = new Map();

function parseDmyToIso(raw) {
  const match = String(raw || '').match(/^(\d{2})[./-](\d{2})[./-](\d{4})$/);
  if (!match) return null;
  const dd = Number(match[1]);
  const mm = Number(match[2]);
  const yyyy = Number(match[3]);
  if (!Number.isFinite(dd) || !Number.isFinite(mm) || !Number.isFinite(yyyy)) return null;
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;
  return `${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
}

function normalizeDateToIso(raw) {
  const dmy = parseDmyToIso(raw);
  if (dmy) return dmy;
  const parsed = new Date(String(raw || '').trim());
  if (Number.isNaN(parsed.getTime())) return null;
  const yyyy = parsed.getFullYear();
  const mm = String(parsed.getMonth() + 1).padStart(2, '0');
  const dd = String(parsed.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function predictCbseExamDate(studentClass) {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  let year = currentMonth >= 8 ? now.getFullYear() + 1 : now.getFullYear();
  const dayNum = studentClass === '12' ? 16 : 15;
  const todayUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  let examUtc = Date.UTC(year, 1, dayNum);
  if (examUtc < todayUtc) {
    year += 1;
    examUtc = Date.UTC(year, 1, dayNum);
  }
  const day = String(dayNum).padStart(2, '0');
  return `${year}-02-${day}`;
}

function extractExplicitExamDate(rowText) {
  const nowYear = new Date().getFullYear();
  const dateMatches = [...String(rowText || '').matchAll(/(\d{2})[./-](\d{2})[./-](\d{4})/g)];
  for (const match of dateMatches) {
    const dd = Number(match[1]);
    const mm = Number(match[2]);
    const yyyy = Number(match[3]);
    if (!Number.isFinite(dd) || !Number.isFinite(mm) || !Number.isFinite(yyyy)) continue;
    if (yyyy < nowYear || yyyy > nowYear + 1) continue;
    if (mm < 1 || mm > 4) continue;
    if (dd < 1 || dd > 31) continue;
    return `${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
  }
  return null;
}

function extractCbseNoticeFromHtml(html, studentClass) {
  const classMatcher = studentClass === '12'
    ? /(revised\s+datesheet\s+class\s*xii|date\s*sheet\s*for\s*class\s*xii|board\s*examinations\s*-\s*\d{4})/i
    : /(revised\s+datesheet\s+class\s*x(?!ii)|date\s*sheet\s*for\s*class\s*x\s*and\s*xii|board\s*examinations\s*-\s*\d{4})/i;

  const rows = String(html || '').match(/<tr[\s\S]*?<\/tr>/gi) || [];
  for (const row of rows) {
    const rowText = row.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (!classMatcher.test(rowText)) continue;

    const dateCellMatch = row.match(/<td[^>]*>\s*(\d{2}[./-]\d{2}[./-]\d{4})\s*<\/td>/i);
    const noticeDate = dateCellMatch ? parseDmyToIso(dateCellMatch[1]) : null;

    const hrefMatch = row.match(/href="([^"]+)"/i);
    const href = hrefMatch && hrefMatch[1] ? hrefMatch[1] : '';
    const noticeUrl = href
      ? (href.startsWith('http') ? href : `https://www.cbse.gov.in/cbsenew/${href.replace(/^\/+/, '')}`)
      : 'https://www.cbse.gov.in/cbsenew/examination_circular.html';

    const explicitExamDate = extractExplicitExamDate(rowText);
    return {
      noticeDate,
      noticeUrl,
      explicitExamDate,
    };
  }
  return null;
}

async function getCbseExamDateInfo(studentClass) {
  const cls = String(studentClass || '10') === '12' ? '12' : '10';
  const cacheKey = `class_${cls}`;
  const cached = cbseExamCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const predicted = predictCbseExamDate(cls);
  let result = {
    class: cls,
    source: 'predicted',
    examDate: predicted,
    noticeUrl: 'https://www.cbse.gov.in/cbsenew/examination_circular.html',
    note: 'Using predicted board start date from prior CBSE trends.',
  };

  const overrideEnvKey = cls === '12' ? 'CBSE_CLASS12_OFFICIAL_DATE' : 'CBSE_CLASS10_OFFICIAL_DATE';
  const overrideRaw = String(process.env[overrideEnvKey] || '').trim();
  const overrideIso = normalizeDateToIso(overrideRaw);
  if (overrideIso) {
    result = {
      class: cls,
      source: 'official',
      examDate: overrideIso,
      noticeUrl: 'manual_env_override',
      note: `Manual official override from ${overrideEnvKey}.`,
    };
    cbseExamCache.set(cacheKey, {
      value: result,
      expiresAt: Date.now() + CBSE_EXAM_CACHE_TTL_MS,
    });
    return result;
  }

  try {
    const res = await fetch('https://www.cbse.gov.in/cbsenew/examination_circular.html', {
      headers: {
        'user-agent': 'LazyTopper/1.0',
      },
    });
    if (res.ok) {
      const html = await res.text();
      const notice = extractCbseNoticeFromHtml(html, cls);
      if (notice) {
        if (notice.explicitExamDate) {
          result = {
            class: cls,
            source: 'official',
            examDate: notice.explicitExamDate,
            noticeUrl: notice.noticeUrl,
            noticeDate: notice.noticeDate,
            note: 'Exam date extracted from CBSE circular notice.',
          };
        } else {
          result = {
            class: cls,
            source: 'predicted',
            examDate: predicted,
            noticeUrl: notice.noticeUrl,
            noticeDate: notice.noticeDate,
            note: 'CBSE notice found, but exact exam start date was not machine-readable; predicted date used.',
          };
        }
      }
    }
  } catch (_err) {
    // Keep predicted fallback.
  }

  cbseExamCache.set(cacheKey, {
    value: result,
    expiresAt: Date.now() + CBSE_EXAM_CACHE_TTL_MS,
  });
  return result;
}

/**
 * Helper to send JSON with CORS headers.
 * @param {import('http').ServerResponse} res
 * @param {number} status
 * @param {any} body
 */

module.exports = { extractCbseNoticeFromHtml, getCbseExamDateInfo, extractExplicitExamDate, parseDmyToIso, normalizeDateToIso, predictCbseExamDate };
