/**
 * Unit conversion module for kitchen inventory and recipe operations.
 * Handles weight, volume, and discrete count dimensional conversions.
 */

export class UnitConversionError extends Error {
  constructor(message, fromUnit, toUnit) {
    super(message);
    this.name = 'UnitConversionError';
    this.fromUnit = fromUnit;
    this.toUnit = toUnit;
  }
}

// Map of canonical units and conversion multipliers to standard base units
// Base weight: grams (g)
// Base volume: milliliters (ml)
// Base count: individual count (1)

const UNIT_DEFINITIONS = {
  // Weight units (base: g)
  g: { dimension: 'weight', toBase: 1, label: 'g' },
  gram: { dimension: 'weight', toBase: 1, label: 'g' },
  grams: { dimension: 'weight', toBase: 1, label: 'g' },
  kg: { dimension: 'weight', toBase: 1000, label: 'kg' },
  kilo: { dimension: 'weight', toBase: 1000, label: 'kg' },
  kilogram: { dimension: 'weight', toBase: 1000, label: 'kg' },
  kilograms: { dimension: 'weight', toBase: 1000, label: 'kg' },
  mg: { dimension: 'weight', toBase: 0.001, label: 'mg' },
  milligram: { dimension: 'weight', toBase: 0.001, label: 'mg' },
  milligrams: { dimension: 'weight', toBase: 0.001, label: 'mg' },
  oz: { dimension: 'weight', toBase: 28.349523, label: 'oz' },
  ounce: { dimension: 'weight', toBase: 28.349523, label: 'oz' },
  ounces: { dimension: 'weight', toBase: 28.349523, label: 'oz' },
  lb: { dimension: 'weight', toBase: 453.59237, label: 'lb' },
  lbs: { dimension: 'weight', toBase: 453.59237, label: 'lb' },
  pound: { dimension: 'weight', toBase: 453.59237, label: 'lb' },
  pounds: { dimension: 'weight', toBase: 453.59237, label: 'lb' },

  // Volume units (base: ml)
  ml: { dimension: 'volume', toBase: 1, label: 'ml' },
  milliliter: { dimension: 'volume', toBase: 1, label: 'ml' },
  milliliters: { dimension: 'volume', toBase: 1, label: 'ml' },
  millilitre: { dimension: 'volume', toBase: 1, label: 'ml' },
  millilitres: { dimension: 'volume', toBase: 1, label: 'ml' },
  l: { dimension: 'volume', toBase: 1000, label: 'l' },
  liter: { dimension: 'volume', toBase: 1000, label: 'l' },
  liters: { dimension: 'volume', toBase: 1000, label: 'l' },
  litre: { dimension: 'volume', toBase: 1000, label: 'l' },
  litres: { dimension: 'volume', toBase: 1000, label: 'l' },
  cl: { dimension: 'volume', toBase: 10, label: 'cl' },
  centiliter: { dimension: 'volume', toBase: 10, label: 'cl' },
  centilitre: { dimension: 'volume', toBase: 10, label: 'cl' },
  tsp: { dimension: 'volume', toBase: 5, label: 'tsp' },
  teaspoon: { dimension: 'volume', toBase: 5, label: 'tsp' },
  teaspoons: { dimension: 'volume', toBase: 5, label: 'tsp' },
  tbsp: { dimension: 'volume', toBase: 15, label: 'tbsp' },
  tablespoon: { dimension: 'volume', toBase: 15, label: 'tbsp' },
  tablespoons: { dimension: 'volume', toBase: 15, label: 'tbsp' },
  cup: { dimension: 'volume', toBase: 240, label: 'cup' },
  cups: { dimension: 'volume', toBase: 240, label: 'cup' },

  // Discrete / Count units (base: count 1)
  pcs: { dimension: 'count', toBase: 1, label: 'pcs' },
  piece: { dimension: 'count', toBase: 1, label: 'pcs' },
  pieces: { dimension: 'count', toBase: 1, label: 'pcs' },
  count: { dimension: 'count', toBase: 1, label: 'pcs' },
  item: { dimension: 'count', toBase: 1, label: 'pcs' },
  items: { dimension: 'count', toBase: 1, label: 'pcs' },
  unit: { dimension: 'count', toBase: 1, label: 'pcs' },
  units: { dimension: 'count', toBase: 1, label: 'pcs' },
  portion: { dimension: 'count', toBase: 1, label: 'portion' },
  portions: { dimension: 'count', toBase: 1, label: 'portion' },
  bunch: { dimension: 'count_bunch', toBase: 1, label: 'bunches' },
  bunches: { dimension: 'count_bunch', toBase: 1, label: 'bunches' },
  can: { dimension: 'count_can', toBase: 1, label: 'cans' },
  cans: { dimension: 'count_can', toBase: 1, label: 'cans' },
  bottle: { dimension: 'count_bottle', toBase: 1, label: 'bottles' },
  bottles: { dimension: 'count_bottle', toBase: 1, label: 'bottles' }
};

/**
 * Normalizes a unit string (trims, converts to lowercase)
 * @param {string} unit 
 * @returns {string}
 */
export function normalizeUnit(unit) {
  if (!unit || typeof unit !== 'string') return '';
  return unit.trim().toLowerCase();
}

/**
 * Checks if two unit strings belong to the same dimensional family
 * @param {string} unitA 
 * @param {string} unitB 
 * @returns {boolean}
 */
export function areUnitsCompatible(unitA, unitB) {
  const normA = normalizeUnit(unitA);
  const normB = normalizeUnit(unitB);

  if (normA === normB) return true;

  const defA = UNIT_DEFINITIONS[normA];
  const defB = UNIT_DEFINITIONS[normB];

  if (!defA || !defB) return false;
  return defA.dimension === defB.dimension;
}

/**
 * Converts a quantity from one unit to another
 * @param {number} amount 
 * @param {string} fromUnit 
 * @param {string} toUnit 
 * @returns {number} converted amount
 * @throws {UnitConversionError} if conversion is invalid or incompatible
 */
export function convertUnit(amount, fromUnit, toUnit) {
  if (typeof amount !== 'number' || isNaN(amount)) {
    throw new Error(`Invalid amount for conversion: ${amount}`);
  }

  const normFrom = normalizeUnit(fromUnit);
  const normTo = normalizeUnit(toUnit);

  if (normFrom === normTo) {
    return amount;
  }

  const defFrom = UNIT_DEFINITIONS[normFrom];
  const defTo = UNIT_DEFINITIONS[normTo];

  if (!defFrom) {
    throw new UnitConversionError(`Unknown source unit: "${fromUnit}"`, fromUnit, toUnit);
  }
  if (!defTo) {
    throw new UnitConversionError(`Unknown target unit: "${toUnit}"`, fromUnit, toUnit);
  }

  if (defFrom.dimension !== defTo.dimension) {
    throw new UnitConversionError(
      `Cannot convert between incompatible dimensions: "${fromUnit}" (${defFrom.dimension}) and "${toUnit}" (${defTo.dimension})`,
      fromUnit,
      toUnit
    );
  }

  // Convert from source unit to base unit, then from base unit to target unit
  const baseValue = amount * defFrom.toBase;
  const targetValue = baseValue / defTo.toBase;

  return targetValue;
}

/**
 * Formats a quantity and unit nicely for display with clean precision
 * @param {number} quantity 
 * @param {string} unit 
 * @returns {string} e.g. "1.5 kg", "180 g"
 */
export function formatQuantity(quantity, unit) {
  if (typeof quantity !== 'number' || isNaN(quantity)) return `0 ${unit}`;
  // Round to max 3 decimal places without trailing zeroes
  const formatted = Math.round(quantity * 1000) / 1000;
  return `${formatted} ${unit}`;
}
