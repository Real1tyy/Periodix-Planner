---
sidebar_position: 8
---

# Frequently Asked Questions

Common questions about Periodix-Planner and their answers.

## 📦 Installation

<details>
<summary>How do I install Periodix-Planner?</summary>

See the [Installation Guide](/installation) for detailed instructions. The plugin can be installed via:

- Community Plugins (once approved)
- BRAT (for beta versions)
- Manual installation from GitHub releases

</details>

<details>
<summary>Is Periodix-Planner available in Community Plugins?</summary>

Periodix-Planner is currently in development. Once ready, it will be submitted for Community Plugins approval. For now, use BRAT or manual installation.

</details>

<details>
<summary>Can I use BRAT to install?</summary>

Yes! BRAT is the recommended method for early access. See the [Installation Guide](/installation) for BRAT setup instructions.

</details>

---

## ⚙️ Configuration

<details>
<summary>Where are my notes stored?</summary>

Notes are stored in folders you configure in **Settings** → **Periodix-Planner** → **Folders** tab. Default folders are:

- `Periodic/Daily`
- `Periodic/Weekly`
- `Periodic/Monthly`
- `Periodic/Quarterly`
- `Periodic/Yearly`

</details>

<details>
<summary>Can I change the note naming format?</summary>

Yes! Go to **Settings** → **Periodix-Planner** → **Naming** tab to customize format strings for each period type.

</details>

<details>
<summary>How do I set up categories?</summary>

Go to **Settings** → **Periodix-Planner** → **Categories** tab, then click **Add Category** to create new categories with custom names and colors.

</details>

<details>
<summary>Can I customize frontmatter property names?</summary>

Yes! Go to **Settings** → **Periodix-Planner** → **Properties** tab to customize all property names.

</details>

---

## 📅 Note Generation

<details>
<summary>How does auto-generation work?</summary>

When enabled, the plugin automatically generates periodic notes when you open Obsidian. It creates the current period and next period for each type (daily, weekly, monthly, quarterly, yearly).

</details>

<details>
<summary>Will the plugin overwrite my existing notes?</summary>

No! The plugin never overwrites existing notes. It only:

- Creates new notes if they don't exist
- Updates frontmatter if properties are missing
- Adds time budget blocks if missing

</details>

<details>
<summary>Can I disable auto-generation?</summary>

Yes! Go to **Settings** → **Periodix-Planner** → **Generation** tab and disable **Auto-generate future periods**.

</details>

<details>
<summary>How do I generate notes manually?</summary>

Use the command **"Generate all periods for today"** from the command palette (Ctrl/Cmd + P).

</details>

---

## ⏱️ Time Budgeting

<details>
<summary>What happens if I exceed the available hours?</summary>

The plugin shows warnings:

- **Red** when over budget
- **Parent budget warnings** when exceeding parent allocation

</details>

<details>
<summary>How does parent budget tracking work?</summary>

When you allocate time in a child period (e.g., weekly), the plugin tracks it against the parent period's budget (e.g., monthly). If you exceed the parent budget, warnings appear.

</details>

---

## 🔗 Navigation

<details>
<summary>How do I navigate between periods?</summary>

Use commands from the command palette:

- **Go to previous period**
- **Go to next period**
- **Go to parent period**
- **Open current [period] note**

</details>

<details>
<summary>Can I assign hotkeys to navigation commands?</summary>

Yes! Go to **Settings** → **Hotkeys**, search for "Periodix-Planner", and assign hotkeys to any command.

</details>

<details>
<summary>Do links work if notes don't exist?</summary>

Yes! When you click a link or use a navigation command, the plugin automatically creates the target note if it doesn't exist.

</details>

---

## 🤝 Support

<details>
<summary>Where can I get help?</summary>

- **Documentation**: Check this documentation site
- **GitHub Issues**: [Open an issue](https://github.com/Real1tyy/Periodix-Planner/issues)
- **Troubleshooting**: See the [Troubleshooting Guide](/troubleshooting)

</details>

<details>
<summary>How do I report a bug?</summary>

1. Go to [GitHub Issues](https://github.com/Real1tyy/Periodix-Planner/issues)
2. Click **New Issue**
3. Select **Bug Report**
4. Provide details about the issue

</details>

<details>
<summary>Can I request a feature?</summary>

Yes! Open a [feature request](https://github.com/Real1tyy/Periodix-Planner/issues) on GitHub with:

- Clear description
- Use case
- Examples if applicable

</details>

---

**Still have questions?** Check the [Troubleshooting Guide](/troubleshooting) or [open an issue on GitHub](https://github.com/Real1tyy/Periodix-Planner/issues).
