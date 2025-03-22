const { Cluster, ClusterPool } = require("./dist/core/modules/Cluster");
const { SQLite } = require("./dist/core/modules/SQLite");
const { UTC } = require("./dist/helpers/modules/UTC");

/** @type {import('bnjsx').AppOptions} */
module.exports = {
  env: "dev",
  mode: "web",
  host: "localhost",
  port: 3030,
  protocol: "http",
  key: undefined,
  cert: undefined,
  cache: false,
  default: "sqlite",
  public: {
    root: "./public",
  },
  cluster: new Cluster(
    new ClusterPool("sqlite", new SQLite("./database.sqlite"))
  ),
  cors: { origin: "*" },
  security: { contentSecurityPolicy: false },
  paths: { views: "./views" },
  typescript: { enabled: true },
  globals: { app_name: "bnjsx" },
  tools: { year: UTC.get.year, env: () => module.exports.env },
};
