import "./AddReceipt.css";

import React, { useEffect, useRef, useState } from "react";

import axios from "axios";

const AddReceipt = () => {
	const [date, setDate] = useState("");
	const [total, setTotal] = useState("");
	const [items, setItems] = useState([{ name: "", price: "" }]);
	const [availableItems, setAvailableItems] = useState([]);
	const [suggestions, setSuggestions] = useState({});
	const [showSuggestions, setShowSuggestions] = useState({});
	const [highlightedSuggestionIndex, setHighlightedSuggestionIndex] = useState(
		{},
	);
	const [bulkRowCount, setBulkRowCount] = useState("");
	const importInputRef = useRef(null);

	const parsePoundsToPence = (value) => {
		if (value === "" || value === null || value === undefined) return null;

		const numericValue = Number(value);
		if (Number.isNaN(numericValue)) return null;

		return Math.round(numericValue * 100);
	};

	const formatPenceToPounds = (pence) => {
		const numericPence = Number(pence);
		if (Number.isNaN(numericPence)) return "";
		return (numericPence / 100).toFixed(2);
	};

	const normalizeImportedDate = (value) => {
		if (typeof value !== "string") return "";

		const trimmed = value.trim();
		if (!trimmed) return "";

		if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
			return trimmed;
		}

		const slashParts = trimmed.split("/");
		if (slashParts.length === 3) {
			const [day, month, year] = slashParts;
			if (
				/^\d{1,2}$/.test(day) &&
				/^\d{1,2}$/.test(month) &&
				/^\d{4}$/.test(year)
			) {
				const paddedDay = day.padStart(2, "0");
				const paddedMonth = month.padStart(2, "0");
				return `${year}-${paddedMonth}-${paddedDay}`;
			}
		}

		return "";
	};

	const normalizeImportedItems = (importedItems) => {
		if (!Array.isArray(importedItems)) return null;

		const normalized = [];
		for (const entry of importedItems) {
			if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
				return null;
			}

			if (typeof entry.name === "string") {
				const price = entry.price;
				const numericPrice = Number(price);
				if (!Number.isFinite(numericPrice)) {
					return null;
				}

				normalized.push({
					name: entry.name,
					price: numericPrice.toFixed(2),
				});
				continue;
			}

			const keys = Object.keys(entry);
			if (keys.length !== 1) {
				return null;
			}

			const itemName = keys[0];
			const itemPrice = entry[itemName];
			const numericPrice = Number(itemPrice);
			if (!itemName || !Number.isFinite(numericPrice)) {
				return null;
			}

			normalized.push({
				name: itemName,
				price: numericPrice.toFixed(2),
			});
		}

		return normalized;
	};

	const handleImportClick = () => {
		if (importInputRef.current) {
			importInputRef.current.value = "";
			importInputRef.current.click();
		}
	};

	const handleImportReceipt = async (e) => {
		const file = e.target.files?.[0];
		if (!file) return;

		try {
			const fileText = await file.text();
			const payload = JSON.parse(fileText);

			if (!payload || typeof payload !== "object") {
				alert("Invalid JSON structure. Expected an object.");
				return;
			}

			const importedDate = normalizeImportedDate(payload.date);
			if (!importedDate) {
				alert("Invalid date. Use YYYY-MM-DD or DD/MM/YYYY.");
				return;
			}

			const importedTotal = Number(payload.total);
			if (!Number.isFinite(importedTotal) || importedTotal < 0) {
				alert("Invalid total. Expected a non-negative number.");
				return;
			}

			const importedItems = normalizeImportedItems(payload.items);
			if (!importedItems || importedItems.length === 0) {
				alert(
					'Invalid items array. Expected at least one item in {name, price} or {"Item Name": price} format.',
				);
				return;
			}

			setDate(importedDate);
			setTotal(importedTotal.toFixed(2));
			setItems(importedItems);
			setSuggestions({});
			setShowSuggestions({});
			setHighlightedSuggestionIndex({});
			alert("Receipt imported successfully.");
		} catch (error) {
			console.error("Failed to import receipt JSON:", error);
			alert("Could not import JSON file. Please check the file format.");
		}
	};

	// Fetch available items for autocomplete
	useEffect(() => {
		const fetchItems = async () => {
			try {
				const response = await axios.get(`/api/items`);
				const normalizedItems = (response.data.items || [])
					.map((item) => {
						if (typeof item === "string") {
							return { name: item, price: "" };
						}

						if (item && typeof item.name === "string") {
							return { name: item.name, price: item.price ?? "" };
						}

						return null;
					})
					.filter(Boolean);

				setAvailableItems(normalizedItems);
			} catch (error) {
				console.error(
					"Failed to fetch items:",
					error.response?.data?.message || error,
				);
			}
		};
		fetchItems();
	}, []);

	// Handle changing item fields
	const updateSuggestionsForIndex = (index, value) => {
		if (value.length > 0) {
			const searchTerm = value.toLowerCase();
			const filtered = availableItems.filter((item) => {
				const itemName = typeof item?.name === "string" ? item.name : "";
				return itemName.toLowerCase().includes(searchTerm);
			});
			setSuggestions((prev) => ({ ...prev, [index]: filtered }));
			setShowSuggestions((prev) => ({ ...prev, [index]: filtered.length > 0 }));
			setHighlightedSuggestionIndex((prev) => ({ ...prev, [index]: 0 }));
		} else {
			setSuggestions((prev) => ({ ...prev, [index]: [] }));
			setShowSuggestions((prev) => ({ ...prev, [index]: false }));
			setHighlightedSuggestionIndex((prev) => ({ ...prev, [index]: 0 }));
		}
	};

	const handleItemChange = (index, key, value) => {
		const newItems = [...items];
		newItems[index][key] = value;
		setItems(newItems);

		// Handle autocomplete for item names
		if (key === "name") {
			updateSuggestionsForIndex(index, value);
		}
	};

	// Handle selecting a suggestion
	const handleSuggestionClick = (index, suggestion) => {
		const newItems = [...items];
		const selectedName =
			typeof suggestion === "string" ? suggestion : suggestion?.name || "";
		const selectedPrice =
			typeof suggestion === "string" ? "" : (suggestion?.price ?? "");

		newItems[index].name = selectedName;
		newItems[index].price =
			selectedPrice === "" ? "" : formatPenceToPounds(selectedPrice);
		setItems(newItems);
		setShowSuggestions((prev) => ({ ...prev, [index]: false }));
	};

	const handleItemNameKeyDown = (index, e) => {
		const itemSuggestions = suggestions[index] || [];
		if (!itemSuggestions.length) {
			return;
		}

		if (e.key === "ArrowDown") {
			e.preventDefault();
			setShowSuggestions((prev) => ({ ...prev, [index]: true }));
			setHighlightedSuggestionIndex((prev) => {
				const current = prev[index] ?? -1;
				const next = (current + 1) % itemSuggestions.length;
				return { ...prev, [index]: next };
			});
		}

		if (e.key === "ArrowUp") {
			e.preventDefault();
			setShowSuggestions((prev) => ({ ...prev, [index]: true }));
			setHighlightedSuggestionIndex((prev) => {
				const current = prev[index] ?? 0;
				const next =
					(current - 1 + itemSuggestions.length) % itemSuggestions.length;
				return { ...prev, [index]: next };
			});
		}

		if (e.key === "Enter" && showSuggestions[index]) {
			e.preventDefault();
			const selectedIndex = highlightedSuggestionIndex[index] ?? 0;
			const selected = itemSuggestions[selectedIndex];
			if (selected) {
				handleSuggestionClick(index, selected);
			}
		}
	};

	const handleBulkCreateRows = () => {
		const count = parseInt(bulkRowCount, 10);
		if (!Number.isInteger(count) || count < 1) {
			alert("Please enter a whole number greater than 0.");
			return;
		}

		setItems(Array.from({ length: count }, () => ({ name: "", price: "" })));
		setSuggestions({});
		setShowSuggestions({});
		setHighlightedSuggestionIndex({});
	};

	// Add a new blank item row
	const addItem = () => setItems([...items, { name: "", price: "" }]);

	// Remove an item row
	const removeItem = (index) => {
		const newItems = items.filter((_, i) => i !== index);
		setItems(newItems);
	};

	// Verify that item prices sum equals total amount
	const verifyTotal = () => {
		const itemsSumPence = items.reduce((sum, item) => {
			const pricePence = parsePoundsToPence(item.price);
			return sum + (pricePence ?? 0);
		}, 0);
		const totalAmountPence = parsePoundsToPence(total) ?? 0;
		const differencePence = Math.abs(itemsSumPence - totalAmountPence);

		const itemsSum = itemsSumPence / 100;
		const totalAmount = totalAmountPence / 100;
		const difference = differencePence / 100;

		if (differencePence === 0) {
			alert(
				`✅ Total verified! Items sum: £${itemsSum.toFixed(
					2,
				)} matches total amount: £${totalAmount.toFixed(2)}`,
			);
		} else {
			alert(
				`❌ Total mismatch! Items sum: £${itemsSum.toFixed(
					2,
				)} vs Total amount: £${totalAmount.toFixed(
					2,
				)} (Difference: £${difference.toFixed(2)})`,
			);
		}
	};

	// Submit the form
	const handleSubmit = async (e) => {
		e.preventDefault();
		const totalPence = parsePoundsToPence(total);
		if (totalPence === null || totalPence < 0) {
			alert("Please enter a valid non-negative total amount.");
			return;
		}

		const normalizedItems = [];
		for (const item of items) {
			const pricePence = parsePoundsToPence(item.price);
			if (pricePence === null) {
				alert("Please enter valid item prices.");
				return;
			}

			normalizedItems.push({
				name: item.name,
				price: pricePence,
			});
		}

		try {
			const postResponse = await axios.post(`/api/receipts`, {
				date,
				total_amount: totalPence,
				items: normalizedItems,
			});

			alert(postResponse.data.message);
			setDate("");
			setTotal("");
			setItems([{ name: "", price: "" }]);
		} catch (error) {
			console.error(error.response?.data?.message || error);
			alert("Error submitting receipt.");
		}
	};

	return (
		<div className="add-receipt-container">
			<h1 className="add-receipt-header">Add Receipt</h1>
			<div className="add-receipt-form-group">
				<button
					type="button"
					className="add-receipt-add-button"
					onClick={handleImportClick}
				>
					Import Receipt JSON
				</button>
				<input
					ref={importInputRef}
					type="file"
					accept="application/json,.json"
					onChange={handleImportReceipt}
					style={{ display: "none" }}
				/>
			</div>
			<form onSubmit={handleSubmit}>
				{/* Date Input */}
				<div className="add-receipt-form-group">
					<label className="add-receipt-label" htmlFor="date">
						Date:
					</label>
					<input
						type="date"
						id="date"
						className="add-receipt-input"
						value={date}
						onChange={(e) => setDate(e.target.value)}
						required
					/>
				</div>

				{/* Total Amount Input */}
				<div className="add-receipt-form-group">
					<label className="add-receipt-label" htmlFor="total">
						Total Amount:
					</label>
					<input
						type="number"
						id="total"
						step="0.01"
						className="add-receipt-input"
						value={total}
						onChange={(e) => setTotal(e.target.value)}
						required
					/>
				</div>

				{/* Items Section */}
				<div className="add-receipt-items-container">
					<h2>Items</h2>
					<div className="add-receipt-bulk-row-controls">
						<input
							type="number"
							min="1"
							placeholder="Number of rows"
							className="add-receipt-bulk-row-input"
							value={bulkRowCount}
							onChange={(e) => setBulkRowCount(e.target.value)}
						/>
						<button
							type="button"
							className="add-receipt-bulk-create-button"
							onClick={handleBulkCreateRows}
						>
							Create Rows
						</button>
					</div>
					{items.map((item, index) => (
						<div key={index} className="add-receipt-item-row">
							<div className="add-receipt-autocomplete-container">
								<input
									type="text"
									placeholder="Item Name"
									className="add-receipt-item-input"
									value={item.name}
									onChange={(e) =>
										handleItemChange(index, "name", e.target.value)
									}
									onFocus={(e) =>
										updateSuggestionsForIndex(index, e.target.value)
									}
									onKeyDown={(e) => handleItemNameKeyDown(index, e)}
									onBlur={() => {
										// Delay hiding suggestions to allow click events
										setTimeout(() => {
											setShowSuggestions((prev) => ({
												...prev,
												[index]: false,
											}));
										}, 150);
									}}
									required
								/>
								{showSuggestions[index] &&
									suggestions[index] &&
									suggestions[index].length > 0 && (
										<div className="add-receipt-suggestions-list">
											{suggestions[index].map((suggestion, suggestionIndex) => (
												<div
													key={suggestionIndex}
													className={`add-receipt-suggestion-item ${
														highlightedSuggestionIndex[index] ===
														suggestionIndex
															? "add-receipt-highlighted-suggestion-item"
															: ""
													}`}
													onClick={() =>
														handleSuggestionClick(index, suggestion)
													}
													onMouseEnter={() =>
														setHighlightedSuggestionIndex((prev) => ({
															...prev,
															[index]: suggestionIndex,
														}))
													}
												>
													{suggestion?.name || ""}
													<span className="add-receipt-suggestion-price">
														{suggestion?.price !== "" &&
														suggestion?.price !== null
															? `£${formatPenceToPounds(suggestion.price)}`
															: ""}
													</span>
												</div>
											))}
										</div>
									)}
							</div>
							<input
								type="number"
								placeholder="Item Price"
								className="add-receipt-item-input"
								step="0.01"
								value={item.price}
								onChange={(e) =>
									handleItemChange(index, "price", e.target.value)
								}
								required
							/>
							<button
								type="button"
								className="add-receipt-remove-button"
								onClick={() => removeItem(index)}
							>
								Remove
							</button>
						</div>
					))}
					<button
						type="button"
						className="add-receipt-add-button"
						onClick={addItem}
					>
						Add Item
					</button>
				</div>
				{/* Verify Total Button */}
				<button
					type="button"
					className="add-receipt-verify-button"
					onClick={verifyTotal}
				>
					Verify Total
				</button>
				{/* Submit Button */}
				<button type="submit" className="add-receipt-submit-button">
					Submit Receipt
				</button>
			</form>
		</div>
	);
};

export default AddReceipt;
