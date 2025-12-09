---
sidebar_position: 1
slug: /
---

# Welcome to Periodix-Planner

**Periodix-Planner** transforms your Obsidian vault into a **time-aware planning system**. It automatically generates interconnected periodic notes (daily, weekly, monthly, quarterly, yearly) and provides powerful time budgeting tools to help you allocate your most precious resource: **time**.

## 🎯 What is Periodix-Planner?

Periodix-Planner is an Obsidian plugin that combines:

- **📅 Automatic Periodic Note Generation** - Creates notes for each time period automatically
- **🔗 Interconnected Note Web** - Links notes hierarchically through frontmatter properties
- **⏱️ Time Budget System** - Allocate and track time across categories with visual feedback
- **📊 Visual Statistics** - Pie charts and tables showing time allocation and budget status
- **🎨 Category Management** - Organize your time investments with custom categories and colors

## ✨ Key Features

### Automatic Note Generation

The plugin automatically creates notes for each time period, always staying **one step ahead** by generating the next period's note in advance:

- **Daily notes** → Generated for today and tomorrow
- **Weekly notes** → Generated for this week and next
- **Monthly notes** → Generated for this month and next
- **Quarterly notes** → Generated for this quarter and next
- **Yearly notes** → Generated for this year and next

### Hierarchical Time Structure

All notes are intelligently linked through frontmatter properties, creating a navigable web of time:

```yaml
---
# Daily Note Example (2025-01-15)
previous: "[[2025-01-14]]"
next: "[[2025-01-16]]"
week: "[[2025-W03]]"
month: "[[2025-01]]"
quarter: "[[2025-Q1]]"
year: "[[2025]]"
hours_available: 24
---
```

### Time Budgeting

Define how many hours you have available and delegate them across categories with visual tracking:

- **Yearly** → Define total category budgets
- **Quarterly** → Allocate portions of yearly budgets (plugin tracks remaining)
- **Monthly** → Allocate from quarterly budgets
- **Weekly** → Allocate from monthly budgets
- **Daily** → See available time and track actuals

### Visual Feedback

- 🟢 **Within budget** → Green indicators
- 🟡 **Approaching limit** → Yellow warnings
- 🔴 **Over budget** → Red alerts with clear messaging

## 🚀 Quick Start

1. **Install** the plugin from Obsidian Community Plugins or BRAT
2. **Configure** your folder structure and naming preferences in settings
3. **Set up** your time budget categories
4. **Generate** your first set of periodic notes
5. **Allocate** time using the interactive allocation editor

See the [Installation Guide](/installation) and [Quick Start Guide](/quickstart) for detailed setup instructions.

## 💡 Use Cases

### Personal Productivity
- Plan your year with clear time investments
- Track where your time actually goes
- Balance work, health, and relationships

### Goal Achievement
- Allocate dedicated hours to learning
- Track progress toward time-based goals
- Adjust allocations based on priorities

### Business Planning
- Quarterly OKR time budgets
- Project time allocation
- Resource planning across time horizons

## 📚 Documentation Structure

- **[Installation](/installation)** - How to install and set up Periodix-Planner
- **[Quick Start](/quickstart)** - Get up and running in minutes
- **[Features](/features/overview)** - Comprehensive feature documentation
- **[Configuration](/configuration)** - All settings explained
- **[FAQ](/faq)** - Common questions answered
- **[Troubleshooting](/troubleshooting)** - Solutions to common issues

## 🤝 Contributing

We welcome contributions! See our [Contributing Guide](/contributing) for how to help improve Periodix-Planner.

## 📄 License

MIT License - see the [LICENSE](https://github.com/Real1tyy/Periodix-Planner/blob/main/LICENSE) file for details.

---

**Ready to get started?** Head to the [Installation Guide](/installation) to begin!
