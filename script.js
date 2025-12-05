// ============================================
// API Configuration
// ============================================
const PIXABAY_API_KEY = "48474848-c9a6f4bd1c3c3e8c9a3f8b2d"; // Free demo key
const API_BASE = "https://pixabay.com/api/audios/";

// ============================================
// DOM Elements
// ============================================
const input = document.getElementById("taskInput");
const addBtn = document.getElementById("addTask");
const taskList = document.getElementById("taskList");
const clearAll = document.getElementById("clearAll");
const filterButtons = document.querySelectorAll(".filter-btns button");

// ============================================
// State
// ============================================
let tasks = JSON.parse(localStorage.getItem("tasks")) || [];
let currentFilter = "all";
let doneAudio = null;

// ============================================
// Utility Functions
// ============================================
function save() {
    localStorage.setItem("tasks", JSON.stringify(tasks));
}

function humanTime(date) {
    const diff = Math.floor((Date.now() - new Date(date)) / 60000);
    if (diff < 1) return "Just now";
    if (diff < 60) return `${diff} min ago`;
    return `${Math.floor(diff / 60)} hr ago`;
}

// ============================================
// Sound Functions (API + Fallback)
// ============================================

// Fetch sound from Pixabay API
async function loadDoneSound() {
    try {
        console.log("🔊 Fetching sound from API...");
        const response = await fetch(
            `${API_BASE}?key=${PIXABAY_API_KEY}&q=notification+bell&order=popular&per_page=1`
        );
        
        if (!response.ok) throw new Error("API Error");
        
        const data = await response.json();
        
        if (data.hits && data.hits.length > 0) {
            const audioUrl = data.hits[0].previewUrl;
            doneAudio = new Audio(audioUrl);
            console.log("✅ Sound loaded from API successfully!");
            return doneAudio;
        } else {
            throw new Error("No sounds found");
        }
    } catch (error) {
        console.log("❌ API failed, using fallback beep:", error.message);
        return null;
    }
}

// Fallback: Web Audio API beep
function playBeep() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        // Create pleasant beep sound
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.1);
        osc.type = 'sine';
        
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.2);
        
        console.log("🔔 Playing beep fallback");
    } catch (e) {
        console.log("⚠️ Web Audio API failed");
    }
}

// Play sound (API first, then fallback)
function playSound() {
    if (doneAudio) {
        doneAudio.currentTime = 0;
        doneAudio.play().catch(err => {
            console.log("🔄 Audio play failed, using beep:", err);
            playBeep();
        });
    } else {
        playBeep();
    }
}

// ============================================
// Render Function
// ============================================
function render() {
    taskList.innerHTML = "";

    // Filter tasks
    let filtered = tasks.filter(t => {
        if (currentFilter === "active") return !t.completed;
        if (currentFilter === "completed") return t.completed;
        return true;
    });

    // Empty state
    if (filtered.length === 0) {
        taskList.innerHTML = `
        <p style="text-align:center;color:#6b7280;margin-top:20px">
            ${currentFilter === "completed" ? "No completed tasks yet" : "No tasks here. Add something meaningful."}
        </p>`;
        return;
    }

    // Render each task
    filtered.forEach(task => {
        const li = document.createElement("li");
        if (task.completed) li.classList.add("completed");

        // Left side: Text + Timestamp
        const left = document.createElement("div");
        left.className = "task-content";
        
        const title = document.createElement("span");
        title.className = "task-text";
        title.textContent = task.text;

        const stamp = document.createElement("span");
        stamp.className = "timestamp";
        stamp.textContent = humanTime(task.created);

        left.appendChild(title);
        left.appendChild(stamp);

        // Right side: Controls
        const controls = document.createElement("div");
        controls.className = "controls";

        // Toggle Complete Button
        const toggle = document.createElement("button");
        toggle.className = "ctrl-btn";
        toggle.title = task.completed ? "Mark incomplete" : "Mark complete";
        toggle.innerHTML = task.completed ? "↺" : "✓";
        toggle.onclick = () => {
            task.completed = !task.completed;
            if (task.completed) {
                playSound(); // 🔊 API Sound or Beep
            }
            save();
            render();
        };

        // Edit Button
        const edit = document.createElement("button");
        edit.className = "ctrl-btn";
        edit.title = "Edit task";
        edit.textContent = "✎";
        edit.onclick = () => {
            const updated = prompt("Edit task:", task.text);
            if (updated && updated.trim()) {
                task.text = updated.trim();
                save();
                render();
            }
        };

        // Delete Button
        const del = document.createElement("button");
        del.className = "ctrl-btn";
        del.title = "Delete task";
        del.textContent = "✕";
        del.onclick = () => {
            if (confirm("Delete this task?")) {
                tasks = tasks.filter(t => t !== task);
                save();
                render();
            }
        };

        controls.append(toggle, edit, del);
        li.append(left, controls);
        taskList.appendChild(li);
    });
}

// ============================================
// Event Listeners
// ============================================

// Add Task
addBtn.onclick = () => {
    const text = input.value.trim();
    if (!text) {
        alert("Please enter a task!");
        return;
    }

    tasks.push({
        text,
        completed: false,
        created: new Date().toISOString()
    });

    save();
    input.value = "";
    input.focus();
    render();
};

// Add task on Enter key
input.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
        addBtn.click();
    }
});

// Clear All
clearAll.onclick = () => {
    if (tasks.length === 0) {
        alert("No tasks to clear!");
        return;
    }
    
    if (confirm("Delete ALL tasks? This cannot be undone!")) {
        tasks = [];
        save();
        render();
    }
};

// Filter Buttons
filterButtons.forEach(btn => {
    btn.onclick = () => {
        filterButtons.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        currentFilter = btn.getAttribute("data-filter");
        render();
    };
});

// ============================================
// Initialization
// ============================================
window.addEventListener("load", async () => {
    console.log("📱 App loading...");
    await loadDoneSound();
    render();
});
