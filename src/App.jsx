import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Bike,
  Footprints,
  Coffee,
  BookOpen,
  Camera,
  CalendarDays,
  Clock3,
  MapPin,
  Image as ImageIcon,
  Pencil,
  Trash2,
  X,
  BarChart3,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytes,
} from "firebase/storage";
import { db, storage } from "./firebase";

const ENTRY_TYPES = [
  { label: "Ride", icon: Bike },
  { label: "Walk", icon: Footprints },
  { label: "Cafe", icon: Coffee },
  { label: "Journal", icon: BookOpen },
];

const MOVEMENT_TYPES = ["Ride", "Walk"];

const EMPTY_FORM = {
  type: "Ride",
  title: "",
  note: "",
  date: getTodayLocalDate(),
  time: getNowLocalTime(),
  place: "",
  duration: "",
  cafeRating: "",
};

function getTodayLocalDate() {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60000);
  return local.toISOString().slice(0, 10);
}

function getNowLocalTime() {
  const d = new Date();
  const hh = `${d.getHours()}`.padStart(2, "0");
  const mm = `${d.getMinutes()}`.padStart(2, "0");
  return `${hh}:${mm}`;
}

function formatFullDate(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatMonthYear(dateStr) {
  if (!dateStr) return "";
  const [y, m] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, 1);
  return dt.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

function formatMonthKey(dateStr) {
  return dateStr?.slice(0, 7) || "";
}

function formatMonthLabel(monthKey) {
  if (!monthKey) return "";
  const [y, m] = monthKey.split("-").map(Number);
  const dt = new Date(y, m - 1, 1);
  return dt.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

function entryDateTimeValue(item) {
  return `${item.date || ""}T${item.time || "00:00"}`;
}

function sortEntriesNewest(entries) {
  return [...entries].sort((a, b) => {
    const av = entryDateTimeValue(a);
    const bv = entryDateTimeValue(b);
    return bv.localeCompare(av);
  });
}

function typeIcon(type) {
  switch (type) {
    case "Ride":
      return Bike;
    case "Walk":
      return Footprints;
    case "Cafe":
      return Coffee;
    case "Journal":
      return BookOpen;
    default:
      return Camera;
  }
}

function classNames(...arr) {
  return arr.filter(Boolean).join(" ");
}

function buildMonthStats(entries) {
  const stats = {
    total: entries.length,
    Ride: 0,
    Walk: 0,
    Cafe: 0,
    Journal: 0,
    minutes: 0,
    photos: 0,
  };

  entries.forEach((item) => {
    if (stats[item.type] !== undefined) stats[item.type] += 1;
    const mins = Number(item.duration || 0);
    if (!Number.isNaN(mins)) stats.minutes += mins;
    stats.photos += Array.isArray(item.images) ? item.images.length : 0;
  });

  return stats;
}

function getMonthRange(monthOffset = 0) {
  const now = new Date();
  const dt = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  return `${dt.getFullYear()}-${`${dt.getMonth() + 1}`.padStart(2, "0")}`;
}

export default function App() {
  const [entries, setEntries] = useState([]);
  const [loadingEntries, setLoadingEntries] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [selectedTab, setSelectedTab] = useState("Journal");
  const [editingId, setEditingId] = useState(null);
  const [pickedFiles, setPickedFiles] = useState([]);
  const [pickedPreviews, setPickedPreviews] = useState([]);
  const [lightboxImages, setLightboxImages] = useState([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [selectedMonth, setSelectedMonth] = useState(getMonthRange(0));
  const fileInputRef = useRef(null);

  useEffect(() => {
    const q = query(collection(db, "daily-frame-entries"), orderBy("date", "desc"));

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const rows = snapshot.docs.map((snap) => ({ id: snap.id, ...snap.data() }));
        setEntries(sortEntriesNewest(rows));
        setLoadingEntries(false);
      },
      (error) => {
        console.error("Firestore read error:", error);
        setLoadingEntries(false);
      }
    );

    return () => unsub();
  }, []);

  useEffect(() => {
    return () => {
      pickedPreviews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [pickedPreviews]);

  const groupedEntries = useMemo(() => {
    const groups = [];
    let lastMonth = "";

    entries.forEach((item) => {
      const monthKey = formatMonthKey(item.date);
      if (monthKey !== lastMonth) {
        groups.push({ type: "month", key: monthKey, label: formatMonthLabel(monthKey) });
        lastMonth = monthKey;
      }
      groups.push({ type: "entry", key: item.id, item });
    });

    return groups;
  }, [entries]);

  const monthEntries = useMemo(() => {
    return entries.filter((item) => formatMonthKey(item.date) === selectedMonth);
  }, [entries, selectedMonth]);

  const monthStats = useMemo(() => buildMonthStats(monthEntries), [monthEntries]);

  const availableMonths = useMemo(() => {
    const map = new Map();
    entries.forEach((item) => {
      const key = formatMonthKey(item.date);
      if (key && !map.has(key)) map.set(key, formatMonthLabel(key));
    });
    const arr = [...map.entries()].map(([key, label]) => ({ key, label }));
    return arr.sort((a, b) => b.key.localeCompare(a.key));
  }, [entries]);

  useEffect(() => {
    if (!availableMonths.length) return;
    const exists = availableMonths.some((m) => m.key === selectedMonth);
    if (!exists) setSelectedMonth(availableMonths[0].key);
  }, [availableMonths, selectedMonth]);

  function updateForm(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function setType(type) {
    setForm((prev) => ({ ...prev, type }));
  }

  function clearForm() {
    setForm({
      ...EMPTY_FORM,
      type: form.type,
      date: getTodayLocalDate(),
      time: getNowLocalTime(),
    });
    setEditingId(null);
    clearPickedImages();
  }

  function clearPickedImages() {
    pickedPreviews.forEach((url) => URL.revokeObjectURL(url));
    setPickedFiles([]);
    setPickedPreviews([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleFilesChange(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const safeImages = files.filter((file) => file.type.startsWith("image/"));
    const previews = safeImages.map((file) => URL.createObjectURL(file));

    setPickedFiles((prev) => [...prev, ...safeImages]);
    setPickedPreviews((prev) => [...prev, ...previews]);
  }

  async function uploadImages(files) {
    if (!files.length) return [];
    setUploading(true);

    try {
      const uploaded = [];

      for (const file of files) {
        const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}-${file.name}`;
        const imageRef = ref(storage, `daily-frame/${fileName}`);
        await uploadBytes(imageRef, file);
        const downloadURL = await getDownloadURL(imageRef);
        uploaded.push({
          url: downloadURL,
          path: imageRef.fullPath,
          name: file.name,
        });
      }

      return uploaded;
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!form.title.trim() && !form.note.trim() && !form.place.trim()) return;

    setSaving(true);

    try {
      const newUploads = await uploadImages(pickedFiles);
      const payload = {
        type: form.type,
        title: form.title.trim(),
        note: form.note.trim(),
        date: form.date,
        time: form.time,
        place: form.place.trim(),
        duration: MOVEMENT_TYPES.includes(form.type) ? form.duration.trim() : "",
        cafeRating: form.type === "Cafe" ? form.cafeRating.trim() : "",
        updatedAt: serverTimestamp(),
      };

      if (editingId) {
        const original = entries.find((item) => item.id === editingId);
        const previousImages = Array.isArray(original?.images) ? original.images : [];
        await updateDoc(doc(db, "daily-frame-entries", editingId), {
          ...payload,
          images: [...previousImages, ...newUploads],
        });
      } else {
        await addDoc(collection(db, "daily-frame-entries"), {
          ...payload,
          images: newUploads,
          createdAt: serverTimestamp(),
        });
      }

      clearForm();
      setSelectedTab("Journal");
    } catch (error) {
      console.error("Save error:", error);
      alert("Could not save entry. Check Firebase settings and try again.");
    } finally {
      setSaving(false);
    }
  }

  function handleEdit(item) {
    setEditingId(item.id);
    setForm({
      type: item.type || "Ride",
      title: item.title || "",
      note: item.note || "",
      date: item.date || getTodayLocalDate(),
      time: item.time || getNowLocalTime(),
      place: item.place || "",
      duration: item.duration || "",
      cafeRating: item.cafeRating || "",
    });
    clearPickedImages();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(item) {
    const ok = window.confirm("Delete this entry?");
    if (!ok) return;

    try {
      if (Array.isArray(item.images)) {
        for (const image of item.images) {
          if (image?.path) {
            try {
              await deleteObject(ref(storage, image.path));
            } catch (err) {
              console.warn("Image delete skipped:", err);
            }
          }
        }
      }

      await deleteDoc(doc(db, "daily-frame-entries", item.id));
    } catch (error) {
      console.error("Delete error:", error);
      alert("Could not delete entry.");
    }
  }

  function openLightbox(images, index = 0) {
    if (!images?.length) return;
    setLightboxImages(images);
    setLightboxIndex(index);
  }

  function closeLightbox() {
    setLightboxImages([]);
    setLightboxIndex(0);
  }

  function nextLightbox() {
    setLightboxIndex((prev) => (prev + 1) % lightboxImages.length);
  }

  function prevLightbox() {
    setLightboxIndex((prev) => (prev - 1 + lightboxImages.length) % lightboxImages.length);
  }

  return (
    <div className="min-h-screen bg-[#f3f0e8] text-[#2f2d29]">
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(47,45,41,0.7) 1px, transparent 0)",
          backgroundSize: "16px 16px",
        }}
      />

      <div className="relative mx-auto max-w-3xl px-4 pb-24 pt-5 sm:px-6">
        <header className="mb-5 rounded-[28px] border border-[#d9d2c5] bg-[#f7f4ed]/95 px-5 py-5 shadow-[0_10px_30px_rgba(80,68,49,0.06)] backdrop-blur">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="mb-2 text-[11px] uppercase tracking-[0.24em] text-[#8f816b]">
                Daily Frame.
              </div>
              <h1 className="text-[28px] font-semibold leading-none tracking-[-0.03em] text-[#4a4338]">
                Ride the day. Keep the moment.
              </h1>
              <p className="mt-2 text-[13px] text-[#7d7468]">
                Quick to log on the phone. Calm to browse later.
              </p>
            </div>
            <div className="hidden rounded-full border border-[#dad3c7] bg-[#f2ede4] px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-[#8f816b] sm:block">
              Firebase sync
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            {["Journal", "Summary"].map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setSelectedTab(tab)}
                className={classNames(
                  "rounded-full border px-4 py-2 text-[13px] transition",
                  selectedTab === tab
                    ? "border-[#8f816b] bg-[#8f816b] text-white"
                    : "border-[#d8d1c3] bg-[#f7f4ed] text-[#655d52] hover:bg-[#f0ebe2]"
                )}
              >
                {tab}
              </button>
            ))}
          </div>
        </header>

        <section className="mb-5 rounded-[28px] border border-[#d9d2c5] bg-[#fbf8f1] p-4 shadow-[0_8px_24px_rgba(80,68,49,0.05)] sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-[0.22em] text-[#8f816b]">
                {editingId ? "Edit entry" : "New entry"}
              </div>
              <div className="mt-1 text-[14px] text-[#6f675b]">
                Capture first, polish later.
              </div>
            </div>
            {editingId ? (
              <button
                type="button"
                onClick={clearForm}
                className="rounded-full border border-[#d9d2c5] px-3 py-1.5 text-[12px] text-[#6b6458] hover:bg-[#f1ece3]"
              >
                Cancel edit
              </button>
            ) : null}
          </div>

          <div className="mb-4 -mx-1 overflow-x-auto">
            <div className="flex min-w-max gap-2 px-1">
              {ENTRY_TYPES.map(({ label, icon: Icon }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setType(label)}
                  className={classNames(
                    "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[13px] transition",
                    form.type === label
                      ? "border-[#8f816b] bg-[#efe7d8] text-[#4a4338]"
                      : "border-[#d9d2c5] bg-white/80 text-[#6c655a] hover:bg-[#f4efe6]"
                  )}
                >
                  <Icon size={14} />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <Field
              label={form.type === "Cafe" ? "Cafe / Title" : form.type === "Journal" ? "Title" : "Ride title"}
              value={form.title}
              onChange={(v) => updateForm("title", v)}
              placeholder={
                form.type === "Ride"
                  ? "Don Valley loop"
                  : form.type === "Walk"
                  ? "Lunch walk"
                  : form.type === "Cafe"
                  ? "Sam James"
                  : "Small note from the day"
              }
            />

            <Field
              label="Notes"
              value={form.note}
              onChange={(v) => updateForm("note", v)}
              placeholder="What stood out today?"
              textarea
            />

            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Date"
                value={form.date}
                onChange={(v) => updateForm("date", v)}
                type="date"
                icon={CalendarDays}
              />
              <Field
                label="Time"
                value={form.time}
                onChange={(v) => updateForm("time", v)}
                type="time"
                icon={Clock3}
              />
            </div>

            <Field
              label="Place"
              value={form.place}
              onChange={(v) => updateForm("place", v)}
              placeholder="Toronto"
              icon={MapPin}
            />

            <div className="grid grid-cols-2 gap-3">
              <Field
                label={MOVEMENT_TYPES.includes(form.type) ? "Duration (mins)" : "Duration"}
                value={form.duration}
                onChange={(v) => updateForm("duration", v)}
                placeholder={MOVEMENT_TYPES.includes(form.type) ? "55" : "Optional"}
                inputMode="numeric"
                disabled={!MOVEMENT_TYPES.includes(form.type)}
              />
              <Field
                label="Cafe rating"
                value={form.cafeRating}
                onChange={(v) => updateForm("cafeRating", v)}
                placeholder="4.5 / 5"
                disabled={form.type !== "Cafe"}
              />
            </div>

            <div>
              <div className="mb-1.5 text-[11px] uppercase tracking-[0.18em] text-[#8f816b]">
                Photos
              </div>
              <div className="rounded-[22px] border border-dashed border-[#cfc6b7] bg-[#f6f2ea] p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 rounded-full border border-[#d0c7b9] bg-white px-3 py-2 text-[13px] text-[#5e564b] hover:bg-[#f5efe7]"
                  >
                    <ImageIcon size={14} />
                    Choose image
                  </button>
                  <div className="text-[12px] text-[#7d7468]">
                    Add one or several photos.
                  </div>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFilesChange}
                  className="hidden"
                />

                {pickedPreviews.length ? (
                  <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {pickedPreviews.map((src, index) => (
                      <div key={`${src}-${index}`} className="group relative overflow-hidden rounded-2xl border border-[#ddd4c7] bg-white">
                        <img src={src} alt="preview" className="h-24 w-full object-cover" />
                        <button
                          type="button"
                          onClick={() => {
                            const nextFiles = pickedFiles.filter((_, i) => i !== index);
                            const nextPreviews = pickedPreviews.filter((_, i) => i !== index);
                            URL.revokeObjectURL(src);
                            setPickedFiles(nextFiles);
                            setPickedPreviews(nextPreviews);
                          }}
                          className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white opacity-90"
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
                type="submit"
                disabled={saving || uploading}
                className="inline-flex min-w-[130px] items-center justify-center gap-2 rounded-full bg-[#8f816b] px-5 py-3 text-[13px] font-medium text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving || uploading ? <Loader2 size={15} className="animate-spin" /> : null}
                {editingId ? "Update entry" : "Add entry"}
              </button>
              <button
                type="button"
                onClick={clearForm}
                className="rounded-full border border-[#d7d0c3] px-4 py-3 text-[13px] text-[#5f584d] hover:bg-[#f1ece4]"
              >
                Clear
              </button>
            </div>
          </form>
        </section>

        {selectedTab === "Journal" ? (
          <section className="space-y-3">
            {loadingEntries ? (
              <div className="rounded-[28px] border border-[#d9d2c5] bg-[#fbf8f1] p-6 text-[14px] text-[#6f675b]">
                Loading your journal…
              </div>
            ) : groupedEntries.length ? (
              groupedEntries.map((row) => {
                if (row.type === "month") {
                  return (
                    <div key={row.key} className="sticky top-2 z-10 pt-2">
                      <div className="inline-flex rounded-full border border-[#d8d1c4] bg-[#f7f3eb]/95 px-3 py-1.5 text-[11px] uppercase tracking-[0.22em] text-[#8f816b] shadow-sm backdrop-blur">
                        {row.label}
                      </div>
                    </div>
                  );
                }

                return (
                  <EntryCard
                    key={row.key}
                    item={row.item}
                    onEdit={() => handleEdit(row.item)}
                    onDelete={() => handleDelete(row.item)}
                    onOpenLightbox={openLightbox}
                  />
                );
              })
            ) : (
              <div className="rounded-[28px] border border-[#d9d2c5] bg-[#fbf8f1] p-6 text-[14px] text-[#6f675b]">
                No entries yet. Start with a ride, walk, cafe, or small journal note.
              </div>
            )}
          </section>
        ) : (
          <section className="space-y-4">
            <div className="rounded-[28px] border border-[#d9d2c5] bg-[#fbf8f1] p-4 shadow-[0_8px_24px_rgba(80,68,49,0.05)] sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.22em] text-[#8f816b]">
                    Monthly summary
                  </div>
                  <div className="mt-1 text-[18px] font-semibold tracking-[-0.02em] text-[#4a4338]">
                    {availableMonths.length ? formatMonthLabel(selectedMonth) : formatMonthYear(getTodayLocalDate())}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const idx = availableMonths.findIndex((m) => m.key === selectedMonth);
                      if (idx >= 0 && idx < availableMonths.length - 1) {
                        setSelectedMonth(availableMonths[idx + 1].key);
                      }
                    }}
                    className="rounded-full border border-[#d7d0c3] p-2 text-[#635b50] hover:bg-[#f0ebe2]"
                  >
                    <ChevronLeft size={16} />
                  </button>

                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="rounded-full border border-[#d7d0c3] bg-white px-4 py-2 text-[13px] text-[#534c42] outline-none"
                  >
                    {availableMonths.length ? (
                      availableMonths.map((m) => (
                        <option key={m.key} value={m.key}>
                          {m.label}
                        </option>
                      ))
                    ) : (
                      <option value={selectedMonth}>{formatMonthLabel(selectedMonth)}</option>
                    )}
                  </select>

                  <button
                    type="button"
                    onClick={() => {
                      const idx = availableMonths.findIndex((m) => m.key === selectedMonth);
                      if (idx > 0) {
                        setSelectedMonth(availableMonths[idx - 1].key);
                      }
                    }}
                    className="rounded-full border border-[#d7d0c3] p-2 text-[#635b50] hover:bg-[#f0ebe2]"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <StatCard label="Entries" value={monthStats.total} icon={BarChart3} />
                <StatCard label="Rides" value={monthStats.Ride} icon={Bike} />
                <StatCard label="Walks" value={monthStats.Walk} icon={Footprints} />
                <StatCard label="Cafes" value={monthStats.Cafe} icon={Coffee} />
                <StatCard label="Journal" value={monthStats.Journal} icon={BookOpen} />
                <StatCard label="Photos" value={monthStats.photos} icon={Camera} />
              </div>

              <div className="mt-3 rounded-[22px] border border-[#e0d9cc] bg-[#f5f1e8] px-4 py-3 text-[13px] text-[#645d52]">
                Movement time this month: <span className="font-semibold text-[#4a4338]">{monthStats.minutes} mins</span>
              </div>
            </div>

            <div className="rounded-[28px] border border-[#d9d2c5] bg-[#fbf8f1] p-4 shadow-[0_8px_24px_rgba(80,68,49,0.05)] sm:p-5">
              <div className="mb-3 text-[11px] uppercase tracking-[0.22em] text-[#8f816b]">
                Entries in this month
              </div>

              {monthEntries.length ? (
                <div className="space-y-3">
                  {monthEntries.map((item) => (
                    <EntryCard
                      key={item.id}
                      item={item}
                      compact
                      onEdit={() => handleEdit(item)}
                      onDelete={() => handleDelete(item)}
                      onOpenLightbox={openLightbox}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-[14px] text-[#6f675b]">No entries in this month yet.</div>
              )}
            </div>
          </section>
        )}
      </div>

      {lightboxImages.length ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4">
          <button
            type="button"
            onClick={closeLightbox}
            className="absolute right-4 top-4 rounded-full border border-white/20 bg-white/10 p-2 text-white"
          >
            <X size={18} />
          </button>

          {lightboxImages.length > 1 ? (
            <button
              type="button"
              onClick={prevLightbox}
              className="absolute left-4 rounded-full border border-white/20 bg-white/10 p-2 text-white"
            >
              <ChevronLeft size={20} />
            </button>
          ) : null}

          <img
            src={lightboxImages[lightboxIndex]?.url}
            alt="enlarged"
            className="max-h-[88vh] max-w-[92vw] rounded-2xl object-contain shadow-2xl"
          />

          {lightboxImages.length > 1 ? (
            <button
              type="button"
              onClick={nextLightbox}
              className="absolute right-4 rounded-full border border-white/20 bg-white/10 p-2 text-white"
            >
              <ChevronRight size={20} />
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function EntryCard({ item, onEdit, onDelete, onOpenLightbox, compact = false }) {
  const Icon = typeIcon(item.type);
  const images = Array.isArray(item.images) ? item.images : [];

  return (
    <article className="rounded-[28px] border border-[#d9d2c5] bg-[#fbf8f1] p-4 shadow-[0_8px_24px_rgba(80,68,49,0.05)] sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full border border-[#d8d1c4] bg-[#f3eee5] px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] text-[#8f816b]">
              <Icon size={12} />
              {item.type || "Entry"}
            </span>
            <span className="text-[11px] uppercase tracking-[0.16em] text-[#938977]">
              {formatFullDate(item.date)}
            </span>
            {item.time ? (
              <span className="text-[11px] uppercase tracking-[0.16em] text-[#938977]">
                {item.time}
              </span>
            ) : null}
          </div>

          <h3 className="text-[20px] font-semibold tracking-[-0.025em] text-[#4b4439]">
            {item.title || "Untitled"}
          </h3>

          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-[#70685c]">
            {item.place ? <span>Place: {item.place}</span> : null}
            {item.duration ? <span>Duration: {item.duration} mins</span> : null}
            {item.cafeRating ? <span>Rating: {item.cafeRating}</span> : null}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="rounded-full border border-[#d7d0c3] p-2 text-[#665e53] hover:bg-[#f0ebe2]"
          >
            <Pencil size={15} />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded-full border border-[#d7d0c3] p-2 text-[#665e53] hover:bg-[#f0ebe2]"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {item.note ? (
        <p className="mt-3 whitespace-pre-wrap text-[14px] leading-6 text-[#564f45]">{item.note}</p>
      ) : null}

      {images.length ? (
        <div className={classNames("mt-4 grid gap-2", compact ? "grid-cols-3" : "grid-cols-2 sm:grid-cols-3") }>
          {images.map((image, index) => (
            <button
              key={`${image.url}-${index}`}
              type="button"
              onClick={() => onOpenLightbox(images, index)}
              className="overflow-hidden rounded-[20px] border border-[#ddd4c7] bg-white text-left"
            >
              <img
                src={image.url}
                alt={image.name || item.title || "entry image"}
                className={classNames(
                  "w-full object-cover transition hover:scale-[1.02]",
                  compact ? "h-24" : "h-40"
                )}
              />
            </button>
          ))}
        </div>
      ) : null}
    </article>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  textarea = false,
  type = "text",
  icon: Icon,
  inputMode,
  disabled = false,
}) {
  const baseClass = classNames(
    "w-full rounded-[20px] border border-[#ddd4c7] bg-white/90 px-4 py-3 text-[14px] text-[#3f392f] outline-none transition placeholder:text-[#aaa08f] focus:border-[#b6a68a] focus:bg-white",
    disabled && "cursor-not-allowed bg-[#f2eee6] text-[#998f81]"
  );

  return (
    <label className="block">
      <div className="mb-1.5 flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] text-[#8f816b]">
        {Icon ? <Icon size={12} /> : null}
        <span>{label}</span>
      </div>
      <div className="relative">
        {textarea ? (
          <textarea
            rows={4}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            className={classNames(baseClass, "resize-none")}
          />
        ) : (
          <input
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            inputMode={inputMode}
            disabled={disabled}
            className={baseClass}
          />
        )}
      </div>
    </label>
  );
}

function StatCard({ label, value, icon: Icon }) {
  return (
    <div className="rounded-[22px] border border-[#ddd4c7] bg-white/85 px-4 py-4">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-[#8f816b]">
        <Icon size={12} />
        {label}
      </div>
      <div className="mt-2 text-[28px] font-semibold tracking-[-0.03em] text-[#4a4338]">{value}</div>
    </div>
  );
}
