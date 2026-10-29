import React, { useState, useEffect, useMemo } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  Calendar,
  Clock,
  Users,
  MessageSquare,
  Shield,
  Plus,
  Trash2,
  Send,
  User,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Sun,
  Sunset,
  Database,
  X,
} from "lucide-react";

// ============================================================================
// 1. SUPABASE CONNECTION (Reads your keys from .env.local automatically)
// ============================================================================
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase =
  supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith("http")
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

// ============================================================================
// 2. SCHEDULE CONSTANTS (4 Hours Morning + 4 Hours Afternoon + 4 Categories)
// ============================================================================
const MORNING_SLOTS = [
  { id: "m1", label: "09:00 - 10:00", period: "Morning" },
  { id: "m2", label: "10:00 - 11:00", period: "Morning" },
  { id: "m3", label: "11:00 - 12:00", period: "Morning" },
  { id: "m4", label: "12:00 - 13:00", period: "Morning" },
];

const AFTERNOON_SLOTS = [
  { id: "a1", label: "14:00 - 15:00", period: "Afternoon" },
  { id: "a2", label: "15:00 - 16:00", period: "Afternoon" },
  { id: "a3", label: "16:00 - 17:00", period: "Afternoon" },
  { id: "a4", label: "17:00 - 18:00", period: "Afternoon" },
];

const ALL_SLOTS = [...MORNING_SLOTS, ...AFTERNOON_SLOTS];

const CATEGORIES = {
  member: {
    id: "member",
    label: "Member Task",
    bg: "bg-blue-600/20 hover:bg-blue-600/30",
    border: "border-blue-500",
    text: "text-blue-200",
    badge: "bg-blue-500 text-white",
  },
  team: {
    id: "team",
    label: "Team Task",
    bg: "bg-emerald-600/20 hover:bg-emerald-600/30",
    border: "border-emerald-500",
    text: "text-emerald-200",
    badge: "bg-emerald-500 text-white",
  },
  community: {
    id: "community",
    label: "Community Task",
    bg: "bg-amber-500/20 hover:bg-amber-500/30",
    border: "border-amber-500",
    text: "text-amber-200",
    badge: "bg-amber-500 text-slate-950",
  },
  pm: {
    id: "pm",
    label: "Project Mgmt",
    bg: "bg-purple-600/20 hover:bg-purple-600/30",
    border: "border-purple-500",
    text: "text-purple-200",
    badge: "bg-purple-500 text-white",
  },
};

const INITIAL_MEMBERS = [
  { id: "u1", name: "Gabriel M.", role: "Admin", dept: "Management", avatar: "GM" },
  { id: "u2", name: "Paula S.", role: "Moderator", dept: "Coordination", avatar: "PS" },
  { id: "u3", name: "Lucas C.", role: "Moderator", dept: "Community", avatar: "LC" },
  { id: "u4", name: "Bruna S.", role: "Member", dept: "Communication", avatar: "BS" },
  { id: "u5", name: "Júlia V.", role: "Member", dept: "Youth Work", avatar: "JV" },
  { id: "u6", name: "Mateo R.", role: "Member", dept: "Operations", avatar: "MR" },
  { id: "u7", name: "Elena K.", role: "Member", dept: "Design", avatar: "EK" },
  { id: "u8", name: "David T.", role: "Member", dept: "Tech", avatar: "DT" },
  { id: "u9", name: "Sofia L.", role: "Member", dept: "Outreach", avatar: "SL" },
  { id: "u10", name: "Marco B.", role: "Member", dept: "Logistics", avatar: "MB" },
];

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// ============================================================================
// 3. MAIN APPLICATION COMPONENT
// ============================================================================
export default function App() {
  const [activeTab, setActiveTab] = useState("daily"); // daily | individual | annual | admin
  const [selectedDate, setSelectedDate] = useState("2026-10-29");
  const [members, setMembers] = useState(INITIAL_MEMBERS);
  const [currentUserId, setCurrentUserId] = useState("u1");
  const [focusedMemberId, setFocusedMemberId] = useState("u1");

  // Tasks dictionary keyed by: `${date}_${slotId}_${memberId}`
  const [tasks, setTasks] = useState({
    "2026-10-29_m1_u1": {
      id: "t_demo_1",
      title: "Grant Budget Review",
      category: "pm",
      notes: "Verify Q4 allocation sheets",
      comments: [
        { id: 1, author: "Paula S.", role: "Moderator", text: "Updated the spreadsheet!", time: "09:15" },
      ],
    },
    "2026-10-29_m2_u2": {
      id: "t_demo_2",
      title: "Team Morning Sync",
      category: "team",
      notes: "Weekly objectives alignment",
      comments: [],
    },
    "2026-10-29_a1_u3": {
      id: "t_demo_3",
      title: "Local Partners Workshop",
      category: "community",
      notes: "Prepare room and materials",
      comments: [],
    },
  });

  // Chat state
  const [messages, setMessages] = useState([
    {
      id: 1,
      channel: "general",
      senderId: "u2",
      senderName: "Paula S.",
      senderRole: "Moderator",
      text: "Welcome to the Sync8 Annual Platform! Click any 1-hour slot to assign tasks.",
      time: "08:50",
    },
  ]);
  const [chatChannel, setChatChannel] = useState("general");
  const [chatInput, setChatInput] = useState("");

  // Task Modal state
  const [selectedCell, setSelectedCell] = useState(null); // { dateKey, slotId, memberId }
  const [formTitle, setFormTitle] = useState("");
  const [formCategory, setFormCategory] = useState("member");
  const [formNotes, setFormNotes] = useState("");
  const [commentInput, setCommentInput] = useState("");

  // Admin New Member state
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberRole, setNewMemberRole] = useState("Member");
  const [newMemberDept, setNewMemberDept] = useState("General");

  // Database Sync Indicator
  const [dbStatus, setDbStatus] = useState(supabase ? "Connecting..." : "Local Demo Mode");

  const currentUser = useMemo(
    () => members.find((m) => m.id === currentUserId) || members[0],
    [members, currentUserId]
  );

  // --------------------------------------------------------------------------
  // LOAD DATA FROM SUPABASE ON STARTUP
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!supabase) return;

    async function loadFromSupabase() {
      try {
        // 1. Load Members
        const { data: dbMembers, error: errMembers } = await supabase
          .from("profiles")
          .select("*")
          .order("created_at");

        if (errMembers) throw errMembers;

        if (dbMembers && dbMembers.length > 0) {
          setMembers(dbMembers);
        } else {
          // First time running: save our 10 starter members into Supabase
          await supabase.from("profiles").upsert(INITIAL_MEMBERS);
        }

        // 2. Load Tasks & Comments
        const { data: dbTasks } = await supabase
          .from("schedule_tasks")
          .select("*, task_comments(*)");

        if (dbTasks && dbTasks.length > 0) {
          const loadedTasks = {};
          dbTasks.forEach((row) => {
            const key = `${row.task_date}_${row.slot_id}_${row.member_id}`;
            loadedTasks[key] = {
              id: row.id,
              title: row.title,
              category: row.category,
              notes: row.notes || "",
              comments: (row.task_comments || []).map((c) => ({
                id: c.id,
                author: c.author_name,
                role: c.author_role,
                text: c.content,
                time: c.time_label,
              })),
            };
          });
          setTasks(loadedTasks);
        }

        // 3. Load Chat Messages
        const { data: dbMsgs } = await supabase
          .from("messages")
          .select("*")
          .order("created_at");

        if (dbMsgs && dbMsgs.length > 0) {
          setMessages(
            dbMsgs.map((m) => ({
              id: m.id,
              channel: m.channel,
              senderId: m.sender_id,
              senderName: m.sender_name,
              senderRole: m.sender_role,
              text: m.text,
              time: m.time_label,
            }))
          );
        }

        setDbStatus("Supabase Live");
      } catch (err) {
        console.error("Supabase connection error:", err);
        setDbStatus("Check SQL Tables");
      }
    }

    loadFromSupabase();
  }, []);

  // --------------------------------------------------------------------------
  // PERMISSION CHECKER (Admin & Moderator can edit all; Member edits own slots)
  // --------------------------------------------------------------------------
  const canEditSlot = (targetMemberId) => {
    if (currentUser.role === "Admin" || currentUser.role === "Moderator") return true;
    return currentUser.id === targetMemberId;
  };

  // --------------------------------------------------------------------------
  // OPEN SLOT MODAL
  // --------------------------------------------------------------------------
  const handleOpenCell = (dateKey, slotId, memberId) => {
    const key = `${dateKey}_${slotId}_${memberId}`;
    const existing = tasks[key];
    setSelectedCell({ dateKey, slotId, memberId });
    setFormTitle(existing ? existing.title : "");
    setFormCategory(existing ? existing.category : "member");
    setFormNotes(existing ? existing.notes : "");
    setCommentInput("");
  };

  // --------------------------------------------------------------------------
  // SAVE TASK (Updates screen AND saves to Supabase)
  // --------------------------------------------------------------------------
  const handleSaveTask = async (e) => {
    e.preventDefault();
    if (!selectedCell || !formTitle.trim()) return;

    const key = `${selectedCell.dateKey}_${selectedCell.slotId}_${selectedCell.memberId}`;
    const existing = tasks[key];
    const taskId = existing?.id || `t_${Date.now()}`;

    const updatedTask = {
      id: taskId,
      title: formTitle.trim(),
      category: formCategory,
      notes: formNotes.trim(),
      comments: existing ? existing.comments : [],
    };

    setTasks((prev) => ({ ...prev, [key]: updatedTask }));
    setSelectedCell(null);

    if (supabase) {
      await supabase.from("schedule_tasks").upsert({
        id: taskId,
        task_date: selectedCell.dateKey,
        slot_id: selectedCell.slotId,
        member_id: selectedCell.memberId,
        title: updatedTask.title,
        category: updatedTask.category,
        notes: updatedTask.notes,
      });
    }
  };

  // --------------------------------------------------------------------------
  // DELETE TASK
  // --------------------------------------------------------------------------
  const handleDeleteTask = async () => {
    if (!selectedCell) return;
    const key = `${selectedCell.dateKey}_${selectedCell.slotId}_${selectedCell.memberId}`;
    const existing = tasks[key];

    setTasks((prev) => {
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
    setSelectedCell(null);

    if (supabase && existing?.id) {
      await supabase.from("schedule_tasks").delete().eq("id", existing.id);
    }
  };

  // --------------------------------------------------------------------------
  // ADD TASK COMMENT
  // --------------------------------------------------------------------------
  const handleAddComment = async () => {
    if (!commentInput.trim() || !selectedCell) return;
    const key = `${selectedCell.dateKey}_${selectedCell.slotId}_${selectedCell.memberId}`;
    const existing = tasks[key];
    if (!existing) return;

    const timeNow = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const newComment = {
      id: Date.now(),
      author: currentUser.name,
      role: currentUser.role,
      text: commentInput.trim(),
      time: timeNow,
    };

    setTasks((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        comments: [...(prev[key].comments || []), newComment],
      },
    }));
    setCommentInput("");

    if (supabase) {
      await supabase.from("task_comments").insert({
        task_id: existing.id,
        author_name: newComment.author,
        author_role: newComment.role,
        content: newComment.text,
        time_label: newComment.time,
      });
    }
  };

  // --------------------------------------------------------------------------
  // SEND CHAT / DIRECT MESSAGE
  // --------------------------------------------------------------------------
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const timeNow = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const newMsg = {
      id: Date.now(),
      channel: chatChannel,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderRole: currentUser.role,
      text: chatInput.trim(),
      time: timeNow,
    };

    setMessages((prev) => [...prev, newMsg]);
    setChatInput("");

    if (supabase) {
      await supabase.from("messages").insert({
        channel: newMsg.channel,
        sender_id: newMsg.senderId,
        sender_name: newMsg.senderName,
        sender_role: newMsg.senderRole,
        text: newMsg.text,
        time_label: newMsg.time,
      });
    }
  };

  // --------------------------------------------------------------------------
  // ADMIN: ADD / REMOVE MEMBERS & SCALE TO 50
  // --------------------------------------------------------------------------
  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!newMemberName.trim() || currentUser.role !== "Admin") return;

    const initials = newMemberName
      .trim()
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

    const newMember = {
      id: `u_${Date.now()}`,
      name: newMemberName.trim(),
      role: newMemberRole,
      dept: newMemberDept.trim() || "General",
      avatar: initials,
    };

    setMembers((prev) => [...prev, newMember]);
    setNewMemberName("");

    if (supabase) {
      await supabase.from("profiles").upsert(newMember);
    }
  };

  const handleRemoveMember = async (id) => {
    if (currentUser.role !== "Admin" || members.length <= 1) return;
    setMembers((prev) => prev.filter((m) => m.id !== id));
    if (supabase) {
      await supabase.from("profiles").delete().eq("id", id);
    }
  };

  const handleScaleTeam = async (targetCount) => {
    if (currentUser.role !== "Admin") return;
    if (targetCount === 10) {
      setMembers(INITIAL_MEMBERS);
      return;
    }
    const extra = [];
    for (let i = members.length + 1; i <= targetCount; i++) {
      extra.push({
        id: `u${i}`,
        name: `Member #${i}`,
        role: i % 8 === 0 ? "Moderator" : "Member",
        dept: ["Operations", "Community", "Youth Work", "Logistics"][i % 4],
        avatar: `M${i}`,
      });
    }
    const combined = [...members, ...extra];
    setMembers(combined);
    if (supabase) {
      await supabase.from("profiles").upsert(combined);
    }
  };

  // ==========================================================================
  // RENDER UI
  // ==========================================================================
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* TOP NAVIGATION BAR */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur px-6 py-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-lg shadow-lg shadow-indigo-600/30">
            S8
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-lg tracking-tight">Sync8 Annual Platform</h1>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-medium flex items-center gap-1 ${
                  dbStatus === "Supabase Live"
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                    : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                }`}
              >
                <Database className="w-3 h-3" />
                {dbStatus}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              4h Morning + 4h Afternoon • {members.length} Active Members
            </p>
          </div>
        </div>

        {/* VIEW TABS */}
        <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700">
          {[
            { id: "daily", label: "Daily 8h Matrix", icon: Clock },
            { id: "individual", label: "Individual Schedule", icon: User },
            { id: "annual", label: "12-Month Annual", icon: Calendar },
            { id: "admin", label: "Admin & Permissions", icon: Shield },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  activeTab === tab.id
                    ? "bg-indigo-600 text-white shadow"
                    : "text-slate-300 hover:text-white hover:bg-slate-700/50"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ACTIVE USER SWITCHER (To test Admin / Moderator / Member rights) */}
        <div className="flex items-center gap-2 bg-slate-800/60 px-3 py-1.5 rounded-xl border border-slate-700">
          <span className="text-xs text-slate-400">Acting as:</span>
          <select
            value={currentUserId}
            onChange={(e) => setCurrentUserId(e.target.value)}
            className="bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer"
          >
            {members.map((m) => (
              <option key={m.id} value={m.id} className="bg-slate-900 text-white">
                {m.name} ({m.role})
              </option>
            ))}
          </select>
        </div>
      </header>

      {/* COLOR LEGEND & DATE BAR */}
      <div className="bg-slate-900/50 border-b border-slate-800 px-6 py-2.5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <label className="text-xs text-slate-400 font-medium">Selected Date:</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1 text-xs text-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs">
          {Object.values(CATEGORIES).map((cat) => (
            <div key={cat.id} className="flex items-center gap-1.5">
              <span className={`w-3 h-3 rounded-sm ${cat.badge.split(" ")[0]}`} />
              <span className="text-slate-300">{cat.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* MAIN WORKSPACE + RIGHT CHAT SIDEBAR */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT MAIN VIEW */}
        <main className="flex-1 overflow-auto p-6">
          {/* 1. DAILY 8-HOUR TEAM MATRIX */}
          {activeTab === "daily" && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/60 text-xs text-slate-400">
                      <th className="p-3 sticky left-0 bg-slate-950 z-10 min-w-[180px]">
                        Team Member ({members.length})
                      </th>
                      {MORNING_SLOTS.map((slot) => (
                        <th key={slot.id} className="p-3 border-l border-slate-800 min-w-[145px]">
                          <div className="flex items-center gap-1 text-amber-400 font-semibold">
                            <Sun className="w-3.5 h-3.5" /> Morning
                          </div>
                          <div className="text-slate-200 mt-0.5">{slot.label}</div>
                        </th>
                      ))}
                      <th className="p-2 border-l border-slate-800 bg-slate-950/90 text-center text-[11px] text-slate-500 w-12">
                        Break
                      </th>
                      {AFTERNOON_SLOTS.map((slot) => (
                        <th key={slot.id} className="p-3 border-l border-slate-800 min-w-[145px]">
                          <div className="flex items-center gap-1 text-indigo-400 font-semibold">
                            <Sunset className="w-3.5 h-3.5" /> Afternoon
                          </div>
                          <div className="text-slate-200 mt-0.5">{slot.label}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70 text-xs">
                    {members.map((member) => (
                      <tr key={member.id} className="hover:bg-slate-800/20">
                        <td className="p-3 sticky left-0 bg-slate-900 z-10 border-r border-slate-800">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-indigo-400">
                              {member.avatar}
                            </div>
                            <div>
                              <div className="font-semibold text-slate-100">{member.name}</div>
                              <div className="text-[11px] text-slate-400">
                                {member.role} • {member.dept}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* 4 Morning Slots */}
                        {MORNING_SLOTS.map((slot) => {
                          const key = `${selectedDate}_${slot.id}_${member.id}`;
                          const task = tasks[key];
                          const cat = task ? CATEGORIES[task.category] : null;
                          return (
                            <td
                              key={slot.id}
                              onClick={() => handleOpenCell(selectedDate, slot.id, member.id)}
                              className="p-1.5 border-l border-slate-800/70 cursor-pointer align-top h-20"
                            >
                              {task ? (
                                <div
                                  className={`h-full p-2 rounded-lg border-l-4 ${cat.bg} ${cat.border} flex flex-col justify-between transition`}
                                >
                                  <div>
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${cat.badge}`}>
                                      {cat.label}
                                    </span>
                                    <div className="font-semibold text-slate-100 mt-1 line-clamp-2">
                                      {task.title}
                                    </div>
                                  </div>
                                  {task.comments?.length > 0 && (
                                    <div className="text-[10px] text-slate-300 flex items-center gap-1 mt-1">
                                      <MessageSquare className="w-3 h-3" /> {task.comments.length}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="h-full rounded-lg border border-dashed border-slate-800 hover:border-slate-600 flex items-center justify-center text-slate-600 hover:text-slate-400 transition">
                                  <Plus className="w-4 h-4" />
                                </div>
                              )}
                            </td>
                          );
                        })}

                        {/* Lunch Break Divider */}
                        <td className="bg-slate-950/80 border-l border-slate-800 text-center text-[10px] text-slate-600 font-medium">
                          13-14h
                        </td>

                        {/* 4 Afternoon Slots */}
                        {AFTERNOON_SLOTS.map((slot) => {
                          const key = `${selectedDate}_${slot.id}_${member.id}`;
                          const task = tasks[key];
                          const cat = task ? CATEGORIES[task.category] : null;
                          return (
                            <td
                              key={slot.id}
                              onClick={() => handleOpenCell(selectedDate, slot.id, member.id)}
                              className="p-1.5 border-l border-slate-800/70 cursor-pointer align-top h-20"
                            >
                              {task ? (
                                <div
                                  className={`h-full p-2 rounded-lg border-l-4 ${cat.bg} ${cat.border} flex flex-col justify-between transition`}
                                >
                                  <div>
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${cat.badge}`}>
                                      {cat.label}
                                    </span>
                                    <div className="font-semibold text-slate-100 mt-1 line-clamp-2">
                                      {task.title}
                                    </div>
                                  </div>
                                  {task.comments?.length > 0 && (
                                    <div className="text-[10px] text-slate-300 flex items-center gap-1 mt-1">
                                      <MessageSquare className="w-3 h-3" /> {task.comments.length}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="h-full rounded-lg border border-dashed border-slate-800 hover:border-slate-600 flex items-center justify-center text-slate-600 hover:text-slate-400 transition">
                                  <Plus className="w-4 h-4" />
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 2. INDIVIDUAL MEMBER SCHEDULE */}
          {activeTab === "individual" && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-base">Individual 8-Hour Schedule</h2>
                  <p className="text-xs text-slate-400">
                    Dedicated personal timetable for {selectedDate}
                  </p>
                </div>
                <select
                  value={focusedMemberId}
                  onChange={(e) => setFocusedMemberId(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold"
                >
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Morning Block (4 Hours) */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
                  <h3 className="text-sm font-bold text-amber-400 flex items-center gap-2">
                    <Sun className="w-4 h-4" /> Morning Shift (4 Hours)
                  </h3>
                  {MORNING_SLOTS.map((slot) => {
                    const key = `${selectedDate}_${slot.id}_${focusedMemberId}`;
                    const task = tasks[key];
                    const cat = task ? CATEGORIES[task.category] : null;
                    return (
                      <div
                        key={slot.id}
                        onClick={() => handleOpenCell(selectedDate, slot.id, focusedMemberId)}
                        className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 cursor-pointer flex items-center justify-between"
                      >
                        <span className="text-xs font-mono text-slate-400">{slot.label}</span>
                        {task ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-white">{task.title}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded ${cat.badge}`}>
                              {cat.label}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-600">+ Assign 1h Task</span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Afternoon Block (4 Hours) */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
                  <h3 className="text-sm font-bold text-indigo-400 flex items-center gap-2">
                    <Sunset className="w-4 h-4" /> Afternoon Shift (4 Hours)
                  </h3>
                  {AFTERNOON_SLOTS.map((slot) => {
                    const key = `${selectedDate}_${slot.id}_${focusedMemberId}`;
                    const task = tasks[key];
                    const cat = task ? CATEGORIES[task.category] : null;
                    return (
                      <div
                        key={slot.id}
                        onClick={() => handleOpenCell(selectedDate, slot.id, focusedMemberId)}
                        className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 cursor-pointer flex items-center justify-between"
                      >
                        <span className="text-xs font-mono text-slate-400">{slot.label}</span>
                        {task ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-white">{task.title}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded ${cat.badge}`}>
                              {cat.label}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-600">+ Assign 1h Task</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* 3. 12-MONTH ANNUAL CALENDAR OVERVIEW */}
          {activeTab === "annual" && (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {MONTHS.map((monthName, monthIndex) => (
                <div
                  key={monthName}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-4"
                >
                  <h3 className="font-bold text-sm text-indigo-400 mb-3">{monthName} 2026</h3>
                  <div className="grid grid-cols-7 gap-1 text-[11px] text-center">
                    {Array.from({ length: 28 }, (_, i) => {
                      const day = String(i + 1).padStart(2, "0");
                      const month = String(monthIndex + 1).padStart(2, "0");
                      const dateStr = `2026-${month}-${day}`;
                      const isSelected = dateStr === selectedDate;
                      return (
                        <button
                          key={day}
                          onClick={() => {
                            setSelectedDate(dateStr);
                            setActiveTab("daily");
                          }}
                          className={`py-1.5 rounded-lg font-medium transition ${
                            isSelected
                              ? "bg-indigo-600 text-white font-bold"
                              : "hover:bg-slate-800 text-slate-300"
                          }`}
                        >
                          {i + 1}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 4. ADMIN & PERMISSIONS PANEL (10 to 50 Members) */}
          {activeTab === "admin" && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="font-bold text-base">Team Scaling & Role Management</h2>
                  <p className="text-xs text-slate-400">
                    Year 1 starts with 10 members • Scales up to 50 members
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleScaleTeam(10)}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold"
                  >
                    Reset to 10 Members
                  </button>
                  <button
                    onClick={() => handleScaleTeam(50)}
                    className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white"
                  >
                    Simulate 50 Members
                  </button>
                </div>
              </div>

              {currentUser.role === "Admin" ? (
                <form
                  onSubmit={handleAddMember}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-wrap gap-3 items-end"
                >
                  <div className="flex-1 min-w-[180px]">
                    <label className="text-xs text-slate-400 block mb-1">Member Name</label>
                    <input
                      type="text"
                      value={newMemberName}
                      onChange={(e) => setNewMemberName(e.target.value)}
                      placeholder="e.g. Tiago M."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Role</label>
                    <select
                      value={newMemberRole}
                      onChange={(e) => setNewMemberRole(e.target.value)}
                      className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs"
                    >
                      <option value="Member">Member</option>
                      <option value="Moderator">Moderator</option>
                      <option value="Admin">Admin</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Department</label>
                    <input
                      type="text"
                      value={newMemberDept}
                      onChange={(e) => setNewMemberDept(e.target.value)}
                      className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs"
                    />
                  </div>
                  <button
                    type="submit"
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-semibold"
                  >
                    + Add Member
                  </button>
                </form>
              ) : (
                <div className="bg-amber-500/10 border border-amber-500/30 text-amber-300 p-4 rounded-2xl text-xs">
                  Switch "Acting as" in the top right to an <strong>Admin</strong> user to add or remove members.
                </div>
              )}

              <div className="bg-slate-900 border border-slate-800 rounded-2xl divide-y divide-slate-800">
                {members.map((m) => (
                  <div key={m.id} className="p-3.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center font-bold text-indigo-400">
                        {m.avatar}
                      </div>
                      <div>
                        <div className="font-semibold text-white">{m.name}</div>
                        <div className="text-slate-400">{m.dept}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-200 font-medium">
                        {m.role}
                      </span>
                      {currentUser.role === "Admin" && m.id !== currentUser.id && (
                        <button
                          onClick={() => handleRemoveMember(m.id)}
                          className="text-rose-400 hover:text-rose-300 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>

        {/* RIGHT SIDEBAR: TEAM & DIRECT MESSAGE CHAT */}
        <aside className="w-80 border-l border-slate-800 bg-slate-900/70 flex flex-col">
          <div className="p-3 border-b border-slate-800 flex items-center justify-between">
            <span className="text-xs font-bold flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-indigo-400" /> Team Messenger
            </span>
            <select
              value={chatChannel}
              onChange={(e) => setChatChannel(e.target.value)}
              className="bg-slate-800 text-xs rounded-lg px-2 py-1 border border-slate-700"
            >
              <option value="general">#general-team</option>
              <option value="pm">#project-mgmt</option>
              <option value="community">#community-tasks</option>
            </select>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages
              .filter((m) => m.channel === chatChannel)
              .map((msg) => (
                <div key={msg.id} className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 text-xs">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                    <span className="font-semibold text-indigo-300">{msg.senderName}</span>
                    <span>{msg.time}</span>
                  </div>
                  <p className="text-slate-200">{msg.text}</p>
                </div>
              ))}
          </div>

          <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-800 flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Write a message..."
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs"
            />
            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-500 text-white p-2 rounded-xl"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </aside>
      </div>

      {/* TASK EDIT & COMMENTS MODAL */}
      {selectedCell && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-sm">
                  1-Hour Task Slot ({ALL_SLOTS.find((s) => s.id === selectedCell.slotId)?.label})
                </h3>
                <p className="text-xs text-slate-400">
                  {members.find((m) => m.id === selectedCell.memberId)?.name} • {selectedCell.dateKey}
                </p>
              </div>
              <button onClick={() => setSelectedCell(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {canEditSlot(selectedCell.memberId) ? (
              <form onSubmit={handleSaveTask} className="space-y-3 text-xs">
                <div>
                  <label className="text-slate-400 block mb-1">Task Title</label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="Enter 1-hour task..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Task Color Category</label>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.values(CATEGORIES).map((cat) => (
                      <button
                        type="button"
                        key={cat.id}
                        onClick={() => setFormCategory(cat.id)}
                        className={`p-2 rounded-xl border text-left font-medium transition ${
                          formCategory === cat.id
                            ? `${cat.bg} ${cat.border} text-white`
                            : "border-slate-800 bg-slate-950 text-slate-400"
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Notes</label>
                  <textarea
                    rows={2}
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2"
                  />
                </div>

                <div className="flex justify-between pt-2">
                  <button
                    type="button"
                    onClick={handleDeleteTask}
                    className="text-rose-400 hover:text-rose-300 font-semibold"
                  >
                    Clear Slot
                  </button>
                  <button
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl font-semibold"
                  >
                    Save Task Slot
                  </button>
                </div>
              </form>
            ) : (
              <div className="text-xs text-amber-300 bg-amber-500/10 p-3 rounded-xl">
                Members can only edit their own schedule slots. You can still leave a comment below!
              </div>
            )}

            {/* TASK COMMENTS SECTION */}
            {tasks[`${selectedCell.dateKey}_${selectedCell.slotId}_${selectedCell.memberId}`] && (
              <div className="border-t border-slate-800 pt-3 space-y-2 text-xs">
                <div className="font-semibold text-slate-300">Task Comments</div>
                <div className="max-h-28 overflow-y-auto space-y-1.5">
                  {(
                    tasks[`${selectedCell.dateKey}_${selectedCell.slotId}_${selectedCell.memberId}`]
                      .comments || []
                  ).map((c) => (
                    <div key={c.id} className="bg-slate-950 p-2 rounded-lg">
                      <span className="font-bold text-indigo-400">{c.author}: </span>
                      <span className="text-slate-200">{c.text}</span>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={commentInput}
                    onChange={(e) => setCommentInput(e.target.value)}
                    placeholder="Add a comment on this task..."
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5"
                  />
                  <button
                    type="button"
                    onClick={handleAddComment}
                    className="bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-xl font-semibold"
                  >
                    Post
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}