import React, { useState, useMemo } from "react";
import "./point.css";
import burgerImg   from "../assets/burger.jpg";
import friesImg    from "../assets/Fries.png";
import sodaImg     from "../assets/soda.png";
import iceCreamImg from "../assets/iceream.png";

const INITIAL_MENU_ITEMS = [
  { id: 1, name: "Burger",    price: 5.0, image: burgerImg   },
  { id: 2, name: "Fries",     price: 3.0, image: friesImg    },
  { id: 3, name: "Soda",      price: 1.5, image: sodaImg     },
  { id: 4, name: "Ice Cream", price: 4.0, image: iceCreamImg },
];

const TAX_RATE = 0.0;
const DISCOUNT = 0;

const MERCHANTS = {
  edahab: {
    label: "E-Dahab", name: "BOOSCafeteria", number: "25261XXXXXXX",
    instructions: "Customer sends payment to the E-Dahab merchant account.",
    color: "#7c3aed", bg: "#f5f3ff", border: "#c4b5fd",
  },
  zaad: {
    label: "Zaad", name: "BOOSCafeteria", number: "25261XXXXXXX",
    instructions: "Customer sends payment using Zaad.",
    color: "#dc2626", bg: "#fff1f2", border: "#fca5a5",
  },
  sahal: {
    label: "Sahal", name: "BOOSCafeteria", number: "25263XXXXXXX",
    instructions: "Customer sends payment using Sahal Merchant.",
    color: "#0369a1", bg: "#f0f9ff", border: "#7dd3fc",
  },
};

const PLACEHOLDER_IMAGE =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'>
    <rect width='100' height='100' fill='%23ececf2'/>
    <text x='50' y='55' font-size='13' text-anchor='middle' fill='%239a9aac' font-family='sans-serif'>No image</text>
  </svg>`);

function fmt(n) { return `$${Number(n).toFixed(2)}`; }

// ── Shared Amount Check Block ──────────────────────────────────────
function AmountCheck({ grandTotal, amountPaid, setAmountPaid }) {
  const paid   = parseFloat(amountPaid) || 0;
  const change = paid - grandTotal;
  const short  = paid > 0 && paid < grandTotal;
  const ok     = paid >= grandTotal && paid > 0;

  return (
    <div className="amount-check-box">
      {/* Row: Amount Required */}
      <div className="amount-check-row">
        <span className="amount-check-label">Amount Required</span>
        <span className="amount-check-required">{fmt(grandTotal)}</span>
      </div>

      {/* Row: Amount Paid input */}
      <div className="amount-check-row">
        <span className="amount-check-label">Amount Paid by Customer</span>
        <input
          type="number"
          min="0"
          step="0.01"
          placeholder="0.00"
          className="amount-check-input"
          value={amountPaid}
          onChange={e => setAmountPaid(e.target.value)}
        />
      </div>

      {/* Row: Change */}
      <div className="amount-check-row amount-check-change">
        <span className="amount-check-label">Change</span>
        <span className={ok ? "change-positive" : "change-negative"}>
          {fmt(Math.max(change, 0))}
        </span>
      </div>

      {/* Status */}
      {short && <p className="field-warning">⚠ Amount paid is less than required ({fmt(grandTotal)}).</p>}
      {ok    && <p className="field-ok">✓ Payment sufficient — Change: {fmt(change)}</p>}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
export default function Point() {
  const [menuItems,    setMenuItems]    = useState(INITIAL_MENU_ITEMS);
  const [order,        setOrder]        = useState([]);
  const [view,         setView]         = useState("order");

  const [newItemName,  setNewItemName]  = useState("");
  const [newItemPrice, setNewItemPrice] = useState("");
  const [newItemImage, setNewItemImage] = useState(null);
  const [newItemError, setNewItemError] = useState("");

  const [method,           setMethod]           = useState("cash");
  const [cashPaid,         setCashPaid]         = useState("");
  const [digitalPaid,      setDigitalPaid]      = useState("");
  const [merchantConfirmed,setMerchantConfirmed]= useState({ edahab:false, zaad:false, sahal:false });
  const [error,            setError]            = useState("");
  const [receipt,          setReceipt]          = useState(null);

  // Totals
  const subtotal   = useMemo(() => order.reduce((s,i) => s + i.qty*i.price, 0), [order]);
  const tax        = subtotal * TAX_RATE;
  const discount   = order.length ? DISCOUNT : 0;
  const grandTotal = Math.max(subtotal + tax - discount, 0);

  const cashPaidNum    = parseFloat(cashPaid)    || 0;
  const digitalPaidNum = parseFloat(digitalPaid) || 0;

  const canComplete = useMemo(() => {
    if (!order.length || grandTotal === 0) return false;
    if (method === "cash")   return cashPaidNum    >= grandTotal;
    if (method === "edahab") return merchantConfirmed.edahab && digitalPaidNum >= grandTotal;
    if (method === "zaad")   return merchantConfirmed.zaad   && digitalPaidNum >= grandTotal;
    if (method === "sahal")  return merchantConfirmed.sahal;
    return false;
  }, [order, method, grandTotal, cashPaidNum, digitalPaidNum, merchantConfirmed]);

  // Order handlers
  function addToOrder(item) {
    setOrder(p => {
      const ex = p.find(o => o.id === item.id);
      if (ex) return p.map(o => o.id===item.id ? {...o,qty:o.qty+1} : o);
      return [...p, {...item, qty:1}];
    });
  }
  function increase(id) { setOrder(p => p.map(o => o.id===id ? {...o,qty:o.qty+1} : o)); }
  function decrease(id) { setOrder(p => p.map(o => o.id===id ? {...o,qty:o.qty-1} : o).filter(o=>o.qty>0)); }
  function remove(id)   { setOrder(p => p.filter(o => o.id!==id)); }
  function clearOrder() { setOrder([]); }
  function checkout()   { if (order.length) setView("payment"); }

  // Menu item add
  function onImageChange(e) {
    const file = e.target.files?.[0];
    if (!file) { setNewItemImage(null); return; }
    const r = new FileReader();
    r.onload = () => setNewItemImage(r.result);
    r.readAsDataURL(file);
  }
  function addMenuItem(e) {
    e.preventDefault();
    const name  = newItemName.trim();
    const price = parseFloat(newItemPrice);
    if (!name)                    { setNewItemError("Enter an item name."); return; }
    if (isNaN(price)||price<=0)   { setNewItemError("Enter a valid price greater than 0."); return; }
    setMenuItems(p => [...p, {id:Date.now(), name, price, image:newItemImage||PLACEHOLDER_IMAGE}]);
    setNewItemName(""); setNewItemPrice(""); setNewItemImage(null); setNewItemError("");
  }
  function deleteMenuItem(id) { setMenuItems(p => p.filter(i=>i.id!==id)); }

  // Payment handlers
  function selectMethod(m) { setMethod(m); setError(""); setDigitalPaid(""); }
  function confirmMerchant(key) { setMerchantConfirmed(p => ({...p,[key]:true})); }

  function cancelPayment() {
    setCashPaid(""); setDigitalPaid(""); setMethod("cash");
    setMerchantConfirmed({edahab:false,zaad:false,sahal:false});
    setError(""); setView("order");
  }

  function completePayment() {
    if (!canComplete) { setError("Payment cannot be completed yet."); return; }
    const isDigital = method==="edahab"||method==="zaad";
    const paid      = method==="cash" ? cashPaidNum : isDigital ? digitalPaidNum : grandTotal;
    setReceipt({
      id: `RCT-${Date.now().toString().slice(-6)}`,
      date: new Date(),
      items: [...order],
      subtotal, tax, discount, grandTotal, method,
      amountPaid: paid,
      change: Math.max(paid - grandTotal, 0),
    });
    setOrder([]); setCashPaid(""); setDigitalPaid("");
    setMerchantConfirmed({edahab:false,zaad:false,sahal:false});
    setError(""); setView("success");
  }

  function newOrder() { setReceipt(null); setMethod("cash"); setView("order"); }

  // ── METHOD CARD helper ──────────────────────────────────────────
  function MethodCard({ id, emoji, title, children }) {
    const m   = MERCHANTS[id];
    const sel = method === id;
    return (
      <label
        className={`method-option ${sel ? "method-selected" : ""}`}
        style={sel && m ? {borderColor:m.color, background:m.bg} : {}}
      >
        <input type="radio" name="method" checked={sel} onChange={() => selectMethod(id)} />
        <div className="method-body">
          <div className="method-name" style={sel && m ? {color:m.color} : {}}>
            {emoji} {title}
          </div>
          {sel && children}
        </div>
      </label>
    );
  }

  // ════════════════════════════════════════════════════════════════
  // SUCCESS
  // ════════════════════════════════════════════════════════════════
  if (view==="success" && receipt) {
    const methodLabel = receipt.method==="cash"
      ? "Cash by Hand"
      : MERCHANTS[receipt.method]?.label ?? receipt.method;
    return (
      <div className="pos-page">
        <div className="success-screen">
          <div className="card success-card">
            <div className="success-icon">✓</div>
            <h2 className="card-title">Payment Complete</h2>
            <p className="success-sub">The order has been paid in full.</p>
            <div className="receipt">
              <div className="receipt-header">
                <span>BOOS Cafeteria</span>
                <span className="receipt-id">{receipt.id}</span>
              </div>
              <div className="receipt-meta">
                {receipt.date.toLocaleDateString()} · {receipt.date.toLocaleTimeString()}
              </div>
              <div className="receipt-divider" />
              {receipt.items.map(item => (
                <div className="receipt-row" key={item.id}>
                  <span>{item.name} <span className="receipt-qty">×{item.qty}</span></span>
                  <span>{fmt(item.qty*item.price)}</span>
                </div>
              ))}
              <div className="receipt-divider" />
              <div className="receipt-row"><span>Subtotal</span><span>{fmt(receipt.subtotal)}</span></div>
              <div className="receipt-row"><span>Tax</span><span>{fmt(receipt.tax)}</span></div>
              <div className="receipt-row"><span>Discount</span><span>-{fmt(receipt.discount)}</span></div>
              <div className="receipt-row receipt-total"><span>Total</span><span>{fmt(receipt.grandTotal)}</span></div>
              <div className="receipt-divider" />
              <div className="receipt-row"><span>Paid via</span><span className="receipt-method">{methodLabel}</span></div>
              <div className="receipt-row"><span>Amount Paid</span><span>{fmt(receipt.amountPaid)}</span></div>
              <div className="receipt-row"><span>Change</span><span className="change-positive">{fmt(receipt.change)}</span></div>
            </div>
            <button className="btn btn-primary btn-block" onClick={newOrder}>Start New Order</button>
          </div>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════
  // PAYMENT VIEW
  // ════════════════════════════════════════════════════════════════
  if (view==="payment") {
    return (
      <div className="pos-page">
        <div className="pos-grid pos-grid-single">
          <section className="card payment-card">
            <h2 className="card-title">Payment Method</h2>

            {/* Grand total summary */}
            <div className="payment-summary">
              <span className="payment-summary__label">Order Total</span>
              <span className="payment-summary__amount">{fmt(grandTotal)}</span>
            </div>

            <div className="method-list">

              {/* ── CASH ── */}
              <MethodCard id="cash" emoji="💵" title="Cash by Hand">
                <AmountCheck
                  grandTotal={grandTotal}
                  amountPaid={cashPaid}
                  setAmountPaid={setCashPaid}
                />
              </MethodCard>

              {/* ── E-DAHAB ── */}
              <MethodCard id="edahab" emoji="💜" title="E-Dahab Merchant">
                <div className="method-detail">
                  <div className="merchant-info" style={{borderColor:MERCHANTS.edahab.border}}>
                    <div><span className="merchant-label">Merchant Name</span><span className="merchant-value">{MERCHANTS.edahab.name}</span></div>
                    <div><span className="merchant-label">Merchant Number</span><span className="merchant-value">{MERCHANTS.edahab.number}</span></div>
                  </div>
                  <p className="instructions">{MERCHANTS.edahab.instructions}</p>
                  <AmountCheck
                    grandTotal={grandTotal}
                    amountPaid={digitalPaid}
                    setAmountPaid={setDigitalPaid}
                  />
                  <button
                    type="button"
                    className={`btn btn-confirm ${merchantConfirmed.edahab?"btn-confirmed":""}`}
                    onClick={() => confirmMerchant("edahab")}
                    disabled={digitalPaidNum < grandTotal || digitalPaidNum===0}
                  >
                    {merchantConfirmed.edahab ? "Payment Confirmed ✓" : "Confirm Payment"}
                  </button>
                </div>
              </MethodCard>

              {/* ── ZAAD ── */}
              <MethodCard id="zaad" emoji="❤️" title="Zaad">
                <div className="method-detail">
                  <div className="merchant-info" style={{borderColor:MERCHANTS.zaad.border}}>
                    <div><span className="merchant-label">Merchant Name</span><span className="merchant-value">{MERCHANTS.zaad.name}</span></div>
                    <div><span className="merchant-label">Merchant Number</span><span className="merchant-value">{MERCHANTS.zaad.number}</span></div>
                  </div>
                  <p className="instructions">{MERCHANTS.zaad.instructions}</p>
                  <AmountCheck
                    grandTotal={grandTotal}
                    amountPaid={digitalPaid}
                    setAmountPaid={setDigitalPaid}
                  />
                  <button
                    type="button"
                    className={`btn btn-confirm ${merchantConfirmed.zaad?"btn-confirmed":""}`}
                    onClick={() => confirmMerchant("zaad")}
                    disabled={digitalPaidNum < grandTotal || digitalPaidNum===0}
                  >
                    {merchantConfirmed.zaad ? "Payment Confirmed ✓" : "Confirm Payment"}
                  </button>
                </div>
              </MethodCard>

              {/* ── SAHAL ── */}
              <MethodCard id="sahal" emoji="🔵" title="Sahal Merchant">
                <div className="method-detail">
                  <div className="merchant-info" style={{borderColor:MERCHANTS.sahal.border}}>
                    <div><span className="merchant-label">Merchant Name</span><span className="merchant-value">{MERCHANTS.sahal.name}</span></div>
                    <div><span className="merchant-label">Merchant Number</span><span className="merchant-value">{MERCHANTS.sahal.number}</span></div>
                  </div>
                  <p className="instructions">{MERCHANTS.sahal.instructions}</p>
                  <button
                    type="button"
                    className={`btn btn-confirm ${merchantConfirmed.sahal?"btn-confirmed":""}`}
                    onClick={() => confirmMerchant("sahal")}
                  >
                    {merchantConfirmed.sahal ? "Payment Confirmed ✓" : "Confirm Payment"}
                  </button>
                </div>
              </MethodCard>

            </div>

            <div className="payment-footer">
              <div className="payment-footer-total">
                <span>Grand Total</span>
                <span>{fmt(grandTotal)}</span>
              </div>
              {error && <p className="field-warning footer-warning">{error}</p>}
              <div className="action-buttons">
                <button type="button" className="btn btn-secondary" onClick={cancelPayment}>Cancel</button>
                <button type="button" className="btn btn-primary" disabled={!canComplete} onClick={completePayment}>
                  Complete Payment
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════
  // ORDER VIEW
  // ════════════════════════════════════════════════════════════════
  return (
    <div className="pos-page">
      <h1 className="page-title">Point of Sale</h1>
      <div className="pos-grid">

        {/* Menu Items */}
        <section className="card">
          <h2 className="card-title">Menu Items</h2>
          <form className="add-item-form" onSubmit={addMenuItem}>
            <div className="add-item-row">
              <input type="text" className="text-input" placeholder="Item name"
                value={newItemName} onChange={e=>setNewItemName(e.target.value)} />
              <input type="number" min="0" step="0.01" className="text-input add-item-price" placeholder="Price"
                value={newItemPrice} onChange={e=>setNewItemPrice(e.target.value)} />
            </div>
            <div className="add-item-row">
              <label className="file-input-label">
                {newItemImage
                  ? <img src={newItemImage} alt="Preview" className="file-preview" />
                  : <span className="file-input-text">Choose image</span>}
                <input type="file" accept="image/*" className="file-input" onChange={onImageChange} />
              </label>
              <button type="submit" className="btn btn-primary add-item-btn">+ Add Item</button>
            </div>
            {newItemError && <p className="field-warning">{newItemError}</p>}
          </form>

          <div className="menu-list">
            {menuItems.map(item => (
              <div className="menu-row" key={item.id}>
                <div className="menu-info">
                  <img src={item.image} alt={item.name} className="menu-img" />
                  <span className="menu-name">{item.name} — {fmt(item.price)}</span>
                </div>
                <div className="menu-actions">
                  <button type="button" className="btn btn-primary" onClick={()=>addToOrder(item)}>+ Add to Order</button>
                  <button type="button" className="delete-link" onClick={()=>deleteMenuItem(item.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Current Order */}
        <section className="card">
          <h2 className="card-title">Current Order</h2>
          {order.length === 0 ? (
            <p className="empty-state">No items in the order yet.</p>
          ) : (
            <div className="order-list">
              {order.map(item => (
                <div className="order-row" key={item.id}>
                  <div className="order-info">
                    <img src={item.image} alt={item.name} className="order-img" />
                    <div>
                      <div className="order-name">{item.name}</div>
                      <div className="qty-control">
                        <button type="button" className="qty-btn" onClick={()=>decrease(item.id)}>−</button>
                        <span className="qty-value">{item.qty}</span>
                        <button type="button" className="qty-btn" onClick={()=>increase(item.id)}>+</button>
                      </div>
                    </div>
                  </div>
                  <div className="order-right">
                    <span className="order-price">{fmt(item.qty*item.price)}</span>
                    <button type="button" className="remove-link" onClick={()=>remove(item.id)}>Remove</button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="order-divider" />
          <div className="order-total"><span>Total</span><span>{fmt(grandTotal)}</span></div>
          <button type="button" className="btn btn-checkout" onClick={checkout} disabled={!order.length}>Checkout</button>
          <button type="button" className="btn btn-clear"    onClick={clearOrder} disabled={!order.length}>Clear Order</button>
        </section>

      </div>
    </div>
  );
}
