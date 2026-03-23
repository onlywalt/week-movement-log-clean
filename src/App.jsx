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
  deletePhotosByPaths,
  subscribeToEntries,
  updateEntry,
  uploadEntryPhotos,
} from "./storage";

const TYPES = [
  { name: "Ride", icon: Bike },
  { name: "Walk", icon: Footprints },
  { name: "Cafe", icon: Coffee },
  { name: "Notes", icon: BookOpen },
];

const MAX_IMAGES = 4;

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
  existingPhotos: [],
  newPhotos: [],
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

function PhotoMosaic({ photos, alt }) {
  if (!photos || photos.length === 0) {
    return (
      <div className="aspect-[1.18/1] w-full bg-[#ece7dc]" />
    );
  }

  if (photos.length === 1) {
    return (
      <div className="aspect-[1.18/1] w-full overflow-hidden bg-[#ece7dc]">
        <img
          src={photos[0].url}
          alt={alt}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      </div>
    );
  }

  if (photos.length === 2) {
    return (
      <div className="grid aspect-[1.18/1] w-full grid-cols-2 gap-[2px] overflow-hidden bg-[#ece7dc]">
        {photos.slice(0, 2).map((photo, index) => (
          <img
            key={photo.url + index}
            src={photo.url}
            alt={alt}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid aspect-[1.18/1] w-full grid-cols-2 grid-rows-2 gap-[2px] overflow-hidden bg-[#ece7dc]">
      {photos.slice(0, 4).map((photo, index) => (
        <div key={photo.url + index} className="relative h-full w-full">
          <img
            src={photo.url}
            alt={alt}
            className="h-full w-full object-cover"
            loading="lazy"
          />
          {index === 3 && photos.length > 4 ? (
            <div className="absolute inset-0 flex items-center justify-center bg-black/35 text-lg font-medium text-white">
              +{photos.length - 4}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function EntryCard({ entry, onEdit, onDelete }) {
  const Icon =
    TYPES.find((item) => item.name === entry.type)?.icon || BookOpen;

  return (
    <article className="overflow-hidden rounded-[28px] border border-[#ded7ca] bg-[#f8f5ee] shadow-[0_1px_2px_rgba(80,66,38,0.04)]">
      <PhotoMosaic photos={entry.photos} alt={entry.title || entry.type} />

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

function HistoryTile({ entry, onOpen }) {
  const hasPhotos = entry.photos && entry.photos.length > 0;

  return (
    <button
      type="button"
      onClick={() => onOpen(entry)}
      className="group relative overflow-hidden rounded-[22px] bg-[#ece7dc] text-left"
    >
      {hasPhotos ? (
        <>
          <div className="aspect-square w-full overflow-hidden">
            <img
              src={entry.photos[0].url}
              alt={entry.title || entry.type}
              className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
              loading="lazy"
            />
          </div>

          {entry.photos.length > 1 ? (
            <div className="absolute right-2 top-2 rounded-full bg-[#f8f5ee]/90 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-[#8c7b5f]">
              +{entry.photos.length - 1}
            </div>
          ) : null}
        </>
      ) : (
        <div className="flex aspect-square w-full flex-col justify-between p-4 text-[#7d705c]">
          <div className="text-[10px] uppercase tracking-[0.24em] text-[#b3a688]">
            {entry.type}
          </div>
          <div>
            <div className="mb-2 text-base leading-6">
              {entry.title || "Untitled entry"}
            </div>
            <div className="line-clamp-4 text-sm leading-6 text-[#8f816b]">
              {entry.note || entry.place || ""}
            </div>
          </div>
        </div>
      )}
    </button>
  );
}

function EntryModal({ entry, onClose, onEdit, onDelete }) {
  if (!entry) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4 py-6">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[28px] border border-[#ddd4c4] bg-[#f8f5ee] shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#e8e0d4] bg-[#f8f5ee]/95 px-5 py-4 backdrop-blur">
          <div className="text-[11px] uppercase tracking-[0.28em] text-[#a69473]">
            {entry.type} · {entry.date ? formatHeaderDate(entry.date) : "No date"}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[#ddd4c4] bg-[#f8f5ee] p-2 text-[#9e8d73] transition hover:bg-[#f4efe5]"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 sm:p-6">
          <div className="overflow-hidden rounded-[24px]">
            <PhotoMosaic photos={entry.photos} alt={entry.title || entry.type} />
          </div>

          <div className="mt-5 mb-3 flex items-start justify-between gap-4">
            <div>
              <h3 className="mb-3 text-[1.35rem] font-normal leading-8 text-[#5f5444]">
                {entry.title || "Untitled entry"}
              </h3>

              <div className="flex flex-wrap gap-x-4 gap-y-2 text-[11px] uppercase tracking-[0.22em] text-[#b3a688]">
                {entry.date ? <span>{formatHeaderDate(entry.date)}</span> : null}
                {entry.time ? <span>{formatTimeLabel(entry.time)}</span> : null}
                {entry.place ? <span>{entry.place}</span> : null}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onEdit(entry)}
                className="rounded-full border border-[#ddd4c4] bg-[#f8f5ee] px-4 py-2 text-[11px] uppercase tracking-[0.24em] text-[#9e8d73] transition hover:bg-[#f4efe5]"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => onDelete(entry)}
                className="rounded-full border border-[#ddd4c4] bg-[#f8f5ee] px-4 py-2 text-[11px] uppercase tracking-[0.24em] text-[#9e8d73] transition hover:bg-[#f4efe5]"
              >
                Delete
              </button>
            </div>
          </div>

          <div className="whitespace-pre-wrap text-[1rem] leading-8 text-[#8f816b]">
            {entry.note || "No note for this entry yet."}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [entries, setEntries] = useState([]);
  const [loadingEntries, setLoadingEntries] = useState(true);
  const [syncError, setSyncError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedHistoryEntry, setSelectedHistoryEntry] = useState(null);

  const [editor, setEditor] = useState(emptyEditor());
  const [activeView, setActiveView] = useState("today");

  const [editingId, setEditingId] = useState(null);
  const [originalPhotos, setOriginalPhotos] = useState([]);

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
      editor.newPhotos.forEach((photo) => {
        if (photo.preview?.startsWith("blob:")) {
          URL.revokeObjectURL(photo.preview);
        }
      });
    };
  }, [editor.newPhotos]);

  const normalizedEntries = useMemo(() => {
    return [...entries].sort((a, b) => {
      const aDate = a.date || "";
      const bDate = b.date || "";
      if (aDate !== bDate) return bDate.localeCompare(aDate);

      const aTime = a.time || "";
      const bTime = b.time || "";
      if (aTime !== bTime) return bTime.localeCompare(aTime);

      return (b.createdAtMs || 0) - (a.createdAtMs || 0);
    });
  }, [entries]);

  const filteredEntries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return normalizedEntries.filter((entry) => {
      if (activeView === "today") {
        if (!entry.date || entry.date.slice(0, 10) !== todayString()) {
          return false;
        }
      }

      if (!q) return true;

      return (
        (entry.title || "").toLowerCase().includes(q) ||
        (entry.note || "").toLowerCase().includes(q) ||
        (entry.place || "").toLowerCase().includes(q) ||
        (entry.type || "").toLowerCase().includes(q)
      );
    });
  }, [normalizedEntries, activeView, searchQuery]);

  const groupedHistory = useMemo(() => {
    const groups = [];

    for (const entry of filteredEntries) {
      const dateKey = entry.date || "Unknown date";
      const lastGroup = groups[groups.length - 1];

      if (!lastGroup || lastGroup.date !== dateKey) {
        groups.push({
          date: dateKey,
          entries: [entry],
        });
      } else {
        lastGroup.entries.push(entry);
      }
    }

    return groups;
  }, [filteredEntries]);

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
    editor.newPhotos.forEach((photo) => {
      if (photo.preview?.startsWith("blob:")) {
        URL.revokeObjectURL(photo.preview);
      }
    });

    setEditor(emptyEditor());
    setEditingId(null);
    setOriginalPhotos([]);
  };

  const handlePhotoChange = (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    const usedSlots = editor.existingPhotos.length + editor.newPhotos.length;
    const availableSlots = Math.max(0, MAX_IMAGES - usedSlots);
    const acceptedFiles = files.slice(0, availableSlots);

    const nextNewPhotos = acceptedFiles.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));

    setEditor((prev) => ({
      ...prev,
      newPhotos: [...prev.newPhotos, ...nextNewPhotos],
    }));

    event.target.value = "";
  };

  const removeExistingPhoto = (indexToRemove) => {
    setEditor((prev) => ({
      ...prev,
      existingPhotos: prev.existingPhotos.filter((_, index) => index !== indexToRemove),
    }));
  };

  const removeNewPhoto = (indexToRemove) => {
    setEditor((prev) => {
      const target = prev.newPhotos[indexToRemove];
      if (target?.preview?.startsWith("blob:")) {
        URL.revokeObjectURL(target.preview);
      }

      return {
        ...prev,
        newPhotos: prev.newPhotos.filter((_, index) => index !== indexToRemove),
      };
    });
  };

  const startEdit = (entry) => {
    editor.newPhotos.forEach((photo) => {
      if (photo.preview?.startsWith("blob:")) {
        URL.revokeObjectURL(photo.preview);
      }
    });

    setSelectedHistoryEntry(null);
    setEditingId(entry.id);
    setOriginalPhotos(entry.photos || []);

    setEditor({
      type: entry.type || "Ride",
      title: entry.title || "",
      note: entry.note || "",
      date: entry.date || todayString(),
      time: entry.time || currentTimeString(),
      place: entry.place || "",
      existingPhotos: entry.photos || [],
      newPhotos: [],
    });

    setActiveView("today");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (entry) => {
    const confirmed = window.confirm("Delete this entry?");
    if (!confirmed) return;

    try {
      await deleteEntry(entry.id);

      const allPaths = (entry.photos || []).map((photo) => photo.path).filter(Boolean);
      if (allPaths.length) {
        await deletePhotosByPaths(allPaths);
      }

      if (editingId === entry.id) {
        clearEditor();
      }

      if (selectedHistoryEntry?.id === entry.id) {
        setSelectedHistoryEntry(null);
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
      const uploadedPhotos = editor.newPhotos.length
        ? await uploadEntryPhotos(editor.newPhotos.map((photo) => photo.file))
        : [];

      const finalPhotos = [...editor.existingPhotos, ...uploadedPhotos].slice(0, MAX_IMAGES);

      const payload = {
        type: editor.type,
        title: cleanTitle,
        note: cleanNote,
        date: editor.date,
        time: editor.time,
        place: cleanPlace,
        photos: finalPhotos,
      };

      if (editingId) {
        const removedPaths = originalPhotos
          .filter(
            (originalPhoto) =>
              !editor.existingPhotos.some(
                (existingPhoto) => existingPhoto.path === originalPhoto.path
              )
          )
          .map((photo) => photo.path)
          .filter(Boolean);

        await updateEntry(editingId, payload);

        if (removedPaths.length) {
          await deletePhotosByPaths(removedPaths);
        }
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

  const editorPreviewCount = editor.existingPhotos.length + editor.newPhotos.length;

  return (
    <div className="min-h-screen bg-leica text-[#4e4435]">
      <div className="mx-auto max-w-[1280px] px-3 pb-12 pt-3 sm:px-5 lg:px-6">
        <header className="mb-6 rounded-[30px] border border-[#ddd4c4] bg-[#f8f5ee] px-7 py-7 shadow-[0_1px_2px_rgba(80,66,38,0.04)]">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div>
              <h1 className="text-[2.05rem] font-medium text-[#8f816b]">
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
                {activeView === "today" ? formatHeaderDate(todayString()) : "All dates"}
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
                Photos ({editorPreviewCount}/{MAX_IMAGES})
              </label>

              <div className="space-y-4">
                {(editor.existingPhotos.length > 0 || editor.newPhotos.length > 0) ? (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {editor.existingPhotos.map((photo, index) => (
                      <div
                        key={`existing-${photo.url}-${index}`}
                        className="relative overflow-hidden rounded-[20px] border border-[#ddd4c4] bg-[#fbf9f3]"
                      >
                        <div className="aspect-square overflow-hidden">
                          <img
                            src={photo.url}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeExistingPhoto(index)}
                          className="absolute right-2 top-2 rounded-full bg-[#f8f5ee]/95 p-1.5 text-[#8f816b] shadow-sm"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}

                    {editor.newPhotos.map((photo, index) => (
                      <div
                        key={`new-${photo.preview}-${index}`}
                        className="relative overflow-hidden rounded-[20px] border border-[#ddd4c4] bg-[#fbf9f3]"
                      >
                        <div className="aspect-square overflow-hidden">
                          <img
                            src={photo.preview}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeNewPhoto(index)}
                          className="absolute right-2 top-2 rounded-full bg-[#f8f5ee]/95 p-1.5 text-[#8f816b] shadow-sm"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}

                {editorPreviewCount < MAX_IMAGES ? (
                  <label className="flex cursor-pointer items-center justify-center gap-3 rounded-[28px] border border-dashed border-[#d8cfbf] bg-[#fbf9f3] px-6 py-10 text-[15px] text-[#8d7d64] transition hover:bg-[#f6f1e8]">
                    <Camera size={18} strokeWidth={1.8} />
                    Add photos
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handlePhotoChange}
                      className="hidden"
                    />
                  </label>
                ) : null}
              </div>
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

        {loadingEntries ? (
          <div className="rounded-[28px] border border-[#ddd4c4] bg-[#f8f5ee] px-6 py-8 text-[15px] text-[#8f816b]">
            <div className="flex items-center gap-3">
              <LoaderCircle size={18} className="animate-spin" />
              Syncing Daily Frame...
            </div>
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="rounded-[28px] border border-[#ddd4c4] bg-[#f8f5ee] px-6 py-10 text-center text-[15px] text-[#9c8d75]">
            {activeView === "history"
              ? "No history entries yet."
              : "No entries yet for today."}
          </div>
        ) : activeView === "today" ? (
          <>
            <div className="mb-4 text-[12px] uppercase tracking-[0.32em] text-[#85765f]">
              {formatHeaderDate(todayString())}
            </div>

            <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {filteredEntries.map((entry) => (
                <EntryCard
                  key={entry.id}
                  entry={entry}
                  onEdit={startEdit}
                  onDelete={handleDelete}
                />
              ))}
            </section>
          </>
        ) : (
          <div className="space-y-8">
            {groupedHistory.map((group) => (
              <section key={group.date}>
                <div className="mb-4 text-[12px] uppercase tracking-[0.32em] text-[#85765f]">
                  {group.date === "Unknown date"
                    ? "Unknown date"
                    : formatHeaderDate(group.date)}
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  {group.entries.map((entry) => (
                    <HistoryTile
                      key={entry.id}
                      entry={entry}
                      onOpen={setSelectedHistoryEntry}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        {syncError ? (
          <div className="mt-5 rounded-[24px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {syncError}
          </div>
        ) : null}
      </div>

      <EntryModal
        entry={selectedHistoryEntry}
        onClose={() => setSelectedHistoryEntry(null)}
        onEdit={startEdit}
        onDelete={handleDelete}
      />
    </div>
  );
}