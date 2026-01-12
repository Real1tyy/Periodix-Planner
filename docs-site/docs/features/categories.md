---
sidebar_position: 8
---

# Category Management

![Category management screenshot](/img/features/categories.png)

Categories in Periodix-Planner allow you to organize and track your time investments across different areas of your life.

## 🎯 Overview

Categories are the foundation of the time budgeting system. They represent different areas where you invest your time:

- **Work** - Professional activities
- **Health** - Exercise, wellness, self-care
- **Learning** - Education, skill development
- **Relationships** - Family, friends, social activities
- **Personal Projects** - Hobbies, creative pursuits

## ✨ Automatic Discovery

**No manual category creation needed!** Categories are automatically detected when you use them in your periodic notes.

### How It Works

1. **Use a Category**: Add time allocation with any category name in a periodic note
2. **Instant Detection**: The category appears in settings automatically
3. **Real-Time Tracking**: Usage statistics update as you work
4. **Automatic Cleanup**: Remove all instances of a category, and it's automatically cleaned up

### Example

When you create a time budget in any periodic note:

```
​```periodic-planner
- Work: 40
- Health: 10
- Learning: 5
​```
```

The categories "Work", "Health", and "Learning" automatically appear in **Settings → Categories** - no manual setup required.

## 🎨 Using Categories

### In Time Budgets

Categories work seamlessly across:
- **[Time Budget Blocks](/features/time-budget-blocks)** - Allocate hours in your periodic notes
- **[Allocation Editor](/features/allocation-editor)** - Interactive modal for managing allocations
- **[Statistics](/features/statistics)** - Comprehensive analytics and visualizations
- **Budget Tracking** - Monitor spending across parent/child periods

## 🎨 Customizing Colors

### Default Colors

When a category is first discovered, it's automatically assigned a color from the default palette:

### Changing Colors

Personalize category colors in settings:

1. Go to **Settings → Periodix-Planner → Categories**
2. Find the category you want to customize
3. Click the color picker next to the category name
4. Choose a new color from the wheel or enter a hex code
5. Changes apply instantly - no save needed

**Visual Feedback**: Category rows have a subtle background tint matching their color, and the pie chart updates immediately when colors change.

## 📊 Category Statistics

The Categories settings tab serves as your analytics hub. See comprehensive usage data for all your categories:

### What You'll See

For each category, view:
- **Total Notes**: How many notes use this category across all period types
- **Period Breakdown**: Usage per period type (e.g., "Daily: 5 · Weekly: 3 · Monthly: 1")
- **Hours Allocated**: Total time for the selected period type
- **Percentage**: Category's share of total time
- **Color-Coded Rows**: Visual identification with subtle background tinting

### Smart Sorting

Categories are automatically ordered:
1. **By Hours** (for selected period type): Most-used categories first
2. **By Total Notes**: Categories in more notes rank higher
3. **Alphabetically**: Ties broken alphabetically

**Learn More**: See the **[Statistics](/features/statistics)** page for complete details on analytics, pie charts, and insights.

## 🔄 Category Lifecycle

### Reactive System

Categories automatically sync as you work:

- **Add New**: Use a new category name → appears instantly in settings
- **Track Usage**: See note counts update in real-time
- **Color Changes**: Update colors → charts and UI reflect immediately
- **Auto-Cleanup**: Remove all allocations → category automatically removed

## 🔍 Finding Category Usage

### In Settings

The Categories tab shows comprehensive statistics:
- Which notes use each category
- How many notes per period type
- Total hours and percentages
- Interactive pie chart visualization

### In Notes

Categories appear wherever you allocate time:
- Time budget code blocks
- Allocation editor modal
- Parent/child budget tracking

## 🚫 Removing Categories

Categories are automatically removed when no longer used:

1. **Remove Allocations**: Delete the category from all periodic notes
2. **Automatic Cleanup**: System detects no usage and removes it
3. **No Manual Deletion**: No need to manually delete in settings

**Note**: Category colors are preserved even if temporarily unused - they'll reappear with the same color if you use the category again.


---

## Next Steps

- **[Statistics](/features/statistics)** - Learn about comprehensive analytics and pie charts
- **[Time Budget Blocks](/features/time-budget-blocks)** - Understand how to allocate time in notes
- **[Allocation Editor](/features/allocation-editor)** - Use the interactive editor for time management
- **[Auto-Inherit](/features/auto-inherit)** - Automatically inherit parent allocations
