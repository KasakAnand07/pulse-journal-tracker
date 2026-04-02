import { useEffect, useMemo, useState } from "react";

const STORAGE_KEYS = {
  theme: "pulse-theme",
  tasks: "pulse-tasks",
  diaryPassword: "pulse-diary-password",
  diaryEntries: "pulse-diary-entries",
  expenseItems: "pulse-expenses",
  profile: "pulse-profile",
  categories: "pulse-categories",
};

const pages = [
  { id: "dashboard", label: "Dashboard" },
  { id: "todo", label: "To-Do List" },
  { id: "tracker", label: "Tracker" },
  { id: "expenses", label: "Expenses" },
  { id: "diary", label: "Diary" },
];

const priorities = [
  { value: "normal", label: "Normal" },
  { value: "important", label: "Important" },
  { value: "priority", label: "Priority" },
];

const defaultCategories = ["Mathematics", "Science", "Language", "History", "Coding", "Finance", "Personal"];

function readStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function formatDate(value) {
  if (!value) return "No deadline";
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function formatDay(value) {
  return new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short" }).format(new Date(value));
}

function dateKey(value) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfDay(value) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function buildStreak(items) {
  const dayKeys = [...new Set(items.map((value) => dateKey(value)))].sort().reverse();
  if (!dayKeys.length) return 0;

  const today = startOfDay(Date.now());
  const latest = startOfDay(dayKeys[0]);
  const diffDays = Math.round((today.getTime() - latest.getTime()) / 86400000);
  if (diffDays > 1) return 0;

  let streak = 0;
  let cursor = latest;
  const available = new Set(dayKeys);

  while (available.has(dateKey(cursor))) {
    streak += 1;
    cursor = new Date(cursor);
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

function timeLeft(deadline) {
  if (!deadline) return null;
  const diff = new Date(deadline).getTime() - Date.now();
  if (diff <= 0) return "Deadline passed";
  const minutes = Math.floor(diff / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  if (minutes > 59) {
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m left`;
  }
  return `${minutes}m ${seconds}s left`;
}

function getDeadlineTone(deadline) {
  if (!deadline) return "cool";
  const diff = new Date(deadline).getTime() - Date.now();
  if (diff <= 0) return "late";
  if (diff <= 5 * 60 * 1000) return "urgent";
  return "cool";
}

function EmptyState({ message }) {
  return <div className="empty-state">{message}</div>;
}

function App() {
  const initialCategories = readStorage(STORAGE_KEYS.categories, defaultCategories);
  const [theme, setTheme] = useState(() => localStorage.getItem(STORAGE_KEYS.theme) || "dark");
  const [activePage, setActivePage] = useState("dashboard");
  const [tasks, setTasks] = useState(() => readStorage(STORAGE_KEYS.tasks, []));
  const [expenseItems, setExpenseItems] = useState(() => readStorage(STORAGE_KEYS.expenseItems, []));
  const [profile, setProfile] = useState(() =>
    readStorage(STORAGE_KEYS.profile, {
      name: "Avery",
      studyGoal: "Deep study streak",
      focusQuote: "Turn consistency into a signature.",
    }),
  );
  const [categories, setCategories] = useState(() => (initialCategories.length ? initialCategories : ["General"]));
  const [categoryDraft, setCategoryDraft] = useState("");
  const [taskForm, setTaskForm] = useState({
    title: "",
    subject: initialCategories[0] || "General",
    details: "",
    priority: "normal",
    deadline: "",
  });
  const [taskFilters, setTaskFilters] = useState({ search: "", category: "all", status: "all", priority: "all" });
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [diaryPasswordInput, setDiaryPasswordInput] = useState("");
  const [diaryPassword, setDiaryPassword] = useState(() => localStorage.getItem(STORAGE_KEYS.diaryPassword) || "");
  const [diaryUnlocked, setDiaryUnlocked] = useState(false);
  const [entries, setEntries] = useState(() => readStorage(STORAGE_KEYS.diaryEntries, []));
  const [selectedEntryId, setSelectedEntryId] = useState(null);
  const [diarySearch, setDiarySearch] = useState("");
  const [entryDraft, setEntryDraft] = useState({ title: "", mood: "Dreamy", body: "" });
  const [expenseDraft, setExpenseDraft] = useState({ label: "", amount: "", category: "Study", note: "" });
  const [clockTick, setClockTick] = useState(Date.now());

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(STORAGE_KEYS.theme, theme);
  }, [theme]);

  useEffect(() => localStorage.setItem(STORAGE_KEYS.tasks, JSON.stringify(tasks)), [tasks]);
  useEffect(() => localStorage.setItem(STORAGE_KEYS.expenseItems, JSON.stringify(expenseItems)), [expenseItems]);
  useEffect(() => localStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(profile)), [profile]);
  useEffect(() => localStorage.setItem(STORAGE_KEYS.diaryEntries, JSON.stringify(entries)), [entries]);
  useEffect(() => localStorage.setItem(STORAGE_KEYS.categories, JSON.stringify(categories)), [categories]);

  useEffect(() => {
    if (diaryPassword) localStorage.setItem(STORAGE_KEYS.diaryPassword, diaryPassword);
    else localStorage.removeItem(STORAGE_KEYS.diaryPassword);
  }, [diaryPassword]);

  useEffect(() => {
    const timer = window.setInterval(() => setClockTick(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const filteredEntries = useMemo(() => {
    const search = diarySearch.trim().toLowerCase();
    return entries.filter((entry) => {
      if (!search) return true;
      return [entry.title, entry.body, entry.mood].some((value) => value.toLowerCase().includes(search));
    });
  }, [entries, diarySearch]);

  useEffect(() => {
    if (!filteredEntries.length) {
      setSelectedEntryId(null);
      return;
    }

    if (!selectedEntryId || !filteredEntries.some((entry) => entry.id === selectedEntryId)) {
      setSelectedEntryId(filteredEntries[0].id);
    }
  }, [filteredEntries, selectedEntryId]);

  useEffect(() => {
    if (!categories.length) {
      setCategories(["General"]);
      return;
    }

    setTaskForm((current) => {
      if (categories.includes(current.subject)) return current;
      return { ...current, subject: categories[0] };
    });
  }, [categories]);

  const completedTasks = useMemo(() => tasks.filter((task) => task.completed), [tasks]);
  const pendingTasks = useMemo(() => tasks.filter((task) => !task.completed), [tasks]);
  const subjectSummary = useMemo(
    () =>
      categories.map((subject) => {
        const subjectTasks = tasks.filter((task) => task.subject === subject);
        const completed = subjectTasks.filter((task) => task.completed).length;
        const total = subjectTasks.length;
        return { subject, total, completed, progress: total ? Math.round((completed / total) * 100) : 0 };
      }),
    [categories, tasks],
  );
  const totalExpenses = useMemo(() => expenseItems.reduce((sum, item) => sum + Number(item.amount || 0), 0), [expenseItems]);
  const selectedEntry = useMemo(() => filteredEntries.find((entry) => entry.id === selectedEntryId) || null, [filteredEntries, selectedEntryId]);

  const filteredTasks = useMemo(() => {
    const search = taskFilters.search.trim().toLowerCase();
    return tasks.filter((task) => {
      const matchesSearch = !search || [task.title, task.details, task.subject].some((value) => value.toLowerCase().includes(search));
      const matchesCategory = taskFilters.category === "all" || task.subject === taskFilters.category;
      const matchesStatus = taskFilters.status === "all" || (taskFilters.status === "done" && task.completed) || (taskFilters.status === "pending" && !task.completed);
      const matchesPriority = taskFilters.priority === "all" || task.priority === taskFilters.priority;
      return matchesSearch && matchesCategory && matchesStatus && matchesPriority;
    });
  }, [taskFilters, tasks]);

  const streaks = useMemo(
    () => ({
      study: buildStreak(completedTasks.map((task) => task.completedAt || task.createdAt).filter(Boolean)),
      diary: buildStreak(entries.map((entry) => entry.createdAt)),
      expense: buildStreak(expenseItems.map((item) => item.createdAt)),
    }),
    [completedTasks, entries, expenseItems],
  );

  const calendarDays = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const day = new Date();
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() + index);
    const key = dateKey(day);
    return {
      key,
      label: formatDay(day),
      taskCount: tasks.filter((task) => task.deadline && dateKey(task.deadline) === key).length,
      entryCount: entries.filter((entry) => dateKey(entry.createdAt) === key).length,
      expenseCount: expenseItems.filter((item) => dateKey(item.createdAt) === key).length,
    };
  }), [tasks, entries, expenseItems]);

  const resetTaskForm = () => {
    setTaskForm({ title: "", subject: categories[0] || "General", details: "", priority: "normal", deadline: "" });
    setEditingTaskId(null);
  };

  const addCategory = (event) => {
    event.preventDefault();
    const value = categoryDraft.trim();
    if (!value) return;
    if (categories.some((item) => item.toLowerCase() === value.toLowerCase())) {
      setCategoryDraft("");
      return;
    }
    setCategories((current) => [...current, value]);
    setCategoryDraft("");
  };

  const removeCategory = (categoryToRemove) => {
    if (categories.length === 1) return;
    const fallback = categories.find((item) => item !== categoryToRemove) || "General";
    setCategories((current) => current.filter((item) => item !== categoryToRemove));
    setTasks((current) => current.map((task) => (task.subject === categoryToRemove ? { ...task, subject: fallback } : task)));
  };

  const submitTask = (event) => {
    event.preventDefault();
    if (!taskForm.title.trim()) return;
    const existingTask = tasks.find((task) => task.id === editingTaskId);
    const payload = {
      id: editingTaskId || crypto.randomUUID(),
      title: taskForm.title.trim(),
      subject: taskForm.subject,
      details: taskForm.details.trim(),
      priority: taskForm.priority,
      deadline: taskForm.deadline || "",
      completed: existingTask?.completed ?? false,
      completedAt: existingTask?.completed ? existingTask.completedAt || new Date().toISOString() : null,
      createdAt: existingTask?.createdAt ?? new Date().toISOString(),
    };
    setTasks((current) => (editingTaskId ? current.map((task) => (task.id === editingTaskId ? payload : task)) : [payload, ...current]));
    resetTaskForm();
  };

  const startTaskEdit = (task) => {
    setActivePage("todo");
    setEditingTaskId(task.id);
    setTaskForm({ title: task.title, subject: task.subject, details: task.details, priority: task.priority, deadline: task.deadline ? task.deadline.slice(0, 16) : "" });
  };

  const removeTask = (taskId) => setTasks((current) => current.filter((task) => task.id !== taskId));
  const toggleTask = (taskId) => setTasks((current) => current.map((task) => task.id === taskId ? { ...task, completed: !task.completed, completedAt: !task.completed ? new Date().toISOString() : null } : task));

  const submitExpense = (event) => {
    event.preventDefault();
    if (!expenseDraft.label.trim() || !expenseDraft.amount) return;
    setExpenseItems((current) => [
      {
        id: crypto.randomUUID(),
        ...expenseDraft,
        label: expenseDraft.label.trim(),
        amount: Number(expenseDraft.amount),
        note: expenseDraft.note.trim(),
        createdAt: new Date().toISOString(),
      },
      ...current,
    ]);
    setExpenseDraft({ label: "", amount: "", category: "Study", note: "" });
  };

  const deleteExpense = (expenseId) => setExpenseItems((current) => current.filter((item) => item.id !== expenseId));

  const createOrUnlockDiary = (event) => {
    event.preventDefault();
    if (!diaryPassword && diaryPasswordInput.length < 4) return;
    if (!diaryPassword) {
      setDiaryPassword(diaryPasswordInput);
      setDiaryUnlocked(true);
      setDiaryPasswordInput("");
      return;
    }
    if (diaryPasswordInput === diaryPassword) {
      setDiaryUnlocked(true);
      setDiaryPasswordInput("");
    }
  };

  const saveEntry = (event) => {
    event.preventDefault();
    if (!entryDraft.title.trim() || !entryDraft.body.trim()) return;

    const newEntry = {
      id: crypto.randomUUID(),
      ...entryDraft,
      title: entryDraft.title.trim(),
      body: entryDraft.body.trim(),
      createdAt: new Date().toISOString(),
    };

    setEntries((current) => [newEntry, ...current]);
    setSelectedEntryId(newEntry.id);
    setEntryDraft({ title: "", mood: "Dreamy", body: "" });
    setDiarySearch("");
  };

  const deleteEntry = (entryId) => setEntries((current) => current.filter((entry) => entry.id !== entryId));
  const resetDiaryLock = () => {
    setDiaryUnlocked(false);
    setDiaryPassword("");
    setDiaryPasswordInput("");
    setSelectedEntryId(null);
  };

  return (
    <div className="app-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <header className="topbar">
        <div>
          <p className="eyebrow">Welcome back, {profile.name || "Scholar"}</p>
          <h1 className="topbar-title">{profile.studyGoal || "Pulse Journal Tracker"}</h1>
        </div>
        <button className="theme-toggle" onClick={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}>
          {theme === "dark" ? "Light Mode" : "Dark Mode"}
        </button>
      </header>

      <nav className="nav-panel">
        {pages.map((page) => (
          <button key={page.id} className={activePage === page.id ? "nav-btn active" : "nav-btn"} onClick={() => setActivePage(page.id)}>
            {page.label}
          </button>
        ))}
      </nav>

      <main>
        {activePage === "dashboard" ? (
          <section className="page page-dashboard">
            <div className="hero-card">
              <div className="hero-copy">
                <p className="eyebrow">Chaos, but curated</p>
                <h1>Pulse Journal Tracker</h1>
                <p className="hero-text">A dramatic, responsive command center for study sessions, spending habits, and the thoughts you want to protect.</p>
                <div className="hero-actions">
                  <button className="primary-btn" onClick={() => setActivePage("todo")}>Start Planning</button>
                  <button className="ghost-btn" onClick={() => setActivePage("diary")}>Open Diary</button>
                </div>
              </div>
              <div className="hero-orbit">
                <div className="orb orb-a" />
                <div className="orb orb-b" />
                <div className="orb orb-c" />
                <div className="hero-stat-grid">
                  <article><span>Pending</span><strong>{pendingTasks.length}</strong></article>
                  <article><span>Completed</span><strong>{completedTasks.length}</strong></article>
                  <article><span>Expenses</span><strong>Rs {totalExpenses.toFixed(0)}</strong></article>
                  <article><span>Entries</span><strong>{entries.length}</strong></article>
                </div>
              </div>
            </div>

            <div className="streak-grid">
              <article className="glass-card streak-card"><span>Study Streak</span><strong>{streaks.study} days</strong></article>
              <article className="glass-card streak-card"><span>Diary Streak</span><strong>{streaks.diary} days</strong></article>
              <article className="glass-card streak-card"><span>Expense Check-In</span><strong>{streaks.expense} days</strong></article>
            </div>

            <div className="dashboard-grid">
              <article className="glass-card profile-card">
                <div className="section-heading"><h2>Personal Pulse</h2><span>Editable vibe panel</span></div>
                <label>Name<input value={profile.name} onChange={(event) => setProfile((current) => ({ ...current, name: event.target.value }))} /></label>
                <label>Study Goal<input value={profile.studyGoal} onChange={(event) => setProfile((current) => ({ ...current, studyGoal: event.target.value }))} /></label>
                <label>Focus Quote<textarea rows="3" value={profile.focusQuote} onChange={(event) => setProfile((current) => ({ ...current, focusQuote: event.target.value }))} /></label>
              </article>

              <article className="glass-card">
                <div className="section-heading"><h2>Custom Tracker</h2><span>Edit what this app tracks</span></div>
                <form className="inline-form" onSubmit={addCategory}>
                  <input value={categoryDraft} onChange={(event) => setCategoryDraft(event.target.value)} placeholder="Add subject or category" />
                  <button className="primary-btn" type="submit">Add</button>
                </form>
                <div className="category-chip-wrap">
                  {categories.map((category) => (
                    <div key={category} className="category-chip-card">
                      <strong>{category}</strong>
                      <button className="ghost-btn small danger" type="button" onClick={() => removeCategory(category)} disabled={categories.length === 1}>Remove</button>
                    </div>
                  ))}
                </div>
              </article>

              <article className="glass-card">
                <div className="section-heading"><h2>Tracker Summary</h2><span>See what needs love</span></div>
                <div className="subject-grid">
                  {subjectSummary.map((item) => (
                    <div key={item.subject} className="subject-tile">
                      <div className="subject-tile-head">
                        <strong>{item.subject}</strong>
                        <span>{item.progress}%</span>
                      </div>
                      <div className="progress-bar"><div style={{ width: `${item.progress}%` }} /></div>
                      <div className="subject-meta">
                        <small>{item.completed} done</small>
                        <small>{item.total} total tasks</small>
                      </div>
                    </div>
                  ))}
                </div>
              </article>

              <article className="glass-card quick-routes-card">
                <div className="section-heading"><h2>Quick Routes</h2><span>Jump into a zone</span></div>
                <div className="route-grid">
                  {pages.slice(1).map((page) => (
                    <button key={page.id} className="route-card" onClick={() => setActivePage(page.id)}>
                      <strong>{page.label}</strong>
                      <small>Open now</small>
                    </button>
                  ))}
                </div>
              </article>

              <article className="glass-card calendar-card">
                <div className="section-heading"><h2>Weekly Pulse</h2><span>Upcoming rhythm</span></div>
                <div className="calendar-grid">
                  {calendarDays.map((day) => (
                    <div key={day.key} className="calendar-day-card">
                      <strong>{day.label}</strong>
                      <small>{day.taskCount} task deadlines</small>
                      <small>{day.entryCount} diary entries</small>
                      <small>{day.expenseCount} expense logs</small>
                    </div>
                  ))}
                </div>
              </article>
            </div>
          </section>
        ) : null}

        {activePage === "todo" ? (
          <section className="page">
            <div className="filter-bar glass-card">
              <input value={taskFilters.search} onChange={(event) => setTaskFilters((current) => ({ ...current, search: event.target.value }))} placeholder="Search tasks, notes, or categories" />
              <select value={taskFilters.category} onChange={(event) => setTaskFilters((current) => ({ ...current, category: event.target.value }))}>
                <option value="all">All categories</option>
                {categories.map((category) => <option key={category} value={category}>{category}</option>)}
              </select>
              <select value={taskFilters.status} onChange={(event) => setTaskFilters((current) => ({ ...current, status: event.target.value }))}>
                <option value="all">All status</option>
                <option value="pending">Pending</option>
                <option value="done">Done</option>
              </select>
              <select value={taskFilters.priority} onChange={(event) => setTaskFilters((current) => ({ ...current, priority: event.target.value }))}>
                <option value="all">All priority</option>
                {priorities.map((priority) => <option key={priority.value} value={priority.value}>{priority.label}</option>)}
              </select>
            </div>
            <div className="two-column-layout">
              <article className="glass-card">
                <div className="section-heading"><h2>{editingTaskId ? "Edit Task" : "Create Task"}</h2><span>Build your study rhythm</span></div>
                <form className="stack-form" onSubmit={submitTask}>
                  <label>Task title<input value={taskForm.title} onChange={(event) => setTaskForm((current) => ({ ...current, title: event.target.value }))} placeholder="Revise chapter 4" /></label>
                  <label>Subject<select value={taskForm.subject} onChange={(event) => setTaskForm((current) => ({ ...current, subject: event.target.value }))}>{categories.map((subject) => <option key={subject} value={subject}>{subject}</option>)}</select></label>
                  <label>Priority<div className="priority-pills">{priorities.map((priority) => <button key={priority.value} type="button" className={taskForm.priority === priority.value ? "pill active" : "pill"} onClick={() => setTaskForm((current) => ({ ...current, priority: priority.value }))}>{priority.label}</button>)}</div></label>
                  <label>Deadline<input type="datetime-local" value={taskForm.deadline} onChange={(event) => setTaskForm((current) => ({ ...current, deadline: event.target.value }))} /></label>
                  <label>Details<textarea rows="5" value={taskForm.details} onChange={(event) => setTaskForm((current) => ({ ...current, details: event.target.value }))} placeholder="Add notes, chapters, links, or what success looks like." /></label>
                  <div className="row-actions">
                    <button className="primary-btn" type="submit">{editingTaskId ? "Update Task" : "Add Task"}</button>
                    {editingTaskId ? <button type="button" className="ghost-btn" onClick={resetTaskForm}>Cancel</button> : null}
                  </div>
                </form>
              </article>

              <article className="glass-card">
                <div className="section-heading"><h2>Task Library</h2><span>{filteredTasks.length} visible tasks</span></div>
                <div className="list-column">
                  {filteredTasks.length === 0 ? <EmptyState message="No tasks match your current filters." /> : null}
                  {filteredTasks.map((task) => (
                    <div key={task.id} className={`task-card priority-${task.priority}`}>
                      <div className="task-card-top">
                        <div><strong>{task.title}</strong><p>{task.subject}</p></div>
                        <span className={`badge badge-${task.priority}`}>{task.priority}</span>
                      </div>
                      <p className="task-details">{task.details || "No extra details yet."}</p>
                      <small>{formatDate(task.deadline)}</small>
                      <div className="row-actions">
                        <button className="ghost-btn small" onClick={() => startTaskEdit(task)}>Edit</button>
                        <button className="ghost-btn small danger" onClick={() => removeTask(task.id)}>Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            </div>
          </section>
        ) : null}
        {activePage === "tracker" ? (
          <section className="page">
            <div className="section-heading standalone"><h2>Study Tracker</h2><span>Live overview synced with your to-do list</span></div>
            <div className="filter-bar glass-card compact">
              <input value={taskFilters.search} onChange={(event) => setTaskFilters((current) => ({ ...current, search: event.target.value }))} placeholder="Search tracker cards" />
              <select value={taskFilters.category} onChange={(event) => setTaskFilters((current) => ({ ...current, category: event.target.value }))}>
                <option value="all">All categories</option>
                {categories.map((category) => <option key={category} value={category}>{category}</option>)}
              </select>
              <select value={taskFilters.status} onChange={(event) => setTaskFilters((current) => ({ ...current, status: event.target.value }))}>
                <option value="all">All status</option>
                <option value="pending">Pending</option>
                <option value="done">Done</option>
              </select>
            </div>
            <div className="tracker-grid">
              {filteredTasks.length === 0 ? <EmptyState message="No tracker cards match your current filters." /> : null}
              {filteredTasks.map((task) => (
                <article key={`${task.id}-${clockTick}`} className={`tracker-card ${task.completed ? "done" : ""} tone-${getDeadlineTone(task.deadline)}`}>
                  <div className="tracker-head">
                    <div><span className="subject-chip">{task.subject}</span><h3>{task.title}</h3></div>
                    <label className="checkbox-wrap"><input type="checkbox" checked={task.completed} onChange={() => toggleTask(task.id)} /><span>{task.completed ? "Done" : "Mark done"}</span></label>
                  </div>
                  <p>{task.details || "No details added yet. Edit the task to add study notes."}</p>
                  <div className="tracker-meta">
                    <div><span>Deadline</span><strong>{formatDate(task.deadline)}</strong></div>
                    <div><span>Status</span><strong>{timeLeft(task.deadline) || "Flexible timing"}</strong></div>
                    <div><span>Priority</span><strong className="capitalize">{task.priority}</strong></div>
                  </div>
                  <div className="tracker-footer row-actions">
                    <button className="ghost-btn small" onClick={() => startTaskEdit(task)}>Refine Task</button>
                    <button className="ghost-btn small danger" onClick={() => removeTask(task.id)}>Remove</button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {activePage === "expenses" ? (
          <section className="page">
            <div className="two-column-layout">
              <article className="glass-card">
                <div className="section-heading"><h2>Expense Log</h2><span>Track study and life spending</span></div>
                <form className="stack-form" onSubmit={submitExpense}>
                  <label>Expense title<input value={expenseDraft.label} onChange={(event) => setExpenseDraft((current) => ({ ...current, label: event.target.value }))} placeholder="Books, coffee, transport" /></label>
                  <label>Amount<input type="number" min="0" step="0.01" value={expenseDraft.amount} onChange={(event) => setExpenseDraft((current) => ({ ...current, amount: event.target.value }))} /></label>
                  <label>Category<select value={expenseDraft.category} onChange={(event) => setExpenseDraft((current) => ({ ...current, category: event.target.value }))}><option>Study</option><option>Food</option><option>Travel</option><option>Fun</option><option>Personal</option></select></label>
                  <label>Note<textarea rows="4" value={expenseDraft.note} onChange={(event) => setExpenseDraft((current) => ({ ...current, note: event.target.value }))} /></label>
                  <button className="primary-btn" type="submit">Save Expense</button>
                </form>
              </article>

              <article className="glass-card">
                <div className="section-heading"><h2>Money Flow</h2><span>Total spent: Rs {totalExpenses.toFixed(2)}</span></div>
                <div className="list-column">
                  {expenseItems.length === 0 ? <EmptyState message="No expenses saved yet. Add a few to see your spending pattern." /> : null}
                  {expenseItems.map((item) => (
                    <div key={item.id} className="expense-card">
                      <div className="task-card-top">
                        <div><strong>{item.label}</strong><p>{item.category}</p></div>
                        <div className="expense-right"><strong>Rs {Number(item.amount).toFixed(2)}</strong><small>{new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(item.createdAt))}</small></div>
                      </div>
                      {item.note ? <p className="task-details">{item.note}</p> : null}
                      <button className="ghost-btn small danger align-left" onClick={() => deleteExpense(item.id)}>Delete</button>
                    </div>
                  ))}
                </div>
              </article>
            </div>
          </section>
        ) : null}

        {activePage === "diary" ? (
          <section className="page">
            {!diaryUnlocked ? (
              <div className="diary-lock-wrap">
                <article className="diary-lock-card">
                  <p className="eyebrow">Private pages</p>
                  <h2>{diaryPassword ? "Unlock your diary" : "Create a diary password"}</h2>
                  <p>{diaryPassword ? "Your entries stay on this device until you delete them." : "Choose a password with at least 4 characters to start protecting your diary."}</p>
                  <form className="stack-form" onSubmit={createOrUnlockDiary}>
                    <label>Password<input type="password" value={diaryPasswordInput} onChange={(event) => setDiaryPasswordInput(event.target.value)} placeholder="Enter password" /></label>
                    <button className="primary-btn" type="submit">{diaryPassword ? "Unlock Diary" : "Set Password"}</button>
                  </form>
                </article>
              </div>
            ) : (
              <div className="three-column-diary-layout">
                <article className="glass-card diary-form-card">
                  <div className="section-heading"><h2>Write Entry</h2><span>Like a glowing paper journal</span></div>
                  <form className="stack-form" onSubmit={saveEntry}>
                    <label>Entry title<input value={entryDraft.title} onChange={(event) => setEntryDraft((current) => ({ ...current, title: event.target.value }))} placeholder="A strange but beautiful day" /></label>
                    <label>Mood<select value={entryDraft.mood} onChange={(event) => setEntryDraft((current) => ({ ...current, mood: event.target.value }))}><option>Dreamy</option><option>Focused</option><option>Chaotic</option><option>Calm</option><option>Victorious</option></select></label>
                    <label>Entry<textarea rows="12" className="diary-textarea" value={entryDraft.body} onChange={(event) => setEntryDraft((current) => ({ ...current, body: event.target.value }))} placeholder="Dear diary..." /></label>
                    <div className="row-actions">
                      <button className="primary-btn" type="submit">Save Entry</button>
                      <button type="button" className="ghost-btn" onClick={() => setDiaryUnlocked(false)}>Lock Diary</button>
                      <button type="button" className="ghost-btn danger" onClick={resetDiaryLock}>Reset Password</button>
                    </div>
                  </form>
                </article>

                <article className="diary-index-card">
                  <div className="section-heading"><h2>Saved Pages</h2><span>{filteredEntries.length} visible entries</span></div>
                  <input value={diarySearch} onChange={(event) => setDiarySearch(event.target.value)} placeholder="Search by title, mood, or words" />
                  <div className="diary-index-list">
                    {filteredEntries.length === 0 ? <EmptyState message="No diary entries match your search." /> : null}
                    {filteredEntries.map((entry) => (
                      <button key={entry.id} className={selectedEntryId === entry.id ? "diary-title-card active" : "diary-title-card"} onClick={() => setSelectedEntryId(entry.id)}>
                        <strong>{entry.title}</strong>
                        <small>{entry.mood}</small>
                      </button>
                    ))}
                  </div>
                </article>

                <article className="diary-book diary-reader-card">
                  <div className="diary-book-inner">
                    {selectedEntry ? (
                      <article className="diary-entry diary-entry-full">
                        <div className="diary-entry-top">
                          <div><h3>{selectedEntry.title}</h3><span>{selectedEntry.mood}</span></div>
                          <button className="ghost-btn small danger" onClick={() => deleteEntry(selectedEntry.id)}>Delete</button>
                        </div>
                        <small>{new Intl.DateTimeFormat("en-IN", { dateStyle: "full", timeStyle: "short" }).format(new Date(selectedEntry.createdAt))}</small>
                        <p>{selectedEntry.body}</p>
                      </article>
                    ) : (
                      <EmptyState message="Choose a title to open and read that diary entry." />
                    )}
                  </div>
                </article>
              </div>
            )}
          </section>
        ) : null}
      </main>
    </div>
  );
}

export default App;

