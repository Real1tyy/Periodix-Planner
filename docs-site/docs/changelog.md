---
sidebar_position: 7
---

# Changelog

All notable changes to this project will be documented here.

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
