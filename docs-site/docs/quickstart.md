---
sidebar_position: 3
---

# Quick Start

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
3. Optionally override monthly, quarterly, or yearly hours if needed

The plugin will automatically calculate hours for each period type based on your weekly hours.

## Step 5: Customize naming (optional)

Customize how your notes are named:

1. Go to the **Naming** tab
2. Adjust the format strings if desired:
   - **Daily**: `YYYY-MM-DD` (default)
   - **Weekly**: `YYYY-[W]WW` (default)
   - **Monthly**: `YYYY-MM` (default)
   - **Quarterly**: `YYYY-[Q]Q` (default)
   - **Yearly**: `YYYY` (default)

## Step 6: Generate your first notes

You have two options:

### Option A: Generate for Today
1. Open the **Command Palette** (Ctrl/Cmd + P)
2. Type **"Generate all periods for today"**
3. Execute the command

This will create:
- Today's daily note
- This week's weekly note
- This month's monthly note
- This quarter's quarterly note
- This year's yearly note

### Option B: Auto-Generation
1. Go to the **Generation** tab in settings
2. Enable **Auto-generate future periods**
3. The plugin will automatically create notes when you open Obsidian

## Step 7: Add a time budget block

To render a time budget block in a note:

1. Open one of your generated periodic notes
2. Add a code block with the language `periodic-planner`:

````markdown
```periodic-planner
work: 8h
health: 2h
learning: 1h
```
````

3. The plugin will render a time budget view with:
   - Pie chart visualization
   - Allocation table
   - Budget tracking
   - Edit button to modify allocations

## Step 8: Edit allocations

To update allocations:

1. Click the **Edit allocations** button in the time budget block
2. Use the allocation editor modal to:
   - Set hours for each category
   - Use quick-fill buttons (10%, 25%, 50%, Max)
   - Drag the percentage bar to adjust
   - See parent budget warnings
   - Track remaining hours

3. Click **Save allocations** to update the note's frontmatter

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
