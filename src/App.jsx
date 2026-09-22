import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";

const STORAGE_KEY = "noteflow-final";

const categories = ["Semua", "Umum", "Ide", "Sekolah", "Kerja", "Rencana", "Pribadi"];

const starterNote = {
  id: crypto.randomUUID(),
  title: "Selamat datang di NoteFlow",
  content:
    "<h2>Selamat datang 👋</h2><p>Ini adalah aplikasi catatan modern untuk menyimpan ide, tugas, rencana, dan berbagai catatan penting.</p><p><strong>Gunakan toolbar</strong> untuk membuat tulisan lebih menarik.</p>",
  category: "Umum",
  favorite: false,
  pinned: true,
  locked: false,
  password: "",
  deleted: false,
  color: "#6366f1",
  created: Date.now(),
  updated: Date.now(),
};

function loadNotes() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}

  return [starterNote];
}

function plainText(html) {
  const div = document.createElement("div");
  div.innerHTML = html || "";
  return div.textContent || "";
}

function App() {
  const [notes, setNotes] = useState(loadNotes);
  const [activeId, setActiveId] = useState(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Semua");
  const [dark, setDark] = useState(false);
  const [focus, setFocus] = useState(false);
  const [trash, setTrash] = useState(false);
  const [favorites, setFavorites] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [locked, setLocked] = useState(false);
  const [fontSize, setFontSize] = useState(17);
  const [listening, setListening] = useState(false);

  const editorRef = useRef(null);
  const recognitionRef = useRef(null);

  const activeNote = notes.find((note) => note.id === activeId);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  }, [notes]);

  useEffect(() => {
    if (!activeNote) {
      setLocked(false);
      return;
    }

    setLocked(activeNote.locked);

    if (!activeNote.locked && editorRef.current) {
      editorRef.current.innerHTML = activeNote.content || "<p></p>";
    }
  }, [activeId]);

  const visibleNotes = useMemo(() => {
    let result = notes.filter((note) =>
      trash ? note.deleted : !note.deleted
    );

    if (favorites) {
      result = result.filter((note) => note.favorite);
    }

    if (pinned) {
      result = result.filter((note) => note.pinned);
    }

    if (category !== "Semua") {
      result = result.filter((note) => note.category === category);
    }

    if (search.trim()) {
      const q = search.toLowerCase();

      result = result.filter((note) => {
        return (
          note.title.toLowerCase().includes(q) ||
          plainText(note.content).toLowerCase().includes(q) ||
          note.category.toLowerCase().includes(q)
        );
      });
    }

    return [...result].sort((a, b) => {
      if (a.pinned !== b.pinned) return b.pinned - a.pinned;
      return b.updated - a.updated;
    });
  }, [notes, trash, favorites, pinned, category, search]);

  function createNote() {
    const now = Date.now();

    const note = {
      id: crypto.randomUUID(),
      title: "Catatan Baru",
      content: "<p>Mulai menulis di sini...</p>",
      category: "Umum",
      favorite: false,
      pinned: false,
      locked: false,
      password: "",
      deleted: false,
      color: "#6366f1",
      created: now,
      updated: now,
    };

    setNotes((prev) => [note, ...prev]);
    setActiveId(note.id);
    setTrash(false);
    setFavorites(false);
    setPinned(false);
  }

  function updateNote(changes) {
    if (!activeNote || activeNote.deleted || locked) return;

    setNotes((prev) =>
      prev.map((note) =>
        note.id === activeId
          ? { ...note, ...changes, updated: Date.now() }
          : note
      )
    );
  }

  function selectNote(id) {
    setActiveId(id);
  }

  function editTitle(e) {
    updateNote({ title: e.target.value });
  }

  function editContent() {
    if (!editorRef.current || locked) return;

    updateNote({
      content: editorRef.current.innerHTML,
    });
  }

  function command(commandName, value = null) {
    if (locked || !editorRef.current) return;

    editorRef.current.focus();
    document.execCommand(commandName, false, value);
    editContent();
  }

  function addLink() {
    if (locked) return;

    const url = window.prompt("Masukkan URL:");
    if (!url) return;

    command("createLink", url);
  }

  function changeFontSize(size) {
    setFontSize(Number(size));

    if (!editorRef.current || locked) return;

    editorRef.current.focus();
    document.execCommand("fontSize", false, "7");

    editorRef.current
      .querySelectorAll('font[size="7"]')
      .forEach((el) => {
        el.removeAttribute("size");
        el.style.fontSize = `${size}px`;
      });

    editContent();
  }

  function toggleFavorite() {
    if (!activeNote || trash) return;
    updateNote({ favorite: !activeNote.favorite });
  }

  function togglePinned() {
    if (!activeNote || trash) return;
    updateNote({ pinned: !activeNote.pinned });
  }

  function changeCategory(e) {
    updateNote({ category: e.target.value });
  }

  function changeColor(color) {
    if (!activeNote || trash) return;
    updateNote({ color });
  }

  function moveTrash() {
    if (!activeNote) return;

    setNotes((prev) =>
      prev.map((note) =>
        note.id === activeId
          ? { ...note, deleted: true, updated: Date.now() }
          : note
      )
    );

    setActiveId(null);
  }

  function restoreNote(id) {
    setNotes((prev) =>
      prev.map((note) =>
        note.id === id
          ? { ...note, deleted: false, updated: Date.now() }
          : note
      )
    );
  }

  function deleteForever(id) {
    if (!window.confirm("Hapus catatan secara permanen?")) return;

    setNotes((prev) => prev.filter((note) => note.id !== id));

    if (activeId === id) {
      setActiveId(null);
    }
  }

  function emptyTrash() {
    if (!window.confirm("Kosongkan Trash?")) return;

    setNotes((prev) => prev.filter((note) => !note.deleted));
    setActiveId(null);
  }

  function toggleLock() {
    if (!activeNote) {
      alert("Pilih catatan terlebih dahulu.");
      return;
    }

    if (activeNote.locked) {
      const password = window.prompt("Masukkan PIN/password:");

      if (password === activeNote.password) {
        setLocked(false);

        setTimeout(() => {
          if (editorRef.current) {
            editorRef.current.innerHTML = activeNote.content;
          }
        }, 50);
      } else {
        alert("PIN/password salah.");
      }

      return;
    }

    const password = window.prompt(
      "Buat PIN/password untuk catatan ini:"
    );

    if (!password) return;

    setNotes((prev) =>
      prev.map((note) =>
        note.id === activeId
          ? {
              ...note,
              locked: true,
              password,
              updated: Date.now(),
            }
          : note
      )
    );

    setLocked(true);
  }

  function startVoice() {
    if (locked) return;

    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert(
        "Browser ini tidak mendukung Voice Typing. Gunakan Chrome atau Edge."
      );
      return;
    }

    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    const recognition = new SpeechRecognition();

    recognition.lang = "id-ID";
    recognition.continuous = true;
    recognition.interimResults = false;

    recognition.onstart = () => setListening(true);

    recognition.onresult = (event) => {
      const text = Array.from(event.results)
        .slice(event.resultIndex)
        .map((result) => result[0].transcript)
        .join(" ");

      if (editorRef.current) {
        editorRef.current.focus();
        document.execCommand(
          "insertText",
          false,
          text + " "
        );
        editContent();
      }
    };

    recognition.onerror = () => {
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }

  function selectAllNotes() {
    setCategory("Semua");
    setTrash(false);
    setFavorites(false);
    setPinned(false);
  }

  useEffect(() => {
    function keyboard(e) {
      const modifier = e.ctrlKey || e.metaKey;

      if (modifier && e.key.toLowerCase() === "k") {
        e.preventDefault();
        document.querySelector(".search-input")?.focus();
      }

      if (modifier && e.key.toLowerCase() === "n") {
        e.preventDefault();
        createNote();
      }

      if (e.key === "Escape" && focus) {
        setFocus(false);
      }
    }

    window.addEventListener("keydown", keyboard);

    return () => {
      window.removeEventListener("keydown", keyboard);
    };
  }, [focus]);

  const text = activeNote ? plainText(activeNote.content) : "";

  const words = text.trim()
    ? text.trim().split(/\s+/).length
    : 0;

  const characters = text.length;

  const paragraphs = text
    ? text.split(/\n+/).filter(Boolean).length
    : 0;

  const readingTime = Math.max(
    1,
    Math.ceil(words / 200)
  );

  return (
    <div className={`app ${dark ? "dark" : ""} ${focus ? "focus" : ""}`}>
      {!focus && (
        <aside className="sidebar">
          <div className="brand">
            <div className="brand-icon">📝</div>

            <div>
              <h1>NoteFlow</h1>
              <p>Smart Notes</p>
            </div>
          </div>

          <button className="new-note" onClick={createNote}>
            ＋ Catatan Baru
          </button>

          <div className="sidebar-title">CATATAN</div>

          <button
            className={`side-item ${
              !trash && !favorites && !pinned
                ? "active"
                : ""
            }`}
            onClick={selectAllNotes}
          >
            📚 Semua Catatan
            <span>{notes.filter((n) => !n.deleted).length}</span>
          </button>

          <button
            className={`side-item ${
              favorites ? "active" : ""
            }`}
            onClick={() => {
              setFavorites(true);
              setPinned(false);
              setTrash(false);
            }}
          >
            ⭐ Favorit
            <span>
              {
                notes.filter(
                  (n) => n.favorite && !n.deleted
                ).length
              }
            </span>
          </button>

          <button
            className={`side-item ${
              pinned ? "active" : ""
            }`}
            onClick={() => {
              setPinned(true);
              setFavorites(false);
              setTrash(false);
            }}
          >
            📌 Dipin
            <span>
              {
                notes.filter(
                  (n) => n.pinned && !n.deleted
                ).length
              }
            </span>
          </button>

          <button
            className={`side-item ${
              trash ? "active" : ""
            }`}
            onClick={() => {
              setTrash(true);
              setFavorites(false);
              setPinned(false);
              setActiveId(null);
            }}
          >
            🗑️ Trash
            <span>
              {notes.filter((n) => n.deleted).length}
            </span>
          </button>

          <div className="sidebar-title">
            KATEGORI
          </div>

          <div className="category-list">
            {categories.slice(1).map((item) => (
              <button
                key={item}
                className={`category-button ${
                  category === item &&
                  !trash &&
                  !favorites &&
                  !pinned
                    ? "active"
                    : ""
                }`}
                onClick={() => {
                  setCategory(item);
                  setTrash(false);
                  setFavorites(false);
                  setPinned(false);
                }}
              >
                {item}
              </button>
            ))}
          </div>

          <div className="sidebar-bottom">
            <button
              className="bottom-button"
              onClick={() => setDark(!dark)}
            >
              {dark ? "☀️ Mode Terang" : "🌙 Mode Gelap"}
            </button>

            <button
              className="bottom-button"
              onClick={() => setFocus(!focus)}
            >
              🎯 Mode Fokus
            </button>

            <button
              className="bottom-button"
              onClick={toggleLock}
            >
              🔐 Kunci Catatan
            </button>
          </div>
        </aside>
      )}

      <main className="main">
        {!focus && (
          <header className="topbar">
            <div className="search">
              <span>🔎</span>

              <input
                className="search-input"
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
                placeholder="Cari catatan..."
              />

              <kbd>Ctrl K</kbd>
            </div>

            <div className="top-actions">
              <span className="top-label">
                {trash
                  ? "Trash"
                  : favorites
                  ? "Favorit"
                  : pinned
                  ? "Dipin"
                  : category}
              </span>

              <div className="avatar">N</div>
            </div>
          </header>
        )}

        {focus && (
          <button
            className="exit-focus"
            onClick={() => setFocus(false)}
          >
            Keluar Fokus
          </button>
        )}

        <section className="workspace">
          {!focus && (
            <section className="notes-panel">
              <div className="notes-header">
                <div>
                  <h2>
                    {trash
                      ? "Trash"
                      : favorites
                      ? "Favorit"
                      : pinned
                      ? "Catatan Dipin"
                      : category === "Semua"
                      ? "Semua Catatan"
                      : category}
                  </h2>

                  <span>
                    {visibleNotes.length} catatan
                  </span>
                </div>

                {trash && (
                  <button
                    className="empty-trash"
                    onClick={emptyTrash}
                  >
                    Kosongkan
                  </button>
                )}
              </div>

              <div className="notes-list">
                {visibleNotes.length === 0 ? (
                  <div className="empty">
                    <div>📭</div>
                    <p>Tidak ada catatan.</p>
                  </div>
                ) : (
                  visibleNotes.map((note) => (
                    <article
                      key={note.id}
                      className={`note-card ${
                        note.id === activeId
                          ? "active"
                          : ""
                      }`}
                      style={{
                        borderLeftColor:
                          note.color,
                      }}
                      onClick={() =>
                        selectNote(note.id)
                      }
                    >
                      <div className="note-card-top">
                        <span className="note-category">
                          {note.category}
                        </span>

                        <span>
                          {note.pinned ? "📌" : ""}
                          {note.favorite ? " ⭐" : ""}
                        </span>
                      </div>

                      <h3>{note.title}</h3>

                      <p>
                        {plainText(
                          note.content
                        ) ||
                          "Catatan kosong"}
                      </p>

                      <small>
                        {new Date(
                          note.updated
                        ).toLocaleDateString(
                          "id-ID"
                        )}
                      </small>

                      {trash && (
                        <div className="trash-actions">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              restoreNote(note.id);
                            }}
                          >
                            ↩ Pulihkan
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteForever(note.id);
                            }}
                          >
                            Hapus
                          </button>
                        </div>
                      )}
                    </article>
                  ))
                )}
              </div>
            </section>
          )}

          <section className="editor-panel">
            {!activeNote ? (
              <div className="welcome">
                <div className="welcome-icon">
                  📝
                </div>

                <h1>Selamat datang di NoteFlow</h1>

                <p>
                  Buat catatan baru untuk mulai
                  menulis.
                </p>

                <button
                  className="primary-button"
                  onClick={createNote}
                >
                  ＋ Buat Catatan
                </button>
              </div>
            ) : (
              <>
                <div className="editor-header">
                  <div className="save-status">
                    ✓ Tersimpan otomatis
                  </div>

                  <div className="editor-actions">
                    <button
                      onClick={toggleFavorite}
                      title="Favorit"
                    >
                      {activeNote.favorite
                        ? "⭐"
                        : "☆"}
                    </button>

                    <button
                      onClick={togglePinned}
                      title="Pin"
                    >
                      {activeNote.pinned
                        ? "📌"
                        : "📍"}
                    </button>

                    <button
                      onClick={moveTrash}
                      title="Trash"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                {locked ? (
                  <div className="locked-screen">
                    <div className="lock-icon">
                      🔐
                    </div>

                    <h2>Catatan Dikunci</h2>

                    <p>
                      Masukkan password untuk
                      membuka catatan ini.
                    </p>

                    <button
                      className="primary-button"
                      onClick={toggleLock}
                    >
                      🔓 Buka Catatan
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="title-row">
                      <input
                        className="title-input"
                        value={activeNote.title}
                        onChange={editTitle}
                        placeholder="Judul catatan..."
                      />

                      <select
                        value={activeNote.category}
                        onChange={changeCategory}
                      >
                        {categories
                          .slice(1)
                          .map((item) => (
                            <option
                              key={item}
                              value={item}
                            >
                              {item}
                            </option>
                          ))}
                      </select>
                    </div>

                    <div className="toolbar">
                      <button
                        onMouseDown={(e) =>
                          e.preventDefault()
                        }
                        onClick={() =>
                          command("bold")
                        }
                        title="Bold"
                      >
                        <b>B</b>
                      </button>

                      <button
                        onMouseDown={(e) =>
                          e.preventDefault()
                        }
                        onClick={() =>
                          command("italic")
                        }
                      >
                        <i>I</i>
                      </button>

                      <button
                        onMouseDown={(e) =>
                          e.preventDefault()
                        }
                        onClick={() =>
                          command("underline")
                        }
                      >
                        <u>U</u>
                      </button>

                      <span className="divider" />

                      <button
                        onClick={() =>
                          command(
                            "insertUnorderedList"
                          )
                        }
                      >
                        ☷
                      </button>

                      <button
                        onClick={() =>
                          command(
                            "insertOrderedList"
                          )
                        }
                      >
                        ≡
                      </button>

                      <button
                        onClick={() =>
                          command(
                            "formatBlock",
                            "H2"
                          )
                        }
                      >
                        H2
                      </button>

                      <button
                        onClick={() =>
                          command(
                            "formatBlock",
                            "H3"
                          )
                        }
                      >
                        H3
                      </button>

                      <button onClick={addLink}>
                        🔗
                      </button>

                      <span className="divider" />

                      <select
                        value={fontSize}
                        onChange={(e) =>
                          changeFontSize(
                            e.target.value
                          )
                        }
                      >
                        {[14, 16, 17, 18, 20, 24, 28, 32].map(
                          (size) => (
                            <option
                              key={size}
                              value={size}
                            >
                              {size}px
                            </option>
                          )
                        )}
                      </select>

                      <div className="text-colors">
                        {[
                          "#111827",
                          "#ef4444",
                          "#f97316",
                          "#eab308",
                          "#22c55e",
                          "#06b6d4",
                          "#3b82f6",
                          "#6366f1",
                          "#8b5cf6",
                          "#ec4899",
                        ].map((color) => (
                          <button
                            key={color}
                            className="color-dot"
                            style={{
                              background:
                                color,
                            }}
                            onMouseDown={(e) =>
                              e.preventDefault()
                            }
                            onClick={() =>
                              command(
                                "foreColor",
                                color
                              )
                            }
                            title="Warna teks"
                          />
                        ))}
                      </div>

                      <span className="divider" />

                      <button
                        className={
                          listening
                            ? "voice active"
                            : "voice"
                        }
                        onClick={startVoice}
                      >
                        {listening
                          ? "⏹ Berhenti"
                          : "🎙 Voice"}
                      </button>

                      <div className="note-colors">
                        {[
                          "#6366f1",
                          "#ef4444",
                          "#f97316",
                          "#eab308",
                          "#22c55e",
                          "#06b6d4",
                          "#3b82f6",
                          "#ec4899",
                        ].map((color) => (
                          <button
                            key={color}
                            className="color-dot"
                            style={{
                              background:
                                color,
                            }}
                            onClick={() =>
                              changeColor(color)
                            }
                            title="Warna catatan"
                          />
                        ))}
                      </div>
                    </div>

                    <div
                      ref={editorRef}
                      className="editor"
                      contentEditable
                      suppressContentEditableWarning
                      onInput={editContent}
                      style={{
                        fontSize: `${fontSize}px`,
                      }}
                    />

                    <div className="editor-footer">
                      <span>📝 {words} kata</span>
                      <span>🔤 {characters} karakter</span>
                      <span>¶ {paragraphs} paragraf</span>
                      <span>◷ {readingTime} menit baca</span>
                      <span className="auto-save">
                        ✓ Tersimpan otomatis
                      </span>
                    </div>
                  </>
                )}
              </>
            )}
          </section>
        </section>
      </main>
    </div>
  );
}

export default App;
