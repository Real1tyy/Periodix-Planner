import { describe, expect, it } from "vitest";
import { deleteCategoryFromCodeFence, renameCategoryInCodeFence } from "../src/utils/category-operations";

describe("deleteCategoryFromCodeFence", () => {
	it("should delete a category from code fence content", () => {
		const content = "Work: 8\nPersonal: 4\nExercise: 2";
		const result = deleteCategoryFromCodeFence(content, "Personal");
		expect(result).toBe("Work: 8\nExercise: 2");
	});

	it("should handle deleting the only category", () => {
		const content = "Work: 8";
		const result = deleteCategoryFromCodeFence(content, "Work");
		expect(result).toBe("");
	});

	it("should handle deleting non-existent category", () => {
		const content = "Work: 8\nPersonal: 4";
		const result = deleteCategoryFromCodeFence(content, "NonExistent");
		expect(result).toBe("Work: 8\nPersonal: 4");
	});

	it("should handle empty content", () => {
		const content = "";
		const result = deleteCategoryFromCodeFence(content, "Work");
		expect(result).toBe("");
	});

	it("should delete category from beginning of list", () => {
		const content = "Work: 8\nPersonal: 4\nExercise: 2";
		const result = deleteCategoryFromCodeFence(content, "Work");
		expect(result).toBe("Personal: 4\nExercise: 2");
	});

	it("should delete category from end of list", () => {
		const content = "Work: 8\nPersonal: 4\nExercise: 2";
		const result = deleteCategoryFromCodeFence(content, "Exercise");
		expect(result).toBe("Work: 8\nPersonal: 4");
	});

	it("should handle decimal hours", () => {
		const content = "Work: 8.5\nPersonal: 4.25\nExercise: 2.75";
		const result = deleteCategoryFromCodeFence(content, "Personal");
		expect(result).toBe("Work: 8.5\nExercise: 2.75");
	});
});

describe("renameCategoryInCodeFence", () => {
	it("should rename a category in code fence content", () => {
		const content = "Work: 8\nPersonal: 4\nExercise: 2";
		const result = renameCategoryInCodeFence(content, "Personal", "Home");
		expect(result).toBe("Work: 8\nHome: 4\nExercise: 2");
	});

	it("should rename the only category", () => {
		const content = "Work: 8";
		const result = renameCategoryInCodeFence(content, "Work", "Job");
		expect(result).toBe("Job: 8");
	});

	it("should handle renaming non-existent category", () => {
		const content = "Work: 8\nPersonal: 4";
		const result = renameCategoryInCodeFence(content, "NonExistent", "NewName");
		expect(result).toBe("Work: 8\nPersonal: 4");
	});

	it("should handle empty content", () => {
		const content = "";
		const result = renameCategoryInCodeFence(content, "Work", "Job");
		expect(result).toBe("");
	});

	it("should rename category at beginning of list", () => {
		const content = "Work: 8\nPersonal: 4\nExercise: 2";
		const result = renameCategoryInCodeFence(content, "Work", "Job");
		expect(result).toBe("Job: 8\nPersonal: 4\nExercise: 2");
	});

	it("should rename category at end of list", () => {
		const content = "Work: 8\nPersonal: 4\nExercise: 2";
		const result = renameCategoryInCodeFence(content, "Exercise", "Gym");
		expect(result).toBe("Work: 8\nPersonal: 4\nGym: 2");
	});

	it("should preserve hours when renaming", () => {
		const content = "Work: 8.5\nPersonal: 4.25";
		const result = renameCategoryInCodeFence(content, "Work", "Office");
		expect(result).toBe("Office: 8.5\nPersonal: 4.25");
	});

	it("should handle category names with spaces", () => {
		const content = "Deep Work: 8\nLight Tasks: 4";
		const result = renameCategoryInCodeFence(content, "Deep Work", "Focused Work");
		expect(result).toBe("Focused Work: 8\nLight Tasks: 4");
	});
});
