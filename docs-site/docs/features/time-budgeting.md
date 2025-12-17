---
sidebar_position: 2
---

# Time Budgeting

The time budgeting system in Periodix-Planner allows you to allocate and track time across categories with hierarchical tracking from yearly down to daily periods.

## 🎯 Overview

Time budgets flow down through the hierarchy:

```
Yearly (10,000 hours)
├── Quarterly (2,500 hours)
│   ├── Monthly (833 hours)
│   │   ├── Weekly (208 hours)
│   │   │   └── Daily (24 hours)
```

Each level tracks:
- **Total hours available** in the period
- **Allocated hours** per category
- **Remaining hours** after allocations
- **Parent budget status** (if over/under parent allocation)

## 📊 Setting Up Time Budgets

### 1. Configure Base Hours

Go to **Settings** → **Periodix-Planner** → **Time budget** tab:

- **Hours per Week**: Base weekly hour budget (default: 40)

The plugin automatically calculates:
- Monthly = Weekly × 4.33
- Quarterly = Monthly × 3
- Yearly = Quarterly × 4

### 2. Define Categories

Go to **Settings** → **Periodix-Planner** → **Categories** tab:

1. Click **Add Category**
2. Enter a name (e.g., "Work", "Health", "Learning")
3. Choose a color for visual identification
4. Repeat for all categories

## 💰 Allocating Time

### Using the Allocation Editor

1. Open any periodic note
2. Click **Edit allocations** button
4. Use the allocation editor to:
   - Set hours for each category
   - Use quick-fill buttons (10%, 25%, 50%, Max)
   - Drag percentage bars
   - Enter custom percentages
   - See parent budget warnings

## 🔍 Budget Tracking

### Visual Indicators

The plugin provides visual feedback on budget status:

- 🟢 **Green** - Within budget, healthy allocation
- 🟡 **Yellow** - Approaching limit (80-100% allocated)
- 🔴 **Red** - Over budget or over parent allocation

### Parent Budget Warnings

When allocating time in child periods, the plugin tracks parent budgets:

- **Quarterly** allocations are tracked against **Yearly** budgets
- **Monthly** allocations are tracked against **Quarterly** budgets
- **Weekly** allocations are tracked against **Monthly** budgets
- **Daily** allocations are tracked against **Weekly** budgets

**Warning indicators:**
- ⚠️ Shows when over parent budget
- Displays parent allocation percentage
- Highlights over-budget items in red

### Remaining Hours

The allocation editor shows:
- **Allocated**: Total hours allocated across all categories
- **Remaining**: Hours still available
- **Percentage**: Allocation percentage of total available

## 📈 Hierarchical Budget Flow

### Yearly → Quarterly

1. Set yearly category budgets (e.g., Work: 2,000 hours)
2. Allocate quarterly portions (e.g., Q1 Work: 500 hours)
3. Plugin tracks remaining yearly budget (1,500 hours left)

### Quarterly → Monthly

1. Quarterly allocation sets the limit for monthly allocations
2. Monthly allocations are tracked against quarterly budget
3. Warnings appear if monthly total exceeds quarterly budget

### Monthly → Weekly

1. Monthly allocation sets the limit for weekly allocations
2. Weekly allocations are tracked against monthly budget
3. Plugin calculates remaining monthly hours

### Weekly → Daily

1. Weekly allocation sets the limit for daily allocations
2. Daily allocations are tracked against weekly budget
3. Visual feedback shows daily progress

## 🎨 Visual Statistics

### Pie Chart

The time budget block displays a pie chart showing:
- Category distribution
- Color-coded segments
- Percentage labels
- Click to enlarge

### Allocation Table

Detailed table showing:
- Category name and color
- Allocated hours
- Percentage of total
- Parent budget status
- Child allocations (if applicable)

### Progress Tracking

- Visual progress bars
- Remaining hours display
- Budget status indicators
- Sortable columns

## 💡 Best Practices

### 1. Start with Yearly Planning

Define your yearly time pool first:
- Total hours available per year
- Category priorities
- High-level allocations

### 2. Break Down Quarterly

Allocate yearly budgets to quarters:
- Consider seasonal variations
- Account for planned time off
- Leave buffer for adjustments

### 3. Refine Monthly

Adjust monthly allocations based on:
- Quarterly goals
- Upcoming commitments
- Previous month's actuals

### 4. Plan Weekly

Set weekly allocations aligned with:
- Monthly goals
- Current priorities
- Available time

### 5. Track Daily

Use daily notes to:
- See available time
- Track actual time spent
- Adjust future allocations

## 🔧 Advanced Features

### Auto-Inherit Parent Percentages {#auto-inherit-parent-percentages}

Periodix-Planner can automatically inherit time allocations from parent periods based on their percentage distribution. This feature helps maintain consistent allocation patterns across your hierarchical periods.

#### How It Works

When a child period has no categories allocated and the setting is enabled, the plugin automatically fills allocations using the parent's percentage distribution:

**Example:**
- **Parent (Monthly)**: 80h Work (50%), 48h Study (30%), 32h Exercise (20%)
- **Child (Weekly)**: 40h available → automatically gets 20h Work, 12h Study, 8h Exercise

#### Enabling Auto-Inherit

Go to **Settings** → **Periodix-Planner** → **Time budget** tab:

Enable **"Automatically inherit parent percentages"** to:
- Auto-fill empty child periods when time budget block renders
- Inherit parent's percentage distribution instantly
- Save time on repetitive allocations

#### Manual Fill from Parent

In the allocation editor, click the **"Fill parent"** button to:
- Manually inherit parent allocations at any time
- Override existing allocations with parent percentages
- Works even if auto-inherit is disabled

**Benefits:**
- One-click inheritance of parent allocations
- Maintains proportional distribution perfectly
- Uses precise integer arithmetic (zero rounding errors)
- Saves time on repetitive allocations

### Fill from Parent {#fill-from-parent}

Each category in the allocation editor has a **"Fill from parent"** checkbox that provides per-category control:

**How it works:**
- When enabled, quick-fill buttons (10%, 25%, 50%) calculate based on **parent's budget** instead of child's total
- Custom percentage input also uses parent budget
- Allows mixing parent-based and independent allocations

**Example:**
- Parent Work budget: 100 hours
- Child total available: 40 hours
- With "Fill from parent" checked for Work:
  - 50% button → 50h (50% of parent's 100h), not 20h (50% of child's 40h)
  - Max button → Uses parent's remaining budget

**Use case:** Useful when you want some categories to follow parent allocations while keeping others independent.

### Custom Percentage Input

Enter exact percentages:
1. Type percentage in custom input field
2. Click **Set** or press Enter
3. Allocation updates automatically

### Undo/Redo

The allocation editor supports:
- **Undo** (Ctrl/Cmd + Z) - Revert changes
- **Redo** (Ctrl/Cmd + Shift + Z) - Restore changes
- Visual undo/redo buttons

### Keyboard Shortcuts

- **Ctrl/Cmd + Z** - Undo
- **Ctrl/Cmd + Shift + Z** - Redo
- **Enter** - Apply custom percentage
- **Tab** - Navigate between inputs

---

**Next:** Learn about the [Allocation Editor](/features/allocation-editor) for detailed editing features.
