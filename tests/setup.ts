// Test setup file for Periodic Planner
// Configure global test utilities here

import { vi } from "vitest";

// Mock console.log in tests to reduce noise
vi.spyOn(console, "log").mockImplementation(() => {});
