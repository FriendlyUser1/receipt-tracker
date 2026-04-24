import "./AddReceipt.css";

import React, { useEffect, useState } from "react";

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

	// Fetch available items for autocomplete
	useEffect(() => {
		const fetchItems = async () => {
			try {
				const response = await axios.get("http://localhost:5000/api/items");
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
			} catch (err) {
				console.error("Failed to fetch items:", err);
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
			await axios.post("http://localhost:5000/api/receipts", {
				date,
				total_amount: totalPence,
				items: normalizedItems,
			});
			alert("Receipt added successfully!");
			setDate("");
			setTotal("");
			setItems([{ name: "", price: "" }]);
		} catch (err) {
			console.error(err);
			alert("Error submitting receipt.");
		}
	};

	return (
		<div className="add-receipt-container">
			<h1 className="add-receipt-header">Add Receipt</h1>
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
