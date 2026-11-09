export function number(value, name, {min = 0, max = 1e7, integer = false, positive = false} = {}) {
  if (!['string','number'].includes(typeof value) || (typeof value==='string' && !value.trim())) throw new Error(`${name} is required.`);
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || n > max || (positive && n === 0) || (integer && !Number.isInteger(n))) {
    throw new Error(`${name} must be ${integer ? 'a whole number' : 'a number'} ${positive ? 'greater than zero' : `from ${min}`} and at most ${max}.`);
  }
  return n;
}
export function boardFeet(t, w, l, q) {
  return number(t, 'Thickness', {positive:true,max:100}) * number(w, 'Width', {positive:true,max:100}) * number(l, 'Length', {positive:true,max:200}) / 12 * number(q, 'Quantity', {positive:true,integer:true,max:100000});
}
export function logScale(d, l) {
  // Doyle rule: (small-end diameter inside bark - 4)^2 * length / 16.
  return (number(d, 'Diameter', {min:5,max:100}) - 4) ** 2 * number(l, 'Length', {positive:true,max:100}) / 16;
}
export function jobQuote(h, r, m, e, margin) {
  const cost = number(h, 'Labor hours') * number(r, 'Hourly rate') + number(m, 'Materials') + number(e, 'Equipment');
  const pct = number(margin, 'Margin', {max:95});
  const quote = cost / (1 - pct / 100);
  return {cost, quote, profit:quote-cost};
}
export function labor(w, h, r) {
  const hours = number(w, 'Workers', {integer:true,positive:true,max:10000}) * number(h, 'Hours each', {positive:true,max:10000});
  return {hours, cost:hours * number(r, 'Hourly rate')};
}
