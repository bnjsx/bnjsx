jest.mock("fs/promises");
jest.mock("../../../src/core/modules/Builder");

import * as fs from "fs/promises";
import * as path from "path";

import { GeneratorHandler } from "../../../src/cli/handlers/GeneratorHandler";
import { GeneratorHandlerError } from "../../../src/cli/handlers/GeneratorHandler";

import { Generator as Gen } from "../../../src/core/modules/Generator";
import { Builder } from "../../../src/core/modules/Builder";

import { QueryError } from "../../../src/errors";
import { isError } from "../../../src/helpers";

const mock = {
  builder: (value?: any): Builder => {
    const builder = new Builder({} as any);
    const driver = { id: Symbol("MySQL") };
    builder.get = {
      connection: () => ({ driver } as any),
    };

    if (isError(value)) {
      builder.raw = jest.fn(() => Promise.reject(value));
    } else builder.raw = jest.fn(() => Promise.resolve(value));

    const insert: any = {
      into: jest.fn(() => insert),
      rows: jest.fn(() => insert),
      row: jest.fn(() => insert),
      exec: jest.fn(() => Promise.resolve()),
    };

    const remove: any = {
      from: jest.fn(() => remove),
      where: jest.fn((condition) => {
        const col = jest.fn(() => ({ in: jest.fn() }));
        condition(col);
        return remove;
      }),
      exec: jest.fn(() => Promise.resolve()),
    };

    builder.insert = jest.fn(() => insert);
    builder.delete = jest.fn(() => remove);

    return builder;
  },
  generator: (table: string, action?: "reject" | "throw" | "return") => {
    class Generator extends Gen {
      public create(): Promise<void> {
        return this.schema(this.column("id").bigInt());
      }
    }

    const generator = new Generator() as any;
    generator.set.table(table);

    if (action === "reject") {
      generator.create = jest.fn(() => Promise.reject(new Error("Ops")));
      generator.drop = jest.fn(() => Promise.reject(new Error("Ops")));
    }

    if (action === "throw") {
      generator.create = jest.fn(() => {
        throw new Error("Ops");
      });

      generator.drop = jest.fn(() => {
        throw new Error("Ops");
      });
    }

    if (action === "return") {
      generator.create = jest.fn(() => "hello world");
      generator.drop = jest.fn(() => "hello world");
    }

    return generator;
  },
};

describe("GeneratorHandler", () => {
  describe("constructor", () => {
    it("should work with a valid Builder", () => {
      const builder = mock.builder();
      const handler = new GeneratorHandler(builder) as any;

      expect(handler).toBeInstanceOf(GeneratorHandler);
      expect(handler.builder).toBe(builder);
      expect(handler.rows).toEqual([]);
      expect(handler.assets).toBe(path.resolve(__dirname, "../../../assets"));
    });

    it("should throw with an invalid Builder", () => {
      const invalidBuilder = "-invalid-" as any; // Not an instance of Builder

      expect(() => new GeneratorHandler(invalidBuilder)).toThrow(
        GeneratorHandlerError
      );

      expect(() => new GeneratorHandler(invalidBuilder)).toThrow(
        "Invalid builder: -invalid-"
      );
    });
  });

  describe("load", () => {
    it("should load rows if table exists", async () => {
      const mockRows = [
        { path: "path1", batch: 1 },
        { path: "path2", batch: 1 },
      ];

      const builder = mock.builder(mockRows);
      const handler = new GeneratorHandler(builder) as any;

      await handler.load();

      // Test if `this.rows` is populated with `mockRows`
      expect(handler.rows).toEqual(mockRows);

      // Ensure `raw` was called with the correct query
      expect(builder.raw).toHaveBeenCalledWith("SELECT * FROM generators;");
    });

    it("should create the table if does not exist", async () => {
      const mockError = new QueryError("Table not found");
      const builder = mock.builder() as any;
      const handler = new GeneratorHandler(builder) as any;

      // Mock `raw` to reject first call with a QueryError and then resolve
      builder.raw = jest
        .fn()
        .mockRejectedValueOnce(mockError)
        .mockResolvedValueOnce(undefined);

      await handler.load();

      // Test if `raw` was called twice, once for `SELECT` and once for `CREATE`
      expect(builder.raw).toHaveBeenCalledTimes(2);
      expect(builder.raw).toHaveBeenCalledWith("SELECT * FROM generators;");
      expect(builder.raw).toHaveBeenCalledWith(
        "CREATE TABLE generators (id BIGINT UNSIGNED AUTO_INCREMENT, path TEXT NOT NULL, batch SMALLINT UNSIGNED NOT NULL, CONSTRAINT pk_generators_id PRIMARY KEY (id));"
      );
    });

    it("should reject if the error is not a QueryError", async () => {
      const error = new Error("Unexpected error");
      const builder = mock.builder() as any;
      const handler = new GeneratorHandler(builder) as any;

      // Mock `raw` to throw a non-`QueryError`
      builder.raw = jest.fn().mockRejectedValueOnce(error);

      // Expect `load` to reject with `error`
      await expect(handler.load()).rejects.toThrow(error);

      expect(builder.raw).toHaveBeenCalledTimes(1);
      expect(builder.raw).toHaveBeenCalledWith("SELECT * FROM generators;");
    });
  });

  describe("collectPaths", () => {
    it("should resolve if the directory is empty", async () => {
      (fs.readdir as jest.Mock).mockResolvedValue([]);

      const handler = new GeneratorHandler(mock.builder()) as any;
      await expect(handler.collectPaths("path", false)).resolves.toEqual([]);
    });

    it("should remove maps if map is false", async () => {
      (fs.readdir as jest.Mock).mockResolvedValue([
        "01_generate_user_table.js",
        "01_generate_user_table.js.map",
      ]);

      const handler = new GeneratorHandler(mock.builder()) as any;

      await expect(handler.collectPaths("root", false)).resolves.toEqual([
        path.resolve("root", "01_generate_user_table.js"),
      ]);
    });

    it("should keep maps if map is true", async () => {
      (fs.readdir as jest.Mock).mockResolvedValue([
        "01_generate_user_table.js",
        "01_generate_user_table.js.map",
      ]);

      const handler = new GeneratorHandler(mock.builder()) as any;

      await expect(handler.collectPaths("root", true)).resolves.toEqual([
        path.resolve("root", "01_generate_user_table.js"),
        path.resolve("root", "01_generate_user_table.js.map"),
      ]);
    });

    it("should reject if any file is invalid", async () => {
      (fs.readdir as jest.Mock).mockResolvedValue([
        "01_generate_user_table.js",
        "01_generate_user_table.js.map",
        123, // invalid file
      ]);

      const handler = new GeneratorHandler(mock.builder()) as any;
      await expect(handler.collectPaths("root", false)).rejects.toThrow(
        GeneratorHandlerError
      );
    });

    it("should reject if fs.readdir rejects", async () => {
      (fs.readdir as jest.Mock).mockRejectedValue(
        new Error("Failed to read directory")
      );

      const handler = new GeneratorHandler(mock.builder()) as any;
      await expect(handler.collectPaths("root", false)).rejects.toThrow(
        "Failed to read directory"
      );
    });
  });

  describe("collectGenerators", () => {
    const mockRequire = (modulePath: string, moduleExports: any) => {
      jest.mock(modulePath, () => moduleExports, { virtual: true });
    };

    afterEach(() => {
      jest.resetModules();
    });

    it("should collect valid default generators", () => {
      const path = "path/to/generator/file";
      const generator = mock.generator("test");

      // Export default generator
      mockRequire(path, generator);

      const handler = new GeneratorHandler(mock.builder()) as any;
      const generators = handler.collectGenerators([path]);

      expect(generators).toHaveLength(1);
      expect(generators).toContain(generator);
    });

    it("should collect valid named generators", () => {
      const path = "path/to/generator/file";
      const generator = mock.generator("test");

      // Export named generator
      mockRequire(path, { name: generator });

      const handler = new GeneratorHandler(mock.builder()) as any;
      const generators = handler.collectGenerators([path]);

      expect(generators).toHaveLength(1);
      expect(generators).toContain(generator);
    });

    it("should throw if module does not export valid generator", () => {
      const path = "path/to/generator/file";

      // Export invalid generator
      mockRequire(path, {});

      const handler = new GeneratorHandler(mock.builder()) as any;
      expect(() => handler.collectGenerators([path])).toThrow(
        GeneratorHandlerError
      );
    });

    it("should throw if module does not exist", () => {
      const path = "does/not/exist";

      const handler = new GeneratorHandler(mock.builder()) as any;
      expect(() => handler.collectGenerators([path])).toThrow(
        GeneratorHandlerError
      );
    });

    it("should throw if paths array is empty", () => {
      const handler = new GeneratorHandler(mock.builder()) as any;
      expect(() => handler.collectGenerators([])).toThrow(
        GeneratorHandlerError
      );
    });
  });

  describe("createTables", () => {
    it("should create tables from valid generator files", async () => {
      // Mock collectGenerators
      const paths = ["01_path", "02_path"];
      const batch = 1;
      const builder = mock.builder();
      const handler = new GeneratorHandler(builder) as any;
      const generators = [mock.generator("users"), mock.generator("profiles")];
      handler.collectGenerators = jest.fn(() => generators);

      // Execute
      const message = await handler.createTables(paths, batch);

      // Test
      expect(message).toBe("2/2 tables created");

      // First the users table is created
      expect(builder.raw).toHaveBeenCalledWith(
        "CREATE TABLE users (id BIGINT);"
      );

      // Then the profiles table is created
      expect(builder.raw).toHaveBeenCalledWith(
        "CREATE TABLE profiles (id BIGINT);"
      );

      // Then paths are registered
      expect(builder.insert).toHaveBeenCalled();
    });

    it("should reject if any generator has an invalid create method", async () => {
      // Mock collectGenerators
      const paths = ["01_path"];
      const batch = 1;
      const builder = mock.builder();
      const handler = new GeneratorHandler(builder) as any;

      // In case the create method throws
      const generator1 = mock.generator("users", "throw");
      handler.collectGenerators = jest.fn(() => [generator1]);
      // Promise rejects with the error message
      await expect(handler.createTables(paths, batch)).rejects.toThrow("Ops");

      // In case the create method rejects
      const generator2 = mock.generator("users", "reject");
      handler.collectGenerators = jest.fn(() => [generator2]);
      // Promise rejects with the error message
      await expect(handler.createTables(paths, batch)).rejects.toThrow("Ops");

      // In case the create method returns
      const generator3 = mock.generator("users", "return");
      handler.collectGenerators = jest.fn(() => [generator3]);
      // Promise rejects with this error
      await expect(handler.createTables(paths, batch)).rejects.toThrow(
        "Invalid create method in: Generator"
      );
    });

    it("should handle the case when table cannot to be created", async () => {
      // Mock collectGenerators
      const paths = ["01_path", "02_path"];
      const batch = 1;
      const builder = mock.builder();
      const handler = new GeneratorHandler(builder) as any;
      const generators = [
        mock.generator("users"), // create method resolves
        mock.generator("profiles", "reject"), // create method rejects
      ];

      handler.collectGenerators = jest.fn(() => generators);

      await expect(handler.createTables(paths, batch)).rejects.toThrow(
        "1/2 tables created: Ops"
      );

      // First the users table is created
      expect(builder.raw).toHaveBeenCalledWith(
        "CREATE TABLE users (id BIGINT);"
      );

      // Then paths are registered
      expect(builder.insert).toHaveBeenCalled();
    });
  });

  describe("dropTables", () => {
    it("should drop tables from valid generator files", async () => {
      // Mock collectGenerators
      const paths = ["01_path", "02_path"];
      const batch = 1;
      const builder = mock.builder();
      const handler = new GeneratorHandler(builder) as any;
      const generators = [mock.generator("users"), mock.generator("profiles")];
      handler.collectGenerators = jest.fn(() => generators);

      // Execute
      const message = await handler.dropTables(paths, batch);

      // Test
      expect(message).toBe("2/2 tables dropped");

      // First the users table is dropped
      expect(builder.raw).toHaveBeenCalledWith("DROP TABLE users;");

      // Then the profiles table is dropped
      expect(builder.raw).toHaveBeenCalledWith("DROP TABLE profiles;");

      // Then paths are deleted
      expect(builder.delete).toHaveBeenCalled();
    });

    it("should reject if any generator has an invalid drop method", async () => {
      // Mock collectGenerators
      const paths = ["01_path"];
      const batch = 1;
      const builder = mock.builder();
      const handler = new GeneratorHandler(builder) as any;

      // In case the drop method throws
      const generator1 = mock.generator("users", "throw");
      handler.collectGenerators = jest.fn(() => [generator1]);
      // Promise rejects with the error message
      await expect(handler.dropTables(paths, batch)).rejects.toThrow("Ops");

      // In case the drop method rejects
      const generator2 = mock.generator("users", "reject");
      handler.collectGenerators = jest.fn(() => [generator2]);
      // Promise rejects with the error message
      await expect(handler.dropTables(paths, batch)).rejects.toThrow("Ops");

      // In case the drop method returns
      const generator3 = mock.generator("users", "return");
      handler.collectGenerators = jest.fn(() => [generator3]);
      // Promise rejects with this error
      await expect(handler.dropTables(paths, batch)).rejects.toThrow(
        "Invalid drop method in: Generator"
      );
    });

    it("should handle the case when table cannot be dropped", async () => {
      // Mock collectGenerators
      const paths = ["01_path", "02_path"];
      const batch = 1;
      const builder = mock.builder();
      const handler = new GeneratorHandler(builder) as any;
      const generators = [
        mock.generator("users"), // drop method resolves
        mock.generator("profiles", "reject"), // drop method rejects
      ];

      handler.collectGenerators = jest.fn(() => generators);

      await expect(handler.dropTables(paths, batch)).rejects.toThrow(
        "1/2 tables dropped: Ops"
      );

      // First the users table is created
      expect(builder.raw).toHaveBeenCalledWith("DROP TABLE users;");

      // Then paths are registered
      expect(builder.delete).toHaveBeenCalled();
    });
  });

  describe("beReadyToGenerate", () => {
    it("should resolve with paths and batch", async () => {
      // Mock dependencies
      const root = "root";
      const paths = ["root/01_file", "root/02_file"];
      const handler = new GeneratorHandler(mock.builder()) as any;

      handler.rows = [{ path: "root/01_file", batch: 1 }];
      handler.load = jest.fn(() => Promise.resolve());
      handler.collectPaths = jest.fn(() => Promise.resolve(paths));

      await expect(handler.beReadyToGenerate(root)).resolves.toEqual({
        batch: 2,
        paths: ["root/02_file"],
      });
    });

    it("should reject if nothing to generate", async () => {
      // Mock dependencies
      const root = "root";
      const paths = ["root/01_file"];
      const handler = new GeneratorHandler(mock.builder()) as any;

      handler.rows = [{ path: "root/01_file", batch: 1 }];
      handler.load = jest.fn(() => Promise.resolve());
      handler.collectPaths = jest.fn(() => Promise.resolve(paths));

      await expect(handler.beReadyToGenerate(root)).rejects.toThrow(
        "Nothing to generate"
      );
    });

    it("should reject if load fails", async () => {
      // Mock dependencies
      const root = "root";
      const error = new QueryError("Ops");
      const handler = new GeneratorHandler(mock.builder()) as any;

      handler.load = jest.fn(() => Promise.reject(error));

      await expect(handler.beReadyToGenerate(root)).rejects.toThrow(error);
    });

    it("should reject if collectPaths fails", async () => {
      // Mock dependencies
      const root = "root";
      const error = new QueryError("Ops");
      const handler = new GeneratorHandler(mock.builder()) as any;

      handler.load = jest.fn(() => Promise.resolve());
      handler.collectPaths = jest.fn(() => Promise.reject(error));

      await expect(handler.beReadyToGenerate(root)).rejects.toThrow(error);
    });
  });

  describe("beReadyToRollback", () => {
    it("should resolve with paths to rollback", async () => {
      // Mock dependencies
      const rows = [
        { path: "root/01_file", batch: 1 },
        { path: "root/02_file", batch: 1 },
        { path: "root/03_file", batch: 2 },
      ];

      const handler = new GeneratorHandler(mock.builder()) as any;
      handler.load = jest.fn(() => Promise.resolve());
      handler.rows = rows;

      await expect(handler.beReadyToRollback()).resolves.toEqual([
        "root/03_file",
      ]);
    });

    it("should reject if there is nothing to rollback", async () => {
      // Mock dependencies
      const rows = [];

      const handler = new GeneratorHandler(mock.builder()) as any;
      handler.load = jest.fn(() => Promise.resolve());
      handler.rows = rows;

      await expect(handler.beReadyToRollback()).rejects.toThrow(
        "Nothing to rollback"
      );
    });

    it("should reject if load rejects", async () => {
      // Mock dependencies
      const error = new QueryError("Ops");

      const handler = new GeneratorHandler(mock.builder()) as any;
      handler.load = jest.fn(() => Promise.reject(error));

      await expect(handler.beReadyToRollback()).rejects.toThrow(error);
    });
  });

  describe("generate", () => {
    it("should resolve after creating tables", async () => {
      const root = "root";
      const batch = 1;
      const paths = ["root/01_file", "root/02_file"];
      const message = "2/2 tables created";
      const handler = new GeneratorHandler(mock.builder()) as any;

      handler.createTables = jest.fn(() => Promise.resolve(message));
      handler.beReadyToGenerate = jest.fn(() =>
        Promise.resolve({ paths, batch })
      );

      await expect(handler.generate(root)).resolves.toBe(message);
      expect(handler.beReadyToGenerate).toHaveBeenCalledWith(root);
      expect(handler.createTables).toHaveBeenCalledWith(paths, batch);
    });

    it("should reject if path is invalid", async () => {
      const root = 123; // Invalid path
      const handler = new GeneratorHandler(mock.builder()) as any;

      await expect(handler.generate(root)).rejects.toThrow("Invalid path: 123");
    });

    it("should reject if beReadyToGenerate rejects", async () => {
      const root = "root";
      const error = new QueryError("Ops");
      const handler = new GeneratorHandler(mock.builder()) as any;

      handler.beReadyToGenerate = jest.fn(() => Promise.reject(error));

      await expect(handler.generate(root)).rejects.toThrow(error);
    });

    it("should reject if createTables rejects", async () => {
      const root = "root";
      const batch = 1;
      const paths = ["root/01_file", "root/02_file"];
      const error = new QueryError("Ops");
      const handler = new GeneratorHandler(mock.builder()) as any;

      handler.createTables = jest.fn(() => Promise.reject(error));
      handler.beReadyToGenerate = jest.fn(() =>
        Promise.resolve({ paths, batch })
      );

      await expect(handler.generate(root)).rejects.toThrow(error);
    });
  });

  describe("rollback", () => {
    it("should resolve after dropping tables", async () => {
      const paths = ["root/01_file", "root/02_file"];
      const message = "2/2 tables dropped";
      const handler = new GeneratorHandler(mock.builder()) as any;

      handler.dropTables = jest.fn(() => Promise.resolve(message));
      handler.beReadyToRollback = jest.fn(() => Promise.resolve(paths));

      await expect(handler.rollback()).resolves.toBe(message);
      expect(handler.beReadyToRollback).toHaveBeenCalled();
      expect(handler.dropTables).toHaveBeenCalledWith(paths);
    });

    it("should reject if beReadyToRollback rejects", async () => {
      const error = new QueryError("Ops");
      const handler = new GeneratorHandler(mock.builder()) as any;

      handler.beReadyToRollback = jest.fn(() => Promise.reject(error));
      handler.dropTables = jest.fn(() => Promise.reject(error));

      await expect(handler.rollback()).rejects.toThrow(error);
      expect(handler.beReadyToRollback).toHaveBeenCalled();
      expect(handler.dropTables).not.toHaveBeenCalled();
    });

    it("should reject if dropTables rejects", async () => {
      const paths = ["root/01_file", "root/02_file"];
      const error = new QueryError("Ops");
      const handler = new GeneratorHandler(mock.builder()) as any;

      handler.beReadyToRollback = jest.fn(() => Promise.resolve(paths));
      handler.dropTables = jest.fn(() => Promise.reject(error));

      await expect(handler.rollback()).rejects.toThrow(error);
      expect(handler.beReadyToRollback).toHaveBeenCalled();
      expect(handler.dropTables).toHaveBeenCalledWith(paths);
    });
  });

  describe("add", () => {
    it("should resolve if file is created", async () => {
      const template = "[className] - [tableName] - [fileName]";
      const files = ["01_generate_users_table.ts"];

      // Mock fs.readFile to resolve with template
      (fs.readFile as jest.Mock).mockResolvedValue(template);

      // Mock fs.readdir to resolve with files
      (fs.readdir as jest.Mock).mockResolvedValue(files);

      // Mock fs.writeFile to resolve
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

      const handler = new GeneratorHandler(mock.builder()) as any;
      await expect(handler.add("profiles", "root", true)).resolves.toBe(
        `Generator added in: ${path.resolve(
          "root",
          "02_generate_profiles_table.ts"
        )}`
      );

      // Test readFile
      expect(fs.readFile).toHaveBeenCalledWith(
        path.resolve(handler.assets, "ts/generator.txt"),
        "utf-8"
      );

      // Test readdir
      expect(fs.readdir).toHaveBeenCalledWith("root");

      // Test writeFile
      expect(fs.writeFile).toHaveBeenCalledWith(
        path.resolve("root", "02_generate_profiles_table.ts"),
        "ProfilesTableGenerator - profiles - 02_generate_profiles_table.ts",
        "utf-8"
      );
    });

    it("should resolve with the first file", async () => {
      const template = "[className] - [tableName] - [fileName]";
      const files = []; // no files in the folder

      // Mock fs.readFile to resolve with template
      (fs.readFile as jest.Mock).mockResolvedValue(template);

      // Mock fs.readdir to resolve with files
      (fs.readdir as jest.Mock).mockResolvedValue(files);

      // Mock fs.writeFile to resolve
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

      const handler = new GeneratorHandler(mock.builder()) as any;
      await expect(handler.add("users", "root", true)).resolves.toBe(
        `Generator added in: ${path.resolve(
          "root",
          "01_generate_users_table.ts" // first file
        )}`
      );
    });

    it("should reject if an invalid file found", async () => {
      const template = "[className] - [tableName] - [fileName]";
      const files = ["-invalid-"]; //invalid file found

      // Mock fs.readFile to resolve with template
      (fs.readFile as jest.Mock).mockResolvedValue(template);

      // Mock fs.readdir to resolve with files
      (fs.readdir as jest.Mock).mockResolvedValue(files);

      // Mock fs.writeFile to resolve
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

      const handler = new GeneratorHandler(mock.builder()) as any;
      await expect(handler.add("users", "root", true)).rejects.toThrow(
        "Invalid generator file: -invalid-"
      );
    });

    it("should reject if table name check fails", async () => {
      const handler = new GeneratorHandler(mock.builder()) as any;
      await expect(handler.add(123, "root")).rejects.toThrow(
        "Invalid table name: 123"
      );
    });

    it("should reject if path check fails", async () => {
      const handler = new GeneratorHandler(mock.builder()) as any;
      await expect(handler.add("profiles", 123)).rejects.toThrow(
        "Invalid path: 123"
      );
    });

    it("should reject if fs.readFile fails", async () => {
      const error = new Error("Ops");

      // Mock fs.readFile to reject
      (fs.readFile as jest.Mock).mockRejectedValue(error);

      const handler = new GeneratorHandler(mock.builder()) as any;
      await expect(handler.add("profiles", "root")).rejects.toThrow("Ops");
    });

    it("should reject if fs.readdir fails", async () => {
      const template = "[className] - [tableName] - [fileName]";
      const error = new Error("Ops");

      // Mock fs.readFile to resolve with template
      (fs.readFile as jest.Mock).mockResolvedValue(template);

      // Mock fs.readdir to reject
      (fs.readdir as jest.Mock).mockRejectedValue(error);

      const handler = new GeneratorHandler(mock.builder()) as any;
      await expect(handler.add("profiles", "root")).rejects.toThrow("Ops");
    });

    it("should reject if fs.writeFile fails", async () => {
      const template = "[className] - [tableName] - [fileName]";
      const files = ["01_generate_users_table.ts"];
      const error = new Error("Ops");

      // Mock fs.readFile to resolve with template
      (fs.readFile as jest.Mock).mockResolvedValue(template);

      // Mock fs.readdir to resolve with files
      (fs.readdir as jest.Mock).mockResolvedValue(files);

      // Mock fs.writeFile to resolve
      (fs.writeFile as jest.Mock).mockRejectedValue(error);

      const handler = new GeneratorHandler(mock.builder()) as any;
      await expect(handler.add("profiles", "root")).rejects.toThrow("Ops");
    });
  });

  describe("remove", () => {
    it("should resolve if files are removed and renamed", async () => {
      // Arguments
      const table = "users"; // valid table name
      const root = "root"; // valid path

      // Create an instance
      const handler = new GeneratorHandler(mock.builder()) as any;

      // Mock collectPaths => resolves
      const paths = [
        "root/01_generate_users_table.js",
        "root/02_generate_profiles_table.js",
        "root/03_generate_products_table.js",
      ];

      handler.collectPaths = jest.fn(() => Promise.resolve(paths));

      // Mock reset => resolves
      handler.reset = jest.fn(() => Promise.resolve());

      // Mock fs.unlik => resolves
      (fs.unlink as jest.Mock).mockResolvedValue(undefined);

      // Mock fs.rename => resolves
      (fs.rename as jest.Mock).mockResolvedValue(undefined);

      // Expect remove to resolve
      await expect(handler.remove(table, root)).resolves.toBe(
        "1 generator file removed in:\nroot/01_generate_users_table.js"
      );

      // Expect 'root/01_generate_users_table.js' to be unliked
      expect(fs.unlink).toHaveBeenCalledWith("root/01_generate_users_table.js");
      expect(fs.unlink).toHaveBeenCalledTimes(1);

      // Expect the rest to be renamed
      expect(fs.rename).toHaveBeenCalledTimes(2);

      expect(fs.rename).toHaveBeenCalledWith(
        "root/02_generate_profiles_table.js", // From
        "root/01_generate_profiles_table.js" // To
      );

      expect(fs.rename).toHaveBeenCalledWith(
        "root/03_generate_products_table.js", // From
        "root/02_generate_products_table.js" // To
      );
    });

    it("should resolve if rename paths are empty", async () => {
      // Clear Mocks
      (fs.unlink as jest.Mock).mockClear();
      (fs.rename as jest.Mock).mockClear();

      // Arguments
      const table = "users"; // valid table name
      const root = "root"; // valid path

      // Create an instance
      const handler = new GeneratorHandler(mock.builder()) as any;

      // Mock collectPaths => resolves
      const paths = ["root/01_generate_users_table.js"];

      handler.collectPaths = jest.fn(() => Promise.resolve(paths));

      // Mock reset => resolves
      handler.reset = jest.fn(() => Promise.resolve());

      // Mock fs.unlik => resolves
      (fs.unlink as jest.Mock).mockResolvedValue(undefined);

      // Mock fs.rename => resolves
      (fs.rename as jest.Mock).mockResolvedValue(undefined);

      // Expect remove to resolve
      await expect(handler.remove(table, root)).resolves.toBe(
        "1 generator file removed in:\nroot/01_generate_users_table.js"
      );

      // Expect 'root/01_generate_users_table.js' to be unliked
      expect(fs.unlink).toHaveBeenCalledWith("root/01_generate_users_table.js");
      expect(fs.unlink).toHaveBeenCalledTimes(1);

      // Expect the rename not be called
      expect(fs.rename).not.toHaveBeenCalled();
    });

    it("should reset js generators only", async () => {
      // Clear Mocks
      (fs.unlink as jest.Mock).mockClear();
      (fs.rename as jest.Mock).mockClear();

      // Arguments
      const table = "users"; // valid table name
      const root = "root"; // valid path

      // Create an instance
      const handler = new GeneratorHandler(mock.builder()) as any;

      // Mock collectPaths => resolves
      const paths = ["root/01_generate_users_table.ts"]; // ts generator

      handler.collectPaths = jest.fn(() => Promise.resolve(paths));

      // Mock reset => resolves
      handler.reset = jest.fn(() => Promise.resolve());

      // Mock fs.unlik => resolves
      (fs.unlink as jest.Mock).mockResolvedValue(undefined);

      // Mock fs.rename => resolves
      (fs.rename as jest.Mock).mockResolvedValue(undefined);

      // Expect remove to resolve
      await expect(handler.remove(table, root)).resolves.toBe(
        "1 generator file removed in:\nroot/01_generate_users_table.ts"
      );

      // Expect the reset not to be called
      expect(handler.reset).not.toHaveBeenCalled();
    });

    it("should reject if reset rejects", async () => {
      // Clear Mocks
      (fs.unlink as jest.Mock).mockClear();
      (fs.rename as jest.Mock).mockClear();

      // Arguments
      const table = "users"; // valid table name
      const root = "root"; // valid path

      // Create an instance
      const handler = new GeneratorHandler(mock.builder()) as any;

      // Mock collectPaths => resolves
      const paths = ["root/01_generate_users_table.js"];
      handler.collectPaths = jest.fn(() => Promise.resolve(paths));

      // Mock reset => rejects
      const error = new Error("Ops");
      handler.reset = jest.fn(() => Promise.reject(error));

      // Mock fs.unlik => resolves
      (fs.unlink as jest.Mock).mockResolvedValue(undefined);

      // Mock fs.rename => resolves
      (fs.rename as jest.Mock).mockResolvedValue(undefined);

      // Expect remove to resolve
      await expect(handler.remove(table, root)).rejects.toThrow(error);
    });

    it("should reject if name is invalid", async () => {
      // Arguments
      const table = "-invalid-"; // invalid name
      const root = "root"; // valid path

      // Create an instance
      const handler = new GeneratorHandler(mock.builder()) as any;

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
      const handler = new GeneratorHandler(mock.builder()) as any;

      // Expect remove to rejects
      await expect(handler.remove(table, root)).rejects.toThrow(
        "Invalid path: 123"
      );
    });

    it("should reject if collectPaths rejects", async () => {
      // Clear Mocks
      (fs.unlink as jest.Mock).mockClear();
      (fs.rename as jest.Mock).mockClear();

      // Arguments
      const table = "users"; // valid table name
      const root = "root"; // valid path

      // Create an instance
      const handler = new GeneratorHandler(mock.builder()) as any;

      // Mock collectPaths => rejects
      const error = new Error("Ops");
      handler.collectPaths = jest.fn(() => Promise.reject(error));

      // Mock reset => resolves
      handler.reset = jest.fn(() => Promise.resolve());

      // Mock fs.unlik => resolves
      (fs.unlink as jest.Mock).mockResolvedValue(undefined);

      // Mock fs.rename => resolves
      (fs.rename as jest.Mock).mockResolvedValue(undefined);

      // Expect remove to rejects
      await expect(handler.remove(table, root)).rejects.toThrow("Ops");
    });

    it("should reject if unlink rejects", async () => {
      // Clear Mocks
      (fs.unlink as jest.Mock).mockClear();
      (fs.rename as jest.Mock).mockClear();

      // Arguments
      const table = "users"; // valid table name
      const root = "root"; // valid path

      // Create an instance
      const handler = new GeneratorHandler(mock.builder()) as any;

      // Mock collectPaths => resolves
      const paths = ["root/01_generate_users_table.js"];
      handler.collectPaths = jest.fn(() => Promise.resolve(paths));

      // Mock reset => resolves
      handler.reset = jest.fn(() => Promise.resolve());

      // Mock fs.unlik => rejects
      const error = new Error("Ops");
      (fs.unlink as jest.Mock).mockRejectedValue(error);

      // Mock fs.rename => resolves
      (fs.rename as jest.Mock).mockResolvedValue(undefined);

      // Expect remove to rejects
      await expect(handler.remove(table, root)).rejects.toThrow("Ops");
    });

    it("should reject if rename rejects", async () => {
      // Clear Mocks
      (fs.unlink as jest.Mock).mockClear();
      (fs.rename as jest.Mock).mockClear();

      // Arguments
      const table = "users"; // valid table name
      const root = "root"; // valid path

      // Create an instance
      const handler = new GeneratorHandler(mock.builder()) as any;

      // Mock collectPaths => resolves
      const paths = [
        "root/01_generate_users_table.js",
        "root/02_generate_products_table.js",
      ];
      handler.collectPaths = jest.fn(() => Promise.resolve(paths));

      // Mock reset => resolves
      handler.reset = jest.fn(() => Promise.resolve());

      // Mock fs.unlik => resolves
      (fs.unlink as jest.Mock).mockResolvedValue(undefined);

      // Mock fs.rename => rejects
      const error = new Error("Ops");
      (fs.rename as jest.Mock).mockRejectedValue(error);

      // Expect remove to reject
      await expect(handler.remove(table, root)).rejects.toThrow("Ops");
    });

    it("should reject if no generator found", async () => {
      // Clear Mocks
      (fs.unlink as jest.Mock).mockClear();
      (fs.rename as jest.Mock).mockClear();

      // Arguments
      const table = "users"; // table name with no generator file
      const root = "root"; // valid path

      // Create an instance
      const handler = new GeneratorHandler(mock.builder()) as any;

      // Mock collectPaths => resolves
      const paths = [
        "root/01_generate_categories_table.js",
        "root/02_generate_products_table.js",
      ];

      handler.collectPaths = jest.fn(() => Promise.resolve(paths));

      // Expect remove to reject
      await expect(handler.remove(table, root)).rejects.toThrow(
        "No generator found for users table in: root"
      );
    });
  });

  describe("reset", () => {
    it("should resolve if tables are dropped", async () => {
      // Arguments
      const root = "root";

      // Create an instance
      const builder = mock.builder();
      const handler = new GeneratorHandler(builder) as any;

      // Mock collectPaths
      const paths = [
        "root/01_generate_users_table.js",
        "root/02_generate_profiles_tables.js",
      ];

      handler.collectPaths = jest.fn(() => Promise.resolve(paths));

      // Mock collectGenerators
      const generators = [mock.generator("users"), mock.generator("profiles")];

      handler.collectGenerators = jest.fn(() => generators);

      // Expect reset to resolve
      await expect(handler.reset(root)).resolves.toBe("2/2 tables dropped");

      // Expect users table to be dropped
      expect(builder.raw).toHaveBeenCalledWith("DROP TABLE users;");

      // Expect profiles table to be dropped
      expect(builder.raw).toHaveBeenCalledWith("DROP TABLE profiles;");

      // Expect generators table to be dropped
      expect(builder.raw).toHaveBeenCalledWith("DROP TABLE generators;");

      // Expect 3 tables dropped in total
      expect(builder.raw).toHaveBeenCalledTimes(3);
    });

    it("should resolve if table does not exist", async () => {
      // Arguments
      const root = "root";

      // Create an instance
      const error = new Error("Table does not exist");
      const builder = mock.builder(error);
      const handler = new GeneratorHandler(builder) as any;

      // Mock collectPaths
      const paths = [
        "root/01_generate_users_table.js",
        "root/02_generate_profiles_tables.js",
      ];

      handler.collectPaths = jest.fn(() => Promise.resolve(paths));

      // Mock collectGenerators
      const generators = [mock.generator("users"), mock.generator("profiles")];

      handler.collectGenerators = jest.fn(() => generators);

      // Expect reset to resolve
      await expect(handler.reset(root)).resolves.toBe("0/2 tables dropped");

      // Expect users table to be dropped
      expect(builder.raw).toHaveBeenCalledWith("DROP TABLE users;");

      // Expect profiles table to be dropped
      expect(builder.raw).toHaveBeenCalledWith("DROP TABLE profiles;");

      // Expect generators table to be dropped
      expect(builder.raw).toHaveBeenCalledWith("DROP TABLE generators;");

      // Expect 3 tables dropped in total
      expect(builder.raw).toHaveBeenCalledTimes(3);
    });

    it("should reject if path is invalid", async () => {
      // Arguments
      const root = 123; // invalid path

      // Create an instance
      const handler = new GeneratorHandler(mock.builder()) as any;

      // Expect remove to rejects
      await expect(handler.reset(root)).rejects.toThrow("Invalid path: 123");
    });

    it("should reject if nothing to reset", async () => {
      // Arguments
      const root = "root";

      // Create an instance
      const builder = mock.builder();
      const handler = new GeneratorHandler(builder) as any;

      // Mock collectPaths
      const paths = [];
      handler.collectPaths = jest.fn(() => Promise.resolve(paths));

      // Expect reset to resolve
      await expect(handler.reset(root)).rejects.toThrow("Nothing to reset");
    });

    it("should reject if collectPaths rejects", async () => {
      // Arguments
      const root = "root";

      // Create an instance
      const builder = mock.builder();
      const handler = new GeneratorHandler(builder) as any;

      // Mock collectPaths
      const error = new Error("Ops");
      handler.collectPaths = jest.fn(() => Promise.reject(error));

      // Expect reset to resolve
      await expect(handler.reset(root)).rejects.toThrow("Ops");
    });

    it("should reject if collectGenerators rejects", async () => {
      // Arguments
      const root = "root";

      // Create an instance
      const builder = mock.builder();
      const handler = new GeneratorHandler(builder) as any;

      // Mock collectPaths
      const paths = ["root/01_generate_users_table.js"];
      handler.collectPaths = jest.fn(() => Promise.resolve(paths));

      // Mock collectPaths
      const error = new Error("Ops");
      handler.collectPaths = jest.fn(() => Promise.reject(error));

      // Expect reset to resolve
      await expect(handler.reset(root)).rejects.toThrow("Ops");
    });
  });
});
