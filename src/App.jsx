import React, { useEffect, useMemo, useState } from "react";
import {
  Bike,
  BookOpen,
  CalendarDays,
  Camera,
  Clock3,
  Coffee,
  Footprints,
  History,
  Image as ImageIcon,
  LoaderCircle,
  MapPin,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import {
  addEntry,
  deleteEntry,
  deletePhotoByPath,
  subscribeToEntries,
  updateEntry,
  uploadEntryPhoto,
} from "./storage";

const TYPES = [
  { name: "Ride", icon: Bike },
  { name: "Walk", icon: Footprints },
  { name: "Cafe", icon: Coffee },
  { name: "Journal", icon: BookOpen },
];

const todayString = () => new Date().toISOString().slice(0, 10);

const currentTimeString = () => {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
};

const emptyEditor = () => ({
  type: "Ride",
  title: "",
  note: "",
  date: todayString(),
  time: currentTimeString(),
  place: "",
  photoFile: null,
  photoPreview: "",
  removePhoto: false,
});

function classNames(...items) {
  return items.filter(Boolean).join(" ");
}

function formatEntryDate(dateString) {
  if (!dateString) return "";
  const d = new Date(`${dateString}T00:00:00`);
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTimeLabel(time) {
  if (!time) return "";
  const [h, m] = time.split(":");
  if (h == null || m == null) return time;

  const date = new Date();
  date.setHours(Number(h), Number(m), 0, 0);

  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function EntryCard({ entry, onEdit, onDelete }) {
  const Icon =
    TYPES.find((item) => item.name === entry.type)?.icon || BookOpen;

  return (
    <article className="overflow-hidden rounded-3xl border border-neutral-200/70 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      {entry.photoURL ? (
        <div className="aspect-[4/3] w-full overflow-hidden bg-neutral-100">
          <img
            src={entry.photoURL}
            alt={entry.title || entry.type}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </div>
      ) : null}

      <div className="p-4 sm:p-5">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-1 flex items-center gap-2 text-[10px] uppercase tracking-[0.24em] text-neutral-500">
              <Icon size={13} />
              <span>{entry.type || "Entry"}</span>
            </div>

            <h3 className="truncate text-base font-semibold text-neutral-900">
              {entry.title || "Untitled entry"}
            </h3>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onEdit(entry)}
              className="rounded-full p-2 text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900"
              aria-label="Edit entry"
              title="Edit entry"
            >
              <Pencil size={16} />
            </button>

            <button
              type="button"
              onClick={() => onDelete(entry)}
              className="rounded-full p-2 text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900"
              aria-label="Delete entry"
              title="Delete entry"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        <div className="mb-3 flex flex-wrap gap-2 text-[11px] text-neutral-500">
          {entry.date ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2.5 py-1">
              <CalendarDays size={12} />
              {formatEntryDate(entry.date)}
            </span>
          ) : null}

          {entry.time ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2.5 py-1">
              <Clock3 size={12} />
              {formatTimeLabel(entry.time)}
            </span>
          ) : null}

          {entry.place ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2.5 py-1">
              <MapPin size={12} />
              {entry.place}
            </span>
          ) : null}
        </div>

        {entry.note ? (
          <p className="whitespace-pre-wrap text-sm leading-6 text-neutral-700">
            {entry.note}
          </p>
        ) : (
          <p className="text-sm text-neutral-400">No note for this entry yet.</p>
        )}
      </div>
    </article>
  );
}

export default function App() {
  const [entries, setEntries] = useState([]);
  const [loadingEntries, setLoadingEntries] = useState(true);
  const [syncError, setSyncError] = useState("");

  const [editor, setEditor] = useState(emptyEditor());
  const [activeView, setActiveView] = useState("today");
  const [selectedDate, setSelectedDate] = useState(todayString());

  const [editingId, setEditingId] = useState(null);
  const [existingPhotoURL, setExistingPhotoURL] = useState("");
  const [existingPhotoPath, setExistingPhotoPath] = useState("");

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToEntries(
      (liveEntries) => {
        setEntries(liveEntries);
        setLoadingEntries(false);
        setSyncError("");
      },
      (error) => {
        console.error(error);
        setSyncError("Live sync failed. Please refresh and try again.");
        setLoadingEntries(false);
      }
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    return () => {
      if (editor.photoPreview && editor.photoPreview.startsWith("blob:")) {
        URL.revokeObjectURL(editor.photoPreview);
      }
    };
  }, [editor.photoPreview]);

  const displayedEntries = useMemo(() => {
    const targetDate = activeView === "today" ? todayString() : selectedDate;

    return entries.filter((entry) => {
      if (!entry.date) return false;
      return entry.date.slice(0, 10) === targetDate;
    });
  }, [entries, activeView, selectedDate]);

  const totalToday = useMemo(() => {
    return entries.filter(
      (entry) => entry.date && entry.date.slice(0, 10) === todayString()
    ).length;
  }, [entries]);

  const handleField = (key, value) => {
    setEditor((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const clearEditor = () => {
    if (editor.photoPreview && editor.photoPreview.startsWith("blob:")) {
      URL.revokeObjectURL(editor.photoPreview);
    }

    setEditor(emptyEditor());
    setEditingId(null);
    setExistingPhotoURL("");
    setExistingPhotoPath("");
  };

  const handlePhotoChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (editor.photoPreview && editor.photoPreview.startsWith("blob:")) {
      URL.revokeObjectURL(editor.photoPreview);
    }

    const preview = URL.createObjectURL(file);

    setEditor((prev) => ({
      ...prev,
      photoFile: file,
      photoPreview: preview,
      removePhoto: false,
    }));
  };

  const handleRemovePhoto = () => {
    if (editor.photoPreview && editor.photoPreview.startsWith("blob:")) {
      URL.revokeObjectURL(editor.photoPreview);
    }

    setEditor((prev) => ({
      ...prev,
      photoFile: null,
      photoPreview: "",
      removePhoto: true,
    }));
  };

  const startEdit = (entry) => {
    if (editor.photoPreview && editor.photoPreview.startsWith("blob:")) {
      URL.revokeObjectURL(editor.photoPreview);
    }

    setEditingId(entry.id);
    setExistingPhotoURL(entry.photoURL || "");
    setExistingPhotoPath(entry.photoPath || "");

    setEditor({
      type: entry.type || "Ride",
      title: entry.title || "",
      note: entry.note || "",
      date: entry.date || todayString(),
      time: entry.time || currentTimeString(),
      place: entry.place || "",
      photoFile: null,
      photoPreview: entry.photoURL || "",
      removePhoto: false,
    });

    setActiveView("today");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (entry) => {
    const confirmed = window.confirm("Delete this entry?");
    if (!confirmed) return;

    try {
      await deleteEntry(entry.id);
      if (entry.photoPath) {
        await deletePhotoByPath(entry.photoPath);
      }

      if (editingId === entry.id) {
        clearEditor();
      }
    } catch (error) {
      console.error("Delete entry failed:", error);
      alert("Sorry — deleting this entry failed.");
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const cleanTitle = editor.title.trim();
    const cleanNote = editor.note.trim();
    const cleanPlace = editor.place.trim();

    if (!cleanTitle && !cleanNote && !cleanPlace) {
      alert("Add at least a title, note, or place.");
      return;
    }

    setSaving(true);

    try {
      let nextPhotoURL = existingPhotoURL;
      let nextPhotoPath = existingPhotoPath;

      if (editor.photoFile) {
        const uploadResult = await uploadEntryPhoto(editor.photoFile);

        nextPhotoURL = uploadResult.photoURL;
        nextPhotoPath = uploadResult.photoPath;

        if (existingPhotoPath) {
          await deletePhotoByPath(existingPhotoPath);
        }
      } else if (editor.removePhoto) {
        if (existingPhotoPath) {
          await deletePhotoByPath(existingPhotoPath);
        }
        nextPhotoURL = "";
        nextPhotoPath = "";
      }

      const payload = {
        type: editor.type,
        title: cleanTitle,
        note: cleanNote,
        date: editor.date,
        time: editor.time,
        place: cleanPlace,
        photoURL: nextPhotoURL,
        photoPath: nextPhotoPath,
      };

      if (editingId) {
        await updateEntry(editingId, payload);
      } else {
        await addEntry(payload);
      }

      clearEditor();
    } catch (error) {
      console.error("Saving entry failed:", error);
      alert("Sorry — saving failed. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const previewImage = editor.photoPreview || existingPhotoURL;

  return (
    <div className="min-h-screen bg-leica text-neutral-900">
      <div className="mx-auto max-w-5xl px-4 pb-12 pt-5 sm:px-6 lg:px-8">
        <header className="mb-5 rounded-[28px] border border-neutral-200/70 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] sm:p-6">
          <div className="mb-3 flex items-start justify-between gap-4">
            <div>
              <p className="mb-2 text-[11px] uppercase tracking-[0.26em] text-neutral-500">
                Daily Frame
              </p>
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Ride the day. Keep the moment.
              </h1>
            </div>

            <div className="rounded-2xl border border-neutral-200/70 bg-white px-3 py-2 text-right">
              <div className="text-[11px] uppercase tracking-[0.22em] text-neutral-500">
                Today
              </div>
              <div className="text-lg font-semibold text-neutral-900">
                {totalToday}
              </div>
            </div>
          </div>

          <div className="text-sm leading-6 text-neutral-500">
            A quiet record of rides, walks, cafes, and small moments — now with
            live sync across devices.
          </div>

          {syncError ? (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {syncError}
            </div>
          ) : null}
        </header>

        <section className="mb-5 rounded-[28px] border border-neutral-200/70 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)] sm:p-5">
          <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
            {TYPES.map(({ name, icon: Icon }) => (
              <button
                key={name}
                type="button"
                onClick={() => handleField("type", name)}
                className={classNames(
                  "inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm transition",
                  editor.type === name
                    ? "bg-neutral-900 text-white/95 hover:bg-neutral-800"
                    : "border border-neutral-200/70 bg-white text-neutral-600 hover:bg-neutral-50"
                )}
              >
                <Icon size={16} />
                {name}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs uppercase tracking-[0.22em] text-neutral-500">
                Title
              </label>
              <input
                type="text"
                value={editor.title}
                onChange={(e) => handleField("title", e.target.value)}
                placeholder="Add a title"
                className="w-full rounded-2xl border border-neutral-200/70 bg-white px-4 py-3 text-sm text-neutral-900 outline-none transition focus:border-neutral-400"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs uppercase tracking-[0.22em] text-neutral-500">
                Note
              </label>
              <textarea
                value={editor.note}
                onChange={(e) => handleField("note", e.target.value)}
                placeholder="Add a short note"
                rows={4}
                className="w-full rounded-2xl border border-neutral-200/70 bg-white px-4 py-3 text-sm text-neutral-900 outline-none transition focus:border-neutral-400"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs uppercase tracking-[0.22em] text-neutral-500">
                  Date
                </label>
                <input
                  type="date"
                  value={editor.date}
                  onChange={(e) => handleField("date", e.target.value)}
                  className="w-full rounded-2xl border border-neutral-200/70 bg-white px-4 py-3 text-sm text-neutral-900 outline-none transition focus:border-neutral-400"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs uppercase tracking-[0.22em] text-neutral-500">
                  Time
                </label>
                <input
                  type="time"
                  value={editor.time}
                  onChange={(e) => handleField("time", e.target.value)}
                  className="w-full rounded-2xl border border-neutral-200/70 bg-white px-4 py-3 text-sm text-neutral-900 outline-none transition focus:border-neutral-400"
                />
              </div>

              <div className="sm:col-span-2 lg:col-span-1">
                <label className="mb-1 block text-xs uppercase tracking-[0.22em] text-neutral-500">
                  Place
                </label>
                <input
                  type="text"
                  value={editor.place}
                  onChange={(e) => handleField("place", e.target.value)}
                  placeholder="Where was this?"
                  className="w-full rounded-2xl border border-neutral-200/70 bg-white px-4 py-3 text-sm text-neutral-900 outline-none transition focus:border-neutral-400"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs uppercase tracking-[0.22em] text-neutral-500">
                Photo
              </label>

              {previewImage ? (
                <div className="overflow-hidden rounded-[24px] border border-neutral-200/70 bg-neutral-50">
                  <div className="aspect-[4/3] w-full overflow-hidden">
                    <img
                      src={previewImage}
                      alt="Preview"
                      className="h-full w-full object-cover"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-3 border-t border-neutral-200/70 p-3">
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-neutral-200/70 bg-white px-3 py-2 text-sm text-neutral-600 transition hover:bg-neutral-50">
                      <ImageIcon size={16} />
                      Change photo
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoChange}
                        className="hidden"
                      />
                    </label>

                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="inline-flex items-center gap-2 rounded-full border border-neutral-200/70 bg-white px-3 py-2 text-sm text-neutral-600 transition hover:bg-neutral-50"
                    >
                      <X size={16} />
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-[24px] border border-dashed border-neutral-300/70 bg-white px-4 py-10 text-sm text-neutral-600 transition hover:bg-neutral-50">
                  <Camera size={18} />
                  Choose image
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            <div className="flex flex-wrap gap-3 pt-1">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-full bg-neutral-900 px-5 py-3 text-sm font-medium text-white/95 transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? (
                  <>
                    <LoaderCircle size={16} className="animate-spin" />
                    Saving...
                  </>
                ) : editingId ? (
                  "Update Entry"
                ) : (
                  "Add Entry"
                )}
              </button>

              <button
                type="button"
                onClick={clearEditor}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-full border border-neutral-200/70 bg-white px-5 py-3 text-sm font-medium text-neutral-600 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Clear
              </button>
            </div>
          </form>
        </section>

        <section className="mb-5 rounded-[28px] border border-neutral-200/70 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)] sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setActiveView("today")}
                className={classNames(
                  "rounded-full px-4 py-2 text-sm transition",
                  activeView === "today"
                    ? "bg-neutral-900 text-white/95 hover:bg-neutral-800"
                    : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                )}
              >
                Today
              </button>

              <button
                type="button"
                onClick={() => setActiveView("history")}
                className={classNames(
                  "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm transition",
                  activeView === "history"
                    ? "bg-neutral-900 text-white/95 hover:bg-neutral-800"
                    : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                )}
              >
                <History size={14} />
                History
              </button>
            </div>

            {activeView === "history" ? (
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="rounded-full border border-neutral-200/70 bg-white px-4 py-2 text-sm text-neutral-900 outline-none transition focus:border-neutral-400"
              />
            ) : (
              <div className="rounded-full bg-neutral-100 px-4 py-2 text-sm text-neutral-500">
                {formatEntryDate(todayString())}
              </div>
            )}
          </div>

          {loadingEntries ? (
            <div className="flex items-center gap-2 rounded-2xl bg-neutral-50 px-4 py-6 text-sm text-neutral-500">
              <LoaderCircle size={16} className="animate-spin" />
              Syncing Daily Frame...
            </div>
          ) : displayedEntries.length === 0 ? (
            <div className="rounded-2xl bg-neutral-50 px-4 py-8 text-center text-sm text-neutral-500">
              {activeView === "history"
                ? "No entries for this date."
                : "No entries yet for today."}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {displayedEntries.map((entry) => (
                <EntryCard
                  key={entry.id}
                  entry={entry}
                  onEdit={startEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}