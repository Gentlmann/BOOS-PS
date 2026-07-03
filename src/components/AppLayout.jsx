import React, { useState } from "react";
import "./AppLayout.css";
import Point from "./Point";

const APPS = [
  { id: "point", label: "Point of Sale", icon: "🏪" },
];

export default function AppLayout() {
  const [active, setActive] = useState("point");
  const [collapsed, setCollapsed] = useState(false);

  function renderContent() {
    switch (active) {
      case "point": return <Point />;
      default:      return <Point />;
    }
  }

  return (
    <div className={`app-layout ${collapsed ? "app-layout--collapsed" : ""}`}>

      {/* ── Sidebar ── */}
      <aside className="app-sidebar">

        <div className="app-sidebar__top">
          {!collapsed && <span className="app-sidebar__brand">Boos Cafetreia</span>}
          <button
            className="app-sidebar__toggle"
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? "Expand" : "Collapse"}
          >
            {collapsed ? "▶" : "◀"}
          </button>
        </div>

        <nav className="app-sidebar__nav">
          {APPS.map((app) => (
            <button
              key={app.id}
              className={`app-nav-btn ${active === app.id ? "app-nav-btn--active" : ""}`}
              onClick={() => setActive(app.id)}
              title={collapsed ? app.label : ""}
            >
              <span className="app-nav-btn__icon">{app.icon}</span>
              {!collapsed && (
                <span className="app-nav-btn__label">{app.label}</span>
              )}
            </button>
          ))}
        </nav>

      </aside>

      {/* ── Main Display ── */}
      <main className="app-display">
        {renderContent()}
      </main>

    </div>
  );
}
