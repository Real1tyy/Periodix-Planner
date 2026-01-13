---
sidebar_position: 1
---

# Features Overview

Periodix-Planner provides a comprehensive set of features for managing periodic notes and time budgets. This page gives you an overview of all available features.

**Prefer video?** [Watch the full video tutorial](/videos) to see everything in action.

## 📅 Automatic Note Generation

Periodix-Planner automatically creates periodic notes for all time periods, always staying one step ahead by generating the next period's note in advance.

**Supported Periods:**
- Daily notes
- Weekly notes
- Monthly notes
- Quarterly notes
- Yearly notes

**Learn more:** [Automatic Note Generation](/features/note-generation)

## 🔗 Interconnected Notes

All periodic notes are intelligently linked through frontmatter properties, creating a navigable web of time that lets you zoom in and out of your planning horizon effortlessly.

**Navigation Links:**
- `Previous` / `Next` - Navigate chronologically within the same period type
- Hierarchical links - Jump from daily → weekly → monthly → quarterly → yearly

**Learn more:** [Note Interconnection](/features/note-interconnection)

## ⏱️ Time Budget System

Define how many hours you have available and delegate them across categories with hierarchical tracking.

**Features:**
- Yearly time pool definition
- Cascading allocation through hierarchy
- Smart budget tracking with warnings
- Visual feedback (green/yellow/red indicators)
- **Auto-inherit parent percentages** - Automatically fill child periods based on parent's allocation distribution
- Manual "Fill parent" button for on-demand inheritance

**Learn more:** [Time Budgeting](/features/time-budgeting)

## 📊 Visual Statistics

Get visual insights into your time allocation with interactive charts and tables.

**Visualizations:**
- Pie charts showing category distribution
- Detailed allocation tables
- Progress bars for budget tracking
- Parent/child budget comparisons

**Learn more:** [Visual Statistics](/features/visual-statistics)

## ✏️ Allocation Editor

Interactive modal for editing time allocations with powerful features:

- Drag-to-adjust percentage bars
- Quick-fill buttons (10%, 25%, 50%, Max)
- Custom percentage input
- Parent budget warnings
- Undo/redo support
- Keyboard shortcuts

**Learn more:** [Allocation Editor](/features/allocation-editor)

## 🎨 Category Management

Organize your time investments with custom categories:

- Custom category names
- Color coding for visual identification
- Category-based time tracking
- Budget allocation per category

**Learn more:** [Category Management](/features/categories)

## 🧭 Navigation Commands

Quick commands to navigate between periods:

- Go to previous/next period
- Go to parent period
- Open current daily/weekly/monthly/quarterly/yearly note
- Show child periods

**Learn more:** [Navigation](/features/navigation)

## 📝 Code Block Processor

Embed time budget visualizations directly in your notes using code blocks:

````markdown
```periodic-planner
work: 8h
health: 2h
learning: 1h
```
````

**Learn more:** [Time Budget Blocks](/features/time-budget-blocks)

## ⚙️ Flexible Configuration

Comprehensive settings for customization:

- **Folders** - Configure where notes are stored
- **Naming** - Customize note naming formats
- **Time Budget** - Set available hours per period
- **Categories** - Define time investment categories
- **Properties** - Customize frontmatter property names
- **Generation** - Control auto-generation behavior

**Learn more:** [Configuration](/configuration)

## 🔄 Auto-Generation

Automatic note generation when you open Obsidian:

- Configurable auto-generation
- Generates next period in advance
- Respects existing notes
- Configurable generation rules

**Learn more:** [Note Generation](/features/note-generation)

## 📋 Period Children View

View all child periods for a given period:

- See all days in a week
- See all weeks in a month
- See all months in a quarter
- See all quarters in a year

**Learn more:** [Period Children](/features/period-children)

## 🗂️ Bases Integration

Filter and view tasks by period intervals using the Bases plugin:

- **Sidebar View** - Persistent task filtering in sidebar
- **Inline Generation** - Automatically embed Bases views in new notes
- **Auto-Filtering** - Tasks filtered by period date range
- **Configurable** - Customize task directory, date property, and display columns
- **Ribbon Icon** - Optional quick-access icon (configurable)

**Learn more:** [Bases Integration](/features/bases-integration)

---
