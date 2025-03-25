# Changelog

All notable changes to this project will be documented in this file.

## Bnjsx@1.0.4 - 2025-03-26

### **Added**

- **Vite Integration for Better Development Experience**  
  Introduced seamless Vite support with automatic asset handling for both development and production environments.

#### **Setup Instructions**

1. Import and register vite in your `bnjsx.config.js`:

```js
const { vite } = require('bnjsx');

module.exports = {
  tools: { vite }, // Register Vite tool
};
```

2. Use it in your templates:

```html
<!DOCTYPE html>
<html>
  <head>
    <!-- Automatic asset injection -->
    $(@vite('/assets/css/style.css', '/assets/ts/app.ts'))
  </head>
  <body>
    $place('body')
  </body>
</html>
```

## Bnjsx@1.0.3 - 2025-03-25

### **Changed**

- **Replaced `sqlite3` with `better-sqlite3`**

  - `sqlite3` had build issues and too many deprecation warnings during installation.
  - `better-sqlite3` is actively maintained and provides a more reliable experience.

- **Replaced `bcrypt` with `bcryptjs`**
  - `bcrypt` had build issues and hasn't been updated in over two years.
  - Switching to `bcryptjs` ensures compatibility without build problems.

These changes improve installation stability and reduce potential headaches for **BNJSX** users.

## Bnjsx@1.0.2 - 2025-03-21

### Changed

- **Updated command naming conventions** for better readability and efficiency.

  - Previously, commands used `add:*` and `remove:*`.
  - Now, they follow a **shorter and more intuitive format** using `mk:*` for creation and `rm:*` for removal.
  - Example changes:
    - `add:cmd` → `mk:cmd`
    - `add:model` → `mk:model`
    - `add:generator` → `mk:gen`
    - `remove:cmd` → `rm:cmd`
    - `remove:model` → `rm:model`
    - `remove:generator` → `rm:gen`

### Added

- **New version shortcut**: You can now use `bnjsx -v`to quickly output the bnjsx version instead of typing `bnjsx version`.

- **Introduced exec** as an alternative command entry point:
  - You can now use `exec` to run `bnjsx` commands, making it even more flexible.
  - Example usage: `exec mk:model users` (equivalent to `bnjsx mk:model users`).

### Fixed

- **Enhanced `rm` commands (`bnjsx rm:gen users`, etc.) to handle missing files more gracefully.**

  - Previously, if any target file was missing, the command would **immediately stop execution**.
  - Now, the command will attempt to remove **all matching files** (e.g., in both `src/` and `dist/` when using TypeScript).
  - If a file is missing, it will **notify you** but continue removing the remaining files instead of failing early.

- **Fixed a `Cluster` instance validation issue** that caused the error:  
  _"Invalid cluster: Expected a 'Cluster' instance but received object."_
  - This occurred when running a **globally installed `bnjsx`** while using a **locally installed version**, leading to instance validation conflicts.
  - The fix ensures that the `config` module correctly handles clusters from **both local and global installations**, improving compatibility.

## Bnjsx@1.0.1 - 2025-03-21

### Fixed

- **Resolved a `Template` issue** where accessing tool return values in a condition would throw an error.
  - Example (previously broken): `$if(@getUser().name == 'simon') $('Greet simon!') $endif`
  - This syntax is now **fully supported**.

## Bnjsx@1.0.0 - 2025-03-07

- **Initial release of `bnjsx`**.
