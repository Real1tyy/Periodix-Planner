---
sidebar_position: 7
---

# Changelog

All notable changes to this project will be documented here.

---

## 1.3.0

### New Features

- **ActivityWatch Integration**: Automatically track and visualize computer usage in daily notes. [Learn more](/integrations#activitywatch)
  - Connect to your local ActivityWatch server to fetch daily activity data
  - Automatic data injection into past daily notes during indexing
  - Application usage breakdown with time and percentages
  - Privacy-first: all data stays local on your machine
  - Smart filtering: only tracks active time (excludes AFK periods)
  - Manual bulk processing available via "Process now" button
  - Configurable API URL and heading text
  - Desktop only (ActivityWatch doesn't run on mobile)

---

## 1.2.0

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

## 1.1.1

### Bug Fixes

- **Fixed immediate generation on load**: Changed default "on load" setting to `false` to prevent automatic note generation when the plugin loads

---

## 1.1.0

### New Features

- **Auto-Inherit Parent Percentages**: Child periods can now automatically inherit time allocations from their parent periods based on percentage distribution
  - New setting: "Automatically inherit parent percentages" - when enabled, empty child periods are automatically pre-filled with allocations matching the parent's percentage distribution
  - Manual "Fill parent" button in the allocation editor modal allows users to inherit parent percentages at any time
  - Maintains proportional distribution: if parent has 50% Work, 30% Study, 20% Exercise, child will receive the same percentage split of their total hours
  - Example: Monthly note has 80h Work (50%), 48h Study (30%), 32h Exercise (20%). Weekly child with 40h available automatically gets 20h Work, 12h Study, 8h Exercise

---

## 1.0.0

Initial release of Periodix-Planner.
