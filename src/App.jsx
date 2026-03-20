import React, { useEffect, useMemo, useState } from "react";
import {
  Camera,
  Coffee,
  Bike,
  Footprints,
  BookOpen,
  Search,
  Trash2,
  Pencil,
  CalendarDays,
  Clock3,
  MapPin,
  Plus,
  X,
} from "lucide-react";

const STORAGE_KEY = "daily-frames-v4";

const activityOptions = [
  { value: "Ride", icon: Bike },
  { value: "Walk", icon: Footprints },
  { value: "Cafe", icon: Coffee },
  { value: "Photo", icon: Camera },
  { value: "Journal", icon: BookOpen },
];

const theme = {
  bg: "#f5f1ea",
  panel: "#faf7f2",
  panel2: "#f0ebe2",
  border: "#d2cabd",
  borderStrong: "#bbb2a4",
  text: "#2a2926",
  subtext: "#7a7268",
  accent: "#8f4a43",
  black: "#1f1f1d",
  white: "#ffffff",
};

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function todayString() {
  const d = new Date();
  return d.toISOString().split("T")[0];
}

function prettyDate(dateStr) {
  const d = new Date(`${dateStr}T12:00:00`);
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function prettyTime(date) {
  return new Date(date).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function loadEntries() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveEntries(entries) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

const baseInputStyle = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: "14px",
  border: `1px solid ${theme.border}`,
  background: theme.white,
  color: theme.text,
  fontSize: "14px",
  outline: "none",
  boxSizing: "border-box",
  fontFamily: "inherit",
};

function Field({ label, children }) {
  return (
    <label style={{ display: "block" }}>
      <div
        style={{
          fontSize: 12,
          marginBottom: 8,
          color: theme.subtext,
          fontWeight: 600,
          letterSpacing: "0.02em",
        }}
      >
        {label}
      </div>
      {children}
    </label>
  );
}

function TypeButton({ active, icon: Icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "10px 14px",
        borderRadius: 14,
        border: `1px solid ${active ? theme.borderStrong : theme.border}`,
        background: active ? theme.panel2 : theme.panel,
        color: theme.text,
        cursor: "pointer",
        fontSize: 14,
        fontWeight: active ? 600 : 500,
        fontFamily: "inherit",
      }}
    >
      <Icon size={15} />
      {label}
    </button>
  );
}

function ActionButton({ children, onClick, type = "button" }) {
  return (
    <button
      type={type}
      onClick={onClick}
      style={{
        padding: "10px 15px",
        borderRadius: 14,
        border: `1px solid ${theme.border}`,
        background: theme.panel2,
        color: theme.text,
        cursor: "pointer",
        fontSize: 14,
        fontWeight: 600,
        letterSpacing: "-0.01em",
        fontFamily: "inherit",
      }}
    >
      {children}
    </button>
  );
}

function TabButton({ active, children, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "10px 15px",
        borderRadius: 999,
        border: `1px solid ${active ? theme.borderStrong : theme.border}`,
        background: active ? theme.panel : "transparent",
        color: active ? theme.text : theme.subtext,
        cursor: "pointer",
        fontSize: 13,
        fontWeight: 600,
        marginRight: 8,
        letterSpacing: "-0.01em",
        fontFamily: "inherit",
      }}
    >
      {children}
    </button>
  );
}

function EmptyState({ title, body }) {
  return (
    <div
      style={{
        border: `1px solid ${theme.border}`,
        borderRadius: 22,
        background: theme.white,
        padding: 28,
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontSize: 18,
          fontWeight: 600,
          color: theme.text,
          marginBottom: 8,
          letterSpacing: "-0.01em",
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontSize: 14,
          lineHeight: 1.7,
          color: theme.subtext,
          maxWidth: 420,
          margin: "0 auto",
        }}
      >
        {body}
      </div>
    </div>
  );
}

function EntryForm({ onSave, onCancel, initialEntry, defaultDate }) {
  const [type, setType] = useState(initialEntry?.type || "Ride");
  const [date, setDate] = useState(
    initialEntry?.date || defaultDate || todayString()
  );
  const [title, setTitle] = useState(initialEntry?.title || "");
  const [place, setPlace] = useState(initialEntry?.place || "");
  const [duration, setDuration] = useState(initialEntry?.duration || "");
  const [rating, setRating] = useState(initialEntry?.rating || "");
  const [note, setNote] = useState(initialEntry?.note || "");

  const showPlace = type === "Cafe";
  const showDuration = ["Ride", "Walk"].includes(type);
  const showRating = type === "Cafe";

  function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) return;

    onSave({
      id: initialEntry?.id || uid(),
      createdAt: initialEntry?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      type,
      date,
      title: title.trim(),
      place: place.trim(),
      duration: duration.trim(),
      rating: rating.trim(),
      note: note.trim(),
    });
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "grid", gap: 18 }}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        {activityOptions.map((item) => (
          <TypeButton
            key={item.value}
            active={type === item.value}
            icon={item.icon}
            label={item.value}
            onClick={() => setType(item.value)}
          />
        ))}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
        }}
      >
        <Field label="Date">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={baseInputStyle}
          />
        </Field>

        <Field label="Title">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Add title"
            style={baseInputStyle}
          />
        </Field>
      </div>

      {(showPlace || showDuration || showRating) && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 16,
          }}
        >
          {showPlace && (
            <Field label="Location">
              <input
                type="text"
                value={place}
                onChange={(e) => setPlace(e.target.value)}
                placeholder="Cafe or area"
                style={baseInputStyle}
              />
            </Field>
          )}

          {showDuration && (
            <Field label="Duration">
              <input
                type="text"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="45 min / 2 hr"
                style={baseInputStyle}
              />
            </Field>
          )}

          {showRating && (
            <Field label="Rating">
              <input
                type="text"
                value={rating}
                onChange={(e) => setRating(e.target.value)}
                placeholder="4.5 / 5"
                style={baseInputStyle}
              />
            </Field>
          )}
        </div>
      )}

      <Field label="Notes">
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={4}
          placeholder="A short note, cafe detail, ride feeling, or photo memory"
          style={{ ...baseInputStyle, resize: "vertical", minHeight: 110 }}
        />
      </Field>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <ActionButton type="submit">
          {initialEntry ? "Save changes" : "Add entry"}
        </ActionButton>
        <ActionButton onClick={onCancel}>Cancel</ActionButton>
      </div>
    </form>
  );
}

function TypePill({ type }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "5px 10px",
        borderRadius: 999,
        border: `1px solid ${theme.border}`,
        background: theme.panel2,
        color: theme.text,
        fontSize: 12,
        fontWeight: 600,
      }}
    >
      {type}
    </span>
  );
}

function IconButton({ children, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 36,
        height: 36,
        borderRadius: 12,
        border: `1px solid ${theme.border}`,
        background: theme.panel,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

function EntryCard({ entry, onEdit, onDelete }) {
  return (
    <div
      style={{
        border: `1px solid ${theme.border}`,
        borderRadius: 22,
        background: theme.panel,
        padding: 18,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 12,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
              marginBottom: 10,
            }}
          >
            <TypePill type={entry.type} />
            <span style={{ fontSize: 12, color: theme.subtext }}>
              {prettyTime(entry.updatedAt)}
            </span>
          </div>

          <div
            style={{
              fontSize: 20,
              fontWeight: 600,
              lineHeight: 1.25,
              marginBottom: 8,
              color: theme.text,
              letterSpacing: "-0.01em",
            }}
          >
            {entry.title}
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 14,
              color: theme.subtext,
              fontSize: 13,
              marginBottom: entry.note ? 14 : 0,
            }}
          >
            {entry.place && (
              <span
                style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                <MapPin size={14} /> {entry.place}
              </span>
            )}
            {entry.duration && (
              <span
                style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                <Clock3 size={14} /> {entry.duration}
              </span>
            )}
            {entry.rating && <span>Rating: {entry.rating}</span>}
          </div>

          {entry.note && (
            <div
              style={{
                color: theme.text,
                fontSize: 14,
                lineHeight: 1.7,
                whiteSpace: "pre-wrap",
              }}
            >
              {entry.note}
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          <IconButton onClick={() => onEdit(entry)}>
            <Pencil size={16} color={theme.text} />
          </IconButton>
          <IconButton onClick={() => onDelete(entry.id)}>
            <Trash2 size={16} color={theme.accent} />
          </IconButton>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [entries, setEntries] = useState([]);
  const [activeTab, setActiveTab] = useState("today");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [selectedDate, setSelectedDate] = useState(todayString());
  const [search, setSearch] = useState("");

  useEffect(() => {
    setEntries(loadEntries());
  }, []);

  useEffect(() => {
    saveEntries(entries);
  }, [entries]);

  const todayEntries = useMemo(() => {
    return entries
      .filter((entry) => entry.date === todayString())
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  }, [entries]);

  const historyDates = useMemo(() => {
    return [...new Set(entries.map((entry) => entry.date))].sort(
      (a, b) => new Date(b) - new Date(a)
    );
  }, [entries]);

  const filteredHistory = useMemo(() => {
    return entries
      .filter((entry) => entry.date === selectedDate)
      .filter((entry) => {
        if (!search.trim()) return true;
        const haystack =
          `${entry.title} ${entry.place} ${entry.note} ${entry.type}`.toLowerCase();
        return haystack.includes(search.toLowerCase());
      })
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  }, [entries, selectedDate, search]);

  function handleSave(entry) {
    setEntries((prev) => {
      const exists = prev.some((item) => item.id === entry.id);
      if (exists) {
        return prev.map((item) => (item.id === entry.id ? entry : item));
      }
      return [entry, ...prev];
    });

    setShowForm(false);
    setEditing(null);
    setSelectedDate(entry.date);

    if (entry.date !== todayString()) {
      setActiveTab("history");
    }
  }

  function handleEdit(entry) {
    setEditing(entry);
    setShowForm(true);
  }

  function handleDelete(id) {
    setEntries((prev) => prev.filter((entry) => entry.id !== id));
    if (editing?.id === id) {
      setEditing(null);
      setShowForm(false);
    }
  }

  function startNewEntry() {
    setEditing(null);
    setShowForm(true);
  }

  const isMobile = window.innerWidth < 768;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: `linear-gradient(180deg, ${theme.bg} 0%, #efe8dd 100%)`,
        padding: "32px 18px",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          maxWidth: 1120,
          margin: "0 auto",
          color: theme.text,
          fontFamily:
            'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}
      >
        <div
          style={{
            background: theme.panel,
            border: `1px solid ${theme.borderStrong}`,
            borderRadius: 30,
            padding: 24,
            marginBottom: 20,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              gap: 18,
              flexWrap: "wrap",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: "0.16em",
                  color: theme.subtext,
                  marginBottom: 8,
                  fontWeight: 600,
                }}
              >
                Daily Frames
              </div>

              <div
                style={{
                  fontSize: "clamp(26px, 4vw, 42px)",
                  fontWeight: 600,
                  lineHeight: 1.05,
                  color: theme.subtext,
                  letterSpacing: "-0.015em",
                  marginBottom: 10,
                }}
              >
                Today + History
              </div>

              <div
                style={{
                  fontSize: 14,
                  lineHeight: 1.7,
                  color: theme.subtext,
                  maxWidth: 680,
                }}
              >
                A calm riding-and-photo journal with Leica restraint and Rapha
                warmth. Quick to capture today, easy to browse later.
              </div>
            </div>

            <ActionButton onClick={startNewEntry}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                <Plus size={16} />
                Add entry
              </span>
            </ActionButton>
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <TabButton
            active={activeTab === "today"}
            onClick={() => setActiveTab("today")}
          >
            Today
          </TabButton>
          <TabButton
            active={activeTab === "history"}
            onClick={() => setActiveTab("history")}
          >
            History
          </TabButton>
        </div>

        {showForm && (
          <div
            style={{
              position: isMobile ? "fixed" : "relative",
              inset: isMobile ? 0 : "auto",
              background: isMobile ? theme.bg : theme.panel,
              zIndex: 1000,
              overflowY: "auto",
              padding: isMobile ? "20px" : "24px",
              border: isMobile ? "none" : `1px solid ${theme.borderStrong}`,
              borderRadius: isMobile ? 0 : 30,
              marginBottom: isMobile ? 0 : 20,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 14,
                marginBottom: 18,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 24,
                    fontWeight: 600,
                    color: theme.text,
                    marginBottom: 6,
                    letterSpacing: "-0.01em",
                  }}
                >
                  {editing ? "Edit entry" : "New entry"}
                </div>
                <div style={{ fontSize: 13, color: theme.subtext, lineHeight: 1.6 }}>
                  Fast enough for phone use, clean enough to grow into a proper journal.
                </div>
              </div>

              <IconButton
                onClick={() => {
                  setShowForm(false);
                  setEditing(null);
                }}
              >
                <X size={18} color={theme.text} />
              </IconButton>
            </div>

            <EntryForm
              onSave={handleSave}
              onCancel={() => {
                setShowForm(false);
                setEditing(null);
              }}
              initialEntry={editing}
              defaultDate={activeTab === "history" ? selectedDate : todayString()}
            />
          </div>
        )}

        {activeTab === "today" ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile
                ? "1fr"
                : "minmax(0, 1.15fr) minmax(280px, 0.85fr)",
              gap: 20,
            }}
          >
            <div
              style={{
                background: theme.panel,
                border: `1px solid ${theme.borderStrong}`,
                borderRadius: 30,
                padding: 22,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: 12,
                  marginBottom: 18,
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 24,
                      fontWeight: 600,
                      color: theme.text,
                      letterSpacing: "-0.01em",
                      marginBottom: 4,
                    }}
                  >
                    Today
                  </div>
                  <div style={{ fontSize: 13, color: theme.subtext, lineHeight: 1.6 }}>
                    {prettyDate(todayString())}
                  </div>
                </div>

                <div
                  style={{
                    background: theme.white,
                    border: `1px solid ${theme.border}`,
                    borderRadius: 14,
                    padding: "9px 13px",
                    fontSize: 13,
                    color: theme.subtext,
                  }}
                >
                  {todayEntries.length} {todayEntries.length === 1 ? "entry" : "entries"}
                </div>
              </div>

              <div style={{ display: "grid", gap: 16 }}>
                {todayEntries.length > 0 ? (
                  todayEntries.map((entry) => (
                    <EntryCard
                      key={entry.id}
                      entry={entry}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                    />
                  ))
                ) : (
                  <EmptyState
                    title="No entries for this date."
                    body="A ride, a walk, a cafe stop, a photo note — add one and this starts feeling like a real journal."
                  />
                )}
              </div>
            </div>

            <div
              style={{
                background: theme.panel,
                border: `1px solid ${theme.borderStrong}`,
                borderRadius: 30,
                padding: 22,
              }}
            >
              <div style={{ marginBottom: 18 }}>
                <div
                  style={{
                    fontSize: 24,
                    fontWeight: 600,
                    color: theme.text,
                    letterSpacing: "-0.01em",
                    marginBottom: 4,
                  }}
                >
                  Recent dates
                </div>
                <div style={{ fontSize: 13, color: theme.subtext, lineHeight: 1.6 }}>
                  Quick jump into your archive.
                </div>
              </div>

              <div style={{ display: "grid", gap: 10 }}>
                {historyDates.length > 0 ? (
                  historyDates.slice(0, 10).map((date) => {
                    const count = entries.filter((entry) => entry.date === date).length;
                    const active = selectedDate === date;

                    return (
                      <button
                        key={date}
                        onClick={() => {
                          setSelectedDate(date);
                          setActiveTab("history");
                        }}
                        style={{
                          width: "100%",
                          textAlign: "left",
                          padding: "14px 16px",
                          borderRadius: 16,
                          border: `1px solid ${
                            active ? theme.borderStrong : theme.border
                          }`,
                          background: active ? theme.panel2 : theme.white,
                          cursor: "pointer",
                          color: theme.text,
                          fontFamily: "inherit",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: 12,
                          }}
                        >
                          <div>
                            <div
                              style={{
                                fontWeight: 600,
                                marginBottom: 4,
                                fontSize: 14,
                              }}
                            >
                              {prettyDate(date)}
                            </div>
                            <div style={{ fontSize: 12, color: theme.subtext }}>
                              Browse this day
                            </div>
                          </div>
                          <div style={{ fontSize: 12, color: theme.subtext }}>{count}</div>
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <EmptyState
                    title="No history yet."
                    body="Once you add a few entries, your recent dates will appear here."
                  />
                )}
              </div>
            </div>
          </div>
        ) : (
          <div
            style={{
              background: theme.panel,
              border: `1px solid ${theme.borderStrong}`,
              borderRadius: 30,
              padding: 22,
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile
                  ? "1fr"
                  : "minmax(240px, 0.9fr) minmax(280px, 1.1fr)",
                gap: 18,
                alignItems: "end",
                marginBottom: 20,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 24,
                    fontWeight: 600,
                    color: theme.text,
                    letterSpacing: "-0.01em",
                    marginBottom: 4,
                  }}
                >
                  History
                </div>
                <div style={{ fontSize: 13, color: theme.subtext, lineHeight: 1.6 }}>
                  Review older rides, cafes, notes, and photo days without clutter.
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isMobile
                    ? "1fr"
                    : "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: 14,
                }}
              >
                <Field label="Choose date">
                  <div style={{ position: "relative" }}>
                    <CalendarDays
                      size={16}
                      color={theme.subtext}
                      style={{
                        position: "absolute",
                        left: 12,
                        top: "50%",
                        transform: "translateY(-50%)",
                      }}
                    />
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      style={{ ...baseInputStyle, paddingLeft: 38 }}
                    />
                  </div>
                </Field>

                <Field label="Search">
                  <div style={{ position: "relative" }}>
                    <Search
                      size={16}
                      color={theme.subtext}
                      style={{
                        position: "absolute",
                        left: 12,
                        top: "50%",
                        transform: "translateY(-50%)",
                      }}
                    />
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Cafe, ride, note..."
                      style={{ ...baseInputStyle, paddingLeft: 38 }}
                    />
                  </div>
                </Field>
              </div>
            </div>

            <div style={{ marginBottom: 18 }}>
              <div
                style={{
                  fontSize: 20,
                  fontWeight: 600,
                  color: theme.text,
                  marginBottom: 4,
                  letterSpacing: "-0.01em",
                }}
              >
                {prettyDate(selectedDate)}
              </div>
              <div style={{ fontSize: 13, color: theme.subtext }}>
                {filteredHistory.length}{" "}
                {filteredHistory.length === 1 ? "entry" : "entries"}
              </div>
            </div>

            <div style={{ display: "grid", gap: 16 }}>
              {filteredHistory.length > 0 ? (
                filteredHistory.map((entry) => (
                  <EntryCard
                    key={entry.id}
                    entry={entry}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))
              ) : (
                <EmptyState
                  title="No entries for this date."
                  body="Pick another date, or use Add entry to backfill the day."
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}