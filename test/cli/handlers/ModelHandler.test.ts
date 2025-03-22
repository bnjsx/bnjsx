jest.mock("fs/promises");

import * as fs from "fs/promises";
import * as path from "path";

import { ModelHandler } from "../../../src/cli/handlers/ModelHandler";
import { ModelHandlerError } from "../../../src/cli/handlers/ModelHandler";

describe("ModelHandler", () => {
  describe("collectPaths", () => {
    it("should resolve if the directory is empty", async () => {
      (fs.readdir as jest.Mock).mockResolvedValue([]);

      const handler = new ModelHandler() as any;
      await expect(handler.collectPaths("path", false)).resolves.toEqual([]);
    });

    it("should remove maps if map is false", async () => {
      (fs.readdir as jest.Mock).mockResolvedValue(["User.js", "User.js.map"]);

      const handler = new ModelHandler() as any;

      await expect(handler.collectPaths("root", false)).resolves.toEqual([
        path.resolve("root", "User.js"),
      ]);
    });

    it("should reject if fs.readdir rejects", async () => {
      (fs.readdir as jest.Mock).mockRejectedValue(
        new Error("Failed to read directory")
      );

      const handler = new ModelHandler() as any;
      await expect(handler.collectPaths("root", false)).rejects.toThrow(
        "Failed to read directory"
      );
    });
  });

  describe("add", () => {
    it("should resolve if file is created", async () => {
      const template = "[className] - [tableName] - [fileName]";

      // Mock fs.readFile to resolve with template
      (fs.readFile as jest.Mock).mockResolvedValue(template);

      // Mock fs.writeFile to resolve
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

      const handler = new ModelHandler() as any;
      await expect(handler.add("profiles", "root", true)).resolves.toBe(
        `Model added in: ${path.resolve("root", "Profile.ts")}`
      );

      // Check readFile
      expect(fs.readFile).toHaveBeenCalledWith(
        path.resolve(handler.assets, "ts/model.txt"),
        "utf-8"
      );

      // Check writeFile
      expect(fs.writeFile).toHaveBeenCalledWith(
        path.resolve("root", "Profile.ts"),
        "Profile - profiles - Profile.ts",
        "utf-8"
      );
    });

    it("should resolve with the first file", async () => {
      const template = "[className] - [tableName] - [fileName]";

      // Mock fs.readFile to resolve with template
      (fs.readFile as jest.Mock).mockResolvedValue(template);

      // Mock fs.writeFile to resolve
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

      const handler = new ModelHandler() as any;
      await expect(handler.add("users", "root", true)).resolves.toBe(
        `Model added in: ${path.resolve(
          "root",
          "User.ts" // first file
        )}`
      );
    });

    it("should reject if table name check fails", async () => {
      const handler = new ModelHandler() as any;
      await expect(handler.add(123, "root")).rejects.toThrow(
        "Invalid table name: 123"
      );
    });

    it("should reject if path check fails", async () => {
      const handler = new ModelHandler() as any;
      await expect(handler.add("profiles", 123)).rejects.toThrow(
        "Invalid path: 123"
      );
    });

    it("should reject if fs.readFile fails", async () => {
      const error = new Error("Ops");

      // Mock fs.readFile to reject
      (fs.readFile as jest.Mock).mockRejectedValue(error);

      const handler = new ModelHandler() as any;
      await expect(handler.add("profiles", "root")).rejects.toThrow("Ops");
    });

    it("should reject if fs.writeFile fails", async () => {
      const template = "[className] - [tableName] - [fileName]";
      const files = ["User.ts"];
      const error = new Error("Ops");

      // Mock fs.readFile to resolve with template
      (fs.readFile as jest.Mock).mockResolvedValue(template);

      // Mock fs.writeFile to resolve
      (fs.writeFile as jest.Mock).mockRejectedValue(error);

      const handler = new ModelHandler() as any;
      await expect(handler.add("profiles", "root")).rejects.toThrow("Ops");
    });
  });

  describe("remove", () => {
    it("should resolve if ts files are removed", async () => {
      // Arguments
      const table = "users"; // valid table name
      const root = "root"; // valid path

      // Create an instance
      const handler = new ModelHandler() as any;

      // Mock collectPaths => resolves
      const paths = ["root/User.ts", "root/Profile.ts", "root/Product.ts"];

      handler.collectPaths = jest.fn(() => Promise.resolve(paths));

      // Mock fs.unlik => resolves
      (fs.unlink as jest.Mock).mockResolvedValue(undefined);

      // Expect remove to resolve
      await expect(handler.remove(table, root)).resolves.toBe(
        "1 model file removed in:\nroot/User.ts"
      );

      // Expect 'root/User.ts' to be unliked
      expect(fs.unlink).toHaveBeenCalledWith("root/User.ts");
      expect(fs.unlink).toHaveBeenCalledTimes(1);
    });

    it("should resolve if js files are removed", async () => {
      // Clear Mocks
      (fs.unlink as jest.Mock).mockClear();

      // Arguments
      const table = "users"; // valid table name
      const root = "root"; // valid path

      // Create an instance
      const handler = new ModelHandler() as any;

      // Mock collectPaths => resolves
      const paths = [
        "root/User.js",
        "root/User.js.map",
        "root/Profile.js",
        "root/Profile.js.map",
      ];

      handler.collectPaths = jest.fn(() => Promise.resolve(paths));

      // Mock fs.unlik => resolves
      (fs.unlink as jest.Mock).mockResolvedValue(undefined);

      // Expect remove to resolve
      await expect(handler.remove(table, root)).resolves.toBe(
        "2 model files removed in:\nroot/User.js\nroot/User.js.map"
      );

      // Expect 'root/User.js' to be unliked
      expect(fs.unlink).toHaveBeenCalledWith("root/User.js");
      expect(fs.unlink).toHaveBeenCalledWith("root/User.js");
      expect(fs.unlink).toHaveBeenCalledTimes(2);
    });

    it("should reject if name is invalid", async () => {
      // Arguments
      const table = "-invalid-"; // invalid name
      const root = "root"; // valid path

      // Create an instance
      const handler = new ModelHandler() as any;

      // Expect remove to rejects
      await expect(handler.remove(table, root)).rejects.toThrow(
        "Invalid table name: -invalid-"
      );
    });

    it("should reject if path is invalid", async () => {
      // Arguments
      const table = "users"; // valid table name
      const root = 123; // invalid path

      // Create an instance
      const handler = new ModelHandler() as any;

      // Expect remove to rejects
      await expect(handler.remove(table, root)).rejects.toThrow(
        "Invalid path: 123"
      );
    });

    it("should reject if collectPaths rejects", async () => {
      // Clear Mocks
      (fs.unlink as jest.Mock).mockClear();

      // Arguments
      const table = "users"; // valid table name
      const root = "root"; // valid path

      // Create an instance
      const handler = new ModelHandler() as any;

      // Mock collectPaths => rejects
      const error = new Error("Ops");
      handler.collectPaths = jest.fn(() => Promise.reject(error));

      // Mock fs.unlik => resolves
      (fs.unlink as jest.Mock).mockResolvedValue(undefined);

      // Expect remove to rejects
      await expect(handler.remove(table, root)).rejects.toThrow("Ops");
    });

    it("should reject if unlink rejects", async () => {
      // Clear Mocks
      (fs.unlink as jest.Mock).mockClear();

      // Arguments
      const table = "users"; // valid table name
      const root = "root"; // valid path

      // Create an instance
      const handler = new ModelHandler() as any;

      // Mock collectPaths => resolves
      const paths = ["root/User.js"];
      handler.collectPaths = jest.fn(() => Promise.resolve(paths));

      // Mock fs.unlik => rejects
      const error = new Error("Ops");
      (fs.unlink as jest.Mock).mockRejectedValue(error);

      // Expect remove to rejects
      await expect(handler.remove(table, root)).rejects.toThrow("Ops");
    });

    it("should reject if no model found", async () => {
      // Clear Mocks
      (fs.unlink as jest.Mock).mockClear();

      // Arguments
      const table = "users"; // table name with no model file
      const root = "root"; // valid path

      // Create an instance
      const handler = new ModelHandler() as any;

      // Mock collectPaths => resolves
      const paths = ["root/Category.js", "root/Product.js"];

      handler.collectPaths = jest.fn(() => Promise.resolve(paths));

      // Expect remove to reject
      await expect(handler.remove(table, root)).rejects.toThrow(
        "No model found for users table in: root"
      );
    });
  });
});
