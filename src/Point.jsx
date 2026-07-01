import React, { useState, useMemo } from "react";
import "./point.css";
import burgerImg from "./assets/burger.jpg";
import friesImg from "./assets/Fries.png";
import sodaImg from "./assets/soda.png";
import iceCreamImg from "./assets/iceream.png";

const ITEM_CATEGORIES = ["Food", "Drinks", "Dessert", "Other"];
const CATEGORY_FILTERS = ["All", ...ITEM_CATEGORIES];

const INITIAL_MENU_ITEMS = [
  { id: 1, name: "Burger", price: 5.0, image: burgerImg, category: "Food" },
  { id: 2, name: "Fries", price: 3.0, image: friesImg, category: "Food" },
  { id: 3, name: "Soda", price: 1.5, image: sodaImg, category: "Drinks" },
  { id: 4, name: "Ice Cream", price: 4.0, image: iceCreamImg, category: "Dessert" },
];

const INITIAL_TABLE_COUNT = 4;
const MAX_TABLES = 12;

const TAX_RATE = 0.0; // e.g. 0.05 for 5% tax
const DISCOUNT = 0; // flat discount in dollars

const MERCHANTS = {
  edahab: {
    label: "E-Dahab Merchant",
    name: "ABC Cafeteria",
    number: "25261XXXXXXX",
    instructions: "Customer sends payment to the merchant account.",
  },
  sahal: {
    label: "Sahal Merchant",
    name: "ABC Cafeteria",
    number: "25263XXXXXXX",
    instructions: "Customer sends payment using Sahal Merchant.",
  },
};

const PLACEHOLDER_IMAGE =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><rect width='100' height='100' fill='%23ececf2'/><text x='50' y='55' font-size='13' text-anchor='middle' fill='%239a9aac' font-family='sans-serif'>No image</text></svg>`
  );

const MAX_IMAGE_SIZE_BYTES = 4 * 1024 * 1024; // 4MB

function currency(n) {
  return `$${n.toFixed(2)}`;
}

function makeInitialTables() {
  return Array.from({ length: INITIAL_TABLE_COUNT }, (_, i) => ({
    id: i + 1,
    number: i + 1,
    order: [],
  }));
}

function point() {
  const [menuItems, setMenuItems] = useState(INITIAL_MENU_ITEMS);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [view, setView] = useState("order"); // "order" | "payment" | "success"

  // Multiple tables: each table keeps its own order
  const [tables, setTables] = useState(makeInitialTables);
  const [activeTableId, setActiveTableId] = useState(1);

  // Add-item form state
  const [newItemName, setNewItemName] = useState("");
  const [newItemPrice, setNewItemPrice] = useState("");
  const [newItemCategory, setNewItemCategory] = useState(ITEM_CATEGORIES[0]);
  const [newItemImage, setNewItemImage] = useState(null);
  const [newItemErrors, setNewItemErrors] = useState({}); // { name, price, image }
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const [justAddedItem, setJustAddedItem] = useState(false);

  // Payment state
  const [method, setMethod] = useState("cash");
  const [amountReceived, setAmountReceived] = useState("");
  const [merchantConfirmed, setMerchantConfirmed] = useState({ edahab: false, sahal: false });
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState(null);

  const activeTable = tables.find((t) => t.id === activeTableId) || tables[0];
  const order = activeTable.order;

  const visibleMenuItems = useMemo(
    () =>
      selectedCategory === "All"
        ? menuItems
        : menuItems.filter((item) => item.category === selectedCategory),
    [menuItems, selectedCategory]
  );

  const subtotal = useMemo(
    () => order.reduce((sum, item) => sum + item.qty * item.price, 0),
    [order]
  );
  const tax = subtotal * TAX_RATE;
  const discount = order.length ? DISCOUNT : 0;
  const grandTotal = Math.max(subtotal + tax - discount, 0);

  const received = parseFloat(amountReceived) || 0;
  const change = received - grandTotal;

  const canComplete = useMemo(() => {
    if (order.length === 0) return false;
    if (method === "cash") return received >= grandTotal && grandTotal > 0;
    if (method === "edahab") return merchantConfirmed.edahab;
    if (method === "sahal") return merchantConfirmed.sahal;
    return false;
  }, [order, method, received, grandTotal, merchantConfirmed]);

  // --- Table helpers ---
  function updateActiveTableOrder(updater) {
    setTables((prev) =>
      prev.map((t) => (t.id === activeTableId ? { ...t, order: updater(t.order) } : t))
    );
  }

  function handleSelectTable(id) {
    setError("");
    setActiveTableId(id);
  }

  function handleAddTable() {
    if (tables.length >= MAX_TABLES) return;
    const nextNumber = tables.length ? Math.max(...tables.map((t) => t.number)) + 1 : 1;
    const newTable = { id: Date.now(), number: nextNumber, order: [] };
    setTables((prev) => [...prev, newTable]);
    setActiveTableId(newTable.id);
  }

  function handleRemoveTable(id) {
    if (tables.length <= 1) return;
    const target = tables.find((t) => t.id === id);
    if (!target || target.order.length > 0) return;
    const remaining = tables.filter((t) => t.id !== id);
    setTables(remaining);
    if (activeTableId === id) {
      setActiveTableId(remaining[0].id);
    }
  }

  // --- Order screen handlers ---
  function handleAddToOrder(item) {
    updateActiveTableOrder((prev) => {
      const existing = prev.find((o) => o.id === item.id);
      if (existing) {
        return prev.map((o) => (o.id === item.id ? { ...o, qty: o.qty + 1 } : o));
      }
      return [...prev, { ...item, qty: 1 }];
    });
  }

  function processNewItemImageFile(file) {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setNewItemErrors((prev) => ({ ...prev, image: "Choose an image file (PNG or JPG)." }));
      return;
    }
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setNewItemErrors((prev) => ({ ...prev, image: "Image must be smaller than 4MB." }));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setNewItemImage(reader.result);
    reader.onerror = () =>
      setNewItemErrors((prev) => ({ ...prev, image: "Couldn't read that file. Try another image." }));
    reader.readAsDataURL(file);
    setNewItemErrors((prev) => ({ ...prev, image: undefined }));
  }

  function handleNewItemImageChange(e) {
    const file = e.target.files && e.target.files[0];
    processNewItemImageFile(file);
    e.target.value = ""; // allow re-selecting the same file later
  }

  function handleImageDragOver(e) {
    e.preventDefault();
    setIsDraggingImage(true);
  }

  function handleImageDragLeave() {
    setIsDraggingImage(false);
  }

  function handleImageDrop(e) {
    e.preventDefault();
    setIsDraggingImage(false);
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    processNewItemImageFile(file);
  }

  function handleRemoveNewItemImage(e) {
    e.preventDefault();
    e.stopPropagation();
    setNewItemImage(null);
  }

  function handleNewItemNameChange(e) {
    setNewItemName(e.target.value);
    if (newItemErrors.name) setNewItemErrors((prev) => ({ ...prev, name: undefined }));
  }

  function handleNewItemPriceChange(e) {
    setNewItemPrice(e.target.value);
    if (newItemErrors.price) setNewItemErrors((prev) => ({ ...prev, price: undefined }));
  }

  function handleAddMenuItem(e) {
    e.preventDefault();
    const name = newItemName.trim();
    const price = parseFloat(newItemPrice);

    const errors = {};
    if (!name) errors.name = "Enter an item name.";
    if (newItemPrice.trim() === "" || isNaN(price) || price <= 0) {
      errors.price = "Enter a valid price greater than 0.";
    }

    if (Object.keys(errors).length > 0) {
      setNewItemErrors(errors);
      return;
    }

    const newItem = {
      id: Date.now(),
      name,
      price,
      image: newItemImage || PLACEHOLDER_IMAGE,
      category: newItemCategory,
    };

    setMenuItems((prev) => [...prev, newItem]);
    setNewItemName("");
    setNewItemPrice("");
    setNewItemCategory(ITEM_CATEGORIES[0]);
    setNewItemImage(null);
    setNewItemErrors({});
    setJustAddedItem(true);
    setTimeout(() => setJustAddedItem(false), 2200);
  }

  function handleDeleteMenuItem(id) {
    setMenuItems((prev) => prev.filter((item) => item.id !== id));
  }

  function handleIncrease(id) {
    updateActiveTableOrder((prev) => prev.map((o) => (o.id === id ? { ...o, qty: o.qty + 1 } : o)));
  }

  function handleDecrease(id) {
    updateActiveTableOrder((prev) =>
      prev.map((o) => (o.id === id ? { ...o, qty: o.qty - 1 } : o)).filter((o) => o.qty > 0)
    );
  }

  function handleRemove(id) {
    updateActiveTableOrder((prev) => prev.filter((o) => o.id !== id));
  }

  function handleClearOrder() {
    updateActiveTableOrder(() => []);
  }

  function handleCheckout() {
    if (order.length === 0) return;
    setView("payment");
  }

  // --- Payment screen handlers ---
  function handleSelectMethod(m) {
    setMethod(m);
    setError("");
  }

  function handleConfirmMerchant(key) {
    setMerchantConfirmed((prev) => ({ ...prev, [key]: true }));
  }

  function handleCancelPayment() {
    setAmountReceived("");
    setMethod("cash");
    setMerchantConfirmed({ edahab: false, sahal: false });
    setError("");
    setView("order");
  }

  function handleCompletePayment() {
    if (!canComplete) {
      setError("Payment cannot be completed yet. Check the requirements above.");
      return;
    }
    const newReceipt = {
      id: `RCT-${Date.now().toString().slice(-6)}`,
      date: new Date(),
      tableNumber: activeTable.number,
      items: order,
      subtotal,
      tax,
      discount,
      grandTotal,
      method,
      amountReceived: method === "cash" ? received : grandTotal,
      change: method === "cash" ? change : 0,
    };
    setReceipt(newReceipt);
    updateActiveTableOrder(() => []);
    setAmountReceived("");
    setMerchantConfirmed({ edahab: false, sahal: false });
    setError("");
    setView("success");
  }

  function handleNewOrder() {
    setReceipt(null);
    setMethod("cash");
    setView("order");
  }

  // ---------- SUCCESS VIEW ----------
  if (view === "success" && receipt) {
    return (
      <div className="pos-page">
        <div className="success-screen">
          <div className="card success-card">
            <div className="success-icon">✓</div>
            <h2 className="card-title">Payment Complete</h2>
            <p className="success-sub">Table {receipt.tableNumber} has been paid in full.</p>

            <div className="receipt">
              <div className="receipt-header">
                <span>ABC Cafeteria</span>
                <span className="receipt-id">{receipt.id}</span>
              </div>
              <div className="receipt-meta">
                {receipt.date.toLocaleDateString()} · {receipt.date.toLocaleTimeString()} · Table {receipt.tableNumber}
              </div>
              <div className="receipt-divider" />
              {receipt.items.map((item) => (
                <div className="receipt-row" key={item.id}>
                  <span>
                    {item.name} <span className="receipt-qty">×{item.qty}</span>
                  </span>
                  <span>{currency(item.qty * item.price)}</span>
                </div>
              ))}
              <div className="receipt-divider" />
              <div className="receipt-row">
                <span>Subtotal</span>
                <span>{currency(receipt.subtotal)}</span>
              </div>
              <div className="receipt-row">
                <span>Tax</span>
                <span>{currency(receipt.tax)}</span>
              </div>
              <div className="receipt-row">
                <span>Discount</span>
                <span>-{currency(receipt.discount)}</span>
              </div>
              <div className="receipt-row receipt-total">
                <span>Total</span>
                <span>{currency(receipt.grandTotal)}</span>
              </div>
              <div className="receipt-divider" />
              <div className="receipt-row">
                <span>Paid via</span>
                <span className="receipt-method">
                  {receipt.method === "cash" ? "Cash by Hand" : MERCHANTS[receipt.method].label}
                </span>
              </div>
              {receipt.method === "cash" && (
                <>
                  <div className="receipt-row">
                    <span>Amount Received</span>
                    <span>{currency(receipt.amountReceived)}</span>
                  </div>
                  <div className="receipt-row">
                    <span>Change</span>
                    <span>{currency(receipt.change)}</span>
                  </div>
                </>
              )}
            </div>

            <button className="btn btn-primary btn-block" onClick={handleNewOrder}>
              Back to Tables
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---------- PAYMENT VIEW ----------
  if (view === "payment") {
    return (
      <div className="pos-page">
        <div className="pos-grid pos-grid-single">
          <section className="card payment-card">
            <h2 className="card-title">Payment Method — Table {activeTable.number}</h2>

            <div className="method-list">
              {/* Cash */}
              <label className={`method-option ${method === "cash" ? "method-selected" : ""}`}>
                <input
                  type="radio"
                  name="method"
                  checked={method === "cash"}
                  onChange={() => handleSelectMethod("cash")}
                />
                <div className="method-body">
                  <div className="method-name">Cash by Hand</div>
                  {method === "cash" && (
                    <div className="method-detail">
                      <label className="field-label" htmlFor="amountReceived">
                        Amount Received
                      </label>
                      <input
                        id="amountReceived"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        className="text-input"
                        value={amountReceived}
                        onChange={(e) => setAmountReceived(e.target.value)}
                      />
                      <div className="change-row">
                        <span>Change</span>
                        <span className={change < 0 ? "change-negative" : "change-positive"}>
                          {currency(Math.max(change, 0))}
                        </span>
                      </div>
                      {received > 0 && received < grandTotal && (
                        <p className="field-warning">Amount received is less than the total due.</p>
                      )}
                    </div>
                  )}
                </div>
              </label>

              {/* E-Dahab */}
              <label className={`method-option ${method === "edahab" ? "method-selected" : ""}`}>
                <input
                  type="radio"
                  name="method"
                  checked={method === "edahab"}
                  onChange={() => handleSelectMethod("edahab")}
                />
                <div className="method-body">
                  <div className="method-name">E-Dahab Merchant</div>
                  {method === "edahab" && (
                    <div className="method-detail">
                      <div className="merchant-info">
                        <div>
                          <span className="merchant-label">Merchant Name</span>
                          <span className="merchant-value">{MERCHANTS.edahab.name}</span>
                        </div>
                        <div>
                          <span className="merchant-label">Merchant Number</span>
                          <span className="merchant-value">{MERCHANTS.edahab.number}</span>
                        </div>
                      </div>
                      <p className="instructions">{MERCHANTS.edahab.instructions}</p>
                      <button
                        type="button"
                        className={`btn btn-confirm ${merchantConfirmed.edahab ? "btn-confirmed" : ""}`}
                        onClick={() => handleConfirmMerchant("edahab")}
                      >
                        {merchantConfirmed.edahab ? "Payment Confirmed ✓" : "Confirm Payment"}
                      </button>
                    </div>
                  )}
                </div>
              </label>

              {/* Sahal */}
              <label className={`method-option ${method === "sahal" ? "method-selected" : ""}`}>
                <input
                  type="radio"
                  name="method"
                  checked={method === "sahal"}
                  onChange={() => handleSelectMethod("sahal")}
                />
                <div className="method-body">
                  <div className="method-name">Sahal Merchant</div>
                  {method === "sahal" && (
                    <div className="method-detail">
                      <div className="merchant-info">
                        <div>
                          <span className="merchant-label">Merchant Name</span>
                          <span className="merchant-value">{MERCHANTS.sahal.name}</span>
                        </div>
                        <div>
                          <span className="merchant-label">Merchant Number</span>
                          <span className="merchant-value">{MERCHANTS.sahal.number}</span>
                        </div>
                      </div>
                      <p className="instructions">{MERCHANTS.sahal.instructions}</p>
                      <button
                        type="button"
                        className={`btn btn-confirm ${merchantConfirmed.sahal ? "btn-confirmed" : ""}`}
                        onClick={() => handleConfirmMerchant("sahal")}
                      >
                        {merchantConfirmed.sahal ? "Payment Confirmed ✓" : "Confirm Payment"}
                      </button>
                    </div>
                  )}
                </div>
              </label>
            </div>

            <div className="payment-footer">
              <div className="payment-footer-total">
                <span>Total</span>
                <span>{currency(grandTotal)}</span>
              </div>

              {error && <p className="field-warning footer-warning">{error}</p>}

              <div className="action-buttons">
                <button type="button" className="btn btn-secondary" onClick={handleCancelPayment}>
                  Cancel Payment
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={!canComplete}
                  onClick={handleCompletePayment}
                >
                  Complete Payment
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    );
  }

  // ---------- ORDER VIEW (default) ----------
  return (
    <div className="pos-page">
      <h1 className="page-title">Point of Sale</h1>

      {/* Table switcher */}
      <div className="table-bar">
        <div className="table-tabs">
          {tables.map((t) => {
            const count = t.order.reduce((s, i) => s + i.qty, 0);
            return (
              <button
                key={t.id}
                type="button"
                className={`table-tab ${t.id === activeTableId ? "table-tab-active" : ""}`}
                onClick={() => handleSelectTable(t.id)}
              >
                <span className="table-tab-name">Table {t.number}</span>
                {count > 0 && <span className="table-tab-badge">{count}</span>}
              </button>
            );
          })}
          {tables.length < MAX_TABLES && (
            <button type="button" className="table-tab table-tab-add" onClick={handleAddTable}>
              + Table
            </button>
          )}
        </div>
        {tables.length > 1 && (
          <button
            type="button"
            className="table-remove-btn"
            onClick={() => handleRemoveTable(activeTableId)}
            disabled={order.length > 0}
            title={
              order.length > 0
                ? "Clear this table's order before removing it"
                : `Remove Table ${activeTable.number}`
            }
          >
            Remove Table {activeTable.number}
          </button>
        )}
      </div>

      <div className="pos-grid">
        {/* Menu Items */}
        <section className="card">
          <h2 className="card-title">Menu Items</h2>

          <div className="category-tabs">
            {CATEGORY_FILTERS.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`category-tab ${selectedCategory === cat ? "category-tab-active" : ""}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          <form className="add-item-form" onSubmit={handleAddMenuItem} noValidate>
            <div className="add-item-grid">
              {/* Image upload / drag-and-drop with live preview */}
              <label
                className={[
                  "image-dropzone",
                  isDraggingImage ? "image-dropzone-active" : "",
                  newItemErrors.image ? "image-dropzone-error" : "",
                ].join(" ").trim()}
                onDragOver={handleImageDragOver}
                onDragLeave={handleImageDragLeave}
                onDrop={handleImageDrop}
              >
                {newItemImage ? (
                  <div className="image-dropzone-preview">
                    <img src={newItemImage} alt="New item preview" />
                    <button
                      type="button"
                      className="image-remove-btn"
                      onClick={handleRemoveNewItemImage}
                      aria-label="Remove selected image"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <div className="image-dropzone-empty">
                    <span className="image-dropzone-icon" aria-hidden="true">🖼️</span>
                    <span className="image-dropzone-text">Drag an image here, or click to browse</span>
                    <span className="image-dropzone-hint">PNG or JPG, up to 4MB · optional</span>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="file-input"
                  onChange={handleNewItemImageChange}
                  aria-label="Item image"
                />
              </label>
              {newItemErrors.image && <p className="field-warning">{newItemErrors.image}</p>}

              <div className="add-item-fields">
                <div className="field-group">
                  <label className="field-label" htmlFor="newItemName">
                    Item name
                  </label>
                  <input
                    id="newItemName"
                    type="text"
                    className={`text-input ${newItemErrors.name ? "text-input-error" : ""}`}
                    placeholder="e.g. Cheeseburger"
                    value={newItemName}
                    onChange={handleNewItemNameChange}
                    aria-invalid={!!newItemErrors.name}
                  />
                  {newItemErrors.name && <p className="field-warning">{newItemErrors.name}</p>}
                </div>

                <div className="field-group-row">
                  <div className="field-group">
                    <label className="field-label" htmlFor="newItemPrice">
                      Price
                    </label>
                    <div className="price-input-wrap">
                      <span className="price-input-prefix" aria-hidden="true">$</span>
                      <input
                        id="newItemPrice"
                        type="number"
                        min="0"
                        step="0.01"
                        className={`text-input price-input ${newItemErrors.price ? "text-input-error" : ""}`}
                        placeholder="0.00"
                        value={newItemPrice}
                        onChange={handleNewItemPriceChange}
                        aria-invalid={!!newItemErrors.price}
                      />
                    </div>
                    {newItemErrors.price && <p className="field-warning">{newItemErrors.price}</p>}
                  </div>

                  <div className="field-group">
                    <label className="field-label" htmlFor="newItemCategory">
                      Category
                    </label>
                    <select
                      id="newItemCategory"
                      className="text-input category-select"
                      value={newItemCategory}
                      onChange={(e) => setNewItemCategory(e.target.value)}
                    >
                      {ITEM_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <button type="submit" className="btn btn-primary add-item-btn">
                  + Add Item
                </button>
                {justAddedItem && <p className="field-success">Item added to the menu.</p>}
              </div>
            </div>
          </form>

          <div className="menu-list">
            {visibleMenuItems.length === 0 ? (
              <p className="empty-state">No items in this category yet.</p>
            ) : (
              visibleMenuItems.map((item) => (
                <div className="menu-row" key={item.id}>
                  <div className="menu-info">
                    <img src={item.image} alt={item.name} className="menu-img" />
                    <div className="menu-name-wrap">
                      <span className="menu-name">
                        {item.name} — {currency(item.price)}
                      </span>
                      <span className="menu-category-tag">{item.category}</span>
                    </div>
                  </div>
                  <div className="menu-actions">
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => handleAddToOrder(item)}
                    >
                      + Add to Order
                    </button>
                    <button
                      type="button"
                      className="delete-link"
                      onClick={() => handleDeleteMenuItem(item.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Current Order */}
        <section className="card">
          <h2 className="card-title">
            Current Order <span className="table-current-label">— Table {activeTable.number}</span>
          </h2>

          {order.length === 0 ? (
            <p className="empty-state">No items in the order yet.</p>
          ) : (
            <div className="order-list">
              {order.map((item) => (
                <div className="order-row" key={item.id}>
                  <div className="order-info">
                    <img src={item.image} alt={item.name} className="order-img" />
                    <div>
                      <div className="order-name">{item.name}</div>
                      <div className="qty-control">
                        <button
                          type="button"
                          className="qty-btn"
                          onClick={() => handleDecrease(item.id)}
                          aria-label={`Decrease ${item.name} quantity`}
                        >
                          −
                        </button>
                        <span className="qty-value">{item.qty}</span>
                        <button
                          type="button"
                          className="qty-btn"
                          onClick={() => handleIncrease(item.id)}
                          aria-label={`Increase ${item.name} quantity`}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="order-right">
                    <span className="order-price">{currency(item.qty * item.price)}</span>
                    <button
                      type="button"
                      className="remove-link"
                      onClick={() => handleRemove(item.id)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="order-divider" />

          <div className="order-total">
            <span>Total</span>
            <span>{currency(grandTotal)}</span>
          </div>

          <button
            type="button"
            className="btn btn-checkout"
            onClick={handleCheckout}
            disabled={order.length === 0}
          >
            Checkout
          </button>

          <button
            type="button"
            className="btn btn-clear"
            onClick={handleClearOrder}
            disabled={order.length === 0}
          >
            Clear Order
          </button>
        </section>
      </div>
    </div>
  );
}

export default point;
