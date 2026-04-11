import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import DashboardHeader from "../components/dashboard/DashboardHeader";
import SearchPanel from "../components/dashboard/SearchPanel";

type TaskList = {
  id: string;
  user_id?: string;
  name: string;
  created_at?: string;
};

type Task = {
  id: string;
  user_id?: string;
  title: string;
  completed: boolean;
  tags: string[] | null;
  list_id: string | null;
  description?: string | null;
  links?: string[] | null;
  attachments?: string[] | null;
  priority?: string | null;
  due_date?: string | null;
  is_important?: boolean | null;
  is_archived?: boolean | null;
  created_at?: string;
  updated_at?: string;
};

type TaskDetailForm = {
  id: string;
  title: string;
  description: string;
  tags: string;
  completed: boolean;
  list_id: string;
  linksText: string;
  attachments: string[];
  priority: string;
  dueDate: string;
  isImportant: boolean;
  isArchived: boolean;
};

type TaskActivityLog = {
  id: string;
  task_id: string;
  user_id: string;
  action: string;
  details?: string | null;
  created_at: string;
};

const columnThemes = [
  { bg: "linear-gradient(135deg, #5A3E2B 0%, #8C5E3C 100%)", pill: "#E7B77A" },
  { bg: "linear-gradient(135deg, #3F315B 0%, #6A4C93 100%)", pill: "#C7A6FF" },
  { bg: "linear-gradient(135deg, #2E4F4F 0%, #4F7C82 100%)", pill: "#9ED9D8" },
  { bg: "linear-gradient(135deg, #6B3E4E 0%, #A45C74 100%)", pill: "#F2AEC4" },
  { bg: "linear-gradient(135deg, #4B5D3A 0%, #7D9D5A 100%)", pill: "#D2E7A8" },
  { bg: "linear-gradient(135deg, #2C425E 0%, #4D78A8 100%)", pill: "#A9D1FF" },
];

export default function AppShell() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [listSaving, setListSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [logsLoading, setLogsLoading] = useState(false);

  const [lists, setLists] = useState<TaskList[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskLogs, setTaskLogs] = useState<TaskActivityLog[]>([]);

  const [isAddingList, setIsAddingList] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [editingListName, setEditingListName] = useState("");

  const [newTaskTitle, setNewTaskTitle] = useState<Record<string, string>>({});
  const [newTaskTags, setNewTaskTags] = useState<Record<string, string>>({});

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [detailForm, setDetailForm] = useState<TaskDetailForm | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterListId, setFilterListId] = useState("all");
  const [filterTag, setFilterTag] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterImportant, setFilterImportant] = useState("all");
  const [showArchived, setShowArchived] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(true);

  const [userDisplayName, setUserDisplayName] = useState("Kullanıcı");
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [now, setNow] = useState(new Date());

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    init();
    loadUserDisplayName();

    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  async function init() {
    setLoading(true);
    try {
      await Promise.all([fetchLists(), fetchTasks()]);
    } finally {
      setLoading(false);
    }
  }

  async function loadUserDisplayName() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    setCurrentUserId(user.id);

    const metaName =
      user.user_metadata?.name ||
      user.user_metadata?.full_name ||
      user.user_metadata?.first_name;

    const emailName = user.email?.split("@")[0];

    setUserDisplayName(metaName || emailName || "Kullanıcı");
  }

  async function fetchLists() {
    const { data, error } = await supabase
      .from("task_lists")
      .select("id, user_id, name, created_at")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("List fetch error:", error);
      return;
    }

    setLists(data || []);
  }

  async function fetchTasks() {
    const { data, error } = await supabase
      .from("tasks")
      .select(
        "id, user_id, title, completed, tags, list_id, description, links, attachments, priority, due_date, is_important, is_archived, created_at, updated_at"
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Task fetch error:", error);
      return;
    }

    setTasks(data || []);
  }

  async function fetchTaskLogs(taskId: string) {
    setLogsLoading(true);
    try {
      const { data, error } = await supabase
        .from("task_activity_logs")
        .select("id, task_id, user_id, action, details, created_at")
        .eq("task_id", taskId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Task logs fetch error:", error);
        setTaskLogs([]);
        return;
      }

      setTaskLogs(data || []);
    } finally {
      setLogsLoading(false);
    }
  }

  async function addLog(taskId: string, action: string, details?: string) {
    if (!currentUserId) return;

    const { error } = await supabase.from("task_activity_logs").insert({
      task_id: taskId,
      user_id: currentUserId,
      action,
      details: details || null,
    });

    if (error) {
      console.error("Task log insert error:", error);
      return;
    }

    if (selectedTask?.id === taskId) {
      await fetchTaskLogs(taskId);
    }
  }

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();

    for (const task of tasks) {
      for (const tag of task.tags || []) {
        const clean = tag.trim();
        if (clean) tagSet.add(clean);
      }
    }

    return Array.from(tagSet).sort((a, b) => a.localeCompare(b, "tr"));
  }, [tasks]);

  const visibleTasks = useMemo(() => {
    return tasks.filter((task) => {
      const term = searchTerm.trim().toLowerCase();

      const matchesText =
        !term ||
        task.title.toLowerCase().includes(term) ||
        (task.description || "").toLowerCase().includes(term) ||
        (task.tags || []).some((tag) => tag.toLowerCase().includes(term)) ||
        (task.links || []).some((link) => link.toLowerCase().includes(term));

      const matchesList =
        filterListId === "all" || task.list_id === filterListId;

      const matchesTag =
        filterTag === "all" || (task.tags || []).includes(filterTag);

      const matchesStatus =
        filterStatus === "all" ||
        (filterStatus === "open" && !task.completed) ||
        (filterStatus === "done" && task.completed);

      const matchesPriority =
        filterPriority === "all" ||
        (task.priority || "medium") === filterPriority;

      const matchesImportant =
        filterImportant === "all" ||
        (filterImportant === "important" && !!task.is_important) ||
        (filterImportant === "normal" && !task.is_important);

      const matchesArchived = showArchived
        ? !!task.is_archived
        : !task.is_archived;

      return (
        matchesText &&
        matchesList &&
        matchesTag &&
        matchesStatus &&
        matchesPriority &&
        matchesImportant &&
        matchesArchived
      );
    });
  }, [
    tasks,
    searchTerm,
    filterListId,
    filterTag,
    filterStatus,
    filterPriority,
    filterImportant,
    showArchived,
  ]);

  const tasksByList = useMemo(() => {
    const grouped: Record<string, Task[]> = {};

    for (const list of lists) grouped[list.id] = [];

    for (const task of visibleTasks) {
      if (task.list_id && grouped[task.list_id]) {
        grouped[task.list_id].push(task);
      }
    }

    return grouped;
  }, [lists, visibleTasks]);

  const totalCount = tasks.length;
  const openTaskCount = tasks.filter((t) => !t.completed && !t.is_archived).length;
  const doneTaskCount = tasks.filter((t) => t.completed && !t.is_archived).length;
  const archivedCount = tasks.filter((t) => !!t.is_archived).length;
  const overdueCount = tasks.filter(
    (t) => !!t.due_date && !t.completed && !t.is_archived && isOverdue(t.due_date)
  ).length;

  async function handleCreateList(e: React.FormEvent) {
    e.preventDefault();

    const name = newListName.trim();
    if (!name) {
      alert("Liste adı boş olamaz.");
      return;
    }

    setListSaving(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        alert("Kullanıcı bilgisi alınamadı.");
        return;
      }

      const { data, error } = await supabase
        .from("task_lists")
        .insert({
          name,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) {
        console.error("Create list error:", error);
        alert(`Liste oluşturulamadı: ${error.message}`);
        return;
      }

      setNewListName("");
      setIsAddingList(false);

      if (data) {
        setLists((prev) => [...prev, data]);
      } else {
        await fetchLists();
      }
    } finally {
      setListSaving(false);
    }
  }

  function startRenameList(list: TaskList) {
    setEditingListId(list.id);
    setEditingListName(list.name);
  }

  function cancelRenameList() {
    setEditingListId(null);
    setEditingListName("");
  }

  async function saveRenameList(listId: string) {
    const name = editingListName.trim();
    if (!name) {
      alert("Liste adı boş olamaz.");
      return;
    }

    const { error } = await supabase
      .from("task_lists")
      .update({ name })
      .eq("id", listId);

    if (error) {
      console.error("Rename list error:", error);
      alert(`Liste güncellenemedi: ${error.message}`);
      return;
    }

    setLists((prev) =>
      prev.map((list) => (list.id === listId ? { ...list, name } : list))
    );

    cancelRenameList();
  }

  async function handleDeleteList(listId: string) {
    const taskCount = tasks.filter((task) => task.list_id === listId).length;

    if (taskCount > 0) {
      alert("Bu listede kart var. Önce kartları sil veya başka listeye taşı.");
      return;
    }

    const listName = lists.find((list) => list.id === listId)?.name || "liste";
    const ok = window.confirm(`"${listName}" listesini silmek istiyor musun?`);
    if (!ok) return;

    const { error } = await supabase.from("task_lists").delete().eq("id", listId);

    if (error) {
      console.error("Delete list error:", error);
      alert(`Liste silinemedi: ${error.message}`);
      return;
    }

    setLists((prev) => prev.filter((list) => list.id !== listId));
  }

  async function handleCreateTask(listId: string, e: React.FormEvent) {
    e.preventDefault();

    const title = (newTaskTitle[listId] || "").trim();
    const tagsValue = newTaskTags[listId] || "";

    if (!title) {
      alert("Kart başlığı boş olamaz.");
      return;
    }

    setSaving(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        alert("Kullanıcı bilgisi alınamadı.");
        return;
      }

      const payload = {
        title,
        completed: false,
        tags: parseTags(tagsValue),
        list_id: listId,
        user_id: user.id,
        description: "",
        links: [],
        attachments: [],
        priority: "medium",
        due_date: null,
        is_important: false,
        is_archived: false,
      };

      const { data, error } = await supabase
        .from("tasks")
        .insert(payload)
        .select()
        .single();

      if (error) {
        console.error("Create task error:", error);
        alert(`Kart oluşturulamadı: ${error.message}`);
        return;
      }

      setNewTaskTitle((prev) => ({ ...prev, [listId]: "" }));
      setNewTaskTags((prev) => ({ ...prev, [listId]: "" }));

      if (data) {
        setTasks((prev) => [data, ...prev]);
        await addLog(data.id, "created", "Kart oluşturuldu");
      } else {
        await fetchTasks();
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteTask(taskId: string) {
    const ok = window.confirm("Bu kartı silmek istiyor musun?");
    if (!ok) return;

    await addLog(taskId, "deleted", "Kart silindi");

    const { error } = await supabase.from("tasks").delete().eq("id", taskId);

    if (error) {
      console.error("Delete task error:", error);
      alert(`Kart silinemedi: ${error.message}`);
      return;
    }

    setTasks((prev) => prev.filter((task) => task.id !== taskId));

    if (selectedTask?.id === taskId) {
      closeModal();
    }
  }

  async function handleToggleComplete(task: Task) {
    const nextValue = !task.completed;

    const { error } = await supabase
      .from("tasks")
      .update({
        completed: nextValue,
      })
      .eq("id", task.id);

    if (error) {
      console.error("Toggle complete error:", error);
      alert(`Kart durumu güncellenemedi: ${error.message}`);
      return;
    }

    setTasks((prev) =>
      prev.map((item) =>
        item.id === task.id ? { ...item, completed: nextValue } : item
      )
    );

    await addLog(
      task.id,
      nextValue ? "completed" : "reopened",
      nextValue ? "Kart tamamlandı" : "Kart tekrar açıldı"
    );

    if (selectedTask?.id === task.id && detailForm) {
      setDetailForm((prev) =>
        prev ? { ...prev, completed: nextValue } : prev
      );
      setSelectedTask((prev) =>
        prev ? { ...prev, completed: nextValue } : prev
      );
    }
  }

  async function handleQuickMove(taskId: string, nextListId: string) {
    const nextListName =
      lists.find((list) => list.id === nextListId)?.name || "başka liste";

    const { error } = await supabase
      .from("tasks")
      .update({
        list_id: nextListId || null,
      })
      .eq("id", taskId);

    if (error) {
      console.error("Quick move error:", error);
      alert(`Kart taşınamadı: ${error.message}`);
      return;
    }

    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId ? { ...task, list_id: nextListId || null } : task
      )
    );

    await addLog(taskId, "moved", `Kart "${nextListName}" listesine taşındı`);

    if (selectedTask?.id === taskId && detailForm) {
      setDetailForm((prev) =>
        prev ? { ...prev, list_id: nextListId } : prev
      );
      setSelectedTask((prev) =>
        prev ? { ...prev, list_id: nextListId || null } : prev
      );
    }
  }

  async function quickToggleImportant(task: Task) {
    const nextValue = !task.is_important;

    const { error } = await supabase
      .from("tasks")
      .update({
        is_important: nextValue,
      })
      .eq("id", task.id);

    if (error) {
      console.error("Quick important toggle error:", error);
      alert(`Önem bilgisi güncellenemedi: ${error.message}`);
      return;
    }

    setTasks((prev) =>
      prev.map((item) =>
        item.id === task.id ? { ...item, is_important: nextValue } : item
      )
    );

    await addLog(
      task.id,
      nextValue ? "marked_important" : "unmarked_important",
      nextValue ? "Kart önemli olarak işaretlendi" : "Kart önemden çıkarıldı"
    );
  }

  async function quickArchiveTask(task: Task) {
    const nextValue = !task.is_archived;

    const { error } = await supabase
      .from("tasks")
      .update({
        is_archived: nextValue,
      })
      .eq("id", task.id);

    if (error) {
      console.error("Quick archive toggle error:", error);
      alert(`Arşiv bilgisi güncellenemedi: ${error.message}`);
      return;
    }

    setTasks((prev) =>
      prev.map((item) =>
        item.id === task.id ? { ...item, is_archived: nextValue } : item
      )
    );

    await addLog(
      task.id,
      nextValue ? "archived" : "unarchived",
      nextValue ? "Kart arşive gönderildi" : "Kart arşivden çıkarıldı"
    );

    if (selectedTask?.id === task.id && detailForm) {
      setDetailForm((prev) =>
        prev ? { ...prev, isArchived: nextValue } : prev
      );
      setSelectedTask((prev) =>
        prev ? { ...prev, is_archived: nextValue } : prev
      );
    }
  }

  async function archiveCompletedTasks() {
    const completedActiveTasks = tasks.filter(
      (task) => task.completed && !task.is_archived
    );

    if (completedActiveTasks.length === 0) {
      alert("Arşivlenecek tamamlanmış kart yok.");
      return;
    }

    const ok = window.confirm(
      `${completedActiveTasks.length} tamamlanmış kart arşive gönderilsin mi?`
    );
    if (!ok) return;

    const ids = completedActiveTasks.map((task) => task.id);

    const { error } = await supabase
      .from("tasks")
      .update({ is_archived: true })
      .in("id", ids);

    if (error) {
      console.error("Bulk archive error:", error);
      alert(`Toplu arşiv yapılamadı: ${error.message}`);
      return;
    }

    setTasks((prev) =>
      prev.map((task) =>
        ids.includes(task.id) ? { ...task, is_archived: true } : task
      )
    );

    for (const task of completedActiveTasks) {
      await addLog(task.id, "archived", "Kart toplu arşiv ile arşive gönderildi");
    }
  }

  async function openTaskModal(task: Task) {
    setSelectedTask(task);
    setDetailForm({
      id: task.id,
      title: task.title,
      description: task.description || "",
      tags: (task.tags || []).join(", "),
      completed: task.completed,
      list_id: task.list_id || "",
      linksText: (task.links || []).join("\n"),
      attachments: task.attachments || [],
      priority: task.priority || "medium",
      dueDate: task.due_date ? toDatetimeLocalValue(task.due_date) : "",
      isImportant: !!task.is_important,
      isArchived: !!task.is_archived,
    });

    await fetchTaskLogs(task.id);
  }

  function closeModal() {
    setSelectedTask(null);
    setDetailForm(null);
    setTaskLogs([]);
  }

  async function handleSaveTaskDetail() {
    if (!detailForm) return;

    const title = detailForm.title.trim();
    if (!title) {
      alert("Kart başlığı boş olamaz.");
      return;
    }

    setSaving(true);

    try {
      const previousTask = tasks.find((task) => task.id === detailForm.id);

      const payload = {
        title,
        description: detailForm.description.trim(),
        tags: parseTags(detailForm.tags),
        completed: detailForm.completed,
        list_id: detailForm.list_id || null,
        links: parseLines(detailForm.linksText),
        attachments: detailForm.attachments,
        priority: detailForm.priority,
        due_date: detailForm.dueDate
          ? new Date(detailForm.dueDate).toISOString()
          : null,
        is_important: detailForm.isImportant,
        is_archived: detailForm.isArchived,
      };

      const { error } = await supabase
        .from("tasks")
        .update(payload)
        .eq("id", detailForm.id);

      if (error) {
        console.error("Save task detail error:", error);
        alert(`Kart güncellenemedi: ${error.message}`);
        return;
      }

      setTasks((prev) =>
        prev.map((task) =>
          task.id === detailForm.id ? { ...task, ...payload } : task
        )
      );

      setSelectedTask((prev) => (prev ? { ...prev, ...payload } : prev));

      if (previousTask) {
        const changes: string[] = [];

        if (previousTask.title !== payload.title) changes.push("başlık");
        if ((previousTask.description || "") !== payload.description) changes.push("açıklama");
        if ((previousTask.priority || "medium") !== payload.priority) changes.push("öncelik");
        if ((previousTask.completed || false) !== payload.completed) changes.push("durum");
        if ((previousTask.is_important || false) !== payload.is_important) changes.push("önem");
        if ((previousTask.is_archived || false) !== payload.is_archived) changes.push("arşiv");
        if ((previousTask.list_id || "") !== (payload.list_id || "")) changes.push("liste");
        if (JSON.stringify(previousTask.tags || []) !== JSON.stringify(payload.tags)) changes.push("etiket");
        if (JSON.stringify(previousTask.links || []) !== JSON.stringify(payload.links)) changes.push("link");
        if (JSON.stringify(previousTask.attachments || []) !== JSON.stringify(payload.attachments)) changes.push("dosya");
        if ((previousTask.due_date || null) !== (payload.due_date || null)) changes.push("termin");

        await addLog(
          detailForm.id,
          "updated",
          changes.length > 0
            ? `Güncellenen alanlar: ${changes.join(", ")}`
            : "Kart güncellendi"
        );
      }

      closeModal();
    } finally {
      setSaving(false);
    }
  }

  async function handleFileUpload(file: File) {
    if (!detailForm) return;

    setUploading(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        alert("Kullanıcı bilgisi alınamadı.");
        return;
      }

      const safeName = `${user.id}/${detailForm.id}/${Date.now()}-${file.name.replace(
        /\s+/g,
        "_"
      )}`;

      const { error: uploadError } = await supabase.storage
        .from("task-files")
        .upload(safeName, file, {
          upsert: false,
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        alert(`Dosya yüklenemedi: ${uploadError.message}`);
        return;
      }

      const { data } = supabase.storage.from("task-files").getPublicUrl(safeName);

      const fileUrl = data.publicUrl;

      setDetailForm((prev) =>
        prev
          ? {
              ...prev,
              attachments: [...prev.attachments, fileUrl],
            }
          : prev
      );
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  function removeAttachment(url: string) {
    setDetailForm((prev) =>
      prev
        ? {
            ...prev,
            attachments: prev.attachments.filter((item) => item !== url),
          }
        : prev
    );
  }
  return (
    <div style={pageStyle}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns:
  window.innerWidth < 768
    ? "1fr"
    : isSearchOpen
    ? "minmax(0, 1fr) 320px"
    : "minmax(0, 1fr) 76px",
          gap: window.innerWidth < 768 ? 12 : 20,
          alignItems: "start",
          overflow: "hidden",
        }}
      >
        <div style={boardArea}>
          <div style={topBarStyle}>
            <DashboardHeader
              userDisplayName={userDisplayName}
              now={now}
              formatNow={formatNow}
              totalCount={totalCount}
              openTaskCount={openTaskCount}
              doneTaskCount={doneTaskCount}
              overdueCount={overdueCount}
              archivedCount={archivedCount}
              welcomeEyebrow={welcomeEyebrow}
              summaryWrap={summaryWrap}
              metricCard={metricCard}
              metricLabel={metricLabel}
              metricValue={metricValue}
            />

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button onClick={archiveCompletedTasks} style={archiveButton}>
                Tamamlananları Arşivle
              </button>
              <button
                onClick={async () => {
                  await supabase.auth.signOut();
                }}
                style={signOutButton}
              >
                Çıkış Yap
              </button>
            </div>
          </div>

          {loading ? (
            <div style={{ padding: 20 }}>Yükleniyor...</div>
          ) : (
            <div style={boardWrap}>
              {lists.map((list, index) => {
                const theme = columnThemes[index % columnThemes.length];
                const columnTasks = tasksByList[list.id] || [];

                return (
                  <div key={list.id} style={columnStyle}>
                    <div style={{ ...columnHeader, background: theme.bg }}>
                      <div
                        style={{
                          ...columnPill,
                          background: theme.pill,
                        }}
                      >
                        Liste
                      </div>

                      {editingListId === list.id ? (
                        <div style={{ display: "grid", gap: 8 }}>
                          <input
                            value={editingListName}
                            onChange={(e) => setEditingListName(e.target.value)}
                            style={listRenameInput}
                          />
                          <div style={{ display: "flex", gap: 8 }}>
                            <button
                              onClick={() => saveRenameList(list.id)}
                              style={miniWhiteButton}
                            >
                              Kaydet
                            </button>
                            <button
                              onClick={cancelRenameList}
                              style={miniGhostButton}
                            >
                              Vazgeç
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <h2 style={columnTitle}>{list.name}</h2>

                          <div style={columnMeta}>
                            <span>{columnTasks.length} kart</span>
                            <span>
                              {columnTasks.filter((task) => task.completed).length} tamamlandı
                            </span>
                          </div>

                          <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
                            <button
                              onClick={() => startRenameList(list)}
                              style={miniWhiteButton}
                            >
                              Listeyi Düzenle
                            </button>
                            <button
                              onClick={() => handleDeleteList(list.id)}
                              style={deleteListButton}
                            >
                              Listeyi Sil
                            </button>
                          </div>
                        </>
                      )}
                    </div>

                    <form
                      onSubmit={(e) => handleCreateTask(list.id, e)}
                      style={addCardForm}
                    >
                      <input
                        type="text"
                        placeholder="Kart başlığı"
                        value={newTaskTitle[list.id] || ""}
                        onChange={(e) =>
                          setNewTaskTitle((prev) => ({
                            ...prev,
                            [list.id]: e.target.value,
                          }))
                        }
                        style={cardInput}
                      />

                      <input
                        type="text"
                        placeholder="etiket1, etiket2"
                        value={newTaskTags[list.id] || ""}
                        onChange={(e) =>
                          setNewTaskTags((prev) => ({
                            ...prev,
                            [list.id]: e.target.value,
                          }))
                        }
                        style={cardInput}
                      />

                      <button type="submit" disabled={saving} style={addCardButton}>
                        + Kart ekle
                      </button>
                    </form>

                    <div style={cardsArea}>
                      {columnTasks.length === 0 ? (
                        <div style={emptyColumnCard}>Bu listede henüz kart yok.</div>
                      ) : (
                        columnTasks.map((task) => (
                          <div key={task.id} style={taskCard}>
                            <div style={taskCardTop}>
                              <input
                                type="checkbox"
                                checked={task.completed}
                                onChange={() => handleToggleComplete(task)}
                              />

                              <button
                                onClick={() => openTaskModal(task)}
                                style={taskOpenButton}
                              >
                                <div
                                  style={{
                                    ...taskTitle,
                                    textDecoration: task.completed
                                      ? "line-through"
                                      : "none",
                                    opacity: task.completed ? 0.6 : 1,
                                  }}
                                >
                                  {task.title}
                                </div>

                                {!!task.description && (
                                  <div style={taskSnippet}>
                                    {task.description.slice(0, 120)}
                                    {task.description.length > 120 ? "..." : ""}
                                  </div>
                                )}
                              </button>
                            </div>

                            <div style={tagRow}>
                              <span style={priorityBadge(task.priority || "medium")}>
                                {priorityLabel(task.priority || "medium")}
                              </span>

                              {!!task.is_important && (
                                <span style={importantBadge}>★ Önemli</span>
                              )}

                              {task.due_date && (
                                <span style={dueDateBadge(isOverdue(task.due_date))}>
                                  Termin: {formatDateShort(task.due_date)}
                                </span>
                              )}

                              {!!task.is_archived && (
                                <span style={archivedBadge}>Arşiv</span>
                              )}
                            </div>

                            {(task.tags || []).length > 0 && (
                              <div style={tagRow}>
                                {(task.tags || []).map((tag) => (
                                  <span key={tag} style={tagBadge}>
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}

                            <div style={miniInfoRow}>
                              <span>{(task.links || []).length} link</span>
                              <span>{(task.attachments || []).length} dosya</span>
                              <span>
                                {task.created_at
                                  ? formatDateShort(task.created_at)
                                  : "Tarih yok"}
                              </span>
                            </div>

                            <select
                              value={task.list_id || ""}
                              onChange={(e) =>
                                handleQuickMove(task.id, e.target.value)
                              }
                              style={moveSelect}
                            >
                              {lists.map((targetList) => (
                                <option key={targetList.id} value={targetList.id}>
                                  {targetList.name}
                                </option>
                              ))}
                            </select>

                            <div style={taskActions}>
                              <button
                                onClick={() => quickToggleImportant(task)}
                                style={ghostButton}
                              >
                                {task.is_important ? "Önemi Kaldır" : "Önemli Yap"}
                              </button>

                              <button
                                onClick={() => quickArchiveTask(task)}
                                style={ghostButton}
                              >
                                {task.is_archived ? "Arşivden Çıkar" : "Arşive Gönder"}
                              </button>
                            </div>

                            <div style={taskActions}>
                              <button
                                onClick={() => openTaskModal(task)}
                                style={ghostButton}
                              >
                                Detay
                              </button>
                              <button
                                onClick={() => handleDeleteTask(task.id)}
                                style={dangerGhostButton}
                              >
                                Sil
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}

              <div style={addListColumn}>
                {!isAddingList ? (
                  <button
                    onClick={() => setIsAddingList(true)}
                    style={addListButton}
                  >
                    + Liste ekle
                  </button>
                ) : (
                  <form onSubmit={handleCreateList} style={addListForm}>
                    <input
                      type="text"
                      placeholder="Liste adı"
                      value={newListName}
                      onChange={(e) => setNewListName(e.target.value)}
                      style={cardInput}
                    />
                    <div style={{ display: "flex", gap: 8 }}>
                      <button type="submit" disabled={listSaving} style={primaryButton}>
                        {listSaving ? "Ekleniyor..." : "Ekle"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingList(false);
                          setNewListName("");
                        }}
                        style={ghostButton}
                      >
                        Vazgeç
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}
        </div>

        <SearchPanel
  isSearchOpen={isSearchOpen}
  setIsSearchOpen={setIsSearchOpen}
  searchTerm={searchTerm}
  setSearchTerm={setSearchTerm}
  filterListId={filterListId}
  setFilterListId={setFilterListId}
  filterTag={filterTag}
  setFilterTag={setFilterTag}
  filterStatus={filterStatus}
  setFilterStatus={setFilterStatus}
  filterPriority={filterPriority}
  setFilterPriority={setFilterPriority}
  filterImportant={filterImportant}
  setFilterImportant={setFilterImportant}
  showArchived={showArchived}
  setShowArchived={setShowArchived}
  lists={lists}
  allTags={allTags}
  visibleTasksCount={visibleTasks.length}
  searchPanel={searchPanel}
  searchPanelCollapsed={searchPanelCollapsed}
  searchToggleButton={searchToggleButton}
  filterGroup={filterGroup}
  filterLabel={filterLabel}
  searchInput={searchInput}
  completedToggle={completedToggle}
  resetFiltersButton={resetFiltersButton}
  searchStats={searchStats}
  metricCardSmall={metricCardSmall}
  metricLabel={metricLabel}
  metricValueSmall={metricValueSmall}
/>
      </div>

      {selectedTask && detailForm && (
        <div style={modalOverlay} onClick={closeModal}>
          <div style={modalCard} onClick={(e) => e.stopPropagation()}>
            <div style={modalHeader}>
              <div>
                <div style={modalEyebrow}>Kart Detayı</div>
                <h2 style={{ margin: "6px 0 0", fontSize: 24 }}>
                  {selectedTask.title}
                </h2>
              </div>

              <button onClick={closeModal} style={closeButton}>
                ✕
              </button>
            </div>

            <div style={modalBody}>
              <div style={modalSection}>
                <label style={filterLabel}>Başlık</label>
                <input
                  type="text"
                  value={detailForm.title}
                  onChange={(e) =>
                    setDetailForm((prev) =>
                      prev ? { ...prev, title: e.target.value } : prev
                    )
                  }
                  style={modalInput}
                />
              </div>

              <div style={modalSection}>
                <label style={filterLabel}>Açıklama</label>
                <textarea
                  value={detailForm.description}
                  onChange={(e) =>
                    setDetailForm((prev) =>
                      prev ? { ...prev, description: e.target.value } : prev
                    )
                  }
                  style={modalTextarea}
                  placeholder="3-5 paragraf detay yazabilirsin..."
                />
              </div>

              <div style={modalGrid}>
                <div style={modalSection}>
                  <label style={filterLabel}>Etiketler</label>
                  <input
                    type="text"
                    value={detailForm.tags}
                    onChange={(e) =>
                      setDetailForm((prev) =>
                        prev ? { ...prev, tags: e.target.value } : prev
                      )
                    }
                    style={modalInput}
                    placeholder="etiket1, etiket2"
                  />
                </div>

                <div style={modalSection}>
                  <label style={filterLabel}>Liste</label>
                  <select
                    value={detailForm.list_id}
                    onChange={(e) =>
                      setDetailForm((prev) =>
                        prev ? { ...prev, list_id: e.target.value } : prev
                      )
                    }
                    style={modalInput}
                  >
                    {lists.map((list) => (
                      <option key={list.id} value={list.id}>
                        {list.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={modalGrid}>
                <div style={modalSection}>
                  <label style={filterLabel}>Öncelik</label>
                  <select
                    value={detailForm.priority}
                    onChange={(e) =>
                      setDetailForm((prev) =>
                        prev ? { ...prev, priority: e.target.value } : prev
                      )
                    }
                    style={modalInput}
                  >
                    <option value="low">Düşük</option>
                    <option value="medium">Orta</option>
                    <option value="high">Yüksek</option>
                  </select>
                </div>

                <div style={modalSection}>
                  <label style={filterLabel}>Son Tarih</label>
                  <input
                    type="datetime-local"
                    value={detailForm.dueDate}
                    onChange={(e) =>
                      setDetailForm((prev) =>
                        prev ? { ...prev, dueDate: e.target.value } : prev
                      )
                    }
                    style={modalInput}
                  />
                </div>
              </div>

              <div style={modalSection}>
                <label style={completedToggle}>
                  <input
                    type="checkbox"
                    checked={detailForm.completed}
                    onChange={(e) =>
                      setDetailForm((prev) =>
                        prev ? { ...prev, completed: e.target.checked } : prev
                      )
                    }
                  />
                  Tamamlandı olarak işaretle
                </label>
              </div>

              <div style={modalSection}>
                <label style={completedToggle}>
                  <input
                    type="checkbox"
                    checked={detailForm.isImportant}
                    onChange={(e) =>
                      setDetailForm((prev) =>
                        prev ? { ...prev, isImportant: e.target.checked } : prev
                      )
                    }
                  />
                  Önemli olarak işaretle
                </label>
              </div>

              <div style={modalSection}>
                <label style={completedToggle}>
                  <input
                    type="checkbox"
                    checked={detailForm.isArchived}
                    onChange={(e) =>
                      setDetailForm((prev) =>
                        prev ? { ...prev, isArchived: e.target.checked } : prev
                      )
                    }
                  />
                  Arşive gönder
                </label>
              </div>

              <div style={modalSection}>
                <label style={filterLabel}>Linkler</label>
                <textarea
                  value={detailForm.linksText}
                  onChange={(e) =>
                    setDetailForm((prev) =>
                      prev ? { ...prev, linksText: e.target.value } : prev
                    )
                  }
                  style={modalTextareaSmall}
                  placeholder="Her satıra bir link yaz"
                />
              </div>

              <div style={modalSection}>
                <div style={attachmentHeader}>
                  <label style={filterLabel}>Dosyalar</label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file);
                    }}
                  />
                </div>

                {uploading && <div style={{ fontSize: 13 }}>Dosya yükleniyor...</div>}

                {detailForm.attachments.length > 0 ? (
                  <div style={attachmentList}>
                    {detailForm.attachments.map((url) => (
                      <div key={url} style={attachmentItem}>
                        <a
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          style={attachmentLink}
                        >
                          {shortFileName(url)}
                        </a>
                        <button
                          onClick={() => removeAttachment(url)}
                          style={attachmentDelete}
                        >
                          Kaldır
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={emptyAttachment}>Henüz dosya yok.</div>
                )}
              </div>

              <div style={modalSection}>
                <label style={filterLabel}>Aktivite Geçmişi</label>

                {logsLoading ? (
                  <div style={emptyAttachment}>Kayıtlar yükleniyor...</div>
                ) : taskLogs.length === 0 ? (
                  <div style={emptyAttachment}>Henüz aktivite kaydı yok.</div>
                ) : (
                  <div style={activityList}>
                    {taskLogs.map((log) => (
                      <div key={log.id} style={activityItem}>
                        <div style={activityAction}>{log.action}</div>
                        {log.details && <div style={activityDetails}>{log.details}</div>}
                        <div style={activityDate}>
                          {new Date(log.created_at).toLocaleString("tr-TR")}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={modalActions}>
                <button
                  onClick={() => handleDeleteTask(detailForm.id)}
                  style={dangerGhostButton}
                >
                  Kartı Sil
                </button>

                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={closeModal} style={ghostButton}>
                    Kapat
                  </button>
                  <button
                    onClick={handleSaveTaskDetail}
                    disabled={saving}
                    style={primaryButton}
                  >
                    {saving ? "Kaydediliyor..." : "Kaydet"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function parseTags(value: string): string[] {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function parseLines(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function formatDateShort(value: string) {
  return new Date(value).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatNow(date: Date) {
  return date.toLocaleString("tr-TR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function shortFileName(url: string) {
  try {
    const clean = url.split("?")[0];
    const parts = clean.split("/");
    return parts[parts.length - 1];
  } catch {
    return "dosya";
  }
}

function priorityLabel(priority: string) {
  if (priority === "low") return "Düşük";
  if (priority === "high") return "Yüksek";
  return "Orta";
}

function isOverdue(value: string) {
  return new Date(value).getTime() < Date.now();
}

function toDatetimeLocalValue(value: string) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

function priorityBadge(priority: string): React.CSSProperties {
  if (priority === "high") {
    return {
      padding: "6px 10px",
      borderRadius: 999,
      background: "rgba(220, 38, 38, 0.18)",
      color: "#ffb4b4",
      fontSize: 12,
      fontWeight: 700,
    };
  }

  if (priority === "low") {
    return {
      padding: "6px 10px",
      borderRadius: 999,
      background: "rgba(34, 197, 94, 0.18)",
      color: "#b8f5c8",
      fontSize: 12,
      fontWeight: 700,
    };
  }

  return {
    padding: "6px 10px",
    borderRadius: 999,
    background: "rgba(245, 158, 11, 0.18)",
    color: "#ffd699",
    fontSize: 12,
    fontWeight: 700,
  };
}

const importantBadge: React.CSSProperties = {
  padding: "6px 10px",
  borderRadius: 999,
  background: "rgba(168, 85, 247, 0.18)",
  color: "#e8c7ff",
  fontSize: 12,
  fontWeight: 700,
};

const archivedBadge: React.CSSProperties = {
  padding: "6px 10px",
  borderRadius: 999,
  background: "rgba(148, 163, 184, 0.18)",
  color: "#d6dee8",
  fontSize: 12,
  fontWeight: 700,
};

function dueDateBadge(overdue: boolean): React.CSSProperties {
  return {
    padding: "6px 10px",
    borderRadius: 999,
    background: overdue
      ? "rgba(220, 38, 38, 0.18)"
      : "rgba(59, 130, 246, 0.18)",
    color: overdue ? "#ffb4b4" : "#b8d7ff",
    fontSize: 12,
    fontWeight: 700,
  };
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  background:
    "linear-gradient(180deg, #14161c 0%, #191c24 45%, #101217 100%)",
  color: "#f4f1ea",
  padding: 24,
  fontFamily:
    "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
};

const boardArea: React.CSSProperties = {
  width: "100%",
  overflowX: "hidden",
};

const topBarStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 16,
  flexWrap: "wrap",
  marginBottom: 20,
  flexDirection: window.innerWidth < 768 ? "column" : "row",
};

const welcomeEyebrow: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  opacity: 0.65,
  marginBottom: 8,
};

const summaryWrap: React.CSSProperties = {
  display: "flex",
  gap: 12,
  flexWrap: "wrap",
  alignItems: "stretch",
};

const metricCard: React.CSSProperties = {
  minWidth: 112,
  padding: 14,
  borderRadius: 16,
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.08)",
};

const metricCardSmall: React.CSSProperties = {
  padding: 12,
  borderRadius: 14,
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.08)",
};

const metricLabel: React.CSSProperties = {
  fontSize: 12,
  opacity: 0.72,
};

const metricValue: React.CSSProperties = {
  marginTop: 6,
  fontSize: 24,
  fontWeight: 800,
};

const metricValueSmall: React.CSSProperties = {
  marginTop: 6,
  fontSize: 20,
  fontWeight: 800,
};

const archiveButton: React.CSSProperties = {
  padding: "12px 16px",
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.06)",
  color: "white",
  fontWeight: 700,
  cursor: "pointer",
};

const signOutButton: React.CSSProperties = {
  padding: "12px 16px",
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.06)",
  color: "white",
  fontWeight: 700,
  cursor: "pointer",
};

const boardWrap: React.CSSProperties = {
  display: window.innerWidth < 768 ? "grid" : "flex",
  gridTemplateColumns: window.innerWidth < 768 ? "1fr" : undefined,
  gap: window.innerWidth < 768 ? 16 : 18,
  overflowX: window.innerWidth < 768 ? "visible" : "auto",
  paddingBottom: 12,
  alignItems: "flex-start",
};

const columnStyle: React.CSSProperties = {
  minWidth: window.innerWidth < 768 ? "100%" : 340,
  width: window.innerWidth < 768 ? "100%" : 340,
  maxWidth: "100%",
  flexShrink: 0,
  borderRadius: 24,
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  padding: 14,
  boxShadow: "0 20px 40px rgba(0,0,0,0.22)",
  boxSizing: "border-box",
};

const columnHeader: React.CSSProperties = {
  borderRadius: 20,
  padding: 16,
  marginBottom: 14,
  border: "1px solid rgba(255,255,255,0.08)",
};

const columnPill: React.CSSProperties = {
  display: "inline-block",
  padding: "6px 12px",
  borderRadius: 999,
  color: "#171717",
  fontWeight: 800,
  fontSize: 12,
  marginBottom: 12,
};

const columnTitle: React.CSSProperties = {
  margin: 0,
  fontSize: 20,
  lineHeight: 1.25,
  fontWeight: 800,
};

const columnMeta: React.CSSProperties = {
  display: "flex",
  gap: 12,
  flexWrap: "wrap",
  marginTop: 12,
  fontSize: 12,
  opacity: 0.9,
};

const deleteListButton: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 12,
  border: "none",
  background: "rgba(220, 38, 38, 0.18)",
  color: "#fff",
  fontWeight: 700,
  cursor: "pointer",
};

const miniWhiteButton: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 12,
  border: "none",
  background: "rgba(255,255,255,0.18)",
  color: "#fff",
  fontWeight: 700,
  cursor: "pointer",
};

const miniGhostButton: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.04)",
  color: "#fff",
  fontWeight: 700,
  cursor: "pointer",
};

const listRenameInput: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.08)",
  color: "#fff",
  outline: "none",
};

const addCardForm: React.CSSProperties = {
  display: "grid",
  gap: 10,
  marginBottom: 14,
};

const cardInput: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(16,18,24,0.92)",
  color: "#f4f1ea",
  fontSize: 14,
  outline: "none",
};

const addCardButton: React.CSSProperties = {
  padding: "12px 14px",
  borderRadius: 14,
  border: "1px dashed rgba(255,255,255,0.18)",
  background: "rgba(255,255,255,0.05)",
  color: "white",
  fontWeight: 700,
  cursor: "pointer",
};

const cardsArea: React.CSSProperties = {
  display: "grid",
  gap: 12,
};

const emptyColumnCard: React.CSSProperties = {
  borderRadius: 18,
  padding: 16,
  background: "rgba(255,255,255,0.04)",
  border: "1px dashed rgba(255,255,255,0.12)",
  color: "rgba(255,255,255,0.72)",
};

const taskCard: React.CSSProperties = {
  borderRadius: 18,
  padding: 16,
  background:
    "linear-gradient(180deg, rgba(33,35,42,0.98) 0%, rgba(24,26,31,0.98) 100%)",
  border: "1px solid rgba(255,255,255,0.08)",
  boxShadow: "0 12px 24px rgba(0,0,0,0.18)",
};

const taskCardTop: React.CSSProperties = {
  display: "flex",
  gap: 10,
  alignItems: "flex-start",
};

const taskOpenButton: React.CSSProperties = {
  flex: 1,
  textAlign: "left",
  background: "transparent",
  border: "none",
  color: "inherit",
  padding: 0,
  cursor: "pointer",
};

const taskTitle: React.CSSProperties = {
  margin: 0,
  fontSize: 18,
  fontWeight: 700,
  lineHeight: 1.35,
};

const taskSnippet: React.CSSProperties = {
  marginTop: 8,
  fontSize: 13,
  opacity: 0.72,
  lineHeight: 1.45,
};

const tagRow: React.CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  marginTop: 12,
};

const tagBadge: React.CSSProperties = {
  padding: "6px 10px",
  borderRadius: 999,
  background: "rgba(255,255,255,0.08)",
  border: "1px solid rgba(255,255,255,0.1)",
  fontSize: 12,
};

const miniInfoRow: React.CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  marginTop: 12,
  fontSize: 12,
  opacity: 0.72,
};

const moveSelect: React.CSSProperties = {
  width: "100%",
  marginTop: 12,
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.05)",
  color: "#f4f1ea",
  outline: "none",
};

const taskActions: React.CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  marginTop: 12,
};

const ghostButton: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.04)",
  color: "white",
  fontWeight: 600,
  cursor: "pointer",
};

const dangerGhostButton: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 12,
  border: "none",
  background: "rgba(220, 38, 38, 0.18)",
  color: "#ffb4b4",
  fontWeight: 700,
  cursor: "pointer",
};

const columnStyle: React.CSSProperties = {
  minWidth: window.innerWidth < 768 ? "100%" : 340,
  width: window.innerWidth < 768 ? "100%" : 340,
  maxWidth: "100%",
  flexShrink: 0,
  borderRadius: 24,
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  padding: 14,
  boxShadow: "0 20px 40px rgba(0,0,0,0.22)",
  boxSizing: "border-box",
};

const addListButton: React.CSSProperties = {
  width: "100%",
  padding: "14px 16px",
  borderRadius: 16,
  border: "none",
  background: "rgba(255,255,255,0.08)",
  color: "white",
  fontWeight: 700,
  cursor: "pointer",
};

const addListForm: React.CSSProperties = {
  display: "grid",
  gap: 10,
};

const primaryButton: React.CSSProperties = {
  padding: "12px 16px",
  borderRadius: 14,
  border: "none",
  background: "linear-gradient(135deg, #7A5AF8 0%, #5B4BDB 100%)",
  color: "white",
  fontWeight: 700,
  cursor: "pointer",
};

const searchPanel: React.CSSProperties = {
  position: "sticky",
  top: 24,
  borderRadius: 22,
  padding: 18,
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.08)",
  backdropFilter: "blur(12px)",
  minHeight: 180,
};

const searchPanelCollapsed: React.CSSProperties = {
  position: "sticky",
  top: 24,
  borderRadius: 22,
  padding: 10,
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  backdropFilter: "blur(12px)",
  display: "flex",
  justifyContent: "center",
};

const searchToggleButton: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.06)",
  color: "white",
  fontWeight: 700,
  cursor: "pointer",
  marginBottom: 14,
};

const filterGroup: React.CSSProperties = {
  display: "grid",
  gap: 8,
  marginBottom: 14,
};

const filterLabel: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  opacity: 0.85,
};

const searchInput: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(12,15,24,0.9)",
  color: "#f4f1ea",
  outline: "none",
  fontSize: 14,
};

const resetFiltersButton: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.1)",
  background: "rgba(255,255,255,0.04)",
  color: "white",
  fontWeight: 700,
  cursor: "pointer",
  marginTop: 4,
};

const searchStats: React.CSSProperties = {
  display: "grid",
  gap: 10,
  marginTop: 16,
};

const modalOverlay: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(3,5,10,0.72)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 20,
  zIndex: 50,
};

const modalCard: React.CSSProperties = {
  width: window.innerWidth < 768
    ? "calc(100vw - 24px)"
    : "min(920px, calc(100vw - 48px))",
  maxHeight: window.innerWidth < 768 ? "88vh" : "90vh",
  overflow: "auto",
  borderRadius: window.innerWidth < 768 ? 20 : 24,
  background:
    "linear-gradient(180deg, rgba(25,27,34,0.98) 0%, rgba(17,19,24,0.98) 100%)",
  border: "1px solid rgba(255,255,255,0.08)",
  boxShadow: "0 30px 80px rgba(0,0,0,0.45)",
};

const modalHeader: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 16,
  padding: 22,
  borderBottom: "1px solid rgba(255,255,255,0.08)",
};

const modalEyebrow: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 800,
  opacity: 0.7,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
};

const closeButton: React.CSSProperties = {
  border: "none",
  background: "rgba(255,255,255,0.08)",
  color: "white",
  borderRadius: 12,
  width: 40,
  height: 40,
  cursor: "pointer",
  fontSize: 18,
};

const modalBody: React.CSSProperties = {
  display: "grid",
  gap: 18,
  padding: window.innerWidth < 768 ? 16 : 24,
};

const modalSection: React.CSSProperties = {
  display: "grid",
  gap: 8,
};

const modalGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: window.innerWidth < 768 ? "1fr" : "1fr 1fr",
  gap: 16,
};

const modalInput: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.04)",
  color: "#f4f1ea",
  outline: "none",
  fontSize: 14,
};

const modalTextarea: React.CSSProperties = {
  width: "100%",
  minHeight: 160,
  padding: "12px 14px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.04)",
  color: "#f4f1ea",
  outline: "none",
  fontSize: 14,
  resize: "vertical",
  lineHeight: 1.55,
};

const modalTextareaSmall: React.CSSProperties = {
  width: "100%",
  minHeight: 100,
  padding: "12px 14px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.04)",
  color: "#f4f1ea",
  outline: "none",
  fontSize: 14,
  resize: "vertical",
  lineHeight: 1.55,
};

const completedToggle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  fontWeight: 600,
};

const attachmentHeader: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
};

const attachmentList: React.CSSProperties = {
  display: "grid",
  gap: 8,
};

const attachmentItem: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  padding: "10px 12px",
  borderRadius: 12,
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
};

const attachmentLink: React.CSSProperties = {
  color: "#c5d9ff",
  textDecoration: "none",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const attachmentDelete: React.CSSProperties = {
  border: "none",
  background: "rgba(220, 38, 38, 0.18)",
  color: "#ffb4b4",
  borderRadius: 10,
  padding: "8px 10px",
  cursor: "pointer",
  fontWeight: 700,
};

const emptyAttachment: React.CSSProperties = {
  padding: "12px 14px",
  borderRadius: 12,
  background: "rgba(255,255,255,0.03)",
  border: "1px dashed rgba(255,255,255,0.1)",
  color: "rgba(255,255,255,0.7)",
};

const activityList: React.CSSProperties = {
  display: "grid",
  gap: 10,
};

const activityItem: React.CSSProperties = {
  padding: "12px 14px",
  borderRadius: 12,
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
};

const activityAction: React.CSSProperties = {
  fontWeight: 700,
  fontSize: 13,
  textTransform: "capitalize",
};

const activityDetails: React.CSSProperties = {
  marginTop: 4,
  fontSize: 13,
  opacity: 0.82,
};

const activityDate: React.CSSProperties = {
  marginTop: 6,
  fontSize: 12,
  opacity: 0.62,
};

const modalActions: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
};