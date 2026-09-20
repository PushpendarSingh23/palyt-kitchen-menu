# Palyt Engineering Intern Task — Write-up

---

## 1. The Calls You Made

### A. The Deletion Dilemma: What happens when you delete an ingredient?
In a restaurant, ingredients are not isolated records—they form a directed dependency graph with the active menu.
* **Unreferenced ingredients (e.g., `Bay Leaves`)**: Deleting them has zero downstream impact on recipes. The system executes a clean deletion immediately after user confirmation.
* **Referenced ingredients (e.g., `Cashews`, used in *Shahi Paneer* and *Cashew Nut Korma*)**: 
  * **Decision**: We implemented **Dependency-Aware Guarding**. When a user attempts to delete an ingredient, the system inspects all recipe dependencies across the menu and presents a modal warning detailing the exact affected dishes and their prices.
  * **System behavior**: If the kitchen manager confirms deletion, the dependency does not cause a crash or unhandled `null` lookup. Instead, the recipe evaluation engine detects the missing inventory record and marks all dependent dishes as **`Unavailable (Missing Ingredient: Cashews)`**.
  * **Rationale**: In real kitchen operations, deleting an ingredient from inventory usually means "we no longer stock/order this item." The menu must immediately reflect that the dish cannot be prepared, without breaking the rest of the menu or corrupting order processing.

---

### B. Critique of the Product Availability Rule
> **Prompt Rule:** *"A dish is unavailable when any ingredient it uses has fallen below its par level."*

While implementing this rule faithfully as specified, we identified three critical operational edge cases where this rule breaks down in a real restaurant:

1. **The Zero-Par / Insufficient Stock False Positive:**
   * If an ingredient has `par = 0` (or `par = 10g`) and current stock is `50g`, but the recipe requires `200g`, the naive rule `stock >= par` evaluates to `TRUE` (50 >= 0).
   * **Result**: The system tells the diner the dish is available, the diner orders it, and the kitchen physically cannot cook it.
   * **Our Fix**: We implemented a dual-condition availability rule: `stock >= par` **AND** `stock >= required_recipe_quantity`.

2. **Procurement Trigger vs. Customer Stop-Sale (Food Waste & Lost Revenue):**
   * In commercial hospitality, **Par Level** is primarily a *procurement buffer* (the threshold at which the kitchen manager places an order with the supplier before the next delivery cycle).
   * If par is 1.0 kg and stock is 0.95 kg, the kitchen still possesses 950g of fresh cashews (enough for 31 portions of Shahi Paneer). Hard-stopping customer orders at par turns away paying customers and leaves perishable inventory in the walk-in refrigerator to spoil.
   * **Recommended Product Evolution**: Separate **Par Level (Purchasing Alert)** from **Menu 86-Threshold (Cutoff Level)**, or introduce an "Over-par Buffer" setting.

3. **Sub-recipe Batching vs. Single-Portion Cooking:**
   * Kitchens rarely cook mother sauces (like Makhani gravy or Korma paste) from raw cashews per single plate order. They batch-prep 10 litres in the morning. An ideal system tracks batch-prepped sub-recipes rather than deducting raw spices per portion.

---

### C. Input Validation: What "Nonsense" Means
To safeguard kitchen data integrity, the system rejects:
1. **Negative numbers**: Quantities and par levels $< 0$ are blocked.
2. **Non-numeric / NaN values**: Strings, malformed decimals, or infinity are rejected.
3. **Empty / Blank names**: Names must be $\ge 2$ non-whitespace characters.
4. **Duplicate entries**: Adding an ingredient whose name already exists is prevented to avoid ambiguous multi-row stock state.
5. **Cross-dimensional conversions**: Attempting to specify recipes with incompatible dimensions (e.g. converting grams to millilitres without a specified specific gravity) throws explicit conversion errors.

---

## 2. How You Checked

### How do we know the numbers are right?
1. **Dimensional Base Normalization**:
   All culinary calculations normalize into standard base dimensions:
   $$\text{Weight} \rightarrow \text{grams (g)}, \quad \text{Volume} \rightarrow \text{millilitres (ml)}, \quad \text{Count} \rightarrow \text{discrete units}$$
2. **Hand-Checked Traceability**:
   * *Paneer*: Stock = 5.0 kg (5,000g). Recipe portion = 180g (0.18 kg). Order 1 $\rightarrow$ Stock = 4.82 kg ($5.0 - 0.18$).
   * *Cashews*: Stock = 1.05 kg (1,050g), Par = 1.0 kg (1,000g). Recipe portion = 30g (0.03 kg).
     * Order 1 $\rightarrow$ Stock = 1.02 kg ($1.02 \ge 1.0$ par) $\rightarrow$ *Shahi Paneer* & *Korma* **Available**.
     * Order 2 $\rightarrow$ Stock = 0.99 kg ($0.99 < 1.0$ par) $\rightarrow$ *Shahi Paneer* & *Korma* **instantly turn Unavailable**.
   * *Cream*: Stock = 4.0 L (4,000 ml). Recipe portion = 50 ml (0.05 L). Order 1 $\rightarrow$ Stock = 3.95 L.

### What would have to be wrong for our automated tests to still pass?
Our test suite in [`test/logic.test.js`](file:///test/logic.test.js) verifies exact arithmetic, boundary conditions ($= \text{par}$, $< \text{par}$, missing ingredients), and cascading multi-dish reactions.
* **If unit conversion had an inverted multiplier** (e.g., multiplying by 1,000 instead of dividing when converting grams to kilograms), the stock deduction assertions ($4.82\text{ kg}$ vs $-175.0\text{ kg}$) would immediately fail.
* **If the availability evaluator checked only $> 0$ rather than $\ge \text{par}$**, the second-order cashew test would fail because 0.99 kg is $> 0$.
* **If dependency tracking missed multiple recipe references**, the test asserting that *both* Shahi Paneer and Cashew Nut Korma become unavailable would fail.

---

## 3. Another Day: What to Build or Fix Next

1. **Yield & Prep Loss Factors (Edible Portion vs As-Purchased)**:
   * 1 kg of whole unpeeled onions yields approximately 850g of usable diced onions (15% prep waste). Adding a `% yield` coefficient per ingredient ensures exact food costing and prevents unexpected kitchen shortages.
2. **Batch / Sub-Recipe Prep Workflow**:
   * Support composite prep items (e.g., "10L Base Gravy") that consume raw ingredients during morning prep and get deducted per dish during service.
3. **Dynamic / Lead-Time Aware Par Levels**:
   * Automatically calculate par based on delivery lead time (e.g., supplier delivers every 2 days) and historical velocity (e.g., Saturday night vs Tuesday lunch).
4. **Cart Reservation & Concurrent Ordering Locks**:
   * Place temporary soft locks on ingredients when dishes are added to a diner's cart to prevent race-condition overselling.
