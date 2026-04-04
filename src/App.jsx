import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Bike,
  Footprints,
  Coffee,
  BookOpen,
  CalendarDays,
  Clock3,
  MapPin,
  Camera,
  Image as ImageIcon,
  Pencil,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const STORAGE_KEY = "daily-frame-journal-v1";

const ACTIVITY_TYPES = [
  {
    key: "Ride",
    label: "Ride",
    icon: Bike,
    needsDuration: true,
    titlePlaceholder: "Ride title",
    notePlaceholder: "Route, effort, weather, a detail worth keeping...",
  },
  {
    key: "Walk",
    label: "Walk",
    icon: Footprints,
    needsDuration: true,
    titlePlaceholder: "Walk title",
    notePlaceholder: "Where it led, what you noticed, pace, mood...",
  },
  {
    key: "Cafe",
    label: "Cafe",
    icon: Coffee,
    needsDuration: false,
    titlePlaceholder: "Cafe title",
    notePlaceholder: "Coffee, pastry, service, atmosphere...",
  },
  {
    key: "Journal",
    label: "Journal",
    icon: BookOpen,
    needsDuration: false,
    titlePlaceholder: "Journal title",
    notePlaceholder: "A note from the day...",
  },
];

const emptyEntry = (type = "Ride") => ({
  id: "",
  type,
  title: "",
  note: "",
  date: todayDate(),
  time: nowTime(),
  place: "",
  duration: "",
  rating: "",
  images: [],
  createdAt: new Date().toISOString(),
});

function todayDate() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function nowTime() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function formatDisplayDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(`${dateStr}T12:00:00`);
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatMonthYear(dateStr) {
  const d = new Date(`${dateStr}T12:00:00`);
  return d.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

function monthKeyFromDate(dateStr) {
  return dateStr?.slice(0, 7) || todayDate().slice(0, 7);
}

function monthLabel(monthKey) {
  const [year, month] = monthKey.split("-");
  const d = new Date(Number(year), Number(month) - 1, 1);
  return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function sortEntries(entries) {
  return [...entries].sort((a, b) => {
    const aStamp = `${a.date || ""} ${a.time || ""}`;
    const bStamp = `${b.date || ""} ${b.time || ""}`;
    return bStamp.localeCompare(aStamp);
  });
}

function readFilesAsDataUrls(files) {
  return Promise.all(
    Array.from(files).map(
      (file) =>
        new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve({ id: crypto.randomUUID(), name: file.name, url: reader.result });
          reader.onerror = reject;
          reader.readAsDataURL(file);
        })
    )
  );
}

function cls(...items) {
  return items.filter(Boolean).join(" ");
}

export default function App() {
  const [entries, setEntries] = useState([]);
  const [activeView, setActiveView] = useState("Journal");
  const [selectedType, setSelectedType] = useState("Ride");
  const [form, setForm] = useState(emptyEntry("Ride"));
  const [editingId, setEditingId] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(todayDate().slice(0, 7));
  const [lightboxImage, setLightboxImage] = useState("");
  const fileInputRef = useRef(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const sorted = sortEntries(parsed);
          setEntries(sorted);
          if (sorted[0]?.date) setSelectedMonth(monthKeyFromDate(sorted[0].date));
        }
      }
    } catch (error) {
      console.error("Failed to read entries", error);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch (error) {
      console.error("Failed to save entries", error);
    }
  }, [entries]);

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      type: selectedType,
      duration: ACTIVITY_TYPES.find((item) => item.key === selectedType)?.needsDuration ? prev.duration : "",
      rating: selectedType === "Cafe" ? prev.rating : "",
    }));
  }, [selectedType]);

  const activityMeta = useMemo(
    () => ACTIVITY_TYPES.find((item) => item.key === selectedType) || ACTIVITY_TYPES[0],
    [selectedType]
  );

  const groupedJournal = useMemo(() => {
    const sorted = sortEntries(entries);
    return sorted.reduce((acc, entry) => {
      if (!acc[entry.date]) acc[entry.date] = [];
      acc[entry.date].push(entry);
      return acc;
    }, {});
  }, [entries]);

  const monthsWithEntries = useMemo(() => {
    const unique = [...new Set(entries.map((item) => monthKeyFromDate(item.date)))];
    return unique.sort((a, b) => b.localeCompare(a));
  }, [entries]);

  useEffect(() => {
    if (!monthsWithEntries.length) return;
    if (!monthsWithEntries.includes(selectedMonth)) {
      setSelectedMonth(monthsWithEntries[0]);
    }
  }, [monthsWithEntries, selectedMonth]);

  const summaryEntries = useMemo(
    () => entries.filter((item) => monthKeyFromDate(item.date) === selectedMonth),
    [entries, selectedMonth]
  );

  const summaryStats = useMemo(() => {
    const stats = {
      total: summaryEntries.length,
      Ride: 0,
      Walk: 0,
      Cafe: 0,
      Journal: 0,
      rideMinutes: 0,
      walkMinutes: 0,
      cafeRated: 0,
      images: 0,
    };

    summaryEntries.forEach((item) => {
      if (stats[item.type] !== undefined) stats[item.type] += 1;
      if (item.type === "Ride") stats.rideMinutes += Number(item.duration || 0);
      if (item.type === "Walk") stats.walkMinutes += Number(item.duration || 0);
      if (item.type === "Cafe" && item.rating) stats.cafeRated += 1;
      stats.images += Array.isArray(item.images) ? item.images.length : 0;
    });

    return stats;
  }, [summaryEntries]);

  const summaryGroups = useMemo(() => {
    return summaryEntries.reduce((acc, item) => {
      const label = formatDisplayDate(item.date);
      if (!acc[label]) acc[label] = [];
      acc[label].push(item);
      return acc;
    }, {});
  }, [summaryEntries]);

  const handleTypeSelect = (type) => {
    setSelectedType(type);
    if (!editingId) {
      setForm((prev) => ({
        ...emptyEntry(type),
        date: prev.date || todayDate(),
        time: prev.time || nowTime(),
        images: prev.images || [],
      }));
    }
  };

  const handleFormChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const clearForm = () => {
    setEditingId("");
    setSelectedType("Ride");
    setForm(emptyEntry("Ride"));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleImages = async (event) => {
    const files = event.target.files;
    if (!files?.length) return;
    try {
      const newImages = await readFilesAsDataUrls(files);
      setForm((prev) => ({
        ...prev,
        images: [...(prev.images || []), ...newImages],
      }));
    } catch (error) {
      console.error("Image load failed", error);
    }
  };

  const removeImage = (imageId) => {
    setForm((prev) => ({
      ...prev,
      images: (prev.images || []).filter((img) => img.id !== imageId),
    }));
  };

  const handleSubmit = () => {
    const next = {
      ...form,
      id: editingId || crypto.randomUUID(),
      type: selectedType,
      createdAt: form.createdAt || new Date().toISOString(),
    };

    if (!next.title.trim() && !next.note.trim() && !next.place.trim()) return;

    setEntries((prev) => {
      const updated = editingId
        ? prev.map((item) => (item.id === editingId ? next : item))
        : [next, ...prev];
      return sortEntries(updated);
    });

    setSelectedMonth(monthKeyFromDate(next.date));
    clearForm();
  };

  const handleEdit = (entry) => {
    setEditingId(entry.id);
    setSelectedType(entry.type);
    setActiveView("Journal");
    setForm({
      ...entry,
      images: Array.isArray(entry.images) ? entry.images : [],
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = (id) => {
    setEntries((prev) => prev.filter((item) => item.id !== id));
    if (editingId === id) clearForm();
  };

  const goMonth = (direction) => {
    const [year, month] = selectedMonth.split("-").map(Number);
    const d = new Date(year, month - 1 + direction, 1);
    const nextMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    setSelectedMonth(nextMonth);
  };

  return (
    <div className="min-h-screen bg-[#f6f3ee] text-[#2d2a26]">
      <div className="mx-auto max-w-3xl px-4 pb-24 pt-6 sm:px-6">
        <header className="mb-5 rounded-[28px] border border-[#d9d1c5] bg-[#fbf8f3] px-5 py-5 shadow-[0_10px_30px_rgba(60,50,40,0.04)]">
          <div className="mb-3 flex items-start justify-between gap-4">
            <div>
              <div className="text-[11px] uppercase tracking-[0.24em] text-[#8f816b]">Daily Frame.</div>
              <h1 className="mt-1 text-[27px] font-medium tracking-[-0.03em] text-[#3a342d]">Ride the day. Keep the moment.</h1>
            </div>
            <div className="hidden text-right sm:block">
              <div className="text-[11px] uppercase tracking-[0.24em] text-[#9b907f]">Month</div>
              <div className="mt-1 text-sm text-[#60584f]">{monthLabel(selectedMonth)}</div>
            </div>
          </div>

          <div className="flex gap-2">
            {[
              { key: "Journal", label: "Journal" },
              { key: "Summary", label: "Summary" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveView(tab.key)}
                className={cls(
                  "rounded-full border px-4 py-2 text-sm transition",
                  activeView === tab.key
                    ? "border-[#8f816b] bg-[#8f816b] text-white"
                    : "border-[#d8d0c4] bg-white text-[#655c52] hover:border-[#beb3a4]"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </header>

        <section className="mb-5 rounded-[28px] border border-[#ded6ca] bg-[#fbf8f4] p-4 shadow-[0_10px_24px_rgba(60,50,40,0.04)] sm:p-5">
          <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
            {ACTIVITY_TYPES.map((item) => {
              const Icon = item.icon;
              const active = selectedType === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => handleTypeSelect(item.key)}
                  className={cls(
                    "inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-sm transition",
                    active
                      ? "border-[#8f816b] bg-[#efe7dc] text-[#433b32]"
                      : "border-[#ddd4c7] bg-white text-[#6b6358] hover:border-[#c7bcae]"
                  )}
                >
                  <Icon size={15} />
                  {item.label}
                </button>
              );
            })}
          </div>

          <div className="grid gap-3">
            <div>
              <label className="mb-1 block text-[11px] uppercase tracking-[0.2em] text-[#8d8171]">Title</label>
              <input
                value={form.title}
                onChange={(e) => handleFormChange("title", e.target.value)}
                placeholder={activityMeta.titlePlaceholder}
                className="w-full rounded-2xl border border-[#d9d1c5] bg-white px-4 py-3 text-sm outline-none transition placeholder:text-[#b3a89b] focus:border-[#8f816b]"
              />
            </div>

            <div>
              <label className="mb-1 block text-[11px] uppercase tracking-[0.2em] text-[#8d8171]">Note</label>
              <textarea
                value={form.note}
                onChange={(e) => handleFormChange("note", e.target.value)}
                placeholder={activityMeta.notePlaceholder}
                rows={4}
                className="w-full rounded-2xl border border-[#d9d1c5] bg-white px-4 py-3 text-sm outline-none transition placeholder:text-[#b3a89b] focus:border-[#8f816b]"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field icon={CalendarDays} label="Date">
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => handleFormChange("date", e.target.value)}
                  className="w-full bg-transparent text-sm outline-none"
                />
              </Field>
              <Field icon={Clock3} label="Time">
                <input
                  type="time"
                  value={form.time}
                  onChange={(e) => handleFormChange("time", e.target.value)}
                  className="w-full bg-transparent text-sm outline-none"
                />
              </Field>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field icon={MapPin} label="Place">
                <input
                  value={form.place}
                  onChange={(e) => handleFormChange("place", e.target.value)}
                  placeholder="Location"
                  className="w-full bg-transparent text-sm outline-none placeholder:text-[#b3a89b]"
                />
              </Field>

              {activityMeta.needsDuration ? (
                <Field icon={Clock3} label="Duration">
                  <input
                    inputMode="numeric"
                    value={form.duration}
                    onChange={(e) => handleFormChange("duration", e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="Minutes"
                    className="w-full bg-transparent text-sm outline-none placeholder:text-[#b3a89b]"
                  />
                </Field>
              ) : selectedType === "Cafe" ? (
                <Field icon={Coffee} label="Rating">
                  <input
                    value={form.rating}
                    onChange={(e) => handleFormChange("rating", e.target.value)}
                    placeholder="Optional"
                    className="w-full bg-transparent text-sm outline-none placeholder:text-[#b3a89b]"
                  />
                </Field>
              ) : (
                <div className="hidden sm:block" />
              )}
            </div>

            <div>
              <label className="mb-2 block text-[11px] uppercase tracking-[0.2em] text-[#8d8171]">Photos</label>
              <div className="rounded-[24px] border border-[#d9d1c5] bg-white p-3">
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-[#cfc6b8] px-4 py-5 text-sm text-[#6d645a] transition hover:border-[#8f816b] hover:text-[#494037]">
                  <Camera size={16} />
                  Choose image
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImages}
                    className="hidden"
                  />
                </label>

                {form.images?.length > 0 ? (
                  <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {form.images.map((img) => (
                      <div key={img.id} className="group relative overflow-hidden rounded-2xl border border-[#e2dbd0] bg-[#f3eee7]">
                        <img src={img.url} alt={img.name || "Upload"} className="aspect-square h-full w-full object-cover" />
                        <button
                          onClick={() => removeImage(img.id)}
                          className="absolute right-1.5 top-1.5 rounded-full bg-[rgba(40,35,30,0.78)] p-1 text-white opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100"
                          aria-label="Remove image"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={handleSubmit}
                className="rounded-full bg-[#8f816b] px-5 py-2.5 text-sm text-white transition hover:bg-[#7d705d]"
              >
                {editingId ? "Update Entry" : "Add Entry"}
              </button>
              <button
                onClick={clearForm}
                className="rounded-full border border-[#d6cec2] bg-white px-5 py-2.5 text-sm text-[#645c53] transition hover:border-[#bdb2a4]"
              >
                Clear
              </button>
            </div>
          </div>
        </section>

        {activeView === "Journal" ? (
          <section className="space-y-6">
            {Object.keys(groupedJournal).length === 0 ? (
              <EmptyState
                title="No entries yet."
                text="Start with a ride, a walk, a cafe stop, or a small note from the day."
              />
            ) : (
              Object.entries(groupedJournal).map(([date, dayEntries]) => (
                <div key={date}>
                  <div className="mb-3">
                    <div className="text-[11px] uppercase tracking-[0.24em] text-[#8f816b]">{formatMonthYear(date)}</div>
                    <h2 className="mt-1 text-lg font-medium tracking-[-0.02em] text-[#3b352d]">{formatDisplayDate(date)}</h2>
                  </div>

                  <div className="space-y-3">
                    {dayEntries.map((entry) => (
                      <EntryCard
                        key={entry.id}
                        entry={entry}
                        onEdit={() => handleEdit(entry)}
                        onDelete={() => handleDelete(entry.id)}
                        onImageClick={(url) => setLightboxImage(url)}
                      />
                    ))}
                  </div>
                </div>
              ))
            )}
          </section>
        ) : (
          <section className="space-y-5">
            <div className="rounded-[28px] border border-[#ddd5c8] bg-[#fbf8f4] p-4 shadow-[0_10px_24px_rgba(60,50,40,0.04)] sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <button
                  onClick={() => goMonth(-1)}
                  className="rounded-full border border-[#d5ccbf] bg-white p-2 text-[#645b51] hover:border-[#bcb0a1]"
                  aria-label="Previous month"
                >
                  <ChevronLeft size={18} />
                </button>

                <div className="text-center">
                  <div className="text-[11px] uppercase tracking-[0.24em] text-[#8f816b]">Monthly Summary</div>
                  <h2 className="mt-1 text-[24px] font-medium tracking-[-0.03em] text-[#3a342d]">{monthLabel(selectedMonth)}</h2>
                </div>

                <button
                  onClick={() => goMonth(1)}
                  className="rounded-full border border-[#d5ccbf] bg-white p-2 text-[#645b51] hover:border-[#bcb0a1]"
                  aria-label="Next month"
                >
                  <ChevronRight size={18} />
                </button>
              </div>

              {monthsWithEntries.length > 0 ? (
                <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                  {monthsWithEntries.map((month) => (
                    <button
                      key={month}
                      onClick={() => setSelectedMonth(month)}
                      className={cls(
                        "shrink-0 rounded-full border px-3 py-1.5 text-sm transition",
                        month === selectedMonth
                          ? "border-[#8f816b] bg-[#efe7dc] text-[#433b32]"
                          : "border-[#ddd4c7] bg-white text-[#6b6358]"
                      )}
                    >
                      {monthLabel(month)}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <StatCard label="Total entries" value={summaryStats.total} />
              <StatCard label="Rides" value={summaryStats.Ride} sub={summaryStats.rideMinutes ? `${summaryStats.rideMinutes} min` : ""} />
              <StatCard label="Walks" value={summaryStats.Walk} sub={summaryStats.walkMinutes ? `${summaryStats.walkMinutes} min` : ""} />
              <StatCard label="Cafes" value={summaryStats.Cafe} sub={summaryStats.cafeRated ? `${summaryStats.cafeRated} rated` : ""} />
              <StatCard label="Journal notes" value={summaryStats.Journal} />
              <StatCard label="Photos" value={summaryStats.images} />
            </div>

            {summaryEntries.length === 0 ? (
              <EmptyState
                title="No entries for this month."
                text="Try another month or add a new note, ride, walk, or cafe visit."
              />
            ) : (
              <div className="space-y-5">
                {Object.entries(summaryGroups).map(([label, dayEntries]) => (
                  <div key={label}>
                    <div className="mb-2 text-[11px] uppercase tracking-[0.22em] text-[#8f816b]">{label}</div>
                    <div className="space-y-3">
                      {dayEntries.map((entry) => (
                        <EntryCard
                          key={entry.id}
                          entry={entry}
                          onEdit={() => handleEdit(entry)}
                          onDelete={() => handleDelete(entry.id)}
                          onImageClick={(url) => setLightboxImage(url)}
                          compact
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>

      {lightboxImage ? (
        <button
          onClick={() => setLightboxImage("")}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(20,18,16,0.88)] p-4"
        >
          <img src={lightboxImage} alt="Expanded entry" className="max-h-[92vh] max-w-[92vw] rounded-2xl object-contain" />
        </button>
      ) : null}
    </div>
  );
}

function Field({ icon: Icon, label, children }) {
  return (
    <div className="rounded-2xl border border-[#d9d1c5] bg-white px-4 py-3">
      <div className="mb-1 flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-[#8d8171]">
        <Icon size={13} />
        {label}
      </div>
      {children}
    </div>
  );
}

function StatCard({ label, value, sub = "" }) {
  return (
    <div className="rounded-[24px] border border-[#ddd5c8] bg-[#fbf8f4] px-4 py-4 shadow-[0_8px_20px_rgba(60,50,40,0.03)]">
      <div className="text-[11px] uppercase tracking-[0.22em] text-[#8f816b]">{label}</div>
      <div className="mt-2 text-[30px] font-medium tracking-[-0.04em] text-[#3a342d]">{value}</div>
      {sub ? <div className="mt-1 text-sm text-[#6b6358]">{sub}</div> : null}
    </div>
  );
}

function EntryCard({ entry, onEdit, onDelete, onImageClick, compact = false }) {
  const typeMeta = ACTIVITY_TYPES.find((item) => item.key === entry.type) || ACTIVITY_TYPES[0];
  const Icon = typeMeta.icon;

  return (
    <article className="overflow-hidden rounded-[28px] border border-[#ddd5c8] bg-[#fbf8f4] shadow-[0_10px_24px_rgba(60,50,40,0.04)]">
      {entry.images?.length ? (
        <div className={cls("grid gap-[1px] bg-[#e7dfd4]", entry.images.length === 1 ? "grid-cols-1" : "grid-cols-2")}>
          {entry.images.map((img) => (
            <button
              key={img.id}
              onClick={() => onImageClick(img.url)}
              className="bg-[#f3eee7]"
            >
              <img
                src={img.url}
                alt={img.name || entry.title || entry.type}
                className={cls(
                  "w-full object-cover",
                  entry.images.length === 1 ? "max-h-[420px]" : compact ? "h-40" : "h-48"
                )}
              />
            </button>
          ))}
        </div>
      ) : null}

      <div className="p-4 sm:p-5">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <div className="mb-1 flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-[#8f816b]">
              <Icon size={13} />
              {entry.type}
              {entry.time ? <span className="text-[#b0a393]">|</span> : null}
              {entry.time ? <span>{entry.time}</span> : null}
              {entry.place ? <span className="text-[#b0a393]">|</span> : null}
              {entry.place ? <span>{entry.place}</span> : null}
            </div>
            <h3 className="text-[21px] font-medium tracking-[-0.03em] text-[#3a342d]">{entry.title || entry.type}</h3>
          </div>

          <div className="flex gap-2">
            <button
              onClick={onEdit}
              className="rounded-full border border-[#d6cec2] bg-white p-2 text-[#645c53] hover:border-[#bdb2a4]"
              aria-label="Edit entry"
            >
              <Pencil size={15} />
            </button>
            <button
              onClick={onDelete}
              className="rounded-full border border-[#d6cec2] bg-white p-2 text-[#645c53] hover:border-[#bdb2a4]"
              aria-label="Delete entry"
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>

        {(entry.duration || entry.rating) && (
          <div className="mb-3 flex flex-wrap gap-2 text-xs text-[#62594f]">
            {entry.duration ? (
              <span className="rounded-full bg-[#efe7dc] px-3 py-1">{entry.duration} min</span>
            ) : null}
            {entry.rating ? <span className="rounded-full bg-[#efe7dc] px-3 py-1">Rating: {entry.rating}</span> : null}
          </div>
        )}

        {entry.note ? <p className="text-[15px] leading-6 text-[#4f473f]">{entry.note}</p> : null}

        <div className="mt-4 flex items-center gap-2 text-[12px] text-[#8a7e6e]">
          <CalendarDays size={13} />
          {formatDisplayDate(entry.date)}
          {entry.images?.length ? (
            <>
              <span className="text-[#b0a393]">•</span>
              <ImageIcon size={13} />
              {entry.images.length}
            </>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function EmptyState({ title, text }) {
  return (
    <div className="rounded-[28px] border border-[#ddd5c8] bg-[#fbf8f4] px-5 py-10 text-center shadow-[0_10px_24px_rgba(60,50,40,0.04)]">
      <div className="text-[11px] uppercase tracking-[0.22em] text-[#8f816b]">Daily Frame</div>
      <h3 className="mt-2 text-[22px] font-medium tracking-[-0.03em] text-[#3a342d]">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#655d53]">{text}</p>
    </div>
  );
}
