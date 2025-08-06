# Bnjsx v2.0.0 is Here

**Bnjsx** has officially hit **version 2.0.0** — and it’s not just an upgrade, it’s a complete evolution.

This release introduces a powerful new architecture built around **Services** — giving you full control, better structure, and less boilerplate. Whether you're building small apps or complex systems, Bnjsx v2 gives you everything in one place.

---

## What’s New in Version 2

Bnjsx is no longer just a lightweight framework — it's now a **full-stack powerhouse** for Node.js.

In version 2, we introduce the **Service Architecture**, where each service is an isolated unit that gives you access to:

- Routing
- Database queries
- Caching
- Validation
- View rendering
- and much more...

### Service-Driven Development

Traditionally, you'd write **3 separate files** for every feature:

```
model + controller + router → 3 files
```

With **Bnjsx services**, it's all in **1 file**:

```
service = model + controller + router
```

You can now build features like this:

- `AuthService`
- `PostService`
- `UserService`

Each service combines routes, logic, database, and responses in one file, with no code splitting across files.

> On a project with 30 tables, you'd normally have **90+ files** (models, controllers, routers).
> With Bnjsx services, you only need **30 clean, focused service files**.

---

## Documentation

Docs for **version 2** are currently in progress — but you can dive into the [version 1 docs](https://github.com/bnjsx/docs) to get familiar with the core concepts.

> By the time you’re done reading, version 2 docs might already be live — so go take a look!

---

## Installation

Install the latest `bnjsx` version:

```bash
npm i bnjsx@latest
```

Or install the most stable v1 release:

```bash
npm i bnjsx@1.1.2
```

---

## bnjet – Project Scaffolding

Create full Bnjsx projects in seconds:

```bash
npm i -g bnjet
bnjet new my-app -ts      # or -js / -react / -vue (coming soon)
```

Built-in support for Vite, Tailwind, CLI, and Jest.

---

## Flexer – VS Code Extension

Flexer adds syntax highlighting, auto-completion, and formatting for `.fx` (Flex) templates.

Install from VS Code Marketplace:
**Extensions → Search "Flexer" → Install**

---

## Contributing

Thank you for your interest in contributing!
Please check out the [contributing guidelines](CONTRIBUTING.md) before submitting issues or pull requests.

---

## License

Bnjsx is open-source software licensed under the MIT License.
See the [LICENSE](LICENSE.md) file for full details.
