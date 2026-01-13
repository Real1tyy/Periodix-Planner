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

**No manual category creation needed!** Categories are automatically detected and registered when you use them in your periodic notes.

### How It Works

1. **Write a Time Allocation**: Add any category name in your time budget code fence
   ```
   ​```periodic-planner
   NewCategory: 5
   ​```
   ```
2. **Instant Registration**: CategoryTracker detects it and adds it to settings automatically with a default color
3. **Real-Time Tracking**: Usage statistics update as you work across all notes
4. **Automatic Cleanup**: Remove all instances of a category, and it's automatically removed from settings

### Example

When you create a time budget in any periodic note:

```
​```periodic-planner
Work: 40
Health: 10
Learning: 5
​```
```

The categories "Work", "Health", and "Learning" automatically appear in **Settings → Categories** with default colors - no manual setup required!

### Create Categories in the Allocation Editor

You can also create categories on-the-fly in the allocation editor:

1. Open the allocation editor in any note
2. Click **"+ Create new category"**
3. Enter the category name
4. Assign hours to it
5. Save - the category is instantly registered with a default color

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
- Blue (#3B82F6)
- Green (#10B981)
- Purple (#8B5CF6)
- Amber (#F59E0B)
- Red (#EF4444)
- Pink (#EC4899)
- Cyan (#06B6D4)
- Lime (#84CC16)

The system cycles through these colors as you add new categories.

### Changing Colors

Personalize category colors in settings:

1. Go to **Settings → Periodix-Planner → Categories**
2. Find the category you want to customize
3. Click the color picker next to the category name
4. Choose a new color from the wheel or enter a hex code
5. Changes apply instantly across all notes and visualizations

**Visual Feedback**: Category rows have a subtle background tint matching their color, and pie charts update immediately when colors change.

## ✏️ Editing Categories

### Rename Categories

To rename a category across all your notes:

1. Go to **Settings → Periodix-Planner → Categories**
2. Click the **pencil (edit)** button next to the category
3. Enter the new category name
4. Click **Rename**

The system will automatically update the category name in all notes that use it.

### Delete Categories

To completely remove a category:

1. Go to **Settings → Periodix-Planner → Categories**
2. Click the **trash (delete)** button next to the category
3. Confirm the deletion in the dialog
4. The category will be removed from all notes and settings

**Note**: Deletion is permanent and will remove the category from all time budget blocks across your vault.

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

### Fully Reactive System

Categories automatically sync as you work - no manual management needed:

- **Auto-Registration**: Use a new category name → CategoryTracker adds it to settings with a default color
- **Real-Time Tracking**: See note counts and hours update instantly
- **Color Changes**: Update colors → all charts and UI reflect immediately
- **Auto-Cleanup**: Remove all allocations → category automatically removed from settings
- **Undo/Redo Support**: Create categories in the allocation editor with full undo/redo functionality

### Behind the Scenes

The **Plugin**:
1. Monitors all periodic notes for category usage
2. Automatically registers new categories when detected
3. Updates usage statistics in real-time
4. Removes categories when no longer used
5. Provides color management with automatic defaults

## 🔍 Finding Category Usage

### In Settings

The Categories tab shows comprehensive statistics:
- Which notes use each category
- How many notes per period type
- Total hours and percentages
- Interactive pie chart visualization
- Edit and delete buttons for category management

### In Notes

Categories appear wherever you allocate time:
- Time budget code blocks
- Allocation editor modal
- Parent/child budget tracking

## 🚫 Removing Categories

To remove a category from your system:

1. Go to **Settings → Periodix-Planner → Categories**
2. Click the **trash (delete)** button next to the category
3. Confirm the deletion
4. The category will be removed from all notes and settings automatically

**Alternative**: You can also manually remove allocations from all notes. Once a category is no longer used anywhere, it will be automatically cleaned up from settings.

**Note**: Category colors are preserved even if temporarily unused - they'll reappear with the same color if you use the category again.


---

## Next Steps

- **[Statistics](/features/statistics)** - Learn about comprehensive analytics and pie charts
- **[Time Budget Blocks](/features/time-budget-blocks)** - Understand how to allocate time in notes
- **[Allocation Editor](/features/allocation-editor)** - Use the interactive editor for time management
- **[Time Budgeting](/features/time-budgeting)** - Automatically inherit parent allocations
