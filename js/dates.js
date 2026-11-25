// Dates are stored as a real `date` column plus a precision ('year' | 'month' | 'day').
// An approximate date is stored as the first day of its period (e.g. 1987 -> 1987-01-01, precision 'year').

function formatDate(date, precision) {
  const [y, m, d] = date.split('-').map(Number);
  if (precision === 'year') return String(y);
  const dt = new Date(y, m - 1, d || 1);
  if (precision === 'month') return dt.toLocaleDateString('nl-BE', { month: 'long', year: 'numeric' });
  return dt.toLocaleDateString('nl-BE', { day: 'numeric', month: 'long', year: 'numeric' });
}

// year is required; month and day are optional. Returns { date, precision } or null if invalid.
function buildDate(year, month, day) {
  const y = Number(year);
  if (!Number.isInteger(y) || y < 1000 || y > 2999) return null;
  const m = month ? Number(month) : 0;
  const d = m && day ? Number(day) : 0;
  if (m && (m < 1 || m > 12)) return null;
  if (d) {
    const check = new Date(y, m - 1, d);
    if (check.getMonth() !== m - 1 || check.getDate() !== d) return null;
  }
  const pad = (n) => String(n).padStart(2, '0');
  return {
    date: `${y}-${pad(m || 1)}-${pad(d || 1)}`,
    precision: d ? 'day' : m ? 'month' : 'year',
  };
}
