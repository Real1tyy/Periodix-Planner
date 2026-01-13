---
sidebar_position: 5
---

# Statistics

View comprehensive analytics about your time allocations across all periodic notes.

## Overview

The Statistics feature provides powerful insights into how you allocate your time across different [categories](/features/categories) and period types. Access statistics through **Settings → Categories**, where you'll find both per-category analytics and global visualizations.

## Global Statistics

### Period Type Selection

Filter your statistics by any enabled period type:

- **Daily**: View time allocation across all daily notes
- **Weekly**: See weekly patterns and totals
- **Monthly**: Analyze monthly time distribution
- **Quarterly**: Review quarterly allocations
- **Yearly**: Examine year-long patterns

Use the dropdown selector at the top of the Categories section to switch between period types. Statistics update instantly when you change the selection.

### Interactive Pie Chart

The pie chart provides a visual breakdown of your time allocation:

- **Color-Coded Segments**: Each category is displayed in its configured color
- **Proportional Sizing**: Segment size reflects the percentage of total hours
- **At-a-Glance Overview**: Quickly understand where your time goes
- **Real-Time Updates**: Chart refreshes automatically when allocations change

### What Statistics Show

For each period type, you'll see:

- **Total Hours**: Sum of all hours allocated to each category
- **Percentage**: Category's share of total allocated time
- **Note Count**: How many notes use each category
- **Period Breakdown**: Usage across all period types (e.g., "Daily: 5 · Weekly: 3 · Monthly: 1")

## Per-Category Analytics

### Category Rows

Each category in settings displays comprehensive usage information:

**Example Category Display:**
```
Work
├─ Total: 12 notes · Daily: 5 · Weekly: 3 · Monthly: 1
└─ Monthly hours: 160.0h (45.7%)
```

This tells you:
- **12 notes** use the "Work" category across all period types
- **5 daily notes**, **3 weekly notes**, and **1 monthly note** contain Work allocations
- For the selected period type (Monthly), **160 hours** are allocated to Work, representing **45.7%** of total monthly hours

### Color-Coded Backgrounds

Each category row has a subtle background tint matching its assigned color:

- Makes categories visually distinct at a glance
- Helps you quickly identify categories in the list
- Updates immediately when you change a category's color
- 10% opacity ensures text remains perfectly readable

### Sorting Logic

Categories are automatically sorted for easy navigation **by hours** (when period type selected): Categories with more hours appear first. This means your most-used categories always appear at the top of the list.

## Category Management

### Automatic Discovery

Categories are discovered automatically - no manual creation needed:

1. **Use a Category**: Add time allocation with a category name in any periodic note
2. **Instant Detection**: The category appears in settings immediately
3. **Real-Time Tracking**: Usage statistics update as you work
4. **Automatic Cleanup**: Remove all instances of a category, and it's automaticallyz cleaned up

### Color Customization

Personalize your categories with custom colors:

1. **Color Picker**: Click the color picker next to any category
2. **Choose Color**: Select from the color wheel or enter a hex code
3. **Instant Update**: Background tint and pie chart update immediately
4. **Consistent Colors**: Your chosen colors persist across all views

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

You can change these colors at any time using the color picker.

## Understanding the Data

### What Gets Counted

Statistics aggregate data from your periodic notes' time allocations:

- Hours allocated in `periodic-planner` code blocks
- Categories used in time budget allocations
- Only counts from notes with proper period properties
- Excludes notes outside your configured periodic folders

### Real-Time Updates

Statistics update automatically when you:

- Add or modify time allocations in notes
- Create new periodic notes
- Change category names in existing notes
- Delete notes or remove allocations

### Accuracy

- **Top-Level Notes Only**: Statistics aggregate from the highest-level notes of each period type to avoid double-counting
- **Live Calculation**: Hours and percentages are computed in real-time from your actual note content
- **Category Tracking**: The system monitors all periodic notes continuously for category usage

## Use Cases

### Time Management Insights

- **Identify Patterns**: See which categories consume most of your time
- **Balance Check**: Ensure time is distributed according to your priorities
- **Trend Analysis**: Compare allocations across different period types
- **Goal Tracking**: Monitor if your actual time allocation matches your intentions

### Planning and Adjustment

- **Resource Allocation**: Understand where your hours go
- **Capacity Planning**: See if you're over-allocating in certain areas
- **Priority Shifts**: Identify when it's time to rebalance categories
- **Historical Context**: Review how your time distribution evolves

### Category Refinement

- **Usage Detection**: Find categories that are rarely used
- **Consolidation Opportunities**: Identify similar categories that could merge
- **Naming Consistency**: Spot variations in category names that should be standardized
- **Coverage Gaps**: Notice areas of your life not being tracked

## Tips and Best Practices

### Meaningful Category Names

- Use consistent naming across all notes
- Choose names that are clear and descriptive
- Avoid overly similar category names
- Keep names concise for better display

### Color Strategy

- **High-Priority Categories**: Use bold, bright colors
- **Related Categories**: Choose similar shades for related work
- **Quick Recognition**: Pick distinct colors for frequently-used categories
- **Visual Hierarchy**: Use color intensity to reflect category importance

### Regular Review

- Check statistics weekly to understand your patterns
- Compare period types to spot inconsistencies
- Adjust allocations based on actual vs. planned time
- Use the pie chart for quick weekly reviews

### Data Quality

- Ensure all periodic notes have time allocations
- Use consistent category names across notes
- Regularly update allocations to reflect actual time spent
- Remove or consolidate unused categories

## Troubleshooting

### Category Not Appearing

If a category doesn't show up in statistics:

- Verify the note is in a configured periodic folder
- Check that the note has proper period properties (Period Type, Period Start, Period End)
- Ensure the time allocation is inside a `periodic-planner` code block
- Wait a moment for the indexer to process the note

### Statistics Seem Incorrect

If statistics don't match expectations:

- Only top-level notes are counted to avoid duplication
- Check that your period type selection matches the notes you're thinking of
- Verify that time allocations are properly formatted
- Remember that the system aggregates from actual note content, not manual entries

### Colors Not Updating

If category colors don't change:

- The update should be immediate - try changing the color again
- Check that you saved the color using the color picker
- Verify you're looking at the correct category
- Reload Obsidian if the issue persists

## Next Steps

- **[Time Budget Blocks](/features/time-budget-blocks)**: Learn how to allocate time in your periodic notes
- **[Time Budgeting](/features/time-budgeting)**: Automatically inherit parent allocations
- **[Period Navigation](/features/navigation)**: Navigate between periodic notes
