---
sidebar_position: 7
---

# Configuration

Periodix-Planner offers comprehensive configuration options to customize the plugin to your workflow and preferences.

## Settings Overview

Access settings via **Settings** → **Periodix-Planner**. The settings are organized into tabs:

- **Folders** - Configure where notes are stored
- **Naming** - Customize note naming formats
- **Time budget** - Set available hours per period
- **Categories** - Define time investment categories
- **Properties** - Customize frontmatter property names
- **Generation** - Control auto-generation behavior
- **Integrations** - Configure ActivityWatch and Templater
- **Bases** - Configure Bases plugin integration for task filtering

## Folders Tab

Configure where periodic notes are stored in your vault.

| Setting | Description | Default |
|---------|-------------|---------|
| **Daily Folder** | Where daily notes are stored | `Periodic/Daily` |
| **Weekly Folder** | Where weekly notes are stored | `Periodic/Weekly` |
| **Monthly Folder** | Where monthly notes are stored | `Periodic/Monthly` |
| **Quarterly Folder** | Where quarterly notes are stored | `Periodic/Quarterly` |
| **Yearly Folder** | Where yearly notes are stored | `Periodic/Yearly` |

**Note:** Folders are created automatically if they don't exist.

[Learn more about note generation](/features/note-generation)

## Naming Tab

Customize how periodic notes are named using [Luxon format tokens](https://moment.github.io/luxon/#/formatting?id=table-of-tokens).

| Period | Setting | Default Format | Example |
|--------|---------|----------------|---------|
| Daily | **Daily Format** | `YYYY-MM-DD` | `2025-01-15` |
| Weekly | **Weekly Format** | `YYYY-[W]WW` | `2025-W03` |
| Monthly | **Monthly Format** | `YYYY-MM` | `2025-01` |
| Quarterly | **Quarterly Format** | `YYYY-[Q]Q` | `2025-Q1` |
| Yearly | **Yearly Format** | `YYYY` | `2025` |

**Common format tokens:**
- `YYYY` - 4-digit year
- `MM` - 2-digit month
- `DD` - 2-digit day
- `[W]WW` - Week number with "W" prefix
- `[Q]Q` - Quarter number with "Q" prefix

## Time Budget Tab

Configure available hours for each period type and inheritance behavior.

| Setting | Description | Default |
|---------|-------------|---------|
| **Hours per Week** | Base weekly hour budget for planning | `40` |
| **Automatically inherit parent percentages** | Auto-fill child periods with parent's allocation distribution | `false` |
| **Hide unused categories by default** | Hide categories with no parent budget in the allocation editor | `true` |
| **Default time budget sorting** | How categories are sorted in time budget tables | `Hours (highest first)` |

**Sorting options:**
- Hours (highest first) - Shows most time-intensive categories at the top
- Hours (lowest first) - Shows least allocated categories first
- Category (A-Z) - Alphabetical sort ascending
- Category (Z-A) - Alphabetical sort descending

**Hours calculations:**
- Monthly = Weekly × 4.33
- Quarterly = Monthly × 3
- Yearly = Quarterly × 4

Enable auto-inherit to fill child periods based on parent percentages. [Learn more](/features/time-budgeting#auto-inherit-parent-percentages)

## Categories Tab

Define your time investment categories for budget tracking.

**Adding categories:**
1. Click **Add Category**
2. Enter category name
3. Choose color (hex format)
4. Click **Save**

**Managing categories:**
- Click category name to view all notes with that category in Bases (requires Bases plugin)
- Click pencil icon to rename
- Click trash icon to delete (removes category from all allocations)
- Adjust color using the color picker

**Viewing category notes:**
- Click on any category name to open a Bases view
- Shows all periodic notes containing that category
- Organized by period type (yearly, quarterly, monthly, weekly, daily)
- Requires the Bases plugin to be installed

[Learn more about categories](/features/categories)

## Properties Tab

Customize frontmatter property names used for note interconnection.

| Setting | Description | Default |
|---------|-------------|---------|
| **Previous Property** | Property name for previous period link | `Previous` |
| **Next Property** | Property name for next period link | `Next` |
| **Parent Property** | Property name for parent period link | `Parent` |
| **Week Property** | Property name for week link | `Week` |
| **Month Property** | Property name for month link | `Month` |
| **Quarter Property** | Property name for quarter link | `Quarter` |
| **Year Property** | Property name for year link | `Year` |
| **Hours Available Property** | Property name for available hours | `Hours Available` |

[Learn more about note interconnection](/features/note-interconnection)

## Generation Tab

Control automatic note generation behavior and which period types to enable.

### Note Generation

| Setting | Description | Default |
|---------|-------------|---------|
| **Auto-generate on load** | Automatically generate the next period's note when Obsidian loads | `true` |
| **Generate periods ahead** | How many periods into the future to generate (1-5) | `1` |

When enabled, the plugin generates notes when Obsidian opens and creates future periods automatically while respecting existing notes.

### Enabled Period Types

Select which period types to generate and track. Disabled periods will be skipped in navigation and time budget calculations.

| Setting | Description | Default |
|---------|-------------|---------|
| **Enable daily notes** | Generate and track daily periodic notes | `true` |
| **Enable weekly notes** | Generate and track weekly periodic notes | `true` |
| **Enable monthly notes** | Generate and track monthly periodic notes | `true` |
| **Enable quarterly notes** | Generate and track quarterly periodic notes | `true` |
| **Enable yearly notes** | Generate and track yearly periodic notes | `true` |

**How it works:**
- Disabled period types are completely skipped in the hierarchy
- Navigation automatically jumps to the next enabled period type
- Time budget calculations adjust based on enabled periods
- Parent/child relationships adapt to your enabled periods

**Example:** If you disable weekly notes, daily notes will link directly to monthly notes as their parent, and monthly notes will show daily notes as children.

### Startup Behavior

Configure actions to perform when the plugin loads.

| Setting | Description | Default |
|---------|-------------|---------|
| **Open yesterday's PDF on startup** | Automatically open yesterday's daily note PDF in a detached window when Obsidian loads | `false` |

**How it works:**
- When enabled, the plugin checks for yesterday's daily note PDF on startup
- Opens the PDF in a new detached window if it exists and isn't already open
- Useful for reviewing the previous day's notes when starting your work session
- Fails silently if the PDF doesn't exist

**Note:** This feature requires that PDF notes exist alongside your markdown notes. Enable PDF commands in the PDF note linking section if you want to work with PDF versions of your periodic notes.

### Bases View Embedding

Automatically embed Bases task filtering views in newly generated periodic notes.

| Setting | Description | Default |
|---------|-------------|---------|
| **Include Bases view in generation** | Add Bases view to newly generated notes | `false` |
| **Bases heading** | Markdown heading above the Bases view | `## Bases` |

**How it works:**
- When enabled, Bases views are automatically added to new notes
- Filters tasks from your configured tasks directory
- Uses the period's date range for filtering
- Appears before PDF content (if enabled)

[Learn more about note generation](/features/note-generation) and [note interconnection](/features/note-interconnection)

## Bases Tab

Configure integration with the Bases plugin for filtering tasks by period intervals. [Learn more about Bases integration](/features/bases-integration)

| Setting | Description | Default |
|---------|-------------|---------|
| **Tasks directory** | Path to your tasks folder (e.g., `Tasks`) | Empty |
| **Date property** | Frontmatter property name for task dates | `Date` |
| **Date column size** | Width in pixels for the date column in the table view | `150` |
| **Properties to show** | Comma-separated list of additional properties to display | Empty |
| **Show ribbon icon** | Display ribbon icon in left sidebar for quick access | `true` |

**How it works:**
- Automatically filters tasks from your tasks directory based on the current period's date range
- Works with all period types (daily, weekly, monthly, quarterly, yearly)
- Provides both a sidebar view and inline generation for task filtering
- Updates automatically when switching between periodic notes

**Example setup:**
```yaml
Tasks directory: Tasks
Date property: due
Date column size: 200
Properties to show: status,priority,tags
```

This configuration:
- Filters tasks from the `Tasks` folder
- Uses the `due` frontmatter property for date filtering
- Sets the date column width to 200 pixels
- Displays status, priority, and tags columns in the table

[Learn more about Bases integration](/features/bases-integration)

---

**Next:** Check out the [FAQ](/faq) for common questions about configuration.
