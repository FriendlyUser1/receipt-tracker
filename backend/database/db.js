const { DatabaseSync } = require("node:sqlite");
const path = require("node:path");

require("dotenv").config({ path: path.resolve(__dirname, "..", ".env") });

const dbPath = process.env.DB_PATH
	? path.isAbsolute(process.env.DB_PATH)
		? process.env.DB_PATH
		: path.resolve(__dirname, "..", process.env.DB_PATH)
	: path.join(__dirname, "receipts.db");

const db = new DatabaseSync(dbPath);

module.exports = db;
