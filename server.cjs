const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 5000;

const DATA_FILE = path.join(__dirname, "notes.json");

app.use(cors());
app.use(express.json());

function readNotes() {
    try {
        if (!fs.existsSync(DATA_FILE)) {
            fs.writeFileSync(DATA_FILE, "[]", "utf8");
        }

        const data = fs.readFileSync(DATA_FILE, "utf8");
        return JSON.parse(data || "[]");
    } catch (error) {
        console.error("Gagal membaca notes:", error);
        return [];
    }
}

function saveNotes(notes) {
    fs.writeFileSync(
        DATA_FILE,
        JSON.stringify(notes, null, 2),
        "utf8"
    );
}

// TEST API
app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "NoteFlow API berhasil berjalan 🚀"
    });
});

// GET SEMUA CATATAN
app.get("/api/notes", (req, res) => {
    const notes = readNotes();
    res.json(notes);
});

// GET CATATAN BERDASARKAN ID
app.get("/api/notes/:id", (req, res) => {
    const notes = readNotes();
    const id = Number(req.params.id);

    const note = notes.find(item => item.id === id);

    if (!note) {
        return res.status(404).json({
            success: false,
            message: "Catatan tidak ditemukan"
        });
    }

    res.json(note);
});

// TAMBAH CATATAN
app.post("/api/notes", (req, res) => {
    const notes = readNotes();

    const note = {
        id: Date.now(),
        title: req.body.title || "Catatan Baru",
        content: req.body.content || "<p></p>",
        favorite: Boolean(req.body.favorite),
        pinned: Boolean(req.body.pinned),
        locked: Boolean(req.body.locked),
        password: req.body.password || "",
        category: req.body.category || "Umum",
        deleted: Boolean(req.body.deleted),
        updated: new Date().toISOString()
    };

    notes.unshift(note);
    saveNotes(notes);

    res.status(201).json(note);
});

// UPDATE CATATAN
app.put("/api/notes/:id", (req, res) => {
    const notes = readNotes();
    const id = Number(req.params.id);

    const index = notes.findIndex(item => item.id === id);

    if (index === -1) {
        return res.status(404).json({
            success: false,
            message: "Catatan tidak ditemukan"
        });
    }

    notes[index] = {
        ...notes[index],
        ...req.body,
        id,
        updated: new Date().toISOString()
    };

    saveNotes(notes);

    res.json(notes[index]);
});

// HAPUS CATATAN
app.delete("/api/notes/:id", (req, res) => {
    const notes = readNotes();
    const id = Number(req.params.id);

    const filtered = notes.filter(note => note.id !== id);

    if (filtered.length === notes.length) {
        return res.status(404).json({
            success: false,
            message: "Catatan tidak ditemukan"
        });
    }

    saveNotes(filtered);

    res.json({
        success: true,
        message: "Catatan berhasil dihapus"
    });
});

// START SERVER
app.listen(PORT, () => {
    console.log("");
    console.log("================================");
    console.log("       NOTEFLOW API SERVER");
    console.log("================================");
    console.log(`API: http://localhost:${PORT}`);
    console.log(`Notes: http://localhost:${PORT}/api/notes`);
    console.log("================================");
    console.log("");
});