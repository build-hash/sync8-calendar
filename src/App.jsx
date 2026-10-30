import React, { useState, useEffect, useMemo } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  Calendar,
  Clock,
  MessageSquare,
  Shield,
  Plus,
  Trash2,
  Send,
  User,
  Sun,
  Sunset,
  Database,
  X,
  LogOut,
  Lock,
  Mail,
  UserPlus,
  Download,
  Repeat,
} from "lucide-react";

// ============================================================================
// 1. SUPABASE CONNECTION
// ============================================================================
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase =
  supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith("http")
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

// ============================================================================
// 2. SCHEDULE CONSTANTS (4h Morning + 4h Afternoon + 4 Categories)
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

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// ============================================================================
// 3. MAIN APPLICATION COMPONENT
// ============================================================================
export default function App() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [authDept, setAuthDept] = useState("Management");
  const [authError, setAuthError] = useState("");
  const [authSubmitting, setAuthSubmitting] = useState(false);

  const [activeTab, setActiveTab] = useState("daily");
  const [selectedDate, setSelectedDate] = useState("2026-10-29");
  const [members, setMembers] = useState([]);
  const [focusedMemberId, setFocusedMemberId] = useState("");
  const [tasks, setTasks] = useState({});
  const [messages, setMessages] = useState([]);
  const [chatChannel, setChatChannel] = useState("general");
  const [chatInput, setChatInput] = useState("");

  // Task Modal State (with Recurring Days support)
  const [selectedCell, setSelectedCell] = useState(null);
  const [formTitle, setFormTitle] = useState("");
  const [formCategory, setFormCategory] = useState("member");
  const [formNotes, setFormNotes] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringDaysCount, setRecurringDaysCount] = useState(5); // e.g. 5 days (Workweek)
  const [commentInput, setCommentInput] = useState("");

  // Admin State
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberRole, setNewMemberRole] = useState("Member");
  const [newMemberDept, setNewMemberDept] = useState("General");

  const [dbStatus, setDbStatus] = useState(supabase ? "Connecting..." : "Missing .env Keys");

  // Auth Listener
  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session: activeSession } }) => {
      setSession(activeSession);
      setAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load Database & Sync User
  useEffect(() => {
    if (!supabase || !session?.user) return;

    async function syncUserAndLoadData() {
      try {
        const user = session.user;
        const userEmail = (user.email || "").toLowerCase();

        const { data: existingProfiles, error: errProf } = await supabase
          .from("profiles")
          .select("*")
          .order("created_at");

        if (errProf) throw errProf;

        let allMembers = existingProfiles || [];
        let myProfile =
          allMembers.find((m) => m.id === user.id) ||
          allMembers.find((m) => m.email && m.email.toLowerCase() === userEmail);

        if (!myProfile) {
          const fullName =
            user.user_metadata?.full_name || userEmail.split("@")[0] || "Team Member";
          const dept = user.user_metadata?.dept || "General";
          const initials = fullName
            .split(" ")
            .map((part) => part[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);

          const hasRealAdmin = allMembers.some((m) => m.role === "Admin" && m.email);
          const assignedRole = hasRealAdmin ? "Member" : "Admin";

          const newProfile = {
            id: user.id,
            name: fullName,
            email: userEmail,
            role: assignedRole,
            dept: dept,
            avatar: initials || "TM",
          };

          await supabase.from("profiles").upsert(newProfile);
          allMembers = [newProfile, ...allMembers];
          myProfile = newProfile;
        } else if (myProfile.id !== user.id) {
          const updatedProfile = { ...myProfile, id: user.id, email: userEmail };
          await supabase.from("profiles").delete().eq("id", myProfile.id);
          await supabase.from("profiles").upsert(updatedProfile);
          allMembers = allMembers.map((m) => (m.id === myProfile.id ? updatedProfile : m));
          myProfile = updatedProfile;
        }

        setMembers(allMembers);
        setFocusedMemberId(myProfile.id);

        const { data: dbTasks } = await supabase
          .from("schedule_tasks")
          .select("*, task_comments(*)");

        if (dbTasks) {
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

        const { data: dbMsgs } = await supabase
          .from("messages")
          .select("*")
          .order("created_at");

        if (dbMsgs) {
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
        console.error("Database sync error:", err);
        setDbStatus("Check SQL Tables");
      }
    }

    syncUserAndLoadData();
  }, [session]);

  const currentUser = useMemo(() => {
    if (!session?.user) return null;
    const userEmail = (session.user.email || "").toLowerCase();
    return (
      members.find((m) => m.id === session.user.id) ||
      members.find((m) => m.email && m.email.toLowerCase() === userEmail) || {
        id: session.user.id,
        name: session.user.user_metadata?.full_name || userEmail.split("@")[0],
        email: userEmail,
        role: "Member",
        dept: "General",
        avatar: "ME",
      }
    );
  }, [members, session]);

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    if (!supabase) return;
    setAuthError("");
    setAuthSubmitting(true);

    try {
      if (authMode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: authEmail.trim(),
          password: authPassword,
          options: {
            data: {
              full_name: authName.trim() || authEmail.split("@")[0],
              dept: authDept.trim() || "General",
            },
          },
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: authEmail.trim(),
          password: authPassword,
        });
        if (error) throw error;
      }
    } catch (err) {
      setAuthError(err.message || "Authentication failed.");
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    if (supabase) await supabase.auth.signOut();
  };

  const canEditSlot = (targetMemberId) => {
    if (!currentUser) return false;
    if (currentUser.role === "Admin" || currentUser.role === "Moderator") return true;
    return currentUser.id === targetMemberId;
  };

  const handleOpenCell = (dateKey, slotId, memberId) => {
    const key = `${dateKey}_${slotId}_${memberId}`;
    const existing = tasks[key];
    setSelectedCell({ dateKey, slotId, memberId });
    setFormTitle(existing ? existing.title : "");
    setFormCategory(existing ? existing.category : "member");
    setFormNotes(existing ? existing.notes : "");
    setIsRecurring(false);
    setRecurringDaysCount(5);
    setCommentInput("");
  };

  // ==========================================================================
  // SAVE TASK (Supports Recurring Multi-Day Assignment)
  // ==========================================================================
  const handleSaveTask = async (e) => {
    e.preventDefault();
    if (!selectedCell || !formTitle.trim()) return;

    const { dateKey, slotId, memberId } = selectedCell;
    const baseDate = new Date(dateKey);
    const daysToSave = isRecurring ? Math.max(1, Math.min(30, recurringDaysCount)) : 1;

    let updatedTasksCopy = { ...tasks };
    let dbUpserts = [];

    for (let i = 0; i < daysToSave; i++) {
      const targetDateObj = new Date(baseDate);
      targetDateObj.setDate(baseDate.getDate() + i);
      const targetDateKey = targetDateObj.toISOString().split("T")[0];

      const key = `${targetDateKey}_${slotId}_${memberId}`;
      const existing = updatedTasksCopy[key];
      const taskId = existing?.id || `t_${Date.now()}_${i}`;

      const newTaskObj = {
        id: taskId,
        title: formTitle.trim(),
        category: formCategory,
        notes: formNotes.trim(),
        comments: existing ? existing.comments : [],
      };

      updatedTasksCopy[key] = newTaskObj;
      dbUpserts.push({
        id: taskId,
        task_date: targetDateKey,
        slot_id: slotId,
        member_id: memberId,
        title: newTaskObj.title,
        category: newTaskObj.category,
        notes: newTaskObj.notes,
      });
    }

    setTasks(updatedTasksCopy);
    setSelectedCell(null);

    if (supabase) {
      await supabase.from("schedule_tasks").upsert(dbUpserts);
    }
  };

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

  const handleAddComment = async () => {
    if (!commentInput.trim() || !selectedCell || !currentUser) return;
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

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !currentUser) return;

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

  // ==========================================================================
  // CSV EXPORT FOR GRANT REPORTING
  // ==========================================================================
  const exportMemberScheduleCSV = (targetMemberId) => {
    const member = members.find((m) => m.id === targetMemberId);
    if (!member) return;

    let csvContent = "data:text/csv;charset=utf-8,Date,Shift,Slot,Category,Task Title,Notes\n";

    Object.entries(tasks).forEach(([key, task]) => {
      const [date, slotId, memId] = key.split("_");
      if (memId === targetMemberId) {
        const slotObj = ALL_SLOTS.find((s) => s.id === slotId);
        const catObj = CATEGORIES[task.category];
        const row = [
          date,
          slotObj?.period || "Day",
          slotObj?.label || slotId,
          catObj?.label || task.category,
          `"${(task.title || "").replace(/"/g, '""')}"`,
          `"${(task.notes || "").replace(/"/g, '""')}"`,
        ];
        csvContent += row.join(",") + "\n";
      }
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Sync8_Schedule_${member.name.replace(/\s+/g, "_")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Admin Controls
  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!newMemberName.trim() || currentUser?.role !== "Admin") return;

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
      email: newMemberEmail.trim().toLowerCase() || null,
      role: newMemberRole,
      dept: newMemberDept.trim() || "General",
      avatar: initials || "TM",
    };

    setMembers((prev) => [...prev, newMember]);
    setNewMemberName("");
    setNewMemberEmail("");

    if (supabase) await supabase.from("profiles").upsert(newMember);
  };

  const handleChangeMemberRole = async (memberId, updatedRole) => {
    if (currentUser?.role !== "Admin") return;
    setMembers((prev) =>
      prev.map((m) => (m.id === memberId ? { ...m, role: updatedRole } : m))
    );
    if (supabase) {
      await supabase.from("profiles").update({ role: updatedRole }).eq("id", memberId);
    }
  };

  const handleRemoveMember = async (id) => {
    if (currentUser?.role !== "Admin" || members.length <= 1) return;
    setMembers((prev) => prev.filter((m) => m.id !== id));
    if (supabase) await supabase.from("profiles").delete().eq("id", id);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-200 flex items-center justify-center text-sm">
        Loading Sync8 Platform...
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-xl shadow-lg shadow-indigo-600/30">
              S8
            </div>
            <div>
              <h1 className="font-bold text-lg">Sync8 Annual Platform</h1>
              <p className="text-xs text-slate-400">4h Morning + 4h Afternoon Schedule</p>
            </div>
          </div>

          <div className="grid grid-cols-2 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
            <button
              type="button"
              onClick={() => { setAuthMode("login"); setAuthError(""); }}
              className={`py-2 rounded-lg transition ${authMode === "login" ? "bg-indigo-600 text-white" : "text-slate-400"}`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setAuthMode("signup"); setAuthError(""); }}
              className={`py-2 rounded-lg transition ${authMode === "signup" ? "bg-indigo-600 text-white" : "text-slate-400"}`}
            >
              Create Account
            </button>
          </div>

          {authError && (
            <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 p-3 rounded-xl text-xs">
              {authError}
            </div>
          )}

          <form onSubmit={handleAuthSubmit} className="space-y-4 text-xs">
            {authMode === "signup" && (
              <>
                <div>
                  <label className="text-slate-400 block mb-1">Full Name</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      required
                      value={authName}
                      onChange={(e) => setAuthName(e.target.value)}
                      placeholder="e.g. Gabriel Manea"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Department / Area</label>
                  <input
                    type="text"
                    required
                    value={authDept}
                    onChange={(e) => setAuthDept(e.target.value)}
                    placeholder="e.g. Management, Youth Work"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white"
                  />
                </div>
              </>
            )}

            <div>
              <label className="text-slate-400 block mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="email"
                  required
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="you@organization.org"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-white"
                />
              </div>
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Password (min 6 chars)</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-white"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={authSubmitting}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl shadow-lg transition"
            >
              {authSubmitting ? "Please wait..." : authMode === "signup" ? "Create Account & Enter" : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* TOP NAVBAR */}
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
            <p className="text-xs text-slate-400">4h Morning + 4h Afternoon • {members.length} Members</p>
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700">
          {[
            { id: "daily", label: "Daily 8h Matrix", icon: Clock },
            { id: "individual", label: "My / Individual Schedule", icon: User },
            { id: "annual", label: "12-Month Annual", icon: Calendar },
            { id: "admin", label: "Team & Permissions", icon: Shield },
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

        {/* USER BADGE & EXPORT BUTTON & SIGN OUT */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => exportMemberScheduleCSV(currentUser?.id)}
            title="Download CSV for grant reporting"
            className="bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5 transition"
          >
            <Download className="w-3.5 h-3.5" />
            Export My CSV
          </button>

          <div className="bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700 text-xs flex items-center gap-2">
            <span className="w-6 h-6 rounded-md bg-indigo-600 text-white font-bold flex items-center justify-center text-[11px]">
              {currentUser?.avatar || "U"}
            </span>
            <div>
              <span className="font-semibold text-white">{currentUser?.name}</span>
              <span className="ml-2 px-2 py-0.5 rounded bg-slate-700 text-indigo-300 text-[10px] font-semibold">
                {currentUser?.role}
              </span>
            </div>
          </div>

          <button
            onClick={handleSignOut}
            title="Sign Out"
            className="bg-slate-800 hover:bg-rose-600/20 hover:text-rose-300 border border-slate-700 px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5 transition"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* DATE & COLOR LEGEND BAR */}
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

      {/* MAIN VIEW + CHAT */}
      <div className="flex-1 flex overflow-hidden">
        <main className="flex-1 overflow-auto p-6">
          {/* DAILY MATRIX */}
          {activeTab === "daily" && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/60 text-xs text-slate-400">
                      <th className="p-3 sticky left-0 bg-slate-950 z-10 min-w-[190px]">
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
                    {members.map((member) => {
                      const isMe = member.id === currentUser?.id;
                      return (
                        <tr
                          key={member.id}
                          className={isMe ? "bg-indigo-950/20 hover:bg-indigo-950/30" : "hover:bg-slate-800/20"}
                        >
                          <td className="p-3 sticky left-0 bg-slate-900 z-10 border-r border-slate-800">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-indigo-400">
                                  {member.avatar}
                                </div>
                                <div>
                                  <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                                    {member.name}
                                    {isMe && (
                                      <span className="text-[10px] px-1.5 py-0.2 bg-indigo-600/30 text-indigo-300 rounded">
                                        You
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[11px] text-slate-400">
                                    {member.role} • {member.dept}
                                  </div>
                                </div>
                              </div>
                              <button
                                onClick={() => exportMemberScheduleCSV(member.id)}
                                title="Download CSV"
                                className="text-slate-500 hover:text-emerald-400 p-1"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>

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

                          <td className="bg-slate-950/80 border-l border-slate-800 text-center text-[10px] text-slate-600 font-medium">
                            13-14h
                          </td>

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
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* INDIVIDUAL SCHEDULE */}
          {activeTab === "individual" && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="font-bold text-base">Individual 8-Hour Schedule</h2>
                  <p className="text-xs text-slate-400">Personal timetable for {selectedDate}</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => exportMemberScheduleCSV(focusedMemberId || currentUser?.id)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" /> Export Member CSV
                  </button>
                  <select
                    value={focusedMemberId || currentUser?.id}
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
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
                  <h3 className="text-sm font-bold text-amber-400 flex items-center gap-2">
                    <Sun className="w-4 h-4" /> Morning Shift (4 Hours)
                  </h3>
                  {MORNING_SLOTS.map((slot) => {
                    const targetId = focusedMemberId || currentUser?.id;
                    const key = `${selectedDate}_${slot.id}_${targetId}`;
                    const task = tasks[key];
                    const cat = task ? CATEGORIES[task.category] : null;
                    return (
                      <div
                        key={slot.id}
                        onClick={() => handleOpenCell(selectedDate, slot.id, targetId)}
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

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
                  <h3 className="text-sm font-bold text-indigo-400 flex items-center gap-2">
                    <Sunset className="w-4 h-4" /> Afternoon Shift (4 Hours)
                  </h3>
                  {AFTERNOON_SLOTS.map((slot) => {
                    const targetId = focusedMemberId || currentUser?.id;
                    const key = `${selectedDate}_${slot.id}_${targetId}`;
                    const task = tasks[key];
                    const cat = task ? CATEGORIES[task.category] : null;
                    return (
                      <div
                        key={slot.id}
                        onClick={() => handleOpenCell(selectedDate, slot.id, targetId)}
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

          {/* 12-MONTH ANNUAL */}
          {activeTab === "annual" && (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {MONTHS.map((monthName, monthIndex) => (
                <div key={monthName} className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
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
                          onClick={() => { setSelectedDate(dateStr); setActiveTab("daily"); }}
                          className={`py-1.5 rounded-lg font-medium transition ${
                            isSelected ? "bg-indigo-600 text-white font-bold" : "hover:bg-slate-800 text-slate-300"
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

          {/* ADMIN */}
          {activeTab === "admin" && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                <h2 className="font-bold text-base">Team Directory & Access Permissions</h2>
                <p className="text-xs text-slate-400">
                  Logged in as <strong>{currentUser?.name}</strong> ({currentUser?.role})
                </p>
              </div>

              {currentUser?.role === "Admin" ? (
                <form
                  onSubmit={handleAddMember}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-wrap gap-3 items-end"
                >
                  <div className="flex-1 min-w-[150px]">
                    <label className="text-xs text-slate-400 block mb-1">Member Name</label>
                    <input
                      type="text"
                      required
                      value={newMemberName}
                      onChange={(e) => setNewMemberName(e.target.value)}
                      placeholder="e.g. Tiago M."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs"
                    />
                  </div>
                  <div className="flex-1 min-w-[170px]">
                    <label className="text-xs text-slate-400 block mb-1">Email</label>
                    <input
                      type="email"
                      value={newMemberEmail}
                      onChange={(e) => setNewMemberEmail(e.target.value)}
                      placeholder="tiago@org.pt"
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
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs"
                    />
                  </div>
                  <button
                    type="submit"
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5"
                  >
                    <UserPlus className="w-3.5 h-3.5" /> Add Member
                  </button>
                </form>
              ) : (
                <div className="bg-amber-500/10 border border-amber-500/30 text-amber-300 p-4 rounded-2xl text-xs">
                  Only <strong>Admin</strong> accounts can add/remove members or change user roles.
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
                        <div className="font-semibold text-white">
                          {m.name} {m.email && <span className="text-slate-500 font-normal">({m.email})</span>}
                        </div>
                        <div className="text-slate-400">{m.dept}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => exportMemberScheduleCSV(m.id)}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded-lg text-xs flex items-center gap-1"
                      >
                        <Download className="w-3 h-3" /> CSV
                      </button>

                      {currentUser?.role === "Admin" ? (
                        <select
                          value={m.role}
                          onChange={(e) => handleChangeMemberRole(m.id, e.target.value)}
                          className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs font-medium text-slate-200"
                        >
                          <option value="Member">Member</option>
                          <option value="Moderator">Moderator</option>
                          <option value="Admin">Admin</option>
                        </select>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-200 font-medium">
                          {m.role}
                        </span>
                      )}

                      {currentUser?.role === "Admin" && m.id !== currentUser.id && (
                        <button onClick={() => handleRemoveMember(m.id)} className="text-rose-400 hover:text-rose-300 p-1">
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

        {/* TEAM CHAT */}
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
            <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white p-2 rounded-xl">
              <Send className="w-4 h-4" />
            </button>
          </form>
        </aside>
      </div>

      {/* TASK EDIT & RECURRING MODAL */}
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
                  <label className="text-slate-400 block mb-1">Color Category</label>
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

                {/* RECURRING MULTI-DAY TOGGLE */}
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                      <Repeat className="w-3.5 h-3.5 text-indigo-400" /> Repeat across multiple days?
                    </span>
                    <input
                      type="checkbox"
                      checked={isRecurring}
                      onChange={(e) => setIsRecurring(e.target.checked)}
                      className="w-4 h-4 accent-indigo-600 cursor-pointer"
                    />
                  </div>
                  {isRecurring && (
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-slate-400">Number of consecutive days:</span>
                      <input
                        type="number"
                        min={1}
                        max={30}
                        value={recurringDaysCount}
                        onChange={(e) => setRecurringDaysCount(parseInt(e.target.value) || 1)}
                        className="w-16 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center font-bold"
                      />
                    </div>
                  )}
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
                    {isRecurring ? `Save ${recurringDaysCount} Days` : "Save Task Slot"}
                  </button>
                </div>
              </form>
            ) : (
              <div className="text-xs text-amber-300 bg-amber-500/10 p-3 rounded-xl">
                Members can only edit their own schedule slots. You can still leave comments below!
              </div>
            )}

            {/* COMMENTS SECTION */}
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
                    placeholder="Add a comment..."
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