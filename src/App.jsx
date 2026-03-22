import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Bike,
  Footprints,
  Coffee,
  BookOpen,
  Search,
  Trash2,
  Pencil,
  CalendarDays,
  Clock3,
  MapPin,
  X,
  Image as ImageIcon,
} from "lucide-react";

const STORAGE_KEY = "daily-frame-capture-mode-v4";

const TYPE_META = {
  Ride: { label: "RIDE", icon: Bike },
  Walk: { label: "WALK", icon: Footprints },
  Cafe: { label: "CAFE", icon: Coffee },
  Notes: { label: "NOTES", icon: BookOpen },
};

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function nowTimeString() {
  const d = new Date();
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

function makeEmptyForm(type = "Ride", date = todayString()) {
  return {
    id: null,
    type,
    title: "",
    place: "",
    note: "",
    date,
    time: nowTimeString(),
    image: "",
  };
}

function formatDateLabel(dateStr) {
  if (!dateStr) return "";
  const d = new Date(`${dateStr}T12:00:00`);
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTimeLabel(timeStr) {
  if (!timeStr) return "";
  const [hour, minute] = timeStr.split(":");
  const d = new Date();
  d.setHours(Number(hour || 0));
  d.setMinutes(Number(minute || 0));
  return d.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function PaperDotBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0"
      style={{
        backgroundColor: "#f4f0e8",
        backgroundImage:
          "radial-gradient(circle at 1px 1px, rgba(143, 122, 92, 0.22) 1px, transparent 0)",
        backgroundSize: "24px 24px",
      }}
    />
  );
}

function EntryCard({ entry, onEdit, onDelete }) {
  const meta = TYPE_META[entry.type] || TYPE_META.Notes;
  const Icon = meta.icon;

  return (
    <article className="group overflow-hidden rounded-[22px] border border-[#d8d0c4] bg-[#fbf8f2]/96 shadow-[0_8px_30px_rgba(80,62,38,0.06)] transition hover:-translate-y-[1px] hover:shadow-[0_10px_32px_rgba(80,62,38,0.10)]">
      {entry.image ? (
        <div className="relative aspect-[4/3] w-full overflow-hidden border-b border-[#e3ddd3] bg-[#efebe3]">
          <img
            src={entry.image}
            alt={entry.title || entry.place || entry.type}
            className="h-full w-full object-cover"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent" />
        </div>
      ) : (
        <div className="flex aspect-[4/3] w-full items-center justify-center border-b border-[#e3ddd3] bg-[#f1ece3] text-[#9f937f]">
          <div className="flex flex-col items-center gap-2">
            <ImageIcon size={20} strokeWidth={1.6} />
            <span className="text-[10px] uppercase tracking-[0.28em]">
              No Image
            </span>
          </div>
        </div>
      )}

      <div className="p-5 sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-3 flex items-center gap-2 text-[9px] font-normal tracking-[0.32em] text-[#9c8f7d]">
              <Icon size={12} strokeWidth={1.7} />
              <span>{meta.label}</span>
            </div>

            <h3 className="line-clamp-2 text-[16px] font-light leading-[1.35] text-[#2f2922]">
              {entry.title?.trim() || entry.place?.trim() || "Untitled entry"}
            </h3>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 opacity-75 transition group-hover:opacity-100">
            <button
              type="button"
              onClick={() => onEdit(entry)}
              className="rounded-full border border-[#ddd4c7] bg-[#f8f4ec] p-2 text-[#746756] transition hover:bg-[#efe9de] hover:text-[#2a241d]"
              title="Edit entry"
            >
              <Pencil size={14} strokeWidth={1.7} />
            </button>
            <button
              type="button"
              onClick={() => onDelete(entry.id)}
              className="rounded-full border border-[#ddd4c7] bg-[#f8f4ec] p-2 text-[#746756] transition hover:bg-[#efe9de] hover:text-[#2a241d]"
              title="Delete entry"
            >
              <Trash2 size={14} strokeWidth={1.7} />
            </button>
          </div>
        </div>

        {entry.note?.trim() ? (
          <p className="mb-5 line-clamp-5 whitespace-pre-wrap text-[13.5px] leading-[1.7] text-[#6b5f50]">
            {entry.note}
          </p>
        ) : (
          <p className="mb-5 text-[13px] italic text-[#9b8f7f]">
            No notes added.
          </p>
        )}

        <div className="border-t border-[#e5ddd2] pt-4">
          <div className="grid gap-2 text-[9px] uppercase tracking-[0.24em] text-[#a09483] sm:grid-cols-3">
            <div className="flex items-center gap-2">
              <CalendarDays size={12} strokeWidth={1.5} />
              <span className="truncate">{formatDateLabel(entry.date)}</span>
            </div>

            <div className="flex items-center gap-2">
              <Clock3 size={12} strokeWidth={1.5} />
              <span>{formatTimeLabel(entry.time)}</span>
            </div>

            <div className="flex items-center gap-2">
              <MapPin size={12} strokeWidth={1.5} />
              <span className="truncate">{entry.place?.trim() || "—"}</span>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function App() {
  const [entries, setEntries] = useState([]);
  const [view, setView] = useState("today");
  const [selectedDate, setSelectedDate] = useState(todayString());
  const [searchTerm, setSearchTerm] = useState("");
  const [editorOpen, setEditorOpen] = useState(true);
  const [form, setForm] = useState(makeEmptyForm("Ride", todayString()));

  const fileInputRef = useRef(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) setEntries(parsed);
    } catch (error) {
      console.error("Failed to load entries:", error);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }, [entries]);

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      date: view === "today" ? todayString() : selectedDate,
    }));
  }, [view, selectedDate]);

  const filteredEntries = useMemo(() => {
    const targetDate = view === "today" ? todayString() : selectedDate;

    let list = entries.filter((item) => item.date === targetDate);

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter((item) =>
        [item.type, item.title, item.place, item.note]
          .join(" ")
          .toLowerCase()
          .includes(q)
      );
    }

    return [...list].sort((a, b) => {
      const aa = `${a.date} ${a.time || "00:00"}`;
      const bb = `${b.date} ${b.time || "00:00"}`;
      return bb.localeCompare(aa);
    });
  }, [entries, view, selectedDate, searchTerm]);

  const allDates = useMemo(() => {
    const set = new Set(entries.map((item) => item.date).filter(Boolean));
    return [...set].sort((a, b) => b.localeCompare(a));
  }, [entries]);

  const hasEntries = filteredEntries.length > 0;

  function handleChange(field, value) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function openNewEntry(type) {
    const targetDate = view === "today" ? todayString() : selectedDate;
    setForm(makeEmptyForm(type, targetDate));
    setEditorOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleImageUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setForm((prev) => ({
        ...prev,
        image: String(reader.result || ""),
      }));
    };
    reader.readAsDataURL(file);
  }

  function clearImage() {
    setForm((prev) => ({
      ...prev,
      image: "",
    }));
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function resetForm() {
    setForm(
      makeEmptyForm(form.type, view === "today" ? todayString() : selectedDate)
    );
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleSubmit(e) {
    e.preventDefault();

    const cleanTitle = form.title.trim();
    const cleanPlace = form.place.trim();
    const cleanNote = form.note.trim();

    if (!cleanTitle && !cleanPlace && !cleanNote) return;

    const payload = {
      ...form,
      title: cleanTitle,
      place: cleanPlace,
      note: cleanNote,
      id: form.id || crypto.randomUUID(),
    };

    setEntries((prev) => {
      const exists = prev.some((item) => item.id === payload.id);
      if (exists) {
        return prev.map((item) => (item.id === payload.id ? payload : item));
      }
      return [payload, ...prev];
    });

    setForm(makeEmptyForm(form.type, form.date));
    setEditorOpen(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleEdit(entry) {
    setForm({ ...entry });
    setEditorOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleDelete(id) {
    setEntries((prev) => prev.filter((item) => item.id !== id));
    if (form.id === id) resetForm();
  }

  function placeholderTitle(type) {
    if (type === "Ride") return "Morning loop";
    if (type === "Walk") return "After work walk";
    if (type === "Cafe") return "Cafe name";
    return "Quick title";
  }

  const meta = TYPE_META[form.type] || TYPE_META.Notes;
  const ActiveIcon = meta.icon;

  return (
    <div className="min-h-screen bg-[#f4f0e8] text-[#2a241d]">
      <div className="relative min-h-screen overflow-hidden">
        <PaperDotBackground />

        <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 pb-14 pt-6 sm:px-6 lg:px-8">
          <header className="mb-6 rounded-[22px] border border-[#ddd5c8] bg-[#f8f4ec]/94 px-5 py-5 shadow-[0_10px_35px_rgba(81,64,40,0.05)] sm:px-7 sm:py-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <h1 className="mt-1 text-[18px] font-semibold tracking-[0.02em] text-[#3a332b] sm:text-[20px]">
                  Daily Frame
                </h1>

                <div className="mt-1 text-[9px] uppercase tracking-[0.36em] text-[#7a6b58] sm:text-[10px]">
                  RIDE | TIME | PLACE
                </div>

                <p className="mt-3 text-[12.5px] italic text-[#8a7c69]">
                  Ride the day. Keep the moment.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setView("today")}
                  className={`rounded-full border px-4 py-2.5 text-[11px] uppercase tracking-[0.28em] transition ${
                    view === "today"
                      ? "border-[#b8aa94] bg-[#ece4d6] text-[#2a241d]"
                      : "border-[#d6cdbf] bg-[#f7f2e8] text-[#7b6f5f] hover:bg-[#eee6d9]"
                  }`}
                >
                  Today
                </button>

                <button
                  type="button"
                  onClick={() => setView("history")}
                  className={`rounded-full border px-4 py-2.5 text-[11px] uppercase tracking-[0.28em] transition ${
                    view === "history"
                      ? "border-[#b8aa94] bg-[#ece4d6] text-[#2a241d]"
                      : "border-[#d6cdbf] bg-[#f7f2e8] text-[#7b6f5f] hover:bg-[#eee6d9]"
                  }`}
                >
                  History
                </button>
              </div>
            </div>
          </header>

          <section className="mb-5 rounded-[24px] border border-[#ddd5c8] bg-[#f8f4ec]/94 p-4 shadow-[0_8px_30px_rgba(81,64,40,0.04)] sm:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 gap-2 overflow-x-auto pb-1">
                {Object.keys(TYPE_META).map((type) => {
                  const typeMeta = TYPE_META[type];
                  const Icon = typeMeta.icon;
                  const active = form.type === type && editorOpen;

                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => openNewEntry(type)}
                      className={`flex shrink-0 items-center gap-2 rounded-full border px-4 py-2.5 text-[11px] uppercase tracking-[0.26em] transition ${
                        active
                          ? "border-[#b8aa94] bg-[#ece4d6] text-[#241e18]"
                          : "border-[#d6cdbf] bg-[#f7f2e8] text-[#7b6f5f] hover:bg-[#eee6d9]"
                      }`}
                    >
                      <Icon size={14} strokeWidth={1.8} />
                      <span>{type}</span>
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                {view === "history" ? (
                  <div className="flex items-center gap-2 rounded-full border border-[#d8cfc2] bg-[#f7f2e8] px-3 py-2.5 text-[#6f6354]">
                    <CalendarDays size={15} strokeWidth={1.8} />
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="bg-transparent text-[13px] outline-none"
                    />
                  </div>
                ) : (
                  <div className="rounded-full border border-[#d8cfc2] bg-[#f7f2e8] px-3 py-2.5 text-[11px] uppercase tracking-[0.24em] text-[#8a7d6b]">
                    {formatDateLabel(todayString())}
                  </div>
                )}

                <div className="flex items-center gap-2 rounded-full border border-[#d8cfc2] bg-[#f7f2e8] px-3 py-2.5 text-[#746857]">
                  <Search size={15} strokeWidth={1.8} />
                  <input
                    type="text"
                    placeholder="Search entries"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-transparent text-[13px] outline-none placeholder:text-[#ac9f8c] sm:w-44"
                  />
                </div>
              </div>
            </div>
          </section>

          {editorOpen && (
            <section className="mb-6 rounded-[28px] border border-[#ddd5c8] bg-[#fbf8f2]/96 p-4 sm:p-5 shadow-[0_10px_35px_rgba(81,64,40,0.05)]">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-[9px] uppercase tracking-[0.28em] text-[#8f816f]">
                  <ActiveIcon size={14} strokeWidth={1.8} />
                  <span>{form.id ? `Edit ${meta.label}` : meta.label}</span>
                </div>

                <button
                  type="button"
                  onClick={() => setEditorOpen(false)}
                  className="rounded-full border border-[#ddd4c8] bg-[#f7f2e8] p-2 text-[#7a6f5f] transition hover:bg-[#eee7da] hover:text-[#241e18]"
                  title="Close editor"
                >
                  <X size={16} strokeWidth={1.8} />
                </button>
              </div>

              <form
                onSubmit={handleSubmit}
                className="grid gap-5 lg:grid-cols-[1.08fr_0.92fr]"
              >
                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-[10px] uppercase tracking-[0.32em] text-[#8f816f]">
                      Title
                    </label>
                    <input
                      type="text"
                      value={form.title}
                      onChange={(e) => handleChange("title", e.target.value)}
                      placeholder={placeholderTitle(form.type)}
                      className="w-full rounded-[18px] border border-[#ddd4c8] bg-[#f8f4ec] px-4 py-3 text-[15px] text-[#2a241d] outline-none transition placeholder:text-[#af9f8a] focus:border-[#bcae97]"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-[10px] uppercase tracking-[0.32em] text-[#8f816f]">
                      Note
                    </label>
                    <textarea
                      rows={5}
                      value={form.note}
                      onChange={(e) => handleChange("note", e.target.value)}
                      placeholder="What happened, what you noticed, what you want to remember."
                      className="w-full rounded-[18px] border border-[#ddd4c8] bg-[#f8f4ec] px-4 py-3 text-[15px] leading-7 text-[#2a241d] outline-none transition placeholder:text-[#af9f8a] focus:border-[#bcae97]"
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-[10px] uppercase tracking-[0.32em] text-[#8f816f]">
                        Date
                      </label>
                      <input
                        type="date"
                        value={form.date}
                        onChange={(e) => handleChange("date", e.target.value)}
                        className="w-full rounded-[18px] border border-[#ddd4c8] bg-[#f8f4ec] px-4 py-3 text-[15px] text-[#2a241d] outline-none transition focus:border-[#bcae97]"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-[10px] uppercase tracking-[0.32em] text-[#8f816f]">
                        Time
                      </label>
                      <input
                        type="time"
                        value={form.time}
                        onChange={(e) => handleChange("time", e.target.value)}
                        className="w-full rounded-[18px] border border-[#ddd4c8] bg-[#f8f4ec] px-4 py-3 text-[15px] text-[#2a241d] outline-none transition focus:border-[#bcae97]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-[10px] uppercase tracking-[0.32em] text-[#8f816f]">
                      Place
                    </label>
                    <input
                      type="text"
                      value={form.place}
                      onChange={(e) => handleChange("place", e.target.value)}
                      placeholder="Add place or location"
                      className="w-full rounded-[18px] border border-[#ddd4c8] bg-[#f8f4ec] px-4 py-3 text-[15px] text-[#2a241d] outline-none transition placeholder:text-[#af9f8a] focus:border-[#bcae97]"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-[10px] uppercase tracking-[0.32em] text-[#8f816f]">
                      Photo
                    </label>

                    <div className="overflow-hidden rounded-[22px] border border-[#ddd4c8] bg-[#f7f2e8]">
                      {form.image ? (
                        <div className="relative aspect-[4/3] w-full">
                          <img
                            src={form.image}
                            alt="Preview"
                            className="h-full w-full object-cover"
                          />
                          <div className="absolute right-3 top-3">
                            <button
                              type="button"
                              onClick={clearImage}
                              className="rounded-full border border-white/60 bg-white/85 p-2 text-[#5f5447] shadow-sm transition hover:bg-white"
                              title="Remove image"
                            >
                              <X size={14} strokeWidth={1.8} />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <label className="flex aspect-[4/3] cursor-pointer items-center justify-center p-6 text-center text-[#8d806f]">
                          <div className="flex max-w-[260px] flex-col items-center gap-3">
                            <ImageIcon size={28} strokeWidth={1.7} />
                            <p className="text-[14px] leading-6 text-[#7a6e5f]">
                              Add a photo if this moment needs one.
                            </p>
                        <span className="text-[10px] uppercase tracking-[0.26em] text-[#9a8c78]">
  Optional photo
</span>
                          </div>
                        </label>
                      )}

                      <div className="border-t border-[#e3dbcf] p-4">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="block w-full text-[13px] text-[#6c604f] file:mr-4 file:rounded-full file:border file:border-[#cdbfa8] file:bg-[#ece4d6] file:px-4 file:py-2 file:text-[11px] file:uppercase file:tracking-[0.22em] file:text-[#241e18]"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-1 lg:col-span-2">
                  <button
                    type="submit"
                    className="flex-1 rounded-full border border-[#b8aa94] bg-[#ece4d6] px-5 py-3 text-[11px] uppercase tracking-[0.28em] text-[#241e18] transition hover:bg-[#e6dccb]"
                  >
                    {form.id ? "Save entry" : "Add entry"}
                  </button>

                  <button
                    type="button"
                    onClick={resetForm}
                    className="rounded-full border border-[#d8cfc2] bg-[#f7f2e8] px-5 py-3 text-[11px] uppercase tracking-[0.28em] text-[#7a6f5f] transition hover:bg-[#eee7da]"
                  >
                    Clear
                  </button>
                </div>
              </form>
            </section>
          )}

          <section className="mb-4">
            <div className="mb-4 flex items-end justify-between gap-3">
              <div>
                <h2 className="mt-1 text-[13px] font-medium uppercase tracking-[0.28em] text-[#6f6354]">
                  {view === "today"
                    ? formatDateLabel(todayString())
                    : formatDateLabel(selectedDate) || "—"}
                </h2>
              </div>

              {view === "history" && allDates.length > 0 && (
                <div className="hidden text-[10px] uppercase tracking-[0.26em] text-[#988b79] sm:block">
                  {allDates.length} saved date{allDates.length > 1 ? "s" : ""}
                </div>
              )}
            </div>

            {hasEntries ? (
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {filteredEntries.map((entry) => (
                  <EntryCard
                    key={entry.id}
                    entry={entry}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-[26px] border border-dashed border-[#d5ccbf] bg-[#f8f4ec]/90 px-6 py-16 text-center shadow-[0_8px_24px_rgba(81,64,40,0.03)]">
                <p className="text-[10px] uppercase tracking-[0.34em] text-[#9b8e7d]">
                  No entries yet
                </p>
                <p className="mt-3 text-[16px] text-[#6f6354]">
                  Start with Ride, Walk, Cafe, or Notes above.
                </p>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}