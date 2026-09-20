# Palyt — Kitchen Stock & Menu Synchronizer

A restaurant operations tool connecting kitchen inventory directly to the live diner menu. When diners order dishes, ingredients are converted from culinary units (grams, ml) to purchasing units (kg, litres), deducted from kitchen stock, and menu dish availability updates dynamically in real time.

---

## 🚀 Quick Start

### 1. Run Automated Tests
Run the logic test suite using Node.js built-in test runner:
```bash
npm test
# or directly:
node --test test/logic.test.js
```

### 2. Open the Application
You can open the application in either of two ways:

* **Option A (Local Web Server - Recommended)**:
  ```bash
  npm start
  # Opens at http://localhost:3000
  ```
  *(Or run `npx serve .` in the project root)*

* **Option B (Direct Browser File)**:
  Double click `index.html` or open `file:///.../palyt-kitchen-menu/index.html` in Chrome/Firefox/Edge.

---

## 📁 Repository Structure

```
palyt-kitchen-menu/
├── data/
│   ├── stock.json          # 15 kitchen inventory items with units & par levels
│   └── recipes.json        # Menu dishes with prices, descriptions, and recipes
├── src/
│   ├── units.js            # Culinary unit converter (kg <-> g, L <-> ml, count)
│   ├── inventory.js        # Stock state management, input validation, and CRUD
│   ├── menu.js             # Recipe resolution, dish availability, and order deductions
│   ├── app.js              # UI controller coordinating real-time split-screen view
│   └── styles.css          # Clean, responsive side-by-side dashboard styling
├── test/
│   └── logic.test.js       # Unit tests covering conversions, CRUD, availability & orders
├── index.html              # Interactive split-screen kitchen & diner dashboard
├── package.json            # Node.js ES module configuration and test scripts
├── README.md               # Quick start & documentation
└── WRITEUP.md              # Detailed engineering write-up addressing all evaluation points
```

---

## 💡 Core Features & Mechanics

1. **Split-Screen Reactive Interface**:
   - **Left Panel (Kitchen Stock)**: Live inventory table with instant search (scalable from 15 to 300+ items), inline quick-adjust buttons (`+1`, `+0.5`, `-0.5`), full row editing, and new item creation with validation.
   - **Right Panel (Diner Menu)**: Displays dishes with prices, recipes, live availability badges, portion capacity, and 1-click ordering.
2. **Buy vs. Cook Unit Conversion**:
   - Seamlessly converts recipe quantities (e.g. `180g Paneer`, `50ml Cream`) into inventory stock units (e.g. `kg`, `L`).
3. **End-to-End Order Reaction Loop**:
   - Ordering *Shahi Paneer* deducts 30g from cashew stock (1.05 kg $\rightarrow$ 1.02 kg).
   - Placing a 2nd order drops cashews to 0.99 kg ($< 1.0\text{ kg}$ par level).
   - **Both** *Shahi Paneer* AND *Cashew Nut Korma* instantly become `Unavailable (Below Par)`.
4. **Dependency-Aware Deletion**:
   - Deleting an unreferenced ingredient (e.g., *Bay Leaves*) executes cleanly.
   - Deleting a recipe dependency (e.g., *Cashews*) displays a warning modal listing affected dishes and safely flags them on the menu.
5. **Robust Input Validation**:
   - Rejects negative quantities, negative par levels, non-numbers, empty names, and duplicate ingredients.

---

## 📖 Engineering Write-up

For detailed explanations of technical trade-offs, critiques of the par-level rule, and test verification analysis, see [WRITEUP.md](./WRITEUP.md).
