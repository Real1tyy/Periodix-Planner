---
sidebar_position: 3
---

# Quick Start

**Prefer video?** [Watch the full feature breakdown on YouTube](https://www.youtube.com/watch?v=bIVNj6fkTc8) to see everything in action.

## Step 1: Open settings

1. Open **Settings** (gear icon in the bottom left)
2. Navigate to **Periodix-Planner** in the left sidebar

You'll see several tabs for configuration:
- **Folders** - Where your periodic notes will be stored
- **Naming** - How your notes will be named
- **Time budget** - Configure available hours
- **Categories** - Define your time investment categories
- **Properties** - Customize frontmatter property names
- **Generation** - Control auto-generation behavior

## Step 2: Configure folders

Set up where you want your periodic notes to be stored:

1. Go to the **Folders** tab
2. Configure each period type's folder:
   - **Daily Folder**: `Periodic/Daily` (default)
   - **Weekly Folder**: `Periodic/Weekly` (default)
   - **Monthly Folder**: `Periodic/Monthly` (default)
   - **Quarterly Folder**: `Periodic/Quarterly` (default)
   - **Yearly Folder**: `Periodic/Yearly` (default)

You can customize these to match your vault structure. The plugin will create these folders automatically if they don't exist.

## Step 3: Set up categories

Define your time investment categories:

1. Go to the **Categories** tab
2. Click **Add Category**
3. Enter a name (e.g., "Work", "Health", "Learning")
4. Choose a color for visual identification
5. Repeat for all your categories

**Example categories:**
- Work (Blue)
- Health & Fitness (Green)
- Learning (Purple)
- Relationships (Orange)
- Personal Projects (Red)

## Step 4: Configure time budget

Set your available hours:

1. Go to the **Time budget** tab
2. Set **Hours per Week** (default: 40)

The plugin will automatically calculate hours for each period type based on your weekly hours.

## Step 5: Customize naming (optional)

Customize how your notes are named:

1. Go to the **Naming** tab
2. Adjust the format strings if desired (uses [Luxon format tokens](https://moment.github.io/luxon/#/formatting?id=table-of-tokens)):
   - **Daily**: `dd-MM-yyyy` (default: 04-12-2025)
   - **Weekly**: `WW-kkkk` (default: 47-2025)
   - **Monthly**: `M-yyyy` (default: 5-2025)
   - **Quarterly**: `'Q'q-yyyy` (default: Q1-2025)
   - **Yearly**: `yyyy` (default: 2025)

## Step 6: Generate your first notes

1. Go to the **Generation** tab in settings
2. Enable **Auto-generate future periods**
3. The plugin will automatically create notes when you open Obsidian again or use the command `Generate future periods`

## Step 7: View the time budget block

The plugin automatically adds a time budget block to each generated periodic note:

1. Open one of your generated periodic notes
2. You'll see a `periodic-planner` code block already added after the frontmatter
3. The block renders as an interactive view with:
   - Pie chart visualization
   - Allocation table showing each category
   - Budget tracking indicators
   - **Edit allocations** button

**Note:** If auto-inherit is enabled (Settings → Time budget → Auto-inherit parent percentages), child periods will automatically inherit allocations from their parent period based on percentage distribution.

## Step 8: Allocate time to categories

Use the Allocation Editor to distribute hours across your categories:

1. Click the **Edit allocations** button in the time budget block
2. For each category, you can:
   - **Type hours directly** in the input field
   - **Use quick-fill buttons**: 10%, 25%, 50%, or Max
   - **Drag the percentage bar** to adjust visually
   - **Enter custom percentage** and click Set
3. The editor shows:
   - Total allocated vs. remaining hours
   - Color-coded status (green/yellow/red)
   - Parent budget warnings if you exceed parent allocations
4. Click **Save allocations** to write the changes to the note

**Tip:** Use the **Fill parent** button (top-left) to instantly inherit your parent period's percentage distribution.

## Next steps

- Learn about [all features](/features/overview)
- Explore [configuration options](/configuration)
- Check out [time budgeting](/features/time-budgeting) in detail
- Read about [navigation commands](/features/navigation)

## Tips

- **Link to projects**: Use the time budget to track hours spent on specific projects
- **Review regularly**: Check your allocations weekly to ensure you're on track
- **Adjust as needed**: Time budgets are flexible - update them as priorities change

---

**Need help?** Check the [FAQ](/faq) or [Troubleshooting Guide](/troubleshooting) for common questions and solutions.
