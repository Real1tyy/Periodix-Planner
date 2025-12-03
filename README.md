<div align="center">

# Periodic Planner

![Version](https://img.shields.io/badge/version-0.1.0-blue?style=for-the-badge)
![License](https://img.shields.io/github/license/Real1tyy/Periodic-Planner?style=for-the-badge)
![Obsidian](https://img.shields.io/badge/obsidian-plugin-purple.svg?style=for-the-badge)

**Intelligent periodic note generation with hierarchical time allocation, budget tracking, and interconnected planning across daily, weekly, monthly, quarterly, and yearly timeframes.**

---

</div>

## 🎯 Vision

Periodic Planner transforms your Obsidian vault into a **time-aware planning system**. It automatically generates interconnected periodic notes (daily, weekly, monthly, quarterly, yearly) and provides powerful time budgeting tools to help you allocate your most precious resource: **time**.

---

## ✨ Core Features

### 📅 **Automatic Periodic Note Generation**

The plugin automatically creates notes for each time period, always staying **one step ahead** by generating the next period's note in advance.

- **Daily notes** → Generated for today and tomorrow
- **Weekly notes** → Generated for this week and next
- **Monthly notes** → Generated for this month and next
- **Quarterly notes** → Generated for this quarter and next
- **Yearly notes** → Generated for this year and next

Each note is created in its designated folder with consistent naming conventions.

### 🔗 **Interconnected Note Web**

All periodic notes are intelligently linked through frontmatter properties:

```yaml
---
# Daily Note Example (2025-01-15)
previous: "[[2025-01-14]]"
next: "[[2025-01-16]]"
week: "[[2025-W03]]"
month: "[[2025-01]]"
quarter: "[[2025-Q1]]"
year: "[[2025]]"
---
```

**Navigation Links:**
- `previous` / `next` → Navigate chronologically within the same period type
- Hierarchical links → Jump from daily → weekly → monthly → quarterly → yearly

This creates a powerful **navigable web of time** that lets you zoom in and out of your planning horizon effortlessly.

### ⏱️ **Time Budget System**

Define how many hours you have available and delegate them across categories:

#### Yearly Time Pool
```
Total Hours/Year: 10,000 hours
├── YouTube:          2,000 hours (20%)
├── Business:         5,000 hours (50%)
└── Health & Relationships: 3,000 hours (30%)
```

#### Cascading Allocation
Time budgets flow down through the hierarchy:
- **Yearly** → Define total category budgets
- **Quarterly** → Allocate portions of yearly budgets (plugin tracks remaining)
- **Monthly** → Allocate from quarterly budgets
- **Weekly** → Allocate from monthly budgets
- **Daily** → See available time and track actuals

#### Smart Tracking
- 🟢 **Within budget** → Green indicators
- 🟡 **Approaching limit** → Yellow warnings
- 🔴 **Over budget** → Red alerts with clear messaging

### 📊 **Visual Statistics**

- **Pie charts** → Category distribution at each time level
- **Tables** → Detailed breakdown with allocated vs. remaining
- **Progress bars** → Visual tracking of time consumption
- **Trend analysis** → How your actual time compares to planned

---

## 🏗️ Architecture

### Hierarchical Time Structure

```
Year (2025)
├── Q1 (2025-Q1)
│   ├── January (2025-01)
│   │   ├── Week 1 (2025-W01)
│   │   │   ├── 2025-01-01 (Wed)
│   │   │   ├── 2025-01-02 (Thu)
│   │   │   └── ...
│   │   ├── Week 2 (2025-W02)
│   │   └── ...
│   ├── February (2025-02)
│   └── March (2025-03)
├── Q2 (2025-Q2)
├── Q3 (2025-Q3)
└── Q4 (2025-Q4)
```

### Frontmatter Properties

| Property | Description | Example |
|----------|-------------|---------|
| `previous` | Link to previous period | `[[2025-01-14]]` |
| `next` | Link to next period | `[[2025-01-16]]` |
| `week` | Parent week (daily notes) | `[[2025-W03]]` |
| `month` | Parent month | `[[2025-01]]` |
| `quarter` | Parent quarter | `[[2025-Q1]]` |
| `year` | Parent year | `[[2025]]` |
| `hours_available` | Total hours in this period | `168` |
| `time_allocations` | Category breakdown | YAML object |

---

## ⚙️ Configuration

### Directory Settings

| Setting | Description | Default |
|---------|-------------|---------|
| Daily Folder | Where daily notes are stored | `Periodic/Daily` |
| Weekly Folder | Where weekly notes are stored | `Periodic/Weekly` |
| Monthly Folder | Where monthly notes are stored | `Periodic/Monthly` |
| Quarterly Folder | Where quarterly notes are stored | `Periodic/Quarterly` |
| Yearly Folder | Where yearly notes are stored | `Periodic/Yearly` |

### Time Settings

| Setting | Description | Default |
|---------|-------------|---------|
| Hours per Week | Base weekly hour budget | `40` |
| Override Monthly | Custom monthly hours (optional) | - |
| Override Quarterly | Custom quarterly hours (optional) | - |
| Override Yearly | Custom yearly hours (optional) | - |

### Categories

Define your time investment categories:

```yaml
categories:
  - name: "Work"
    color: "#3B82F6"
  - name: "Health"
    color: "#10B981"
  - name: "Learning"
    color: "#8B5CF6"
  - name: "Relationships"
    color: "#F59E0B"
```

---

## 📦 Installation

### Coming Soon

Periodic Planner is currently in active development. Once ready, it will be available via:

1. **BRAT Plugin** (Beta testing)
2. **Community Plugins** (After approval)
3. **Manual installation** (From GitHub releases)

---

## 🗺️ Roadmap

### Phase 1: Foundation ✅
- [ ] Basic plugin structure
- [ ] Settings management
- [ ] Directory configuration

### Phase 2: Note Generation
- [ ] Daily note generation
- [ ] Weekly note generation
- [ ] Monthly note generation
- [ ] Quarterly note generation
- [ ] Yearly note generation
- [ ] Automatic "next period" generation

### Phase 3: Interconnection
- [ ] Previous/Next linking
- [ ] Hierarchical linking (daily → weekly → monthly → quarterly → yearly)
- [ ] Backlink population

### Phase 4: Time Budgeting
- [ ] Category definition
- [ ] Yearly time allocation modal
- [ ] Quarterly allocation with tracking
- [ ] Monthly allocation with tracking
- [ ] Weekly allocation with tracking

### Phase 5: Visualization
- [ ] Pie chart statistics view
- [ ] Table statistics view
- [ ] Budget warnings and alerts
- [ ] Progress tracking

### Phase 6: Polish
- [ ] Templates integration
- [ ] Custom naming patterns
- [ ] Command palette integration
- [ ] Hotkey support

---

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

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

---

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

## ☕ Support

If you find Periodic Planner useful, consider supporting development:

- [Sponsor on GitHub](https://github.com/sponsors/Real1tyy)
- [Buy Me a Coffee](https://www.buymeacoffee.com/real1ty)
