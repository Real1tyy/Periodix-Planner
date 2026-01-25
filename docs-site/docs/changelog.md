---
sidebar_position: 7
---

# Changelog

All notable changes to this project will be documented here.

---

## 1.6.0 - 2026-01-25

### Added

- **Past Period Generation**: Automatically generate all missing periodic notes from a specific starting date
  - **Location**: Settings → Generation → "Starting period generation date"
  - **What it does**: When set, the plugin generates all missing periodic notes (daily, weekly, monthly, quarterly, yearly) from the specified date to today on startup
  - **Use case**: Perfect for backfilling past notes when you start using the plugin or want to ensure all historical periods exist
  - **How it works**:
    - Set a starting date (e.g., January 1, 2025)
    - On next startup, the plugin checks for missing notes from that date to today
    - Generates only the missing notes - existing notes are preserved
    - Respects your enabled period types (only generates enabled periods)
  - **Default**: Empty (disabled)
  - **Example**: If today is January 25, 2026 and you set the starting date to January 1, 2025, the plugin will generate all daily, weekly, monthly, quarterly, and yearly notes from January 2025 to January 2026

- **Disable automatic generation**: New setting to prevent automatic file creation and modifications while still allowing manual commands
  - **Location**: Settings → Generation → "Disable automatic generation"
  - **What it does**: Blocks automatic operations like generation on startup, frontmatter updates when opening files, and ActivityWatch data injection
  - **Manual commands still work**: You can still use commands like "Generate all periods for today" or "Open today's daily note"
  - **Use case**: Perfect for preventing sync conflicts or when you want full control over when files are created/modified
  - **Default**: Disabled (automatic generation works normally)

---

## 1.5.0 - 1/14/2026

### New Video

- [Periodix Planner — Advanced Time Planning & Budgeting in Obsidian](https://www.youtube.com/watch?v=ggijBVSo1to)

### New Features

- **Configurable Time Budget Sorting**: Choose how categories are displayed in time budget tables
  - **Hours (highest first)**: Default - Shows most time-intensive categories at the top
  - **Hours (lowest first)**: Shows least allocated categories first
  - **Category (A-Z)**: Alphabetical sort ascending
  - **Category (Z-A)**: Alphabetical sort descending
  - **Configure in settings**: Settings → Time budget → "Default time budget sorting"
  - **Applies to all time budgets**: Sorting is consistent across all periodic notes

- **Category Bases View**: View all periodic notes for a specific category using the Bases plugin
  - **Click category name** in settings to open Bases view
  - **Shows all periods**: Displays yearly, quarterly, monthly, weekly, and daily notes containing that category
  - **Multiple views**: Switch between "All Periods" and individual period type views
  - **Quick filtering**: Find all notes where you've allocated time to a specific category
  - **Requires Bases plugin**: Must have Bases plugin installed to use this feature

### Improvements

- **Real-Time Hierarchy Synchronization**: Time budget displays now stay perfectly synchronized across the entire period hierarchy
  - **Automatic updates**: When you edit allocations in any note, all related notes update instantly
  - **Multi-window support**: Changes made in one Obsidian window immediately appear in all other windows
  - **Parent budget tracking**: Child notes automatically show updated parent budget values when parent allocations change
  - **Child allocation tracking**: Parent notes automatically show updated child allocated values when children change
  - **Always accurate**: No more stale budget information - everything stays in sync in real-time
  - **Allocation editor updates**: Even when the allocation editor modal is open, it receives live updates from hierarchy changes

- **Improved Undo/Redo System in Allocation Editor**: Enhanced history management for better user experience
  - **Separate undo entries**: Each button press, input change, or drag operation now creates its own undoable action
  - **No redundant saves**: State is only saved when values actually change, preventing empty undo operations
  - **Smart change detection**: Input blur and button clicks only save state if the value differs from the starting value
  - **Consistent behavior**: All user actions (preset buttons, custom percentage, drag, typing) properly track history
  - **Better undo/redo buttons**: History buttons accurately reflect available undo/redo operations

- **Simplified Period Children Bases Modal**: Removed custom view selector buttons
  - **Leverages Bases plugin views**: Now uses native Bases view tabs instead of custom buttons
  - **Smart view filtering**: Only shows views for child period types (e.g., Yearly modal shows Quarterly/Monthly/Weekly/Daily, but not Yearly)
  - **Better UX**: Consistent with Bases plugin's native interface

### Bug Fixes

- **Fixed Allocation Editor Focus Behavior**: Resolved focus management issues
  - **No more automatic refocusing**: Input fields no longer automatically refocus when typing
  - **Natural focus transitions**: You can now freely click between rows without the UI fighting against you
  - **Preserved scroll position**: Scroll position is maintained during updates without interfering with focus

- **Fixed Note Scroll Position After Saving Allocations**: Resolved issue where submitting the allocation editor modal would cause the note to jump to the bottom
  - **Preserved editor state**: Note now maintains its scroll position and cursor location after saving allocations

---

## 1.4.0 - 1/13/2026

### New Features

- **Configurable Period Tasks Sidebar Position**: Choose where the Period Tasks view opens
  - **Left or right sidebar**: Select your preferred sidebar position in settings (Bases section)
  - **Default: Left sidebar**: Opens in left sidebar by default for quick access

- **Improved Input Precision in Allocation Editor**: Enhanced number input handling
  - **3 decimal places**: Input fields now support up to 3 decimal places (e.g., `8.125` hours)
  - **Auto-formatting**: Values automatically format to show maximum 3 decimals when you finish typing
  - **Precise calculations**: Behind the scenes, values are stored with full precision
  - **Better UX**: Cleaner display while maintaining calculation accuracy

- **Hide Unused Categories in Allocation Editor**: Reduce clutter by hiding categories with no parent budget allocation
  - **Configurable default**: Toggle default behavior in settings (Time Budget section)
  - **Per-session toggle**: "Hide unused" checkbox in the allocation editor header
  - **Smart filtering**: Shows categories with current allocation or parent budget allocation
  - **Yearly exception**: Always shows all categories for yearly notes (top-level planning)
  - **Default: ON**: By default hides unused categories to reduce visual clutter

- **Category Edit and Delete**: Bulk category management operations
  - **Rename categories**: Edit button allows renaming categories across all notes at once
  - **Delete categories**: Delete button removes categories from all notes with confirmation
  - **Bulk operations**: Changes are applied to all notes automatically using Promise.all
  - **Error handling**: Failed operations are tracked and reported with detailed error messages

- **Fully Reactive Category System**: Categories now auto-register and update in real-time
  - **No more "unknown categories"**: All categories in time allocations are automatically recognized
  - **Create categories on-the-fly**: Add categories directly in the allocation editor - they appear instantly
  - **Auto-registration**: CategoryTracker automatically adds new categories to settings with default colors
  - **Auto-cleanup**: Unused categories are automatically removed from settings
  - **Undo/Redo support**: Full undo/redo functionality works seamlessly with newly created categories
  - Just write `NewCategory: 5` in your code fence and it works immediately!

- **Simplified Time Budget Workflow**: Streamlined allocation editor experience
  - Create new categories directly in the modal without manual setup
  - Categories get default colors automatically (blue, green, purple, amber, red, pink, cyan, lime)
  - All allocations render immediately regardless of whether they exist in settings
  - CategoryTracker handles all category management behind the scenes

- **Enhanced Global Statistics**: Comprehensive time allocation analytics across all your periodic notes. [Learn more](/features/statistics)
  - **Period Type Selector**: View statistics filtered by period type (daily, weekly, monthly, quarterly, yearly)
  - **Interactive Pie Chart**: Visual breakdown of time allocation by category with color-coded segments
  - **Per-Category Analytics**: See how many notes use each category and total hours allocated
  - **Sorted by Usage**: Categories automatically sorted by hours allocated for the selected period type
  - **Note Count Breakdown**: View category usage across all period types (e.g., "Daily: 5, Weekly: 3, Monthly: 1")
  - **Color-Coded Rows**: Each category row is subtly highlighted with its assigned color for easy identification

- **Streamlined Category Management**: Settings tab now serves as your analytics and customization hub
  - Configure category colors with the built-in color picker
  - View comprehensive usage statistics for each category
  - Track which period types use each category
  - See total hours and percentages for selected period type
  - Background colors update instantly when you change category colors
  - Categories auto-sync as you work - no manual management needed

- **Global Statistics**: View comprehensive time allocation statistics across all periodic notes in the Categories settings tab
  - Aggregates data from top-level periodic notes (yearly, quarterly, monthly, weekly, or daily)
  - Displays a detailed table with category breakdown, note counts, total hours, and percentages
  - Interactive pie chart visualization with color-coded categories
  - Automatically updates when time allocations change

- **Unified Periodic Settings**: Merged Folders, Naming, and Time Budget settings into a single "Periodic Settings" tab for better organization

- **Auto-Open Yesterday's PDF on Startup**: New optional setting to automatically open yesterday's daily note PDF in a detached window when Obsidian loads
  - Configurable in Settings → Generation → Startup behavior
  - Only opens if the PDF exists and isn't already open
  - Opens in a new detached window for easy reference
  - Off by default - enable to automatically access previous day's notes

- **Bases Plugin Integration**: Seamlessly filter and view tasks by period intervals using the Bases plugin. [Learn more](/features/bases-integration)
  - **Period Tasks Sidebar**: Persistent sidebar view that automatically filters tasks based on the current periodic note
  - **Inline Generation**: Automatically embed Bases views in newly generated periodic notes (configurable)
  - **Automatic Date Filtering**: Tasks are filtered by the period's date range (daily, weekly, monthly, quarterly, yearly)
  - **Configurable Task Directory**: Set your tasks folder path in settings
  - **Custom Date Property**: Configure which frontmatter property to use for task dates
  - **Configurable Date Column Size**: Adjust the width of the date column in the table view (default: 150px)
  - **Flexible Display**: Choose which additional properties to show in the task table
  - **Ribbon Icon Toggle**: Optional ribbon icon for quick access (configurable in settings)
  - **Generation Settings**: Toggle Bases view embedding and customize heading in Generation tab

- **Configurable Ribbon Icon**: New setting to show/hide the Period Tasks ribbon icon (default: enabled)
  - Toggle in Settings → Bases → Show ribbon icon
  - Dynamically shows/hides without requiring restart
  - Uses "list-checks" icon in left sidebar

- **What's New Modal**: The plugin now automatically displays a "What's New" modal when you update to a new version
  - Shows changelog content highlighting new features and improvements
  - Displays only once per version update
  - Includes links to support, documentation, and full changelog
  - Helps you stay informed about new features and changes

### Bug Fixes

- **Fixed plugin reload cleanup**: Resolved an issue where reloading the plugin could fail during unload and then crash on the next load with a duplicate view registration error

---

## 1.3.0 - 12/19/2025

### New Video

- [Periodix Planner — A Time-First Planning System for Obsidian](https://www.youtube.com/watch?v=bIVNj6fkTc8)

### New Features

- **ActivityWatch Integration**: Automatically track and visualize computer usage in daily notes. [Learn more](/integrations#activitywatch)
  - **Interactive Visualizations**: Pie charts and sortable tables render from JSON code blocks
  - **Automatic Injection**: Activity data added to past daily notes during indexing
  - **Code Fence Format**: `periodic-planner-activity-watch` blocks store structured JSON data
  - **Sortable Table**: Click headers to sort by application name or duration
  - **Enlarge View**: Full-screen pie chart modal with detailed breakdowns
  - **Smart Filtering**: Only tracks active time (excludes AFK periods)
  - **Privacy-First**: All data stays local - ActivityWatch runs on your machine
  - **Configurable**: Custom API URL, heading text, and code fence name
  - **Desktop Only**: Requires locally-running ActivityWatch server

---

## 1.2.0 - 12/19/2025

### New Features

- **Templater Integration**: Create periodic notes from custom templates using the Templater plugin. [Learn more](/integrations#templater)
  - Support for per-period-type templates (daily, weekly, monthly, quarterly, yearly)
  - Automatic template application when creating new periodic notes
  - Fallback to standard note creation when templates are not configured
  - File existence check prevents accidental overwrites
  - Seamless integration with Templater's template processing

- **Optional Code Block Auto-Insertion**: Added a new setting to control whether the `periodic-planner` code block is automatically inserted into newly generated periodic notes
  - New setting: "Auto-insert code block" in Settings → Generation → Time budget code block
  - When enabled (default: `true`), the plugin automatically adds the time budget code block to new periodic notes
  - When disabled, users can manually add the code block when needed using the standard markdown code fence syntax
  - Provides flexibility for users who prefer to manage their own note structure or don't use the time budgeting features

- **Flexible Period Type Enablement**: Users can now selectively enable or disable specific period types (daily, weekly, monthly, quarterly, yearly) to customize their workflow
  - New settings section: "Enabled period types" in Settings → Generation
  - Five independent checkboxes to enable/disable each period type (all enabled by default)
  - **Smart parent-child navigation**: When periods are disabled, the system automatically adjusts relationships
    - Example: Disable monthly → weekly notes link directly to quarterly as parent
    - Example: Disable weekly and monthly → daily notes link directly to quarterly
  - **Intelligent time budget calculations**: Category allocations propagate correctly between enabled periods only
    - Child budget calculations skip disabled periods and use the next enabled descendant
    - Parent budget tracking uses the closest enabled ancestor
  - **Automatic link generation**: Frontmatter links (Previous, Next, Parent, Week, Month, Quarter, Year) only include enabled periods
  - **Filtered note generation**: Auto-generation and manual generation commands respect enabled period settings
  - **Period children modal**: Only displays enabled period types when viewing child notes

- **Go to Child Period Command**: New navigation command that intelligently navigates to child periods
  - Command: "Go to child period" (ID: `periodix-planner:go-to-child`)
  - Smart interval detection: if parent period contains today, navigates to the child containing today
  - Falls back to first child for past/future periods
  - Works with any parent period type (weekly → daily, monthly → weekly/daily, etc.)
  - Only enabled when child periods exist

### Bug Fixes

- **Fixed duplicate time budget block rendering**: Resolved issue where time budget blocks would render multiple times on initial note load
  - Added render guard to prevent concurrent rendering during initialization

---

## 1.1.1 - 12/17/2025

### Bug Fixes

- **Fixed immediate generation on load**: Changed default "on load" setting to `false` to prevent automatic note generation when the plugin loads

---

## 1.1.0 - 12/17/2025

### New Features

- **Auto-Inherit Parent Percentages**: Child periods can now automatically inherit time allocations from their parent periods based on percentage distribution
  - New setting: "Automatically inherit parent percentages" - when enabled, empty child periods are automatically pre-filled with allocations matching the parent's percentage distribution
  - Manual "Fill parent" button in the allocation editor modal allows users to inherit parent percentages at any time
  - Maintains proportional distribution: if parent has 50% Work, 30% Study, 20% Exercise, child will receive the same percentage split of their total hours
  - Example: Monthly note has 80h Work (50%), 48h Study (30%), 32h Exercise (20%). Weekly child with 40h available automatically gets 20h Work, 12h Study, 8h Exercise

---

## 1.0.0 - 12/11/2025

Initial release of Periodix-Planner.
