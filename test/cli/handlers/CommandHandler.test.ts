jest.mock("fs/promises");

import * as path from "path";
import * as fs from "fs/promises";

import { CommandHandler } from "../../../src/cli/handlers/CommandHandler";
import { CommandHandlerError } from "../../../src/cli/handlers/CommandHandler";

describe("CommandHandler", () => {
  describe("collectPaths", () => {
    it("should resolve if the directory is empty", async () => {
      (fs.readdir as jest.Mock).mockResolvedValue([]);

      const handler = new CommandHandler() as any;
      await expect(handler.collectPaths("path", false)).resolves.toEqual([]);
    });

    it("should remove maps if map is false", async () => {
      (fs.readdir as jest.Mock).mockResolvedValue([
        "TestCommand.js",
        "TestCommand.js.map",
        "WrongFile.test",
      ]);

      const handler = new CommandHandler() as any;

      await expect(handler.collectPaths("root", false)).resolves.toEqual([
        path.resolve("root", "TestCommand.js"),
        path.resolve("root", "TestCommand.js.map"),
      ]);
    });

    it("should reject if fs.readdir rejects", async () => {
      (fs.readdir as jest.Mock).mockRejectedValue(
        new Error("Failed to read directory")
      );

      const handler = new CommandHandler() as any;
      await expect(handler.collectPaths("root", false)).rejects.toThrow(
        "Failed to read directory"
      );
    });
  });

  describe("add", () => {
    it("should resolve if file is created", async () => {
      const template = "[className] - [fileName]";

      // Mock fs.readFile to resolve with template
      (fs.readFile as jest.Mock).mockResolvedValue(template);

      // Mock fs.writeFile to resolve
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

      const handler = new CommandHandler() as any;
      await expect(handler.add("TestCommand", "root", true)).resolves.toBe(
        `Command added in: ${path.resolve("root", "TestCommand.ts")}`
      );

      // Check readFile
      expect(fs.readFile).toHaveBeenCalledWith(
        path.resolve(handler.assets, "ts/command.txt"),
        "utf-8"
      );

      // Check writeFile
      expect(fs.writeFile).toHaveBeenCalledWith(
        path.resolve("root", "TestCommand.ts"),
        "TestCommand - TestCommand.ts",
        "utf-8"
      );
    });

    it("should resolve with the first file", async () => {
      const template = "[className] - [fileName]";

      // Mock fs.readFile to resolve with template
      (fs.readFile as jest.Mock).mockResolvedValue(template);

      // Mock fs.writeFile to resolve
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

      const handler = new CommandHandler() as any;
      await expect(handler.add("TestCommand", "root", true)).resolves.toBe(
        `Command added in: ${path.resolve(
          "root",
          "TestCommand.ts" // first file
        )}`
      );
    });

    it("should reject if command name check fails", async () => {
      const handler = new CommandHandler() as any;
      await expect(handler.add(123, "root")).rejects.toThrow(
        "Invalid command name: 123"
      );
    });

    it("should reject if path check fails", async () => {
      const handler = new CommandHandler() as any;
      await expect(handler.add("TestCommand", 123)).rejects.toThrow(
        "Invalid path: 123"
      );
    });

    it("should reject if fs.readFile fails", async () => {
      const error = new Error("Ops");

      // Mock fs.readFile to reject
      (fs.readFile as jest.Mock).mockRejectedValue(error);

      const handler = new CommandHandler() as any;
      await expect(handler.add("TestCommand", "root")).rejects.toThrow("Ops");
    });

    it("should reject if fs.writeFile fails", async () => {
      const template = "[className] - [fileName]";
      const error = new Error("Ops");

      // Mock fs.readFile to resolve with template
      (fs.readFile as jest.Mock).mockResolvedValue(template);

      // Mock fs.writeFile to resolve
      (fs.writeFile as jest.Mock).mockRejectedValue(error);

      const handler = new CommandHandler() as any;
      await expect(handler.add("TestCommand", "root")).rejects.toThrow("Ops");
    });
  });

  describe("remove", () => {
    it("should resolve if ts files are removed", async () => {
      // Arguments
      const command = "TestCommand"; // valid command name
      const root = "root"; // valid path

      // Create an instance
      const handler = new CommandHandler() as any;

      // Mock collectPaths => resolves
      const paths = [
        "root/TestCommand.ts",
        "root/TestCommand2.ts",
        "root/TestCommand3.ts",
      ];

      handler.collectPaths = jest.fn(() => Promise.resolve(paths));

      // Mock fs.unlik => resolves
      (fs.unlink as jest.Mock).mockResolvedValue(undefined);

      // Expect remove to resolve
      await expect(handler.remove(command, root)).resolves.toBe(
        "1 command file removed in:\nroot/TestCommand.ts"
      );

      // Expect 'root/TestCommand.ts' to be unliked
      expect(fs.unlink).toHaveBeenCalledWith("root/TestCommand.ts");
      expect(fs.unlink).toHaveBeenCalledTimes(1);
    });

    it("should resolve if js files are removed", async () => {
      // Clear Mocks
      (fs.unlink as jest.Mock).mockClear();

      // Arguments
      const command = "TestCommand"; // valid command name
      const root = "root"; // valid path

      // Create an instance
      const handler = new CommandHandler() as any;

      // Mock collectPaths => resolves
      const paths = [
        "root/TestCommand.js",
        "root/TestCommand.js.map",
        "root/TestCommand2.js",
        "root/TestCommand2.js.map",
      ];

      handler.collectPaths = jest.fn(() => Promise.resolve(paths));

      // Mock fs.unlik => resolves
      (fs.unlink as jest.Mock).mockResolvedValue(undefined);

      // Expect remove to resolve
      await expect(handler.remove(command, root)).resolves.toBe(
        "2 command files removed in:\nroot/TestCommand.js\nroot/TestCommand.js.map"
      );

      // Expect 'root/TestCommand' to be unlinked
      expect(fs.unlink).toHaveBeenCalledWith("root/TestCommand.js");
      expect(fs.unlink).toHaveBeenCalledWith("root/TestCommand.js.map");
      expect(fs.unlink).toHaveBeenCalledTimes(2);
    });

    it("should reject if name is invalid", async () => {
      // Arguments
      const command = "-invalid-"; // invalid name
      const root = "root"; // valid path

      // Create an instance
      const handler = new CommandHandler() as any;

      // Expect remove to rejects
      await expect(handler.remove(command, root)).rejects.toThrow(
        "Invalid command name: -invalid-"
      );
    });

    it("should reject if path is invalid", async () => {
      // Arguments
      const command = "TestCommand"; // valid command name
      const root = 123; // invalid path

      // Create an instance
      const handler = new CommandHandler() as any;

      // Expect remove to rejects
      await expect(handler.remove(command, root)).rejects.toThrow(
        "Invalid path: 123"
      );
    });

    it("should reject if collectPaths rejects", async () => {
      // Clear Mocks
      (fs.unlink as jest.Mock).mockClear();

      // Arguments
      const command = "TestCommand"; // valid command name
      const root = "root"; // valid path

      // Create an instance
      const handler = new CommandHandler() as any;

      // Mock collectPaths => rejects
      const error = new Error("Ops");
      handler.collectPaths = jest.fn(() => Promise.reject(error));

      // Mock fs.unlik => resolves
      (fs.unlink as jest.Mock).mockResolvedValue(undefined);

      // Expect remove to rejects
      await expect(handler.remove(command, root)).rejects.toThrow("Ops");
    });

    it("should reject if unlink rejects", async () => {
      // Clear Mocks
      (fs.unlink as jest.Mock).mockClear();

      // Arguments
      const command = "TestCommand"; // valid command name
      const root = "root"; // valid path

      // Create an instance
      const handler = new CommandHandler() as any;

      // Mock collectPaths => resolves
      const paths = ["root/TestCommand.js"];
      handler.collectPaths = jest.fn(() => Promise.resolve(paths));

      // Mock fs.unlik => rejects
      const error = new Error("Ops");
      (fs.unlink as jest.Mock).mockRejectedValue(error);

      // Expect remove to rejects
      await expect(handler.remove(command, root)).rejects.toThrow("Ops");
    });

    it("should reject if no command found", async () => {
      // Clear Mocks
      (fs.unlink as jest.Mock).mockClear();

      // Arguments
      const command = "TestCommand"; // command name with no command file
      const root = "root"; // valid path

      // Create an instance
      const handler = new CommandHandler() as any;

      // Mock collectPaths => resolves
      const paths = ["root/TestCommand2.js", "root/TestCommand3.js"];

      handler.collectPaths = jest.fn(() => Promise.resolve(paths));

      // Expect remove to reject
      await expect(handler.remove(command, root)).rejects.toThrow(
        "File not found in: root"
      );
    });
  });
});
