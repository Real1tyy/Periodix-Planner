---
sidebar_position: 9
---

# Time Budget Blocks

Time budget blocks are interactive code blocks that display visual time allocation statistics directly in your periodic notes.

## 🎯 Overview

Time budget blocks render as interactive visualizations showing:
- Pie chart of category distribution
- Detailed allocation table
- Budget status indicators
- Edit button for quick adjustments

## 📝 Adding a Time Budget Block

Add a code block with the language `periodic-planner`:

````markdown
```periodic-planner
work: 8h
health: 2h
learning: 1h
```
````

The plugin automatically renders this as an interactive time budget interface.

## ✍️ Block Syntax

### Basic Format

```
categoryId: hours
```

**Examples:**

````markdown
```periodic-planner
work: 40h
health: 10h
learning: 5h
relationships: 5h
```
````

## 🎨 Rendered Interface

When rendered, the block displays:

### Header Section

- **Total hours available** - Hours in the current period
- **Total allocated** - Sum of all category allocations
- **Remaining hours** - Hours still available
- **Status indicators** - Color-coded budget status

### Pie Chart

- Visual representation of category distribution
- Color-coded by category
- Click to enlarge
- Shows percentages

### Allocation Table

- Category name and color
- Allocated hours
- Percentage of total
- Parent budget status (if applicable)
- Child allocations (if applicable)

### Edit Button

- Opens allocation editor modal
- Quick access to edit allocations
- Saves changes to frontmatter

## 🔄 Auto-Insertion

The plugin can automatically add time budget blocks to generated notes:

1. Go to **Settings** → **Periodix-Planner** → **Generation**
2. Configure time budget block settings
3. Blocks are added when notes are generated

### Configuration Options

- **Add heading above code block** - Include markdown heading
- **Plan heading content** - Customize heading text

---

**Related:** Learn about [Time Budgeting](/features/time-budgeting) and [Allocation Editor](/features/allocation-editor).
