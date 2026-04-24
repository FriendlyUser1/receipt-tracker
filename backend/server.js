const express = require("express");
const cors = require("cors");
const db = require("./database/db");

const app = express();
app.use(cors());
app.use(express.json());

// GET /api/items - return unique items with latest price for autocomplete
app.get("/api/items", (req, res) => {
	db.all(
		`SELECT i.item_name, i.item_price
		 FROM items i
		 WHERE i.id = (
		 	SELECT i2.id
		 	FROM items i2
		 	WHERE i2.item_name = i.item_name
		 	ORDER BY i2.id DESC
		 	LIMIT 1
		 )
		 ORDER BY i.item_name ASC`,
		[],
		(err, rows) => {
			if (err) return res.status(500).json({ error: err.message });
			const items = rows.map((row) => ({
				name: row.item_name,
				price: row.item_price,
			}));
			res.json({ items });
		},
	);
});

// GET /api/monthly?m=MM&y=YYYY - return total spend for a given month and year
app.get("/api/monthly", (req, res) => {
	const { m, y } = req.query;

	if (!m) {
		return res
			.status(400)
			.json({ error: "Query parameter 'm' is required (01-12)." });
	}

	if (!y) {
		return res
			.status(400)
			.json({ error: "Query parameter 'y' is required (YYYY)." });
	}

	const monthNumber = Number.parseInt(m, 10);
	if (Number.isNaN(monthNumber) || monthNumber < 1 || monthNumber > 12) {
		return res
			.status(400)
			.json({ error: "Invalid month. Use a value from 01 to 12." });
	}

	if (!/^\d{4}$/.test(String(y))) {
		return res.status(400).json({ error: "Invalid year. Use YYYY format." });
	}

	const month = String(monthNumber).padStart(2, "0");
	const year = String(y);

	db.get(
		"SELECT COALESCE(SUM(total_amount), 0) AS total_spend FROM receipts WHERE strftime('%m', date) = ? AND strftime('%Y', date) = ?",
		[month, year],
		(err, row) => {
			if (err) return res.status(500).json({ error: err.message });

			res.json({ month, year, total_spend: row.total_spend });
		},
	);
});

app.post("/api/receipts", (req, res) => {
	const { date, total_amount, items } = req.body;

	db.run(
		"INSERT INTO receipts (date, total_amount) VALUES (?, ?)",
		[date, total_amount],
		function (err) {
			if (err) return res.status(500).json({ error: err.message });

			const receiptId = this.lastID;

			const itemStmt = db.prepare(
				"INSERT INTO items (receipt_id, item_name, item_price) VALUES (?, ?, ?)",
			);
			items.forEach(({ name, price }) => {
				itemStmt.run(receiptId, name, price);
			});
			itemStmt.finalize();

			res.status(201).send({ message: "Receipt added successfully" });
		},
	);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
	console.log(`Server running on http://localhost:${PORT}`),
);
