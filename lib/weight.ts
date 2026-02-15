export type WeightUnit = 'kg' | 'lb';

const KG_TO_LB = 2.2046226218;

export const DEFAULT_WEIGHT_UNIT: WeightUnit = 'kg';

export function isWeightUnit(value: string): value is WeightUnit {
  return value === 'kg' || value === 'lb';
}

export function convertKgToUnit(weightKg: number, unit: WeightUnit): number {
  if (unit === 'kg') {
    return weightKg;
  }

  return weightKg * KG_TO_LB;
}

export function convertUnitToKg(weight: number, unit: WeightUnit): number {
  if (unit === 'kg') {
    return weight;
  }

  return weight / KG_TO_LB;
}

export function getDefaultWeeklyIncrementKg(unit: WeightUnit): number {
  if (unit === 'kg') {
    return 2.5;
  }

  return convertUnitToKg(5, 'lb');
}

export function parseWeightInputToKg(value: string, unit: WeightUnit): number | null {
  const parsed = Number.parseFloat(value);

  if (!Number.isFinite(parsed)) {
    return null;
  }

  return roundTo(convertUnitToKg(parsed, unit), 3);
}

export function formatWeightFromKg(weightKg: number, unit: WeightUnit): string {
  const converted = convertKgToUnit(weightKg, unit);

  if (Math.abs(converted) >= 100) {
    return `${stripTrailingZeroes(converted.toFixed(0))} ${unit}`;
  }

  return `${stripTrailingZeroes(converted.toFixed(1))} ${unit}`;
}

export function isAssistedWeightKg(weightKg: number): boolean {
  return weightKg < 0;
}

export function formatWeightInputFromKg(weightKg: number, unit: WeightUnit): string {
  const converted = convertKgToUnit(weightKg, unit);

  if (Math.abs(converted) >= 100) {
    return stripTrailingZeroes(converted.toFixed(0));
  }

  return stripTrailingZeroes(converted.toFixed(1));
}

function stripTrailingZeroes(value: string): string {
  return value.replace(/\.0$/, '').replace(/(\.\d*[1-9])0+$/, '$1');
}

function roundTo(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
