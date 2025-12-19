---
sidebar_position: 8
---

# Integrations

Periodix-Planner integrates with third-party tools to enhance your periodic planning workflow.

## Templater

Use [Templater](https://github.com/SilentVoid13/Templater) templates to create customized periodic notes.

### Setup

1. Install and enable the [Templater plugin](https://github.com/SilentVoid13/Templater)
2. Create template files for the period types you want to customize
3. In **Settings** → **Periodix-Planner** → **Integrations** → **Templater**:
   - Toggle **Enable Templater** on
   - Enter template paths for the period types you want to customize
   - Leave paths empty for period types you don't want to template

### Configuration

| Setting | Description |
|---------|-------------|
| **Enable Templater** | Turn integration on/off |
| **Daily/Weekly/Monthly/Quarterly/Yearly note template** | Path to template file (e.g., `Templates/Daily.md`) |

### How It Works

When creating a new periodic note:
1. If a template path is configured, Periodix-Planner uses Templater to process it
2. After template processing, required frontmatter is automatically added
3. If no template is configured, notes are created with default content
4. Existing notes are never overwritten

### Notes

- Periodix-Planner automatically adds period-specific frontmatter - don't include these in your templates
- Templates are optional - configure only the period types you want to customize
- See [Templater documentation](https://silentvoid13.github.io/Templater/) for template syntax

## ActivityWatch

Track and visualize your computer usage automatically in daily notes.

### Overview

[ActivityWatch](https://activitywatch.net) is a free, open-source, privacy-focused time tracker that runs locally on your computer. Periodix-Planner can automatically fetch your daily activity data and embed it in past daily notes.

### Features

- **Automatic Data Injection**: Activity data is automatically added to past daily notes during indexing
- **Privacy-First**: All data stays local - ActivityWatch runs on your machine
- **Smart Filtering**: Only tracks active time (excludes AFK periods)
- **Application Breakdown**: See which applications you used and for how long
- **Visual Summaries**: Data is formatted as tables with time and percentages

### Setup

1. **Install ActivityWatch**
   - Download from [activitywatch.net](https://activitywatch.net)
   - Install and start the ActivityWatch server
   - Verify it's running at `http://localhost:5600`

2. **Enable in Periodix-Planner**
   - Go to **Settings** → **Periodix-Planner** → **Integrations**
   - Toggle **Enable ActivityWatch** on
   - Verify the **API URL** (default: `http://localhost:5600`)
   - Customize the **heading** if desired (default: `## ActivityWatch`)

3. **Process Existing Notes** (Optional)
   - Click **Process now** to add ActivityWatch data to all past daily notes
   - Or wait for automatic processing as notes are indexed

### How It Works

**Automatic Mode**: When enabled, Periodix-Planner automatically adds ActivityWatch data to past daily notes during the normal indexing process.

**Manual Mode**: Use the "Process now" button to bulk process all past daily notes at once.

**Smart Detection**: The plugin won't duplicate data - it checks for the ActivityWatch heading before adding content to avoid re-processing notes.

### Example Output

When enabled, past daily notes will automatically include a section like this:

```markdown
## ActivityWatch

**Total Active Time:** 6.75 hours

| Application | Time | Percentage |
|-------------|------|------------|
| obsidian | 3h 45m | 55.6% |
| chrome | 2h 10m | 32.1% |
| vscode | 50m | 12.3% |
```

### Configuration

| Setting | Description | Default |
|---------|-------------|---------|
| **Enable ActivityWatch** | Turn integration on/off | `false` |
| **API URL** | ActivityWatch server address | `http://localhost:5600` |
| **Heading** | Heading text for ActivityWatch sections | `## ActivityWatch` |

### Requirements

- **Desktop Only**: ActivityWatch integration only works with desktop Obsidian (ActivityWatch doesn't run on mobile)
- **Local Server**: ActivityWatch must be running on the same machine as Obsidian
- **Past Dates Only**: Data is only added to past daily notes (not today or future dates)

### Troubleshooting

**Data not appearing?**
- Verify ActivityWatch is running and accessible at the configured API URL
- Check that you have ActivityWatch watchers enabled (window tracker and AFK tracker)
- Ensure the daily note is from a past date (not today or future)
- Use the "Process now" button to manually trigger processing

**Duplicate sections?**
- The plugin checks for existing ActivityWatch headings to prevent duplicates
- If you see duplicates, the heading text may have changed - update old sections manually

**Connection errors?**
- Confirm ActivityWatch server is running (`http://localhost:5600` should load in browser)
- Check firewall settings aren't blocking local connections
- Verify the API URL in settings matches your ActivityWatch configuration

### Privacy & Security

- **Local Only**: ActivityWatch data never leaves your machine
- **No Cloud**: All processing happens locally between Obsidian and ActivityWatch
- **No Authentication**: ActivityWatch relies on localhost-only access for security
- **Your Data**: You have complete control over what data is tracked and stored
