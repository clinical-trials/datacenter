'use strict';
const FootprintScale = Object.freeze({
  calculate({mode, capacityMW, averagePercent, year, annualMWh, monthlyKWh}) {
    const valid = n => typeof n === 'number' && Number.isFinite(n);
    if (!valid(monthlyKWh) || monthlyKWh <= 0) throw new Error('Choose a valid residential comparison.');
    let energy, hours = null;
    if (mode === 'capacity') {
      if (!valid(capacityMW) || capacityMW < 0 || capacityMW > 100000) throw new Error('Facility capacity must be between 0 and 100,000 MW.');
      if (!valid(averagePercent) || averagePercent < 0 || averagePercent > 100) throw new Error('Average use must be between 0% and 100% of stated capacity.');
      if (!Number.isInteger(year) || year < 2000 || year > 2100) throw new Error('Enter a calculation year from 2000 to 2100.');
      hours = (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)) ? 8784 : 8760;
      energy = capacityMW * averagePercent / 100 * hours;
    } else if (mode === 'annual') {
      if (!valid(annualMWh) || annualMWh < 0 || annualMWh > 1e10) throw new Error('Enter a full-year electricity total between 0 and 10 billion MWh.');
      energy = annualMWh;
    } else throw new Error('Choose capacity assumptions or an annual electricity total.');
    return {annualMWh: energy, hours, annualCustomerKWh: monthlyKWh * 12, customerEquivalents: energy * 1000 / (monthlyKWh * 12)};
  }
});
