import React, { useState, useEffect, useRef } from "react";
import { Check, Plus, Trash2, ShoppingBasket, Copy } from "lucide-react";

// ---------- Store layout ----------
// Aisle order modelled on a typical Woolworths supermarket walk-through.
const AISLES = [
  { id: "produce", label: "Fruit & Veg", num: 1 },
  { id: "bakery", label: "Bakery", num: 2 },
  { id: "meat", label: "Meat, Fish & Deli", num: 3 },
  { id: "dairy", label: "Dairy & Eggs", num: 4 },
  { id: "frozen", label: "Frozen", num: 5 },
  { id: "pantry", label: "Pantry", num: 6 },
  { id: "drinks", label: "Drinks", num: 7 },
  { id: "household", label: "Household & Personal", num: 8 },
];

const CATEGORY_TABS = [
  { id: "produce", label: "Fruit" },
  { id: "veg", label: "Vegetables" },
  { id: "fish", label: "Fish" },
  { id: "chicken", label: "Chicken" },
  { id: "meat", label: "Meat" },
  { id: "pantry", label: "Ingredients" },
  { id: "dairy", label: "Dairy" },
  { id: "bakery", label: "Bakery" },
  { id: "frozen", label: "Frozen" },
  { id: "drinks", label: "Drinks" },
  { id: "household", label: "Household" },
];

// keyword -> aisle mapping (simulates matching typed text to real product placement)
const KEYWORD_MAP = [
  [["banana", "apple", "orange", "grape", "mandarin", "avocado", "lemon", "lime", "berries", "strawberr", "mango", "pear", "kiwi", "melon", "pineapple", "fruit"], "produce", "fruit"],
  [["carrot", "potato", "onion", "tomato", "lettuce", "broccoli", "capsicum", "cucumber", "pumpkin", "mushroom", "zucchini", "spinach", "garlic", "ginger", "salad", "herbs", "coriander", "parsley", "fresh bean"], "produce", "veg"],
  [["bread", "roll", "bun", "bagel", "croissant", "sourdough", "muffin", "wrap", "pita", "tortilla"], "bakery", "bakery"],
  [["chicken", "drumstick", "thigh", "wing", "schnitzel"], "meat", "chicken"],
  [["salmon", "fish", "tuna", "prawn", "seafood", "barramundi", "cod"], "meat", "fish"],
  [["beef", "mince", "steak", "lamb", "pork", "bacon", "sausage", "ham", "salami", "deli", "chikli con carne", "chilli con carne", "con carne"], "meat", "meat"],
  [["milk", "cheese", "yoghurt", "yogurt", "butter", "cream", "egg"], "dairy", "dairy"],
  [["frozen", "ice cream", "peas", "chips", "pizza", "greens for freezer", "cauliflour", "cauliflower"], "frozen", "frozen"],
  [["pasta", "rice", "flour", "sugar", "oil", "sauce", "can", "tin", "cereal", "oats", "spice", "salt", "pepper", "stock", "lentil", "bean", "vinegar", "honey", "jam", "peanut butter", "noodle", "curry paste", "curry", "mayonnaise", "mayo", "worcester", "muesli", "biscuit", "shortbread", "digestive", "kidney bean", "black bean", "baked bean"], "pantry", "pantry"],
  [["water", "juice", "soft drink", "coke", "soda", "coffee", "tea", "beer", "wine", "cordial"], "drinks", "drinks"],
  [["toilet paper", "paper towel", "detergent", "shampoo", "soap", "toothpaste", "cleaner", "tissue", "deodorant", "nappies", "dish", "steradent", "denture"], "household", "household"],
];

function classify(rawText) {
  const text = rawText.toLowerCase();
  for (const [keywords, aisleId, tabId] of KEYWORD_MAP) {
    if (keywords.some((k) => text.includes(k))) {
      return { aisleId, tabId };
    }
  }
  return { aisleId: "pantry", tabId: "pantry" };
}

function titleCase(s) {
  return s.replace(/\s+/g, " ").trim().replace(/^\w/, (c) => c.toUpperCase());
}

// Seed suggestions shown before any personal history exists.
const DEFAULT_SUGGESTIONS = {
  produce: ["Bananas", "Apples", "Avocado", "Strawberries", "Raspberries", "Blueberries"],
  veg: ["Carrots", "Onions", "Tomatoes", "Potatoes", "Spinach", "Fresh beans"],
  fish: ["Salmon fillets", "Tinned tuna"],
  chicken: ["Chicken breast", "Chicken thigh fillets"],
  meat: ["Beef mince", "Chilli con carne mix"],
  pantry: [
    "Pasta",
    "Rice",
    "Olive oil",
    "Jar curry paste",
    "Heinz mayonnaise seriously good",
    "Worcester sauce",
    "Muesli",
    "Baked beans",
    "Tin black beans",
    "Tin red kidney beans",
    "Arnotts shortbread creams",
    "Chocolate digestives",
  ],
  dairy: ["Full cream milk 2L", "Tasty cheese", "Greek yoghurt", "Yoghurts"],
  bakery: ["Sourdough loaf", "Wraps", "Bread"],
  frozen: ["Frozen peas", "Ice cream", "Greens for freezer", "Frozen broccoli", "Frozen cauliflower"],
  drinks: ["Sparkling water", "Orange juice"],
  household: ["Toilet paper", "Dish soap", "Steradent"],
};

let uid = 0;
const nextId = () => `item-${Date.now()}-${uid++}`;

export default function ShoppingListApp() {
  const [items, setItems] = useState([]);
  const [draft, setDraft] = useState("");
  const [activeTab, setActiveTab] = useState(null);
  const [history, setHistory] = useState({});
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [removing, setRemoving] = useState({});
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await window.storage.get("category-history", false);
        if (res && res.value) setHistory(JSON.parse(res.value));
      } catch (e) {
        // no history yet
      }
      try {
        const res = await window.storage.get("current-list", false);
        if (res && res.value) setItems(JSON.parse(res.value));
      } catch (e) {
        // no saved list yet
      } finally {
        setHistoryLoaded(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!historyLoaded) return;
    window.storage.set("current-list", JSON.stringify(items), false).catch(() => {});
  }, [items, historyLoaded]);

  const saveHistory = async (next) => {
    setHistory(next);
    try {
      await window.storage.set("category-history", JSON.stringify(next), false);
    } catch (e) {
      // best effort — list still works this session
    }
  };

  const bumpHistory = (tabId, name) => {
    const bucket = { ...(history[tabId] || {}) };
    bucket[name] = (bucket[name] || 0) + 1;
    const next = { ...history, [tabId]: bucket };
    saveHistory(next);
  };

  const addItem = (name, aisleId, tabId) => {
    setItems((prev) => [...prev, { id: nextId(), name, aisleId, checked: false }]);
    if (tabId) bumpHistory(tabId, name);
  };

  const handleBuildList = () => {
    const lines = draft.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) return;
    const newItems = lines.map((line) => {
      const { aisleId, tabId } = classify(line);
      bumpHistory(tabId, titleCase(line));
      return { id: nextId(), name: titleCase(line), aisleId, checked: false };
    });
    setItems((prev) => [...prev, ...newItems]);
    setDraft("");
    setToast(`Added ${newItems.length} item${newItems.length > 1 ? "s" : ""}, sorted by aisle`);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  };

  const toggleItem = (id) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, checked: true } : it)));
    setRemoving((prev) => ({ ...prev, [id]: true }));
    setTimeout(() => {
      setItems((prev) => prev.filter((it) => it.id !== id));
      setRemoving((prev) => {
        const { [id]: _, ...rest } = prev;
        return rest;
      });
    }, 420);
  };

  const removeItem = (id) => setItems((prev) => prev.filter((it) => it.id !== id));

  const grouped = AISLES.map((aisle) => ({
    aisle,
    items: items.filter((it) => it.aisleId === aisle.id),
  })).filter((g) => g.items.length > 0);

  const remainingCount = items.length;

  const suggestionsFor = (tabId) => {
    const learned = history[tabId] || {};
    const learnedSorted = Object.entries(learned)
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => name);
    const defaults = DEFAULT_SUGGESTIONS[tabId] || [];
    const combined = [...learnedSorted];
    for (const d of defaults) if (!combined.includes(d)) combined.push(d);
    return combined.slice(0, 8);
  };

  return (
    <div style={styles.page}>
      <div style={styles.appShell}>
        <header style={styles.header}>
          <div style={styles.headerTop}>
            <div style={styles.logoMark}>
              <ShoppingBasket size={20} color="#FAF8F3" strokeWidth={2} />
            </div>
            <div>
              <h1 style={styles.title}>Carol's Shopping List</h1>
              <p style={styles.subtitle}>
                {remainingCount === 0 ? "Nothing left to grab" : `${remainingCount} item${remainingCount === 1 ? "" : "s"} left, aisle by aisle`}
              </p>
            </div>
          </div>
        </header>

        <section style={styles.composer}>
          <textarea
            style={styles.textarea}
            placeholder={"Type your list, one thing per line —\nmilk\nbananas\nchicken breast\npasta"}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
          />
          <button
            style={{ ...styles.buildBtn, opacity: draft.trim() ? 1 : 0.5 }}
            onClick={handleBuildList}
            disabled={!draft.trim()}
          >
            Sort onto list
          </button>
        </section>

        <section style={styles.tabsWrap}>
          <div style={styles.tabsScroll}>
            {CATEGORY_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(activeTab === tab.id ? null : tab.id)}
                style={{
                  ...styles.tabChip,
                  ...(activeTab === tab.id ? styles.tabChipActive : {}),
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab && (
            <div style={styles.suggestPanel}>
              <div style={styles.suggestHeading}>
                {history[activeTab] && Object.keys(history[activeTab]).length > 0
                  ? "Your usual picks"
                  : "Common picks"}
              </div>
              <div style={styles.suggestGrid}>
                {suggestionsFor(activeTab).map((name) => (
                  <button
                    key={name}
                    style={styles.suggestItem}
                    onClick={() => {
                      const { aisleId } = classify(name);
                      addItem(name, aisleId, activeTab);
                    }}
                  >
                    <Plus size={14} color="#2D5A3D" strokeWidth={2.5} />
                    <span>{name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        <section style={styles.list}>
          {grouped.length === 0 && (
            <div style={styles.empty}>
              <p style={styles.emptyTitle}>Your trolley is empty</p>
              <p style={styles.emptyBody}>Type a list above, or tap a category to add your usual items.</p>
            </div>
          )}

          {grouped.map(({ aisle, items: aisleItems }) => (
            <div key={aisle.id} style={styles.aisleBlock}>
              <div style={styles.aisleHeading}>
                <span style={styles.aisleNum}>{aisle.num}</span>
                <span>{aisle.label}</span>
              </div>
              <div>
                {aisleItems.map((it) => (
                  <div
                    key={it.id}
                    style={{
                      ...styles.row,
                      ...(removing[it.id] ? styles.rowRemoving : {}),
                    }}
                  >
                    <button style={styles.checkBtn} onClick={() => toggleItem(it.id)} aria-label={`Mark ${it.name} in trolley`}>
                      {it.checked && <Check size={14} color="#FAF8F3" strokeWidth={3} />}
                    </button>
                    <span style={{ ...styles.rowLabel, ...(it.checked ? styles.rowLabelChecked : {}) }}>
                      {it.name}
                    </span>
                    <button style={styles.removeBtn} onClick={() => removeItem(it.id)} aria-label={`Remove ${it.name}`}>
                      <Trash2 size={14} color="#B7AF9E" strokeWidth={2} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>

        {remainingCount > 0 && (
          <section style={styles.copyCard}>
            <button
              style={styles.copyBtn}
              onClick={() => {
                const text = grouped.map((g) => g.items.map((it) => it.name).join("\n")).join("\n");
                navigator.clipboard?.writeText(text);
                setToast("List copied to clipboard");
                clearTimeout(toastTimer.current);
                toastTimer.current = setTimeout(() => setToast(null), 2200);
              }}
            >
              <Copy size={15} color="#2D5A3D" strokeWidth={2} />
              Copy list
            </button>
          </section>
        )}
      </div>

      {toast && <div style={styles.toast}>{toast}</div>}
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#EFEBE1",
    display: "flex",
    justifyContent: "center",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    padding: "0 0 40px",
  },
  appShell: {
    width: "100%",
    maxWidth: 440,
    background: "#FAF8F3",
    minHeight: "100vh",
    boxShadow: "0 0 40px rgba(0,0,0,0.06)",
  },
  header: {
    background: "#2D5A3D",
    padding: "28px 20px 22px",
  },
  headerTop: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  logoMark: {
    width: 40,
    height: 40,
    borderRadius: 10,
    background: "#3E7350",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  title: {
    margin: 0,
    fontSize: 22,
    fontWeight: 700,
    color: "#FAF8F3",
    letterSpacing: "-0.01em",
  },
  subtitle: {
    margin: "2px 0 0",
    fontSize: 13,
    color: "#C7DAC9",
  },
  composer: {
    padding: "18px 20px 0",
  },
  textarea: {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid #E4DFD3",
    borderRadius: 12,
    padding: "12px 14px",
    fontSize: 14.5,
    color: "#1C2620",
    background: "#FFFFFF",
    resize: "vertical",
    fontFamily: "inherit",
    lineHeight: 1.5,
  },
  buildBtn: {
    marginTop: 10,
    width: "100%",
    background: "#B8451F",
    color: "#FAF8F3",
    border: "none",
    borderRadius: 12,
    padding: "12px 0",
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
  },
  tabsWrap: {
    padding: "18px 0 0",
  },
  tabsScroll: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    padding: "0 20px 4px",
  },
  tabChip: {
    padding: "8px 14px",
    borderRadius: 999,
    border: "1px solid #E4DFD3",
    background: "#FFFFFF",
    color: "#5C5647",
    fontSize: 13.5,
    fontWeight: 500,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  tabChipActive: {
    background: "#2D5A3D",
    borderColor: "#2D5A3D",
    color: "#FAF8F3",
  },
  suggestPanel: {
    margin: "10px 20px 0",
    padding: "14px",
    background: "#F1EEE4",
    borderRadius: 12,
  },
  suggestHeading: {
    fontSize: 12.5,
    color: "#8A8578",
    marginBottom: 10,
    fontWeight: 500,
  },
  suggestGrid: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
  },
  suggestItem: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "7px 12px",
    borderRadius: 999,
    border: "1px solid #DCD6C6",
    background: "#FFFFFF",
    color: "#1C2620",
    fontSize: 13,
    cursor: "pointer",
  },
  list: {
    padding: "18px 20px 4px",
  },
  empty: {
    padding: "40px 10px",
    textAlign: "center",
  },
  emptyTitle: {
    margin: 0,
    fontSize: 15.5,
    fontWeight: 600,
    color: "#1C2620",
  },
  emptyBody: {
    margin: "6px 0 0",
    fontSize: 13.5,
    color: "#8A8578",
    lineHeight: 1.5,
  },
  aisleBlock: {
    marginBottom: 20,
  },
  aisleHeading: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 18.75,
    fontWeight: 600,
    color: "#8A8578",
    marginBottom: 8,
    textTransform: "none",
  },
  aisleNum: {
    width: 27,
    height: 27,
    borderRadius: 7,
    background: "#E4DFD3",
    color: "#5C5647",
    fontSize: 16.5,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
  },
  row: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "10px 4px",
    borderBottom: "1px solid #F1EEE4",
    transition: "opacity 0.4s ease, transform 0.4s ease",
    opacity: 1,
  },
  rowRemoving: {
    opacity: 0,
    transform: "translateX(12px)",
  },
  checkBtn: {
    width: 24,
    height: 24,
    borderRadius: 7,
    border: "1.5px solid #C9C2AC",
    background: "transparent",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    flexShrink: 0,
  },
  rowLabel: {
    flex: 1,
    fontSize: 22.5,
    color: "#1C2620",
  },
  rowLabelChecked: {
    textDecoration: "line-through",
    color: "#B7AF9E",
  },
  removeBtn: {
    border: "none",
    background: "transparent",
    cursor: "pointer",
    padding: 4,
    flexShrink: 0,
  },
  copyCard: {
    margin: "6px 20px 0",
  },
  copyBtn: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    background: "#FFFFFF",
    border: "1px solid #DCD6C6",
    borderRadius: 10,
    padding: "11px 0",
    fontSize: 14,
    fontWeight: 600,
    color: "#2D5A3D",
    cursor: "pointer",
  },
  toast: {
    position: "fixed",
    bottom: 24,
    left: "50%",
    transform: "translateX(-50%)",
    background: "#1C2620",
    color: "#FAF8F3",
    padding: "10px 18px",
    borderRadius: 999,
    fontSize: 13.5,
    boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
  },
};
