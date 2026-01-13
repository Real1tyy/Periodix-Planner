---
sidebar_position: 2
---

# Time Budgeting

![Time budgeting screenshot](/img/features/time-budgeting.png)

The time budgeting system allows you to allocate and track time across categories with hierarchical tracking from yearly down to daily periods.

## Overview

Time budgets flow down through the hierarchy:

```
Yearly (10,000 hours)
├── Quarterly (2,500 hours)
│   ├── Monthly (833 hours)
│   │   ├── Weekly (208 hours)
│   │   │   └── Daily (24 hours)
```

Each level tracks total hours available, allocated hours per category, remaining hours, and parent budget status.

## Setup

**Configure base hours:** Set your weekly hours in Settings → Time budget. The plugin automatically calculates monthly, quarterly, and yearly hours. [Learn more](/configuration#time-budget-tab)

**Categories auto-register:** No setup needed! Just start using category names in your time allocations. Categories are automatically created with default colors and appear in settings instantly. [Learn more](/features/categories)

## Allocating Time

1. Open any periodic note
2. Click **Edit allocations** button
3. Distribute hours across categories:
   - Use existing categories from the dropdown
   - Create new categories on-the-fly with the "+ Create new category" button
   - New categories get default colors automatically (blue, green, purple, etc.)
   - All changes are reactive - categories appear in settings immediately

4. Categories are automatically tracked across all your notes

[Learn more about the Allocation Editor](/features/allocation-editor)

## Budget Tracking

**Visual indicators:**
- 🟢 Green - Within budget
- 🟡 Yellow - Approaching limit (80-100%)
- 🔴 Red - Over budget or exceeds parent allocation

**Parent budget tracking:** Child periods (daily, weekly, monthly, quarterly) are tracked against their parent period's budget. Warnings appear when allocations exceed parent limits.

**Remaining hours:** The allocation editor shows allocated hours, remaining hours, and allocation percentage.

## Hierarchical Budget Flow

Time budgets cascade through the hierarchy:

1. **Yearly → Quarterly:** Set yearly budgets, allocate quarterly portions, track remaining
2. **Quarterly → Monthly:** Monthly allocations tracked against quarterly limits
3. **Monthly → Weekly:** Weekly allocations tracked against monthly limits
4. **Weekly → Daily:** Daily allocations tracked against weekly limits

Warnings appear when child allocations exceed parent budgets.

## Visual Statistics

The time budget block displays pie charts and allocation tables showing category distribution, allocated hours, percentages, and parent budget status.

[Learn more about Visual Statistics](/features/visual-statistics)

## Advanced Features

### Hide Unused Categories {#hide-unused-categories}

Reduce clutter in the Allocation Editor by hiding categories with no parent budget allocation.

- **Configure default:** Settings → Time budget → "Hide unused categories by default" (default: ON)
- **Toggle in editor:** Use the "Hide unused" checkbox at the top of the Allocation Editor
- **Smart filtering:** Shows categories that have either:
  - Current allocation in the note being edited
  - Budget allocated in the parent period
- **Yearly exception:** Yearly notes always show all categories (top-level planning)

This helps focus on relevant categories while editing child periods (daily, weekly, monthly, quarterly).

### Auto-Inherit Parent Percentages {#auto-inherit-parent-percentages}

Automatically fill child periods based on the parent period's percentage distribution.

- **Enable globally:** Settings → Time budget → "Automatically inherit parent percentages"
- **Manual per-note:** Click "Fill parent" button in the Allocation Editor

Example: If parent is 50/30/20, child gets the same 50/30/20 split of its own total hours.

### Fill from Parent {#fill-from-parent}

Per-category option in the Allocation Editor that calculates percentages based on the parent's category budget instead of the child's total hours. Mix and match: some categories can follow the parent, others can be independent.

---

**Related:** [Allocation Editor](/features/allocation-editor) • [Visual Statistics](/features/visual-statistics) • [Configuration](/configuration#time-budget-tab)
