const sqlite3 = require("sqlite3").verbose();
const path = require("path");

require("dotenv").config({ path: path.resolve(__dirname, "..", ".env") });

const dbPath = process.env.DB_PATH
	? path.isAbsolute(process.env.DB_PATH)
		? process.env.DB_PATH
		: path.resolve(__dirname, "..", process.env.DB_PATH)
	: path.join(__dirname, "receipts.db");

const db = new sqlite3.Database(dbPath, (err) => {
	if (err) {
		console.error("Error opening database:", err.message);
	} else {
		console.log("Connected to SQLite database.");
	}
});

module.exports = db;
