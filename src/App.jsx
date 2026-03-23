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
  Search,
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
  { name: "Notes", icon: BookOpen },
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

function formatHeaderDate(dateString) {
  if (!dateString) return "";
  const d = new Date(`${dateString}T00:00:00`);
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatCardDate(dateString) {
  if (!dateString) return "";
  const d = new Date(`${dateString}T00:00:00`);
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
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
    <article className="overflow-hidden rounded-[28px] border border-[#ded7ca] bg-[#f8f5ee] shadow-[0_1px_2px_rgba(80,66,38,0.04)]">
      {entry.photoURL ? (
        <div className="aspect-[1.18/1] w-full overflow-hidden rounded-b-none rounded-t-[28px] bg-[#ece7dc]">
          <img
            src={entry.photoURL}
            alt={entry.title || entry.type}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </div>
      ) : (
        <div className="aspect-[1.18/1] w-full rounded-b-none rounded-t-[28px] bg-[#ece7dc]" />
      )}

      <div className="px-6 pb-4 pt-5">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="mb-3 flex items-center gap-2 text-[10px] uppercase tracking-[0.26em] text-[#b3a688]">
              <Icon size={12} strokeWidth={1.8} />
              <span>{entry.type || "Entry"}</span>
            </div>

            <h3 className="mb-3 text-[1.05rem] font-normal leading-7 text-[#6f624f]">
              {entry.title || "Untitled entry"}
            </h3>

            <p className="min-h-[3.25rem] whitespace-pre-wrap text-[0.95rem] leading-8 text-[#8f816b]">
              {entry.note || " "}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2 pt-0.5">
            <button
              type="button"
              onClick={() => onEdit(entry)}
              className="rounded-full border border-[#ddd4c4] bg-[#f8f5ee] p-2 text-[#b1a184] transition hover:bg-[#f2ede3] hover:text-[#7d705c]"
              aria-label="Edit entry"
              title="Edit entry"
            >
              <Pencil size={15} strokeWidth={1.8} />
            </button>

            <button
              type="button"
              onClick={() => onDelete(entry)}
              className="rounded-full border border-[#ddd4c4] bg-[#f8f5ee] p-2 text-[#b1a184] transition hover:bg-[#f2ede3] hover:text-[#7d705c]"
              aria-label="Delete entry"
              title="Delete entry"
            >
              <Trash2 size={15} strokeWidth={1.8} />
            </button>
          </div>
        </div>

        <div className="mt-4 border-t border-[#e8e0d4] pt-3 text-[10px] uppercase tracking-[0.22em] text-[#b9ad92]">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {entry.date ? (
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays size={11} strokeWidth={1.8} />
                {formatCardDate(entry.date)}
              </span>
            ) : null}

            {entry.time ? (
              <span className="inline-flex items-center gap-1.5">
                <Clock3 size={11} strokeWidth={1.8} />
                {formatTimeLabel(entry.time)}
              </span>
            ) : null}

            {entry.place ? (
              <span className="inline-flex items-center gap-1.5">
                <MapPin size={11} strokeWidth={1.8} />
                {entry.place}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}

export default function App() {
  const [entries, setEntries] = useState([]);
  const [loadingEntries, setLoadingEntries] = useState(true);
  const [syncError, setSyncError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

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

  const targetDate = activeView === "today" ? todayString() : selectedDate;

  const displayedEntries = useMemo(() => {
    return entries
      .filter((entry) => {
        if (!entry.date) return false;
        return entry.date.slice(0, 10) === targetDate;
      })
      .filter((entry) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          (entry.title || "").toLowerCase().includes(q) ||
          (entry.note || "").toLowerCase().includes(q) ||
          (entry.place || "").toLowerCase().includes(q) ||
          (entry.type || "").toLowerCase().includes(q)
        );
      });
  }, [entries, targetDate, searchQuery]);

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

      const normalizedType = editor.type === "Journal" ? "Notes" : editor.type;

      const payload = {
        type: normalizedType,
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
    <div className="min-h-screen bg-leica text-[#4e4435]">
      <div className="mx-auto max-w-[1280px] px-3 pb-12 pt-3 sm:px-5 lg:px-6">
        <header className="mb-6 rounded-[30px] border border-[#ddd4c4] bg-[#f8f5ee] px-7 py-7 shadow-[0_1px_2px_rgba(80,66,38,0.04)]">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div>
              <h1 className="mb-1 text-[2.05rem] font-medium leading-tight text-[#8f816b]">
                Daily Frame.
              </h1>
              <div className="mb-5 text-[11px] uppercase tracking-[0.36em] text-[#a69473]">
                Ride | Time | Place
              </div>
              <p className="text-[1.08rem] italic leading-8 text-[#8f816b]">
                Ride the day. Keep the moment.
              </p>
            </div>

            <div className="flex gap-2 self-start">
              <button
                type="button"
                onClick={() => setActiveView("today")}
                className={classNames(
                  "rounded-full border px-6 py-3 text-[12px] uppercase tracking-[0.28em] transition",
                  activeView === "today"
                    ? "border-[#cfc2aa] bg-[#eee5d2] text-[#8c7b5f]"
                    : "border-[#ddd4c4] bg-[#f8f5ee] text-[#b19f84] hover:bg-[#f4efe5]"
                )}
              >
                Today
              </button>

              <button
                type="button"
                onClick={() => setActiveView("history")}
                className={classNames(
                  "rounded-full border px-6 py-3 text-[12px] uppercase tracking-[0.28em] transition",
                  activeView === "history"
                    ? "border-[#cfc2aa] bg-[#eee5d2] text-[#8c7b5f]"
                    : "border-[#ddd4c4] bg-[#f8f5ee] text-[#b19f84] hover:bg-[#f4efe5]"
                )}
              >
                History
              </button>
            </div>
          </div>
        </header>

        <section className="mb-6 rounded-[30px] border border-[#ddd4c4] bg-[#f8f5ee] p-5 shadow-[0_1px_2px_rgba(80,66,38,0.04)]">
          <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="hide-scrollbar flex gap-2 overflow-x-auto pb-1">
              {TYPES.map(({ name, icon: Icon }) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => handleField("type", name)}
                  className={classNames(
                    "inline-flex shrink-0 items-center gap-2 rounded-full border px-5 py-3 text-[12px] uppercase tracking-[0.28em] transition",
                    editor.type === name
                      ? "border-[#cfc2aa] bg-[#eee5d2] text-[#8c7b5f]"
                      : "border-[#ddd4c4] bg-[#f8f5ee] text-[#9e8d73] hover:bg-[#f4efe5]"
                  )}
                >
                  <Icon size={14} strokeWidth={1.8} />
                  {name}
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="rounded-full border border-[#ddd4c4] bg-[#f8f5ee] px-6 py-3 text-[12px] uppercase tracking-[0.28em] text-[#a59376]">
                {formatHeaderDate(targetDate)}
              </div>

              <label className="flex min-w-[250px] items-center gap-3 rounded-full border border-[#ddd4c4] bg-[#f8f5ee] px-5 py-3 text-[#a59376]">
                <Search size={16} strokeWidth={1.8} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search entries"
                  className="w-full bg-transparent text-[15px] text-[#7f725f] outline-none placeholder:text-[#b7a88f]"
                />
              </label>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
              <div>
                <label className="mb-2 block text-[11px] uppercase tracking-[0.34em] text-[#9f8d73]">
                  Title
                </label>
                <input
                  type="text"
                  value={editor.title}
                  onChange={(e) => handleField("title", e.target.value)}
                  placeholder="Add a title"
                  className="w-full rounded-[24px] border border-[#ddd4c4] bg-[#fbf9f3] px-6 py-4 text-[1rem] text-[#675b49] outline-none transition placeholder:text-[#b3a691] focus:border-[#cfc2aa]"
                />
              </div>

              <div>
                <label className="mb-2 block text-[11px] uppercase tracking-[0.34em] text-[#9f8d73]">
                  Place
                </label>
                <input
                  type="text"
                  value={editor.place}
                  onChange={(e) => handleField("place", e.target.value)}
                  placeholder="Where was this?"
                  className="w-full rounded-[24px] border border-[#ddd4c4] bg-[#fbf9f3] px-6 py-4 text-[1rem] text-[#675b49] outline-none transition placeholder:text-[#b3a691] focus:border-[#cfc2aa]"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-[11px] uppercase tracking-[0.34em] text-[#9f8d73]">
                Note
              </label>
              <textarea
                value={editor.note}
                onChange={(e) => handleField("note", e.target.value)}
                placeholder="Add a short note"
                rows={5}
                className="w-full rounded-[24px] border border-[#ddd4c4] bg-[#fbf9f3] px-6 py-5 text-[1rem] leading-8 text-[#675b49] outline-none transition placeholder:text-[#b3a691] focus:border-[#cfc2aa]"
              />
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-[11px] uppercase tracking-[0.34em] text-[#9f8d73]">
                  Date
                </label>
                <input
                  type="date"
                  value={editor.date}
                  onChange={(e) => handleField("date", e.target.value)}
                  className="w-full rounded-[24px] border border-[#ddd4c4] bg-[#fbf9f3] px-6 py-4 text-[1rem] text-[#675b49] outline-none transition focus:border-[#cfc2aa]"
                />
              </div>

              <div>
                <label className="mb-2 block text-[11px] uppercase tracking-[0.34em] text-[#9f8d73]">
                  Time
                </label>
                <input
                  type="time"
                  value={editor.time}
                  onChange={(e) => handleField("time", e.target.value)}
                  className="w-full rounded-[24px] border border-[#ddd4c4] bg-[#fbf9f3] px-6 py-4 text-[1rem] text-[#675b49] outline-none transition focus:border-[#cfc2aa]"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-[11px] uppercase tracking-[0.34em] text-[#9f8d73]">
                Photo
              </label>

              {previewImage ? (
                <div className="overflow-hidden rounded-[28px] border border-[#ddd4c4] bg-[#fbf9f3]">
                  <div className="aspect-[1.35/1] w-full overflow-hidden">
                    <img
                      src={previewImage}
                      alt="Preview"
                      className="h-full w-full object-cover"
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e8e0d4] p-4">
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-[#ddd4c4] bg-[#f8f5ee] px-4 py-2.5 text-[12px] uppercase tracking-[0.24em] text-[#9e8d73] transition hover:bg-[#f4efe5]">
                      <ImageIcon size={14} strokeWidth={1.8} />
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
                      className="inline-flex items-center gap-2 rounded-full border border-[#ddd4c4] bg-[#f8f5ee] px-4 py-2.5 text-[12px] uppercase tracking-[0.24em] text-[#9e8d73] transition hover:bg-[#f4efe5]"
                    >
                      <X size={14} strokeWidth={1.8} />
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <label className="flex cursor-pointer items-center justify-center gap-3 rounded-[28px] border border-dashed border-[#d8cfbf] bg-[#fbf9f3] px-6 py-14 text-[15px] text-[#8d7d64] transition hover:bg-[#f6f1e8]">
                  <Camera size={18} strokeWidth={1.8} />
                  Add photo
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
                className="inline-flex items-center gap-2 rounded-full border border-[#cfc2aa] bg-[#eee5d2] px-6 py-3 text-[12px] uppercase tracking-[0.28em] text-[#8c7b5f] transition hover:bg-[#e7dcc4] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? (
                  <>
                    <LoaderCircle size={15} className="animate-spin" />
                    Saving
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
                className="inline-flex items-center gap-2 rounded-full border border-[#ddd4c4] bg-[#f8f5ee] px-6 py-3 text-[12px] uppercase tracking-[0.28em] text-[#a08f74] transition hover:bg-[#f4efe5] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Clear
              </button>
            </div>
          </form>
        </section>

        <div className="mb-4 text-[12px] uppercase tracking-[0.32em] text-[#85765f]">
          {formatHeaderDate(targetDate)}
        </div>

        {loadingEntries ? (
          <div className="rounded-[28px] border border-[#ddd4c4] bg-[#f8f5ee] px-6 py-8 text-[15px] text-[#8f816b]">
            <div className="flex items-center gap-3">
              <LoaderCircle size={18} className="animate-spin" />
              Syncing Daily Frame...
            </div>
          </div>
        ) : displayedEntries.length === 0 ? (
          <div className="rounded-[28px] border border-[#ddd4c4] bg-[#f8f5ee] px-6 py-10 text-center text-[15px] text-[#9c8d75]">
            {activeView === "history"
              ? "No entries for this date."
              : "No entries yet for today."}
          </div>
        ) : (
          <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {displayedEntries.map((entry) => (
              <EntryCard
                key={entry.id}
                entry={entry}
                onEdit={startEdit}
                onDelete={handleDelete}
              />
            ))}
          </section>
        )}

        {syncError ? (
          <div className="mt-5 rounded-[24px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {syncError}
          </div>
        ) : null}
      </div>
    </div>
  );
}