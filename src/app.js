/**
 * Application Controller & Split-Screen View Coordinator.
 * Connects Kitchen Stock Management with Diner Menu in real time.
 */

import { InventoryStore } from './inventory.js';
import { MenuManager, AvailabilityStatus } from './menu.js';
import { formatQuantity } from './units.js';

// Default baseline data fixtures (embedded so it works both via HTTP and directly via file://)
export const DEFAULT_STOCK = [
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

export const DEFAULT_RECIPES = [
  {
    id: 'shahi_paneer',
    name: 'Shahi Paneer',
    price: 14.99,
    description: 'Cottage cheese cubes simmered in a rich, creamy cashew and tomato gravy.',
    ingredients: [
      { id: 'paneer', name: 'Paneer', quantity: 180, unit: 'g' },
      { id: 'cashews', name: 'Cashews', quantity: 30, unit: 'g' },
      { id: 'heavy_cream', name: 'Heavy Cream', quantity: 50, unit: 'ml' },
      { id: 'tomatoes', name: 'Tomatoes', quantity: 150, unit: 'g' },
      { id: 'butter', name: 'Butter', quantity: 25, unit: 'g' },
      { id: 'ginger_garlic_paste', name: 'Ginger Garlic Paste', quantity: 15, unit: 'g' },
      { id: 'garam_masala', name: 'Garam Masala', quantity: 5, unit: 'g' }
    ]
  },
  {
    id: 'cashew_nut_korma',
    name: 'Cashew Nut Korma',
    price: 16.50,
    description: 'Delicate vegetable medley in an aromatic, velvety cashew-cream sauce.',
    ingredients: [
      { id: 'cashews', name: 'Cashews', quantity: 50, unit: 'g' },
      { id: 'heavy_cream', name: 'Heavy Cream', quantity: 40, unit: 'ml' },
      { id: 'onions', name: 'Onions', quantity: 100, unit: 'g' },
      { id: 'cooking_oil', name: 'Cooking Oil', quantity: 20, unit: 'ml' },
      { id: 'garam_masala', name: 'Garam Masala', quantity: 5, unit: 'g' }
    ]
  },
  {
    id: 'paneer_butter_masala',
    name: 'Paneer Butter Masala',
    price: 13.99,
    description: 'Succulent paneer pieces cooked in a buttery tomato gravy with fresh cream.',
    ingredients: [
      { id: 'paneer', name: 'Paneer', quantity: 200, unit: 'g' },
      { id: 'tomatoes', name: 'Tomatoes', quantity: 180, unit: 'g' },
      { id: 'butter', name: 'Butter', quantity: 30, unit: 'g' },
      { id: 'heavy_cream', name: 'Heavy Cream', quantity: 30, unit: 'ml' },
      { id: 'ginger_garlic_paste', name: 'Ginger Garlic Paste', quantity: 15, unit: 'g' }
    ]
  },
  {
    id: 'chicken_biryani',
    name: 'Chicken Biryani',
    price: 17.50,
    description: 'Fragrant basmati rice layered with spiced marinated chicken and herbs.',
    ingredients: [
      { id: 'chicken_breast', name: 'Chicken Breast', quantity: 250, unit: 'g' },
      { id: 'basmati_rice', name: 'Basmati Rice', quantity: 200, unit: 'g' },
      { id: 'onions', name: 'Onions', quantity: 80, unit: 'g' },
      { id: 'cooking_oil', name: 'Cooking Oil', quantity: 30, unit: 'ml' },
      { id: 'garam_masala', name: 'Garam Masala', quantity: 8, unit: 'g' },
      { id: 'green_chillies', name: 'Green Chillies', quantity: 10, unit: 'g' }
    ]
  },
  {
    id: 'dal_makhani',
    name: 'Dal Makhani',
    price: 11.99,
    description: 'Slow-cooked black lentils enriched with butter, cream, and subtle spices.',
    ingredients: [
      { id: 'heavy_cream', name: 'Heavy Cream', quantity: 40, unit: 'ml' },
      { id: 'butter', name: 'Butter', quantity: 35, unit: 'g' },
      { id: 'tomatoes', name: 'Tomatoes', quantity: 100, unit: 'g' },
      { id: 'ginger_garlic_paste', name: 'Ginger Garlic Paste', quantity: 15, unit: 'g' },
      { id: 'garam_masala', name: 'Garam Masala', quantity: 5, unit: 'g' }
    ]
  },
  {
    id: 'jeera_rice',
    name: 'Jeera Rice',
    price: 6.50,
    description: 'Steamed basmati rice tempered with aromatic cumin seeds and clarified butter.',
    ingredients: [
      { id: 'basmati_rice', name: 'Basmati Rice', quantity: 180, unit: 'g' },
      { id: 'butter', name: 'Butter', quantity: 15, unit: 'g' }
    ]
  }
];

class App {
  constructor() {
    this.inventoryStore = new InventoryStore();
    this.menuManager = new MenuManager([], this.inventoryStore);
    this.searchQuery = '';
    this.editingItemId = null;

    // DOM References
    this.dom = {
      stockTableBody: document.getElementById('stockTableBody'),
      searchInput: document.getElementById('searchInput'),
      menuContainer: document.getElementById('menuContainer'),
      addIngredientForm: document.getElementById('addIngredientForm'),
      formError: document.getElementById('formError'),
      feedList: document.getElementById('feedList'),
      resetBtn: document.getElementById('resetBtn'),
      metricsStockCount: document.getElementById('metricsStockCount'),
      metricsBelowParCount: document.getElementById('metricsBelowParCount'),
      metricsAvailableDishes: document.getElementById('metricsAvailableDishes'),
      modalContainer: document.getElementById('modalContainer')
    };

    this.init();
  }

  async init() {
    // Attempt to load from JSON files or fallback to embedded constants
    try {
      const [stockRes, recipesRes] = await Promise.all([
        fetch('./data/stock.json'),
        fetch('./data/recipes.json')
      ]);
      if (stockRes.ok && recipesRes.ok) {
        const stockData = await stockRes.json();
        const recipesData = await recipesRes.json();
        this.inventoryStore.loadItems(stockData);
        this.menuManager.setRecipes(recipesData);
      } else {
        this.loadDefaultData();
      }
    } catch (e) {
      // Fallback for direct file:// protocol execution
      this.loadDefaultData();
    }

    // Subscribe to state changes
    this.inventoryStore.subscribe(() => {
      this.render();
    });

    this.menuManager.subscribe(() => {
      this.renderMenu();
      this.renderMetrics();
    });

    this.bindEvents();
    this.render();
  }

  loadDefaultData() {
    this.inventoryStore.loadItems(JSON.parse(JSON.stringify(DEFAULT_STOCK)));
    this.menuManager.setRecipes(JSON.parse(JSON.stringify(DEFAULT_RECIPES)));
  }

  bindEvents() {
    // Search filter
    this.dom.searchInput.addEventListener('input', (e) => {
      this.searchQuery = e.target.value;
      this.renderStockTable();
    });

    // Add ingredient form
    this.dom.addIngredientForm.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleAddIngredient();
    });

    // Reset data
    this.dom.resetBtn.addEventListener('click', () => {
      if (confirm('Reset kitchen inventory and menu to initial state?')) {
        this.loadDefaultData();
        this.addFeedItem('System', 'Reset inventory and menu to factory state.');
      }
    });
  }

  handleAddIngredient() {
    this.dom.formError.textContent = '';
    const form = this.dom.addIngredientForm;
    const name = form.name.value;
    const quantity = form.quantity.value;
    const unit = form.unit.value;
    const par = form.par.value;

    try {
      const added = this.inventoryStore.addItem({ name, quantity, unit, par });
      form.reset();
      this.addFeedItem('Inventory', `Added new ingredient "${added.name}" (${formatQuantity(added.quantity, added.unit)}, par: ${formatQuantity(added.par, added.unit)}).`);
    } catch (err) {
      this.dom.formError.textContent = err.message;
    }
  }

  handleQuickAdjust(id, delta) {
    try {
      const item = this.inventoryStore.getById(id);
      const updated = this.inventoryStore.adjustQuantity(id, delta);
      const direction = delta > 0 ? `+${delta}` : `${delta}`;
      this.addFeedItem('Stock Adjustment', `Adjusted ${item.name}: ${direction} ${item.unit} (Now: ${formatQuantity(updated.quantity, updated.unit)}).`);
    } catch (err) {
      alert(`Error adjusting stock: ${err.message}`);
    }
  }

  handleUpdateRow(id, newQty, newPar) {
    try {
      const updated = this.inventoryStore.updateItem(id, {
        quantity: Number(newQty),
        par: Number(newPar)
      });
      this.addFeedItem('Stock Edit', `Updated ${updated.name}: Stock = ${formatQuantity(updated.quantity, updated.unit)}, Par = ${formatQuantity(updated.par, updated.unit)}.`);
      this.editingItemId = null;
    } catch (err) {
      alert(`Error updating item: ${err.message}`);
    }
  }

  handleDelete(id) {
    const item = this.inventoryStore.getById(id);
    if (!item) return;

    const usage = this.inventoryStore.checkUsage(id, this.menuManager.recipes);

    if (usage.isUsed) {
      // Deleting a used ingredient (e.g. Cashews)
      const dishList = usage.usedInDishes.map(d => `• ${d.name} ($${d.price.toFixed(2)})`).join('\n');
      this.showModal({
        title: `⚠️ Active Recipe Dependency Warning`,
        message: `"${item.name}" is required by ${usage.count} menu dish(es):\n\n${dishList}\n\nIf you delete it, these dishes cannot be cooked and will immediately become UNAVAILABLE on the diner menu.\n\nDo you want to proceed with deletion?`,
        confirmText: 'Delete & Disable Dishes',
        confirmClass: 'btn-danger',
        onConfirm: () => {
          this.inventoryStore.deleteItem(id);
          this.addFeedItem('Ingredient Deleted', `Deleted "${item.name}" (affected ${usage.count} dishes).`);
        }
      });
    } else {
      // Deleting an unreferenced ingredient (e.g. Bay Leaves)
      this.showModal({
        title: `Confirm Deletion`,
        message: `Delete "${item.name}" from inventory? No menu recipes currently use this ingredient.`,
        confirmText: 'Delete Ingredient',
        confirmClass: 'btn-danger',
        onConfirm: () => {
          this.inventoryStore.deleteItem(id);
          this.addFeedItem('Ingredient Deleted', `Deleted unused ingredient "${item.name}".`);
        }
      });
    }
  }

  handleOrderDish(dishId) {
    try {
      const order = this.menuManager.placeOrder(dishId, 1);
      const deductionSummary = order.deductions
        .map(d => `${formatQuantity(d.recipeQty, d.recipeUnit)} ${d.ingredientName}`)
        .join(', ');

      this.addFeedItem('Diner Order Placed', `Ordered 1x ${order.dishName} ($${order.price.toFixed(2)}). Deducted: ${deductionSummary}.`);
    } catch (err) {
      alert(`Order Failed: ${err.message}`);
    }
  }

  showModal({ title, message, confirmText, confirmClass, onConfirm }) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-content">
        <h3>${title}</h3>
        <p style="white-space: pre-line;">${message}</p>
        <div class="modal-actions">
          <button class="btn btn-secondary" id="modalCancel">Cancel</button>
          <button class="btn ${confirmClass || 'btn-primary'}" id="modalConfirm">${confirmText || 'Confirm'}</button>
        </div>
      </div>
    `;

    overlay.querySelector('#modalCancel').onclick = () => overlay.remove();
    overlay.querySelector('#modalConfirm').onclick = () => {
      overlay.remove();
      if (onConfirm) onConfirm();
    };

    this.dom.modalContainer.innerHTML = '';
    this.dom.modalContainer.appendChild(overlay);
  }

  addFeedItem(category, message) {
    const li = document.createElement('li');
    li.className = 'feed-item';
    const time = new Date().toLocaleTimeString();
    li.innerHTML = `<span><strong>[${category}]</strong> ${message}</span> <span style="color:#94a3b8; font-size:0.75rem;">${time}</span>`;
    this.dom.feedList.prepend(li);
  }

  renderMetrics() {
    const items = this.inventoryStore.getAll();
    const belowPar = items.filter(i => i.quantity < i.par);
    const menu = this.menuManager.getMenu();
    const available = menu.filter(d => d.availability.isAvailable);

    this.dom.metricsStockCount.textContent = items.length;
    this.dom.metricsBelowParCount.textContent = belowPar.length;
    this.dom.metricsAvailableDishes.textContent = `${available.length} / ${menu.length}`;
  }

  renderStockTable() {
    const items = this.inventoryStore.search(this.searchQuery);
    this.dom.stockTableBody.innerHTML = '';

    if (items.length === 0) {
      this.dom.stockTableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#94a3b8; padding:2rem;">No ingredients found matching "${this.searchQuery}".</td></tr>`;
      return;
    }

    for (const item of items) {
      const tr = document.createElement('tr');
      const isBelowPar = item.quantity < item.par;
      const isZero = item.quantity === 0;

      if (isZero) {
        tr.className = 'row-zero-stock';
      } else if (isBelowPar) {
        tr.className = 'row-below-par';
      }

      const isEditing = this.editingItemId === item.id;

      if (isEditing) {
        tr.innerHTML = `
          <td><strong>${item.name}</strong></td>
          <td>
            <input type="number" step="any" min="0" class="qty-input" id="editQty_${item.id}" value="${item.quantity}" />
          </td>
          <td>${item.unit}</td>
          <td>
            <input type="number" step="any" min="0" class="qty-input" id="editPar_${item.id}" value="${item.par}" />
          </td>
          <td>
            <span class="badge ${isBelowPar ? 'badge-below-par' : 'badge-healthy'}">Editing...</span>
          </td>
          <td>
            <button class="btn btn-primary btn-sm" id="saveEdit_${item.id}">Save</button>
            <button class="btn btn-secondary btn-sm" id="cancelEdit_${item.id}">Cancel</button>
          </td>
        `;

        tr.querySelector(`#saveEdit_${item.id}`).onclick = () => {
          const newQty = tr.querySelector(`#editQty_${item.id}`).value;
          const newPar = tr.querySelector(`#editPar_${item.id}`).value;
          this.handleUpdateRow(item.id, newQty, newPar);
        };
        tr.querySelector(`#cancelEdit_${item.id}`).onclick = () => {
          this.editingItemId = null;
          this.renderStockTable();
        };
      } else {
        let statusBadge = `<span class="badge badge-healthy">✓ In Stock</span>`;
        if (isZero) {
          statusBadge = `<span class="badge badge-out-of-stock">✕ Out of Stock</span>`;
        } else if (isBelowPar) {
          const deficit = Math.round((item.par - item.quantity) * 1000) / 1000;
          statusBadge = `<span class="badge badge-below-par">⚠️ Below Par (-${deficit} ${item.unit})</span>`;
        }

        tr.innerHTML = `
          <td><strong>${item.name}</strong></td>
          <td>
            <div class="qty-control">
              <span>${item.quantity}</span>
            </div>
            <div class="quick-adjust-group">
              <button class="btn btn-secondary btn-sm" title="Add 1 ${item.unit}" id="addOne_${item.id}">+1</button>
              <button class="btn btn-secondary btn-sm" title="Add 0.5 ${item.unit}" id="addHalf_${item.id}">+0.5</button>
              <button class="btn btn-secondary btn-sm" title="Subtract 0.5 ${item.unit}" id="subHalf_${item.id}">-0.5</button>
            </div>
          </td>
          <td>${item.unit}</td>
          <td>${item.par}</td>
          <td>${statusBadge}</td>
          <td>
            <button class="btn btn-secondary btn-sm" id="editBtn_${item.id}">Edit</button>
            <button class="btn btn-danger btn-sm" id="delBtn_${item.id}">Delete</button>
          </td>
        `;

        tr.querySelector(`#addOne_${item.id}`).onclick = () => this.handleQuickAdjust(item.id, 1);
        tr.querySelector(`#addHalf_${item.id}`).onclick = () => this.handleQuickAdjust(item.id, 0.5);
        tr.querySelector(`#subHalf_${item.id}`).onclick = () => this.handleQuickAdjust(item.id, -0.5);
        tr.querySelector(`#editBtn_${item.id}`).onclick = () => {
          this.editingItemId = item.id;
          this.renderStockTable();
        };
        tr.querySelector(`#delBtn_${item.id}`).onclick = () => this.handleDelete(item.id);
      }

      this.dom.stockTableBody.appendChild(tr);
    }
  }

  renderMenu() {
    const menu = this.menuManager.getMenu();
    this.dom.menuContainer.innerHTML = '';

    for (const dish of menu) {
      const card = document.createElement('div');
      const isAvailable = dish.availability.isAvailable;
      card.className = `dish-card ${isAvailable ? 'dish-available' : 'dish-unavailable'}`;

      const recipeSummary = (dish.ingredients || [])
        .map(i => `${formatQuantity(i.quantity, i.unit)} ${i.name || i.id}`)
        .join(', ');

      let statusDisplay = '';
      if (isAvailable) {
        statusDisplay = `
          <div>
            <span class="badge badge-healthy">✓ Available</span>
            <span style="font-size:0.75rem; color:#16a34a; margin-left:0.35rem;">(${dish.availability.maxPortions} portions above par)</span>
          </div>
        `;
      } else {
        const reasonText = dish.availability.reasons.join('<br>');
        statusDisplay = `
          <div>
            <span class="badge badge-out-of-stock">✕ Unavailable</span>
            <div class="dish-reasons">${reasonText}</div>
          </div>
        `;
      }

      card.innerHTML = `
        <div class="dish-header">
          <div class="dish-title">${dish.name}</div>
          <div class="dish-price">$${dish.price.toFixed(2)}</div>
        </div>
        <div class="dish-desc">${dish.description || ''}</div>
        <div class="dish-recipe-info">
          <strong>Recipe:</strong> ${recipeSummary}
        </div>
        <div class="dish-status-box">
          ${statusDisplay}
          <button class="btn btn-primary" id="orderBtn_${dish.id}" ${!isAvailable ? 'disabled' : ''}>
            🍽️ Order Portion
          </button>
        </div>
      `;

      if (isAvailable) {
        card.querySelector(`#orderBtn_${dish.id}`).onclick = () => this.handleOrderDish(dish.id);
      }

      this.dom.menuContainer.appendChild(card);
    }
  }

  render() {
    this.renderStockTable();
    this.renderMenu();
    this.renderMetrics();
  }
}

// Instantiate on load
document.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});
