require("./setupBase");

process.env.CODEMM_DB_PATH = process.env.CODEMM_DB_PATH || ":memory:";

const { initializeDatabase } = require("../../src/database");

initializeDatabase();

