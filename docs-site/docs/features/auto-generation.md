---
sidebar_position: 10
---

# Auto-Generation

Periodix-Planner can automatically generate periodic notes when you open Obsidian, ensuring you always have the notes you need.

## 🎯 Overview

Auto-generation creates periodic notes automatically:
- When Obsidian loads
- For current and next periods
- Respects existing notes
- Updates frontmatter if needed

## ⚙️ Configuration

### Enable Auto-Generation

1. Go to **Settings** → **Periodix-Planner** → **Generation** tab
2. Enable **Auto-generate on load**
3. Configure **Generate periods ahead** (1-5)

### Settings

| Setting | Description | Default |
|---------|-------------|---------|
| **Auto-generate on load** | Generate notes when Obsidian opens | `true` |
| **Generate periods ahead** | How many periods into the future to generate | `1` |

## 🔄 How It Works

### On Obsidian Load

When Obsidian opens:
1. Plugin checks which periods need notes
2. Generates missing notes automatically
3. Updates frontmatter for existing notes
4. Adds time budget blocks if missing

### Period Generation

For each period type:
- **Current period** - Always generated
- **Next period** - Generated based on "periods ahead" setting
- **Future periods** - Generated up to configured limit

### Example

With "Generate periods ahead" set to 1:
- Today's daily note ✅
- Tomorrow's daily note ✅
- This week's weekly note ✅
- Next week's weekly note ✅
- This month's monthly note ✅
- Next month's monthly note ✅
- (And so on for quarterly and yearly)

## 🛡️ Safety Features

### Existing Notes

- **Never overwrites** - Existing notes are preserved
- **Updates frontmatter** - Adds missing properties
- **Adds time budget blocks** - Inserts if missing
- **Preserves content** - Your content is never modified

---

**Related:** Learn about [Note Generation](/features/note-generation) and [Configuration](/configuration).
