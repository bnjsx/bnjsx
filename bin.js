#!/usr/bin/env node

const { execute } = require("./dist/cli/Executor");
const { Command } = require("./dist/cli/Command");

execute()
  .then(() => process.exit()) // Stop the process
  .catch((error) => Command.error(error.message));
