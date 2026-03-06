---
sidebar_position: 12
---

# Prisma Calendar Integration

Periodix-Planner integrates with [Prisma Calendar](https://github.com/Real1tyy/Prisma-Calendar) to automatically embed event statistics in your periodic notes.

## Overview

When enabled, the plugin queries Prisma Calendar's API to get event statistics for each period and embeds them as a code block in the note. The data is rendered as an interactive summary with a table, pie chart, and event counts.

Statistics are only added to **past** periodic notes — today's note and future notes are not affected. This works for all period types: daily, weekly, monthly, quarterly, and yearly.

## Setup

1. Install and enable the [Prisma Calendar](https://github.com/Real1tyy/Prisma-Calendar) plugin
2. Open **Settings** → **Periodix-Planner** → **Integrations**
3. Enable **Prisma Calendar** integration

### Configuration

| Setting                     | Description                                           | Default                            |
| --------------------------- | ----------------------------------------------------- | ---------------------------------- |
| **Enable Prisma Calendar**  | Toggle the integration on/off                         | Off                                |
| **Prisma Calendar heading** | Markdown heading above the statistics block           | `## Prisma Calendar`               |
| **Code fence name**         | Code fence identifier for the block (requires reload) | `periodic-planner-prisma-calendar` |
| **Aggregation mode**        | Aggregate by category or event name                   | Category                           |

## How It Works

### Automatic Injection

When a periodic note is indexed and its period has ended:

1. The plugin checks if the note already has a Prisma Calendar section
2. If not, it queries the Prisma Calendar API for statistics matching the period interval
3. The statistics are embedded as a JSON code block under the configured heading

### Period-to-Interval Mapping

| Period Type | Prisma Calendar Query              |
| ----------- | ---------------------------------- |
| Daily       | Single day query                   |
| Weekly      | Single week query                  |
| Monthly     | Single month query                 |
| Quarterly   | Aggregated from 3 monthly queries  |
| Yearly      | Aggregated from 12 monthly queries |

### Rendered View

The embedded statistics block renders as:

- **Header** with total duration, event count, and done/undone ratio
- **Sortable table** with entries (category/name, duration, percentage, count)
- **Pie chart** showing the duration distribution
- **Enlarge button** to view the chart in a modal

### Bulk Processing

To add Prisma Calendar statistics to all existing past notes:

1. Go to **Settings** → **Integrations** → **Actions**
2. Click **Process now** next to "Process all periodic notes (Prisma Calendar)"

This scans all periodic notes across all period types and adds statistics to notes that don't have them yet.

## Related Features

- **[ActivityWatch Integration](/features/activity-watch)** — Similar integration for computer usage tracking (daily notes only)
- **[Bases Integration](/features/bases-integration)** — View tasks filtered by period
