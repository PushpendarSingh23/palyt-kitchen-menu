/**
 * Automated Test Suite for Palyt Kitchen & Menu Sync Engine.
 * Tests unit conversions, inventory validation/CRUD, dish availability, and order deductions.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { convertUnit, areUnitsCompatible, UnitConversionError, formatQuantity } from '../src/units.js';
import { InventoryStore, validateIngredientData, generateIngredientId } from '../src/inventory.js';
import { MenuManager, evaluateDishAvailability, AvailabilityStatus } from '../src/menu.js';

// Sample test data fixture matching kitchen specifications
const TEST_STOCK = [
  { id: 'paneer', name: 'Paneer', quantity: 5.0, unit: 'kg', par: 2.0 },
  { id: 'cashews', name: 'Cashews', quantity: 1.05, unit: 'kg', par: 1.0 },
  { id: 'bay_leaves', name: 'Bay Leaves', quantity: 0.5, unit: 'kg', par: 0.2 },
  { id: 'heavy_cream', name: 'Heavy Cream', quantity: 4.0, unit: 'l', par: 1.5 },
  { id: 'tomatoes', name: 'Tomatoes', quantity: 12.0, unit: 'kg', par: 4.0 },
  { id: 'onions', name: 'Onions', quantity: 15.0, unit: 'kg', par: 5.0 },
  { id: 'basmati_rice', name: 'Basmati Rice', quantity: 20.0, unit: 'kg', par: 6.0 },
  { id: 'butter', name: 'Butter', quantity: 3.0, unit: 'kg', par: 1.0 },
  { id: 'ginger_garlic_paste', name: 'Ginger Garlic Paste', quantity: 2.5, unit: 'kg', par: 0.8 },
  { id: 'chicken_breast', name: 'Chicken Breast', quantity: 8.0, unit: 'kg', par: 3.0 },
  { id: 'garam_masala', name: 'Garam Masala', quantity: 800, unit: 'g', par: 200 },
  { id: 'cooking_oil', name: 'Cooking Oil', quantity: 10.0, unit: 'l', par: 3.0 },
  { id: 'fresh_coriander', name: 'Fresh Coriander', quantity: 15, unit: 'bunches', par: 5 },
  { id: 'whole_milk', name: 'Whole Milk', quantity: 6.0, unit: 'l', par: 2.0 },
  { id: 'green_chillies', name: 'Green Chillies', quantity: 1.5, unit: 'kg', par: 0.4 }
];

const TEST_RECIPES = [
  {
    id: 'shahi_paneer',
    name: 'Shahi Paneer',
    price: 14.99,
    ingredients: [
      { id: 'paneer', name: 'Paneer', quantity: 180, unit: 'g' },
      { id: 'cashews', name: 'Cashews', quantity: 30, unit: 'g' },
      { id: 'heavy_cream', name: 'Heavy Cream', quantity: 50, unit: 'ml' },
      { id: 'tomatoes', name: 'Tomatoes', quantity: 150, unit: 'g' },
      { id: 'butter', name: 'Butter', quantity: 25, unit: 'g' }
    ]
  },
  {
    id: 'cashew_nut_korma',
    name: 'Cashew Nut Korma',
    price: 16.50,
    ingredients: [
      { id: 'cashews', name: 'Cashews', quantity: 50, unit: 'g' },
      { id: 'heavy_cream', name: 'Heavy Cream', quantity: 40, unit: 'ml' },
      { id: 'onions', name: 'Onions', quantity: 100, unit: 'g' }
    ]
  },
  {
    id: 'jeera_rice',
    name: 'Jeera Rice',
    price: 6.50,
    ingredients: [
      { id: 'basmati_rice', name: 'Basmati Rice', quantity: 180, unit: 'g' },
      { id: 'butter', name: 'Butter', quantity: 15, unit: 'g' }
    ]
  }
];

describe('Unit Conversion Engine', () => {
  test('converts weight units accurately (kg <-> g)', () => {
    // 180 grams of paneer to kg
    const kg = convertUnit(180, 'g', 'kg');
    assert.strictEqual(kg, 0.18);

    // 2.5 kg to grams
    const g = convertUnit(2.5, 'kg', 'g');
    assert.strictEqual(g, 2500);

    // Identity conversion
    assert.strictEqual(convertUnit(500, 'g', 'g'), 500);
  });

  test('converts volume units accurately (l <-> ml, tbsp, tsp)', () => {
    // 50 ml heavy cream to litres
    const l = convertUnit(50, 'ml', 'l');
    assert.strictEqual(l, 0.05);

    // 1.5 litres to ml
    const ml = convertUnit(1.5, 'l', 'ml');
    assert.strictEqual(ml, 1500);

    // 2 tablespoons to ml (1 tbsp = 15 ml)
    assert.strictEqual(convertUnit(2, 'tbsp', 'ml'), 30);
  });

  test('normalizes casing and whitespace', () => {
    assert.strictEqual(convertUnit(1000, ' G ', 'KG'), 1);
    assert.strictEqual(convertUnit(1, 'Litre', 'ml'), 1000);
  });

  test('throws UnitConversionError on incompatible dimensions (e.g. kg to l)', () => {
    assert.throws(
      () => convertUnit(500, 'g', 'ml'),
      (err) => err instanceof UnitConversionError && err.message.includes('incompatible dimensions')
    );
  });

  test('throws error on unknown units', () => {
    assert.throws(
      () => convertUnit(10, 'widgets', 'kg'),
      (err) => err instanceof UnitConversionError && err.message.includes('Unknown source unit')
    );
  });
});

describe('Inventory Validation and CRUD', () => {
  test('validates and accepts valid ingredient data', () => {
    const valid = validateIngredientData({
      name: 'Fresh Mint',
      quantity: 2.5,
      unit: 'kg',
      par: 1.0
    }, true, []);

    assert.strictEqual(valid.name, 'Fresh Mint');
    assert.strictEqual(valid.quantity, 2.5);
    assert.strictEqual(valid.unit, 'kg');
    assert.strictEqual(valid.par, 1.0);
  });

  test('stops nonsense input: rejects negative values, empty names, and non-numbers', () => {
    // Negative quantity
    assert.throws(
      () => validateIngredientData({ name: 'Sugar', quantity: -5, unit: 'kg', par: 1 }),
      (err) => err.message.includes('Quantity cannot be negative')
    );

    // Negative par
    assert.throws(
      () => validateIngredientData({ name: 'Sugar', quantity: 5, unit: 'kg', par: -2 }),
      (err) => err.message.includes('Par level cannot be negative')
    );

    // Empty name
    assert.throws(
      () => validateIngredientData({ name: '   ', quantity: 5, unit: 'kg', par: 1 }),
      (err) => err.message.includes('Ingredient name is required')
    );

    // Non-numeric quantity
    assert.throws(
      () => validateIngredientData({ name: 'Sugar', quantity: 'abc', unit: 'kg', par: 1 }),
      (err) => err.message.includes('Current quantity must be a valid number')
    );
  });

  test('detects duplicate ingredient names', () => {
    const existing = [{ id: 'paneer', name: 'Paneer', quantity: 5, unit: 'kg', par: 2 }];
    assert.throws(
      () => validateIngredientData({ name: 'paneer', quantity: 2, unit: 'kg', par: 1 }, true, existing),
      (err) => err.message.includes('already exists')
    );
  });

  test('performs full CRUD lifecycle', () => {
    const store = new InventoryStore(TEST_STOCK);
    assert.strictEqual(store.getAll().length, 15);

    // Search
    const searchRes = store.search('cashew');
    assert.strictEqual(searchRes.length, 1);
    assert.strictEqual(searchRes[0].id, 'cashews');

    // Add
    const added = store.addItem({
      name: 'Saffron',
      quantity: 50,
      unit: 'g',
      par: 10
    });
    assert.strictEqual(store.getById(added.id).name, 'Saffron');

    // Update
    store.updateItem(added.id, { quantity: 45, par: 15 });
    assert.strictEqual(store.getById(added.id).quantity, 45);
    assert.strictEqual(store.getById(added.id).par, 15);

    // Adjust delta (e.g. delivery +20)
    store.adjustQuantity(added.id, 20);
    assert.strictEqual(store.getById(added.id).quantity, 65);

    // Delete
    const deleted = store.deleteItem(added.id);
    assert.strictEqual(deleted, true);
    assert.strictEqual(store.getById(added.id), null);
  });

  test('dependency checking: correctly identifies used vs unused ingredients', () => {
    const store = new InventoryStore(TEST_STOCK);

    // Bay leaves is not used in any recipe
    const bayLeavesUsage = store.checkUsage('bay_leaves', TEST_RECIPES);
    assert.strictEqual(bayLeavesUsage.isUsed, false);
    assert.strictEqual(bayLeavesUsage.count, 0);

    // Cashews is used in two dishes (Shahi Paneer and Cashew Nut Korma)
    const cashewUsage = store.checkUsage('cashews', TEST_RECIPES);
    assert.strictEqual(cashewUsage.isUsed, true);
    assert.strictEqual(cashewUsage.count, 2);
    const dishNames = cashewUsage.usedInDishes.map(d => d.name);
    assert.ok(dishNames.includes('Shahi Paneer'));
    assert.ok(dishNames.includes('Cashew Nut Korma'));
  });
});

describe('Dish Availability Evaluation', () => {
  test('marks dish AVAILABLE when all ingredients are above par and sufficient', () => {
    const store = new InventoryStore(TEST_STOCK);
    const shahiPaneer = TEST_RECIPES.find(r => r.id === 'shahi_paneer');

    const result = evaluateDishAvailability(shahiPaneer, store);
    assert.strictEqual(result.isAvailable, true);
    assert.strictEqual(result.status, AvailabilityStatus.AVAILABLE);
    assert.strictEqual(result.reasons.length, 0);
  });

  test('marks dish UNAVAILABLE when any ingredient falls below par', () => {
    const store = new InventoryStore(TEST_STOCK);
    // Cashews par is 1.0 kg. Set cashews stock to 0.95 kg (< 1.0 kg)
    store.updateItem('cashews', { quantity: 0.95 });

    const shahiPaneer = TEST_RECIPES.find(r => r.id === 'shahi_paneer');
    const result = evaluateDishAvailability(shahiPaneer, store);

    assert.strictEqual(result.isAvailable, false);
    assert.strictEqual(result.status, AvailabilityStatus.BELOW_PAR);
    assert.strictEqual(result.bottlenecks.length, 1);
    assert.strictEqual(result.bottlenecks[0].ingredientId, 'cashews');
  });

  test('raising par level immediately takes dish off menu without orders', () => {
    const store = new InventoryStore(TEST_STOCK);
    const shahiPaneer = TEST_RECIPES.find(r => r.id === 'shahi_paneer');

    // Initially available
    assert.strictEqual(evaluateDishAvailability(shahiPaneer, store).isAvailable, true);

    // Raise tomatoes par from 4.0 kg to 15.0 kg (current stock is 12.0 kg)
    store.updateItem('tomatoes', { par: 15.0 });

    const updatedResult = evaluateDishAvailability(shahiPaneer, store);
    assert.strictEqual(updatedResult.isAvailable, false);
    assert.strictEqual(updatedResult.status, AvailabilityStatus.BELOW_PAR);
    assert.strictEqual(updatedResult.bottlenecks[0].ingredientId, 'tomatoes');
  });

  test('handles deleted/missing ingredients gracefully', () => {
    const store = new InventoryStore(TEST_STOCK);
    // Delete paneer from stock
    store.deleteItem('paneer');

    const shahiPaneer = TEST_RECIPES.find(r => r.id === 'shahi_paneer');
    const result = evaluateDishAvailability(shahiPaneer, store);

    assert.strictEqual(result.isAvailable, false);
    assert.strictEqual(result.status, AvailabilityStatus.MISSING_INGREDIENT);
    assert.ok(result.reasons[0].includes('Missing ingredient'));
  });
});

describe('End-to-End Order Processing & Multi-Dish Reaction', () => {
  test('single order deducts correct converted amounts from kitchen stock', () => {
    const store = new InventoryStore(TEST_STOCK);
    const menuManager = new MenuManager(TEST_RECIPES, store);

    // Place 1 order for Shahi Paneer
    const order = menuManager.placeOrder('shahi_paneer', 1);

    assert.strictEqual(order.dishName, 'Shahi Paneer');
    assert.strictEqual(order.portions, 1);

    // Check Paneer: was 5.0 kg, used 180g (0.18 kg) -> now 4.82 kg
    const paneer = store.getById('paneer');
    assert.strictEqual(paneer.quantity, 4.82);

    // Check Cashews: was 1.05 kg, used 30g (0.03 kg) -> now 1.02 kg
    const cashews = store.getById('cashews');
    assert.strictEqual(cashews.quantity, 1.02);

    // Check Heavy Cream: was 4.0 l, used 50ml (0.05 l) -> now 3.95 l
    const cream = store.getById('heavy_cream');
    assert.strictEqual(cream.quantity, 3.95);

    // Both dishes should still be available because Cashews (1.02 kg) >= par (1.0 kg)
    const menu = menuManager.getMenu();
    const shahiPaneer = menu.find(d => d.id === 'shahi_paneer');
    const cashewKorma = menu.find(d => d.id === 'cashew_nut_korma');

    assert.strictEqual(shahiPaneer.availability.isAvailable, true);
    assert.strictEqual(cashewKorma.availability.isAvailable, true);
  });

  test('second order pushes ingredient below par and automatically takes BOTH dependent dishes off menu', () => {
    const store = new InventoryStore(TEST_STOCK);
    const menuManager = new MenuManager(TEST_RECIPES, store);

    // Order 1: Cashews: 1.05 kg - 0.03 kg = 1.02 kg (still >= 1.0 kg par)
    menuManager.placeOrder('shahi_paneer', 1);

    // Order 2: Cashews: 1.02 kg - 0.03 kg = 0.99 kg (< 1.0 kg par)
    menuManager.placeOrder('shahi_paneer', 1);

    const cashews = store.getById('cashews');
    assert.strictEqual(cashews.quantity, 0.99);
    assert.strictEqual(cashews.quantity < cashews.par, true);

    // Check Menu Reactivity
    const menu = menuManager.getMenu();
    const shahiPaneer = menu.find(d => d.id === 'shahi_paneer');
    const cashewKorma = menu.find(d => d.id === 'cashew_nut_korma');
    const jeeraRice = menu.find(d => d.id === 'jeera_rice');

    // BOTH dishes using cashews are now UNAVAILABLE
    assert.strictEqual(shahiPaneer.availability.isAvailable, false);
    assert.strictEqual(shahiPaneer.availability.status, AvailabilityStatus.BELOW_PAR);

    assert.strictEqual(cashewKorma.availability.isAvailable, false);
    assert.strictEqual(cashewKorma.availability.status, AvailabilityStatus.BELOW_PAR);

    // Unrelated dish (Jeera Rice) remains AVAILABLE
    assert.strictEqual(jeeraRice.availability.isAvailable, true);
  });

  test('attempting to order an unavailable dish throws error and prevents stock corruption', () => {
    const store = new InventoryStore(TEST_STOCK);
    const menuManager = new MenuManager(TEST_RECIPES, store);

    // Force cashews below par
    store.updateItem('cashews', { quantity: 0.9 });

    const paneerBefore = store.getById('paneer').quantity;

    assert.throws(
      () => menuManager.placeOrder('shahi_paneer', 1),
      (err) => err.message.includes('Cannot order "Shahi Paneer"')
    );

    // Verify stock was not partially deducted
    assert.strictEqual(store.getById('paneer').quantity, paneerBefore);
  });

  test('restocking an ingredient restores dish availability immediately', () => {
    const store = new InventoryStore(TEST_STOCK);
    const menuManager = new MenuManager(TEST_RECIPES, store);

    // Bring below par
    store.updateItem('cashews', { quantity: 0.95 });
    assert.strictEqual(menuManager.getDishById('shahi_paneer') !== null, true);
    assert.strictEqual(evaluateDishAvailability(menuManager.getDishById('shahi_paneer'), store).isAvailable, false);

    // Restock delivery arrives (+1.0 kg cashews -> 1.95 kg)
    store.adjustQuantity('cashews', 1.0);

    const updatedEval = evaluateDishAvailability(menuManager.getDishById('shahi_paneer'), store);
    assert.strictEqual(updatedEval.isAvailable, true);
  });
});
