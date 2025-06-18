# Changelog

All notable changes to this project will be documented in this file.

## **Bnjsx@1.1.1 - 2025-06-18**

### Added

- **New `unique(...columns)` method** added to the Generator.
  Use this to define **composite UNIQUE constraints** when generating tables — helpful for ensuring that a combination of columns (like `user_id` + `comment_id`) is unique, not just a single column.

  ```ts
  this.unique('user_id', 'comment_id');
  ```

  Useful in tables like `comment_reports`, where you want to prevent the same user from reporting the same comment multiple times.

## **Bnjsx@1.1.0 - 2025-06-14**

### Added

- New `builder.upsert()` method added alongside `insert`, `update`, `delete`, and `select` for powerful UPSERT (insert or update) operations.

  ```ts
  // If the username exists, update the age
  // If it does not exist, insert the new row
  builder
    .upsert()
    .from('users')
    .row({ username: 'simon', age: 19 })
    .conflict('username')
    .set('age');

  // If the username exists, do nothing
  // If it does not exist, insert the new row
  builder
    .upsert()
    .from('users')
    .row({ username: 'simon', age: 19 })
    .conflict('username');

  // Bulk upsert: insert or update multiple rows by username
  builder
    .upsert()
    .from('users')
    .rows([
      { username: 'simon', age: 19 },
      { username: 'james', age: 44 },
    ])
    .conflict('username')
    .set('age');
  ```

- `select()` method now accepts columns as arguments for simpler syntax:

  ```ts
  builder.select('username', 'email').from('users').limit(10).exec();
  ```

  This is in addition to the previous `.col()` method! use whichever you prefer.

- New `.random()` method on the Select builder to order query results randomly, ideal for fetching random rows (e.g., random user, avatar, banner):

  ```ts
  builder.select().from('avatars').random().limit(1).first();
  ```

### Fixed

- Improved `bugger()` error logging to use `error.constructor.name` for better error type display. Custom errors now show their proper class names (e.g., `QueryError`, `ConnectionError`) instead of the generic `Error`.

## **Bnjsx@1.0.8 - 2025-06-05**

### Added

- `Selector.first()` method to easily retrieve the first model instance from a query result.
- Recommended for use with queries where the result is guaranteed to be unique (e.g., by `id`, `email`, or `slug`).

## **Bnjsx@1.0.7 - 2025-05-19**

### **Fixed**

- **Nested `$render()` / `$replace()` Support**
  - Fixed an issue where **nested `$render()` and `$replace()` calls would throw an error**:
    > Unexpected `$replace` tag found in `watch.fx` at line 109
  - You can now safely nest any number of `$render()` and `$replace()` calls within component templates.
  - Example (now valid):
    ```
    $render('layout');
      $replace('body');
        $render('greeting');
          $replace('name');
            'simon';
          $endreplace;
        $endrender;
      $endreplace;
    $endrender;
    ```

## **Bnjsx@1.0.6 - 2025-03-29**

### **Changed**

- **App is now a Singleton**
  - Previously, users could create multiple `App` instances, but **Bnjsx now enforces a single app instance per project**.
  - All configurations, and settings are now **centralized in `bnjsx.config.js`**.
  - If you need multiple apps, simply create separate Bnjsx projects.

### **Added**

- **Improved Error Handling & Debugging**
  - Introduced helper functions to **display errors and messages more cleanly in development mode**.

## Bnjsx@1.0.5 - 2025-03-27

### Added

- **Custom Validation Support**  
  You can now define custom validation rules for every form field.

  ```js
  const auth = Auth.break({ mailer });

  // Ensure password & confirmation match in `register` form
  auth.validation.register.confirmation = {
    test: (value, body) => value === body.password,
    message: 'Passwords do not match',
  };
  ```

- **Flexible Validation Control**
  - Disable validation for all forms:
    ```js
    auth.validation = {};
    ```
  - Disable validation for a specific form:
    ```js
    auth.validation.login = undefined;
    ```
  - Remove validation for a single field:
    ```js
    auth.validation.register.terms = undefined;
    ```

## Bnjsx@1.0.4 - 2025-03-26

### Added

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

### Changed

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
