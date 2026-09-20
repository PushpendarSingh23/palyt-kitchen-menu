/**
 * Menu and Recipe Management Module.
 * Calculates dish availability, handles recipe-to-inventory resolution,
 * and processes diner orders with atomic stock deductions.
 */

import { convertUnit, formatQuantity, UnitConversionError } from './units.js';

export const AvailabilityStatus = {
  AVAILABLE: 'AVAILABLE',
  BELOW_PAR: 'BELOW_PAR',
  OUT_OF_STOCK: 'OUT_OF_STOCK',
  MISSING_INGREDIENT: 'MISSING_INGREDIENT',
  CONVERSION_ERROR: 'CONVERSION_ERROR'
};

/**
 * Evaluates the availability of a single dish against current inventory.
 * A dish is available iff:
 * 1. All required ingredients exist in stock.
 * 2. No required ingredient is below its par level.
 * 3. The current stock has at least enough quantity to cook 1 portion.
 * 
 * @param {Object} dish 
 * @param {InventoryStore} inventoryStore 
 * @returns {Object} Availability detail object
 */
export function evaluateDishAvailability(dish, inventoryStore) {
  if (!dish || !dish.ingredients || dish.ingredients.length === 0) {
    return {
      dishId: dish?.id,
      dishName: dish?.name,
      isAvailable: false,
      status: AvailabilityStatus.MISSING_INGREDIENT,
      reasons: ['Dish has no recipe ingredients defined.'],
      bottlenecks: [],
      maxPortions: 0
    };
  }

  const reasons = [];
  const bottlenecks = [];
  let isAvailable = true;
  let maxPortions = Infinity;
  let primaryStatus = AvailabilityStatus.AVAILABLE;

  for (const recipeIng of dish.ingredients) {
    // 1. Locate ingredient in inventory by id or name
    let stockItem = null;
    if (recipeIng.id) {
      stockItem = inventoryStore.getById(recipeIng.id);
    }
    if (!stockItem && recipeIng.name) {
      stockItem = inventoryStore.getByName(recipeIng.name);
    }

    // Edge case: Ingredient deleted or missing from inventory
    if (!stockItem) {
      isAvailable = false;
      primaryStatus = AvailabilityStatus.MISSING_INGREDIENT;
      const msg = `Missing ingredient: "${recipeIng.name || recipeIng.id}" is not in kitchen inventory.`;
      reasons.push(msg);
      bottlenecks.push({
        ingredientName: recipeIng.name || recipeIng.id,
        reason: 'Missing from inventory',
        status: AvailabilityStatus.MISSING_INGREDIENT
      });
      maxPortions = 0;
      continue;
    }

    // 2. Unit conversion from recipe unit to stock unit
    let requiredInStockUnit = 0;
    try {
      requiredInStockUnit = convertUnit(recipeIng.quantity, recipeIng.unit, stockItem.unit);
    } catch (err) {
      isAvailable = false;
      primaryStatus = AvailabilityStatus.CONVERSION_ERROR;
      const msg = `Unit mismatch for "${stockItem.name}": recipe uses "${recipeIng.unit}" but stock is tracked in "${stockItem.unit}".`;
      reasons.push(msg);
      bottlenecks.push({
        ingredientName: stockItem.name,
        reason: msg,
        status: AvailabilityStatus.CONVERSION_ERROR
      });
      maxPortions = 0;
      continue;
    }

    // 3. Check if ingredient is below par level (The Core Product Rule)
    const isBelowPar = stockItem.quantity < stockItem.par;
    
    // 4. Check physical stock availability (enough for at least 1 portion)
    const hasEnoughForOne = stockItem.quantity >= requiredInStockUnit;

    // Calculate how many portions can be made above par level
    const availableAbovePar = Math.max(0, stockItem.quantity - stockItem.par);
    const portionsAbovePar = requiredInStockUnit > 0 ? Math.floor(availableAbovePar / requiredInStockUnit) : 0;
    
    // Calculate absolute physical portions before reaching 0
    const physicalPortions = requiredInStockUnit > 0 ? Math.floor(stockItem.quantity / requiredInStockUnit) : 0;

    if (portionsAbovePar < maxPortions) {
      maxPortions = portionsAbovePar;
    }

    if (isBelowPar) {
      isAvailable = false;
      if (primaryStatus === AvailabilityStatus.AVAILABLE) {
        primaryStatus = AvailabilityStatus.BELOW_PAR;
      }
      const deficit = Math.round((stockItem.par - stockItem.quantity) * 1000) / 1000;
      const msg = `"${stockItem.name}" is below par (${formatQuantity(stockItem.quantity, stockItem.unit)} in stock, par is ${formatQuantity(stockItem.par, stockItem.unit)} - deficit of ${formatQuantity(deficit, stockItem.unit)}).`;
      reasons.push(msg);
      bottlenecks.push({
        ingredientId: stockItem.id,
        ingredientName: stockItem.name,
        currentStock: stockItem.quantity,
        parLevel: stockItem.par,
        unit: stockItem.unit,
        requiredPerPortion: requiredInStockUnit,
        reason: 'Below par level',
        status: AvailabilityStatus.BELOW_PAR
      });
    } else if (!hasEnoughForOne) {
      isAvailable = false;
      if (primaryStatus === AvailabilityStatus.AVAILABLE) {
        primaryStatus = AvailabilityStatus.OUT_OF_STOCK;
      }
      const msg = `Insufficient "${stockItem.name}" for a portion (${formatQuantity(stockItem.quantity, stockItem.unit)} available, needs ${formatQuantity(requiredInStockUnit, stockItem.unit)}).`;
      reasons.push(msg);
      bottlenecks.push({
        ingredientId: stockItem.id,
        ingredientName: stockItem.name,
        currentStock: stockItem.quantity,
        parLevel: stockItem.par,
        unit: stockItem.unit,
        requiredPerPortion: requiredInStockUnit,
        reason: 'Insufficient stock for 1 portion',
        status: AvailabilityStatus.OUT_OF_STOCK
      });
    }
  }

  if (maxPortions === Infinity) {
    maxPortions = 0;
  }

  return {
    dishId: dish.id,
    dishName: dish.name,
    isAvailable,
    status: primaryStatus,
    reasons,
    bottlenecks,
    maxPortions: isAvailable ? maxPortions : 0
  };
}

export class MenuManager {
  constructor(recipes = [], inventoryStore) {
    this.recipes = recipes || [];
    this.inventoryStore = inventoryStore;
    this.orderHistory = [];
    this.listeners = new Set();
  }

  /**
   * Set or update recipes list
   * @param {Array} recipes 
   */
  setRecipes(recipes) {
    this.recipes = recipes;
    this._notify();
  }

  /**
   * Returns all dishes with their live calculated availability
   * @returns {Array}
   */
  getMenu() {
    return this.recipes.map(dish => {
      const evalResult = evaluateDishAvailability(dish, this.inventoryStore);
      return {
        ...dish,
        availability: evalResult
      };
    });
  }

  /**
   * Finds a specific recipe by ID
   * @param {string} dishId 
   * @returns {Object|null}
   */
  getDishById(dishId) {
    return this.recipes.find(d => d.id === dishId) || null;
  }

  /**
   * Places an order for a dish, deducting required ingredients from stock.
   * Atomic operation: validates all ingredients can be converted and deducted.
   * 
   * @param {string} dishId 
   * @param {number} portions 
   * @returns {Object} Order summary
   */
  placeOrder(dishId, portions = 1) {
    const dish = this.getDishById(dishId);
    if (!dish) {
      throw new Error(`Dish with id "${dishId}" does not exist.`);
    }

    if (portions <= 0 || !Number.isInteger(portions)) {
      throw new Error(`Invalid portion count: ${portions}. Must be a positive integer.`);
    }

    const availability = evaluateDishAvailability(dish, this.inventoryStore);
    if (!availability.isAvailable) {
      throw new Error(`Cannot order "${dish.name}": ${availability.reasons.join(' ')}`);
    }

    // Calculate deductions
    const deductions = [];
    for (const recipeIng of dish.ingredients) {
      let stockItem = null;
      if (recipeIng.id) {
        stockItem = this.inventoryStore.getById(recipeIng.id);
      }
      if (!stockItem && recipeIng.name) {
        stockItem = this.inventoryStore.getByName(recipeIng.name);
      }

      const totalNeeded = recipeIng.quantity * portions;
      const deductionInStockUnit = convertUnit(totalNeeded, recipeIng.unit, stockItem.unit);

      deductions.push({
        stockItemId: stockItem.id,
        ingredientName: stockItem.name,
        recipeQty: totalNeeded,
        recipeUnit: recipeIng.unit,
        deductionInStockUnit,
        stockUnit: stockItem.unit,
        previousStock: stockItem.quantity,
        parLevel: stockItem.par
      });
    }

    // Apply deductions to inventory store
    const appliedDeductions = [];
    for (const d of deductions) {
      const updated = this.inventoryStore.adjustQuantity(d.stockItemId, -d.deductionInStockUnit);
      const isNowBelowPar = updated.quantity < updated.par;
      appliedDeductions.push({
        ...d,
        newStock: updated.quantity,
        isNowBelowPar
      });
    }

    const orderRecord = {
      orderId: `ord_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date().toISOString(),
      dishId: dish.id,
      dishName: dish.name,
      portions,
      price: dish.price * portions,
      deductions: appliedDeductions
    };

    this.orderHistory.unshift(orderRecord);
    this._notify();

    return orderRecord;
  }

  /**
   * Subscribe to menu and order changes
   * @param {Function} listener 
   * @returns {Function} unsubscribe function
   */
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  _notify() {
    const menu = this.getMenu();
    for (const listener of this.listeners) {
      try {
        listener(menu, this.orderHistory);
      } catch (err) {
        console.error('Error in menu listener:', err);
      }
    }
  }
}
