/**
 * Inventory Management Module for Kitchen Stock.
 * Encapsulates stock state, validation, CRUD operations, and dependency tracking.
 */

import { normalizeUnit, formatQuantity, areUnitsCompatible } from './units.js';

export class ValidationError extends Error {
  constructor(field, message) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
  }
}

/**
 * Validates ingredient input fields to prevent invalid / nonsense entries.
 * @param {Object} data 
 * @param {boolean} isNew - True if creating a new item, false if updating
 * @param {Array} existingItems - Current inventory items
 * @param {string} [currentId] - Id of item being updated
 */
export function validateIngredientData(data, isNew = false, existingItems = [], currentId = null) {
  const errors = [];

  // Name validation
  if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
    errors.push(new ValidationError('name', 'Ingredient name is required and cannot be empty.'));
  } else {
    const trimmedName = data.name.trim();
    if (trimmedName.length < 2) {
      errors.push(new ValidationError('name', 'Ingredient name must be at least 2 characters long.'));
    }
    // Check duplicates
    const duplicate = existingItems.find(
      item => item.name.toLowerCase() === trimmedName.toLowerCase() && item.id !== currentId
    );
    if (duplicate) {
      errors.push(new ValidationError('name', `An ingredient named "${trimmedName}" already exists.`));
    }
  }

  // Quantity validation
  const qty = Number(data.quantity);
  if (data.quantity === undefined || data.quantity === null || data.quantity === '' || isNaN(qty)) {
    errors.push(new ValidationError('quantity', 'Current quantity must be a valid number.'));
  } else if (qty < 0) {
    errors.push(new ValidationError('quantity', 'Quantity cannot be negative.'));
  } else if (!isFinite(qty)) {
    errors.push(new ValidationError('quantity', 'Quantity must be a finite number.'));
  }

  // Par level validation
  const par = Number(data.par);
  if (data.par === undefined || data.par === null || data.par === '' || isNaN(par)) {
    errors.push(new ValidationError('par', 'Par level must be a valid number.'));
  } else if (par < 0) {
    errors.push(new ValidationError('par', 'Par level cannot be negative.'));
  } else if (!isFinite(par)) {
    errors.push(new ValidationError('par', 'Par level must be a finite number.'));
  }

  // Unit validation
  if (!data.unit || typeof data.unit !== 'string' || data.unit.trim().length === 0) {
    errors.push(new ValidationError('unit', 'Measurement unit is required.'));
  }

  if (errors.length > 0) {
    const combinedMessage = errors.map(e => e.message).join(' ');
    const err = new Error(combinedMessage);
    err.validationErrors = errors;
    throw err;
  }

  return {
    name: data.name.trim(),
    quantity: Math.round(Number(data.quantity) * 1000) / 1000,
    par: Math.round(Number(data.par) * 1000) / 1000,
    unit: normalizeUnit(data.unit)
  };
}

/**
 * Generates a clean URL/id slug from ingredient name
 * @param {string} name 
 * @returns {string}
 */
export function generateIngredientId(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export class InventoryStore {
  constructor(initialItems = []) {
    this.items = new Map();
    this.listeners = new Set();
    if (initialItems && initialItems.length > 0) {
      this.loadItems(initialItems);
    }
  }

  /**
   * Loads items into memory
   * @param {Array} itemsArray 
   */
  loadItems(itemsArray) {
    this.items.clear();
    for (const item of itemsArray) {
      const id = item.id || generateIngredientId(item.name);
      this.items.set(id, {
        id,
        name: item.name,
        quantity: Number(item.quantity) || 0,
        unit: normalizeUnit(item.unit || 'g'),
        par: Number(item.par) || 0
      });
    }
    this._notify();
  }

  /**
   * Returns all inventory items as an array
   * @returns {Array}
   */
  getAll() {
    return Array.from(this.items.values()).map(item => ({ ...item }));
  }

  /**
   * Finds an item by ID
   * @param {string} id 
   * @returns {Object|null}
   */
  getById(id) {
    const item = this.items.get(id);
    return item ? { ...item } : null;
  }

  /**
   * Finds an item by name (case-insensitive)
   * @param {string} name 
   * @returns {Object|null}
   */
  getByName(name) {
    if (!name) return null;
    const norm = name.trim().toLowerCase();
    for (const item of this.items.values()) {
      if (item.name.toLowerCase() === norm) {
        return { ...item };
      }
    }
    return null;
  }

  /**
   * Searches items by keyword (name or unit or id)
   * Supports scaling from 15 to 300+ items smoothly.
   * @param {string} query 
   * @returns {Array}
   */
  search(query) {
    if (!query || query.trim() === '') {
      return this.getAll();
    }
    const q = query.toLowerCase().trim();
    return this.getAll().filter(item => 
      item.name.toLowerCase().includes(q) ||
      item.unit.toLowerCase().includes(q) ||
      item.id.toLowerCase().includes(q)
    );
  }

  /**
   * Adds a new ingredient
   * @param {Object} data 
   * @returns {Object} created item
   */
  addItem(data) {
    const validated = validateIngredientData(data, true, this.getAll());
    let id = generateIngredientId(validated.name);
    
    // Ensure uniqueness of id
    if (this.items.has(id)) {
      id = `${id}_${Date.now().toString(36)}`;
    }

    const newItem = {
      id,
      ...validated
    };

    this.items.set(id, newItem);
    this._notify();
    return { ...newItem };
  }

  /**
   * Updates an existing ingredient
   * @param {string} id 
   * @param {Object} updates 
   * @returns {Object} updated item
   */
  updateItem(id, updates) {
    const existing = this.items.get(id);
    if (!existing) {
      throw new Error(`Ingredient with id "${id}" not found.`);
    }

    const merged = {
      name: updates.name !== undefined ? updates.name : existing.name,
      quantity: updates.quantity !== undefined ? updates.quantity : existing.quantity,
      unit: updates.unit !== undefined ? updates.unit : existing.unit,
      par: updates.par !== undefined ? updates.par : existing.par
    };

    const validated = validateIngredientData(merged, false, this.getAll(), id);

    const updatedItem = {
      ...existing,
      ...validated
    };

    this.items.set(id, updatedItem);
    this._notify();
    return { ...updatedItem };
  }

  /**
   * Quick quantity adjustment (e.g. delivery arrives +5, spoilage -0.5)
   * @param {string} id 
   * @param {number} delta 
   * @returns {Object}
   */
  adjustQuantity(id, delta) {
    const existing = this.items.get(id);
    if (!existing) {
      throw new Error(`Ingredient with id "${id}" not found.`);
    }
    const newQty = Math.max(0, existing.quantity + delta);
    return this.updateItem(id, { quantity: newQty });
  }

  /**
   * Deletes an ingredient
   * @param {string} id 
   * @returns {boolean}
   */
  deleteItem(id) {
    if (!this.items.has(id)) {
      return false;
    }
    this.items.delete(id);
    this._notify();
    return true;
  }

  /**
   * Checks if an ingredient is currently below its par level
   * @param {string|Object} itemOrId 
   * @returns {boolean}
   */
  isBelowPar(itemOrId) {
    const item = typeof itemOrId === 'string' ? this.items.get(itemOrId) : itemOrId;
    if (!item) return false;
    return Number(item.quantity) < Number(item.par);
  }

  /**
   * Checks dependency of an ingredient across all recipes
   * @param {string} ingredientId 
   * @param {Array} recipes 
   * @returns {{ isUsed: boolean, usedInDishes: Array }}
   */
  checkUsage(ingredientId, recipes = []) {
    const targetItem = this.items.get(ingredientId);
    const targetName = targetItem ? targetItem.name.toLowerCase() : '';

    const usedInDishes = [];

    for (const dish of recipes) {
      const uses = (dish.ingredients || []).some(
        ing => (ing.id && ing.id === ingredientId) ||
               (ing.name && ing.name.toLowerCase() === targetName)
      );
      if (uses) {
        usedInDishes.push({
          id: dish.id,
          name: dish.name,
          price: dish.price
        });
      }
    }

    return {
      isUsed: usedInDishes.length > 0,
      count: usedInDishes.length,
      usedInDishes
    };
  }

  /**
   * Subscribe to state changes
   * @param {Function} callback 
   * @returns {Function} unsubscribe function
   */
  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  _notify() {
    const all = this.getAll();
    for (const listener of this.listeners) {
      try {
        listener(all);
      } catch (err) {
        console.error('Error in inventory listener:', err);
      }
    }
  }
}
