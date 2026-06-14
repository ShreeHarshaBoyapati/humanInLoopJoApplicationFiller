export function formatDateDDMMYYYY(date: string): string {
  if (!date) return '';
  const parts = date.split('-');
  if (parts.length !== 3) return date;
  const [year, month, day] = parts;
  return `${day}-${month}-${year}`;
}
