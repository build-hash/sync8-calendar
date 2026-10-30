import React, { useState, useEffect, useMemo } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  Calendar,
  Clock,
  Shield,
  Plus,
  Trash2,
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
  Sparkles,
  Palmtree,
  Kanban,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

// ============================================================================
// 1. SUPABASE CONFIGURATION
// ============================================================================
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase =
  supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith("http")
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

// ============================================================================
// 2. TIME SLOTS & DEFAULTS
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

const COLOR_PALETTES = {
  blue: { bg: "bg-blue-600/20 hover:bg-blue-600/30", border: "border-blue-500", badge: "bg-blue-500 text-white" },
  purple: { bg: "bg-purple-600/20 hover:bg-purple-600/30", border: "border-purple-500", badge: "bg-purple-500 text-white" },
  amber: { bg: "bg-amber-500/20 hover:bg-amber-500/30", border: "border-amber-500", badge: "bg-amber-500 text-slate-950" },
  emerald: { bg: "bg-emerald-600/20 hover:bg-emerald-600/30", border: "border-emerald-500", badge: "bg-emerald-500 text-white" },
  teal: { bg: "bg-teal-600/20 hover:bg-teal-600/30", border: "border-teal-500", badge: "bg-teal-500 text-white" },
};

const DEFAULT_CATEGORIES = {
  personal: { id: "personal", label: "Personal Project", color_name: "blue", ...COLOR_PALETTES.blue },
  pm: { id: "pm", label: "Project Management", color_name: "purple", ...COLOR_PALETTES.purple },
  community: { id: "community", label: "Community Project", color_name: "amber", ...COLOR_PALETTES.amber },
  other: { id: "other", label: "Other", color_name: "emerald", ...COLOR_PALETTES.emerald },
};

const DEFAULT_HOLIDAYS_2026 = {
  "2026-01-01": "New Year's Day",
  "2026-04-03": "Good Friday",
  "2026-04-05": "Easter Sunday",
  "2026-04-25": "Freedom Day (25 de Abril)",
  "2026-05-01": "Labour Day",
  "2026-06-04": "Corpus Christi",
  "2026-06-10": "Portugal National Day",
  "2026-08-15": "Assumption Day",
  "2026-10-05": "Republic Day",
  "2026-11-01": "All Saints' Day",
  "2026-12-01": "Restoration of Independence",
  "2026-12-08": "Immaculate Conception",
  "2026-12-25": "Christmas Day",
};

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function getWeekDates(dateStr) {
  const base = new Date(dateStr + "T12:00:00");
  const dayOfWeek = base.getDay();
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(base);
  monday.setDate(base.getDate() + diffToMonday);

  const days = [];
  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push({ dateKey: d.toISOString().split("T")[0], dayName: dayNames[i], dayNum: d.getDate() });
  }
  return days;
}

// ============================================================================
// 3. MAIN COMPONENT
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

  const [activeTab, setActiveTab] = useState("daily"); // daily | weekly | annual | admin
  const [selectedDate, setSelectedDate] = useState("2026-10-30");
  const [selectedMonthIdx, setSelectedMonthIdx] = useState(9);
  const [members, setMembers] = useState([]);
  const [tasks, setTasks] = useState({});
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [holidays, setHolidays] = useState(DEFAULT_HOLIDAYS_2026);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [adminTasks, setAdminTasks] = useState([
    { id: "at_1", title: "Review PEPAC Grant Allocation", priority: "High", status: "pending", assignee: "Gabriel" },
    { id: "at_2", title: "Prepare Community Workshop Agenda", priority: "Medium", status: "pending", assignee: "Paula" },
    { id: "at_3", title: "Order Greenhouse Thermal Film", priority: "Low", status: "completed", assignee: "Mateo" },
  ]);

  // Modals & Forms
  const [selectedCell, setSelectedCell] = useState(null);
  const [formTitle, setFormTitle] = useState("");
  const [formCategory, setFormCategory] = useState("personal");
  const [formNotes, setFormNotes] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringDaysCount, setRecurringDaysCount] = useState(5);

  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveType, setLeaveType] = useState("day_off");
  const [leaveDate, setLeaveDate] = useState("2026-10-30");
  const [leaveReason, setLeaveReason] = useState("");

  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberRole, setNewMemberRole] = useState("Member");
  const [newMemberDept, setNewMemberDept] = useState("General");
  const [newCatLabel, setNewCatLabel] = useState("");
  const [newCatColor, setNewCatColor] = useState("teal");
  const [newHolidayDate, setNewHolidayDate] = useState("2026-06-24");
  const [newHolidayName, setNewHolidayName] = useState("");
  const [newAdminTaskTitle, setNewAdminTaskTitle] = useState("");
  const [newAdminTaskPriority, setNewAdminTaskPriority] = useState("Medium");

  const [aiMonthlyNarrative, setAiMonthlyNarrative] = useState("");
  const [reportTargetMemberId, setReportTargetMemberId] = useState("");

  const [dbStatus, setDbStatus] = useState(supabase ? "Connecting..." : "Local Mode");

  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false);
      return;
    }
    supabase.auth.getSession().then(({ data: { session: activeSession } }) => {
      setSession(activeSession);
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!supabase || !session?.user) return;

    async function loadPlatformData() {
      try {
        const user = session.user;
        const userEmail = (user.email || "").toLowerCase();

        const { data: dbProfiles } = await supabase.from("profiles").select("*").order("created_at");
        let allMembers = (dbProfiles || []).map((m) => ({
          ...m,
          days_off_total: m.days_off_total ?? 22,
          days_off_used: m.days_off_used ?? 0,
          sick_days_used: m.sick_days_used ?? 0,
        }));

        let myProfile = allMembers.find((m) => m.id === user.id) || allMembers.find((m) => m.email && m.email.toLowerCase() === userEmail);

        if (!myProfile) {
          const fullName = user.user_metadata?.full_name || userEmail.split("@")[0] || "Member";
          const dept = user.user_metadata?.dept || "General";
          const hasAdmin = allMembers.some((m) => m.role === "Admin" && m.email);
          myProfile = {
            id: user.id,
            name: fullName,
            email: userEmail,
            role: hasAdmin ? "Member" : "Admin",
            dept,
            avatar: fullName.slice(0, 2).toUpperCase(),
            days_off_total: 22,
            days_off_used: 0,
            sick_days_used: 0,
          };
          await supabase.from("profiles").upsert(myProfile);
          allMembers = [myProfile, ...allMembers];
        }

        setMembers(allMembers);
        setReportTargetMemberId(myProfile.id);

        const { data: dbCats } = await supabase.from("custom_categories").select("*");
        if (dbCats && dbCats.length > 0) {
          const mergedCats = { ...DEFAULT_CATEGORIES };
          dbCats.forEach((c) => {
            const pal = COLOR_PALETTES[c.color_name] || COLOR_PALETTES.teal;
            mergedCats[c.id] = { id: c.id, label: c.label, color_name: c.color_name, ...pal };
          });
          setCategories(mergedCats);
        }

        const { data: dbTasks } = await supabase.from("schedule_tasks").select("*");
        if (dbTasks) {
          const loaded = {};
          dbTasks.forEach((row) => {
            const key = `${row.task_date}_${row.slot_id}_${row.member_id}`;
            loaded[key] = { id: row.id, title: row.title, category: row.category, notes: row.notes || "" };
          });
          setTasks(loaded);
        }

        const { data: dbLeaves } = await supabase.from("leave_requests").select("*").order("created_at", { ascending: false });
        if (dbLeaves) setLeaveRequests(dbLeaves);

        const { data: dbSettings } = await supabase.from("app_settings").select("*");
        if (dbSettings) {
          const holRow = dbSettings.find((s) => s.key === "custom_holidays");
          if (holRow) {
            try { setHolidays({ ...DEFAULT_HOLIDAYS_2026, ...JSON.parse(holRow.value) }); } catch {}
          }
        }

        setDbStatus("Supabase Live");
      } catch (err) {
        console.error("Load error:", err);
        setDbStatus("Run Step 1 SQL");
      }
    }

    loadPlatformData();
  }, [session]);

  const currentUser = useMemo(() => {
    if (!session?.user) return null;
    const email = (session.user.email || "").toLowerCase();
    return (
      members.find((m) => m.id === session.user.id) ||
      members.find((m) => m.email && m.email.toLowerCase() === email) || {
        id: session.user.id,
        name: email.split("@")[0],
        role: "Member",
        dept: "General",
        avatar: "ME",
        days_off_total: 22,
        days_off_used: 0,
        sick_days_used: 0,
      }
    );
  }, [members, session]);

  const weekDays = useMemo(() => getWeekDates(selectedDate), [selectedDate]);

  const getMemberLeaveOnDate = (memberId, dateStr) => {
    return leaveRequests.find((r) => r.member_id === memberId && r.leave_date === dateStr && r.status === "approved");
  };

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
          options: { data: { full_name: authName.trim() || authEmail.split("@")[0], dept: authDept.trim() || "General" } },
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: authEmail.trim(), password: authPassword });
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

  const handleRequestLeave = async (e) => {
    e.preventDefault();
    if (!currentUser) return;
    const newReq = {
      id: `leave_${Date.now()}`,
      member_id: currentUser.id,
      member_name: currentUser.name,
      leave_type: leaveType,
      leave_date: leaveDate,
      reason: leaveReason.trim(),
      status: "pending",
    };
    setLeaveRequests((prev) => [newReq, ...prev]);
    setShowLeaveModal(false);
    setLeaveReason("");
    if (supabase) await supabase.from("leave_requests").upsert(newReq);
  };

  const handleReviewLeave = async (reqId, newStatus) => {
    if (currentUser?.role !== "Admin" && currentUser?.role !== "Moderator") return;
    const targetReq = leaveRequests.find((r) => r.id === reqId);
    if (!targetReq || targetReq.status === newStatus) return;

    setLeaveRequests((prev) => prev.map((r) => (r.id === reqId ? { ...r, status: newStatus } : r)));

    if (newStatus === "approved") {
      setMembers((prev) => prev.map((m) => {
        if (m.id !== targetReq.member_id) return m;
        const updated = {
          ...m,
          days_off_used: targetReq.leave_type === "day_off" ? (m.days_off_used || 0) + 1 : m.days_off_used || 0,
          sick_days_used: targetReq.leave_type === "sick_day" ? (m.sick_days_used || 0) + 1 : m.sick_days_used || 0,
        };
        if (supabase) supabase.from("profiles").update({ days_off_used: updated.days_off_used, sick_days_used: updated.sick_days_used }).eq("id", m.id);
        return updated;
      }));
    }

    if (supabase) await supabase.from("leave_requests").update({ status: newStatus }).eq("id", reqId);
  };

  const handleAdjustMemberDays = async (memberId, field, delta) => {
    if (currentUser?.role !== "Admin" && currentUser?.role !== "Moderator") return;
    setMembers((prev) => prev.map((m) => {
      if (m.id !== memberId) return m;
      const nextVal = Math.max(0, (m[field] || 0) + delta);
      const updated = { ...m, [field]: nextVal };
      if (supabase) supabase.from("profiles").update({ [field]: nextVal }).eq("id", memberId);
      return updated;
    }));
  };

  const handleOpenCell = (dateKey, slotId, memberId) => {
    const key = `${dateKey}_${slotId}_${memberId}`;
    const existing = tasks[key];
    setSelectedCell({ dateKey, slotId, memberId });
    setFormTitle(existing ? existing.title : "");
    setFormCategory(existing ? existing.category : Object.keys(categories)[0]);
    setFormNotes(existing ? existing.notes : "");
    setIsRecurring(false);
    setRecurringDaysCount(5);
  };

  const handleSaveTask = async (e) => {
    e.preventDefault();
    if (!selectedCell || !formTitle.trim()) return;

    const { dateKey, slotId, memberId } = selectedCell;
    const baseDate = new Date(dateKey + "T12:00:00");
    const daysToSave = isRecurring ? Math.max(1, Math.min(30, recurringDaysCount)) : 1;

    let updatedTasks = { ...tasks };
    let upserts = [];

    for (let i = 0; i < daysToSave; i++) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() + i);
      const dKey = d.toISOString().split("T")[0];
      const key = `${dKey}_${slotId}_${memberId}`;
      const existing = updatedTasks[key];
      const taskId = existing?.id || `t_${Date.now()}_${i}`;

      const tObj = { id: taskId, title: formTitle.trim(), category: formCategory, notes: formNotes.trim() };
      updatedTasks[key] = tObj;
      upserts.push({ id: taskId, task_date: dKey, slot_id: slotId, member_id: memberId, title: tObj.title, category: tObj.category, notes: tObj.notes });
    }

    setTasks(updatedTasks);
    setSelectedCell(null);
    if (supabase) await supabase.from("schedule_tasks").upsert(upserts);
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
    if (supabase && existing?.id) await supabase.from("schedule_tasks").delete().eq("id", existing.id);
  };

  // Admin-Only CSV Export
  const exportWeeklyScheduleCSV = (memberId) => {
    if (currentUser?.role !== "Admin") return;
    const member = members.find((m) => m.id === memberId) || currentUser;
    if (!member) return;

    const freeTotal = member.days_off_total ?? 22;
    const freeUsed = member.days_off_used ?? 0;
    const freeLeft = Math.max(0, freeTotal - freeUsed);

    let csv = `Member Name,${member.name}\nFree Days Left,${freeLeft}\nFree Days Used,${freeUsed}\n\nDate,Period,Slot,Category,Title,Notes\n`;
    weekDays.forEach((wd) => {
      ALL_SLOTS.forEach((slot) => {
        const key = `${wd.dateKey}_${slot.id}_${member.id}`;
        const task = tasks[key];
        if (task) {
          csv += `${wd.dateKey},${slot.period},${slot.label},${categories[task.category]?.label || task.category},"${task.title}","${task.notes || ""}"\n`;
        }
      });
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Export_${member.name.replace(/\s+/g, "_")}.csv`;
    a.click();
  };

  // Admin-Only Monthly AI Report
  const generateAdminMonthlyReport = () => {
    if (currentUser?.role !== "Admin") return;
    const member = members.find((m) => m.id === reportTargetMemberId) || currentUser;
    const monthPrefix = `2026-${String(selectedMonthIdx + 1).padStart(2, "0")}`;
    let totalHours = 0;
    const byCategory = {};

    Object.entries(tasks).forEach(([key, task]) => {
      const [dateStr, , memId] = key.split("_");
      if (memId === member.id && dateStr.startsWith(monthPrefix)) {
        totalHours += 1;
        byCategory[task.category] = (byCategory[task.category] || 0) + 1;
      }
    });

    const breakdown = Object.entries(byCategory).map(([k, h]) => `${categories[k]?.label || k}: ${h}h`).join(", ");
    setAiMonthlyNarrative(
      `📊 ADMIN EVALUATION REPORT: ${member.name.toUpperCase()} (${MONTHS[selectedMonthIdx]} 2026)\n` +
      `• Total Hours Logged: ${totalHours} hours\n` +
      `• Category Breakdown: ${breakdown || "No hours logged"}\n` +
      `• Leave Status: ${member.days_off_used} days used, ${Math.max(0, member.days_off_total - member.days_off_used)} days remaining.`
    );
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCatLabel.trim() || currentUser?.role !== "Admin") return;
    const id = newCatLabel.trim().toLowerCase().replace(/[^a-z0-9]/g, "_");
    const pal = COLOR_PALETTES[newCatColor] || COLOR_PALETTES.teal;
    const newCatObj = { id, label: newCatLabel.trim(), color_name: newCatColor, ...pal };
    setCategories((prev) => ({ ...prev, [id]: newCatObj }));
    setNewCatLabel("");
    if (supabase) await supabase.from("custom_categories").upsert({ id, label: newCatObj.label, color_name: newCatColor });
  };

  const handleAddHoliday = async (e) => {
    e.preventDefault();
    if (!newHolidayDate || !newHolidayName.trim() || currentUser?.role !== "Admin") return;
    const updated = { ...holidays, [newHolidayDate]: newHolidayName.trim() };
    setHolidays(updated);
    setNewHolidayName("");
    if (supabase) await supabase.from("app_settings").upsert({ key: "custom_holidays", value: JSON.stringify(updated) });
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!newMemberName.trim() || currentUser?.role !== "Admin") return;
    const initials = newMemberName.trim().split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
    const newMember = {
      id: `u_${Date.now()}`,
      name: newMemberName.trim(),
      email: newMemberEmail.trim().toLowerCase() || null,
      role: newMemberRole,
      dept: newMemberDept.trim() || "General",
      avatar: initials || "TM",
      days_off_total: 22,
      days_off_used: 0,
      sick_days_used: 0,
    };
    setMembers((prev) => [...prev, newMember]);
    setNewMemberName("");
    setNewMemberEmail("");
    if (supabase) await supabase.from("profiles").upsert(newMember);
  };

  const handleAddAdminTask = (e) => {
    e.preventDefault();
    if (!newAdminTaskTitle.trim() || currentUser?.role !== "Admin") return;
    setAdminTasks((prev) => [
      ...prev,
      { id: `at_${Date.now()}`, title: newAdminTaskTitle.trim(), priority: newAdminTaskPriority, status: "pending", assignee: currentUser.name },
    ]);
    setNewAdminTaskTitle("");
  };

  if (authLoading) return <div className="min-h-screen bg-slate-950 text-slate-200 flex items-center justify-center text-sm">Loading Sync8...</div>;

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-xl text-white shadow-lg">S8</div>
            <div>
              <h1 className="font-bold text-lg">Sync8 Platform</h1>
              <p className="text-xs text-slate-400">Secure Team Operations</p>
            </div>
          </div>
          <form onSubmit={handleAuthSubmit} className="space-y-4 text-xs">
            <div>
              <label className="text-slate-400 block mb-1">Email Address</label>
              <input type="email" required value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} placeholder="you@org.pt" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white" />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Password</label>
              <input type="password" required minLength={6} value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} placeholder="••••••••" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white" />
            </div>
            <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 rounded-xl shadow-lg transition">Sign In</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* HEADER */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur px-6 py-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-lg shadow-lg">S8</div>
          <div>
            <h1 className="font-bold text-lg tracking-tight">Sync8 Platform</h1>
            <p className="text-xs text-slate-400">{members.length} Members • Operations Hub</p>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700">
          {[
            { id: "daily", label: "Daily Schedule", icon: Clock },
            { id: "weekly", label: "Weekly Schedule", icon: Calendar },
            { id: "annual", label: "Annual & Holidays", icon: Palmtree },
            { id: "admin", label: "Admin Dashboard", icon: Shield },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${activeTab === tab.id ? "bg-indigo-600 text-white shadow" : "text-slate-300 hover:text-white hover:bg-slate-700/50"}`}>
                <Icon className="w-3.5 h-3.5" /> {tab.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2.5">
          <button onClick={() => { setLeaveDate(selectedDate); setShowLeaveModal(true); }} className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition">
            <Palmtree className="w-3.5 h-3.5" /> + Request Leave
          </button>

          <div className="bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700 text-xs flex items-center gap-2">
            <span className="w-6 h-6 rounded-md bg-indigo-600 text-white font-bold flex items-center justify-center text-[11px]">{currentUser?.avatar || "U"}</span>
            <div>
              <span className="font-semibold text-white">{currentUser?.name}</span>
              <span className="ml-2 px-1.5 py-0.5 rounded bg-slate-700 text-indigo-300 text-[10px] font-semibold">{currentUser?.role}</span>
            </div>
          </div>

          <button onClick={handleSignOut} title="Sign Out" className="bg-slate-800 hover:bg-rose-600/25 hover:text-rose-300 border border-slate-700 p-2 rounded-xl text-xs transition">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* DATE & LEGEND BAR */}
      <div className="bg-slate-900/50 border-b border-slate-800 px-6 py-2.5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <label className="text-xs text-slate-400 font-medium">Selected Date:</label>
          <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1 text-xs text-white" />
          {holidays[selectedDate] && <span className="bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs px-2.5 py-0.5 rounded-full font-semibold">🎉 {holidays[selectedDate]}</span>}
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs">
          {Object.values(categories).map((cat) => (
            <div key={cat.id} className="flex items-center gap-1.5">
              <span className={`w-3 h-3 rounded-sm ${cat.badge.split(" ")[0]}`} />
              <span className="text-slate-300">{cat.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* MAIN WORKSPACE */}
      <main className="flex-1 overflow-auto p-6">
        {/* TAB 1: DAILY */}
        {activeTab === "daily" && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/60 text-xs text-slate-400">
                    <th className="p-3 sticky left-0 bg-slate-950 z-10 min-w-[190px]">Team Member</th>
                    {MORNING_SLOTS.map((slot) => (
                      <th key={slot.id} className="p-3 border-l border-slate-800 min-w-[135px]">
                        <div className="text-amber-400 font-semibold">Morning</div>
                        <div className="text-slate-200 mt-0.5">{slot.label}</div>
                      </th>
                    ))}
                    <th className="p-2 border-l border-slate-800 bg-slate-950/90 text-center text-[11px] text-slate-500 w-12">Break</th>
                    {AFTERNOON_SLOTS.map((slot) => (
                      <th key={slot.id} className="p-3 border-l border-slate-800 min-w-[135px]">
                        <div className="text-indigo-400 font-semibold">Afternoon</div>
                        <div className="text-slate-200 mt-0.5">{slot.label}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70 text-xs">
                  {members.map((member) => {
                    const approvedLeave = getMemberLeaveOnDate(member.id, selectedDate);
                    return (
                      <tr key={member.id} className="hover:bg-slate-800/20">
                        <td className="p-3 sticky left-0 bg-slate-900 z-10 border-r border-slate-800">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-indigo-400">{member.avatar}</div>
                            <div>
                              <div className="font-semibold text-slate-100">{member.name}</div>
                              <div className="text-[10px] text-slate-400">{member.role}</div>
                            </div>
                          </div>
                        </td>

                        {approvedLeave ? (
                          <td colSpan={9} className="p-3 border-l border-slate-800 text-center font-semibold">
                            <div className={`py-3 rounded-xl border ${approvedLeave.leave_type === "day_off" ? "bg-amber-500/15 border-amber-500/40 text-amber-300" : "bg-rose-500/15 border-rose-500/40 text-rose-300"}`}>
                              {approvedLeave.leave_type === "day_off" ? `🌴 Approved Day Off` : `🤒 Sick Day`}
                            </div>
                          </td>
                        ) : (
                          <>
                            {MORNING_SLOTS.map((slot) => {
                              const key = `${selectedDate}_${slot.id}_${member.id}`;
                              const task = tasks[key];
                              const cat = task ? categories[task.category] || DEFAULT_CATEGORIES.other : null;
                              return (
                                <td key={slot.id} onClick={() => handleOpenCell(selectedDate, slot.id, member.id)} className="p-1.5 border-l border-slate-800/70 cursor-pointer align-top h-20">
                                  {task ? (
                                    <div className={`h-full p-2 rounded-lg border-l-4 ${cat.bg} ${cat.border}`}>
                                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${cat.badge}`}>{cat.label}</span>
                                      <div className="font-semibold text-slate-100 mt-1 line-clamp-2">{task.title}</div>
                                    </div>
                                  ) : (
                                    <div className="h-full rounded-lg border border-dashed border-slate-800 hover:border-slate-600 flex items-center justify-center text-slate-600"><Plus className="w-4 h-4" /></div>
                                  )}
                                </td>
                              );
                            })}

                            <td className="bg-slate-950/80 border-l border-slate-800 text-center text-[10px] text-slate-600 font-medium">13-14h</td>

                            {AFTERNOON_SLOTS.map((slot) => {
                              const key = `${selectedDate}_${slot.id}_${member.id}`;
                              const task = tasks[key];
                              const cat = task ? categories[task.category] || DEFAULT_CATEGORIES.other : null;
                              return (
                                <td key={slot.id} onClick={() => handleOpenCell(selectedDate, slot.id, member.id)} className="p-1.5 border-l border-slate-800/70 cursor-pointer align-top h-20">
                                  {task ? (
                                    <div className={`h-full p-2 rounded-lg border-l-4 ${cat.bg} ${cat.border}`}>
                                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${cat.badge}`}>{cat.label}</span>
                                      <div className="font-semibold text-slate-100 mt-1 line-clamp-2">{task.title}</div>
                                    </div>
                                  ) : (
                                    <div className="h-full rounded-lg border border-dashed border-slate-800 hover:border-slate-600 flex items-center justify-center text-slate-600"><Plus className="w-4 h-4" /></div>
                                  )}
                                </td>
                              );
                            })}
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: WEEKLY */}
        {activeTab === "weekly" && (
          <div className="space-y-5 max-w-5xl mx-auto">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
              <div>
                <h2 className="font-bold text-base">Weekly Schedule ({weekDays[0].dateKey} — {weekDays[6].dateKey})</h2>
                <p className="text-xs text-slate-400">Monday to Sunday timetable view.</p>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400">
                      <th className="p-3 sticky left-0 bg-slate-950 z-10 min-w-[140px]">Time Slot</th>
                      {weekDays.map((wd) => (
                        <th key={wd.dateKey} className="p-3 border-l border-slate-800 min-w-[145px]">
                          <div className="font-bold text-white">{wd.dayName} ({wd.dateKey.slice(5)})</div>
                          {holidays[wd.dateKey] && <div className="text-[10px] text-amber-400">🎉 {holidays[wd.dateKey]}</div>}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70">
                    {ALL_SLOTS.map((slot) => (
                      <tr key={slot.id} className="hover:bg-slate-800/20">
                        <td className="p-3 sticky left-0 bg-slate-900 z-10 border-r border-slate-800 font-mono text-slate-200">{slot.label}</td>
                        {weekDays.map((wd) => {
                          const key = `${wd.dateKey}_${slot.id}_${currentUser?.id}`;
                          const task = tasks[key];
                          const cat = task ? categories[task.category] || DEFAULT_CATEGORIES.other : null;
                          return (
                            <td key={wd.dateKey} onClick={() => handleOpenCell(wd.dateKey, slot.id, currentUser?.id)} className="p-1.5 border-l border-slate-800/70 cursor-pointer align-top h-16">
                              {task ? (
                                <div className={`h-full p-2 rounded-lg border-l-4 ${cat.bg} ${cat.border}`}>
                                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${cat.badge}`}>{cat.label}</span>
                                  <div className="font-semibold text-white mt-1 line-clamp-1">{task.title}</div>
                                </div>
                              ) : (
                                <div className="h-full rounded-lg border border-dashed border-slate-800 hover:border-slate-600 flex items-center justify-center text-slate-600"><Plus className="w-3.5 h-3.5" /></div>
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
          </div>
        )}

        {/* TAB 3: ANNUAL & HOLIDAYS DEFINITION */}
        {activeTab === "annual" && (
          <div className="max-w-6xl mx-auto space-y-6">
            {currentUser?.role === "Admin" && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
                <h3 className="font-bold text-sm text-amber-400">Define & Add Public Holiday</h3>
                <form onSubmit={handleAddHoliday} className="flex flex-wrap gap-3 items-end text-xs">
                  <div>
                    <label className="text-slate-400 block mb-1">Date</label>
                    <input type="date" required value={newHolidayDate} onChange={(e) => setNewHolidayDate(e.target.value)} className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white" />
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <label className="text-slate-400 block mb-1">Holiday Name</label>
                    <input type="text" required value={newHolidayName} onChange={(e) => setNewHolidayName(e.target.value)} placeholder="e.g. Municipal Holiday" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white" />
                  </div>
                  <button type="submit" className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-xl font-semibold">+ Add to Annual Calendar</button>
                </form>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {MONTHS.map((monthName, monthIndex) => {
                const daysInMonth = new Date(2026, monthIndex + 1, 0).getDate();
                return (
                  <div key={monthName} className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                    <h3 className="font-bold text-sm text-indigo-400 mb-3">{monthName} 2026</h3>
                    <div className="grid grid-cols-7 gap-1 text-[11px] text-center">
                      {Array.from({ length: daysInMonth }, (_, i) => {
                        const day = String(i + 1).padStart(2, "0");
                        const month = String(monthIndex + 1).padStart(2, "0");
                        const dateStr = `2026-${month}-${day}`;
                        const holidayName = holidays[dateStr];
                        const isSelected = dateStr === selectedDate;
                        return (
                          <button
                            key={day}
                            title={holidayName ? `🎉 ${holidayName}` : dateStr}
                            onClick={() => { setSelectedDate(dateStr); setActiveTab("daily"); }}
                            className={`py-1.5 rounded-lg font-medium transition ${isSelected ? "bg-indigo-600 text-white font-bold" : holidayName ? "bg-amber-500/25 border border-amber-500/50 text-amber-300 font-bold" : "hover:bg-slate-800 text-slate-300"}`}
                          >
                            {i + 1}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 4: ADMIN DASHBOARD (Leave, Free Days, Export, AI Reports & Kanban Task Board) */}
        {activeTab === "admin" && (
          <div className="max-w-6xl mx-auto space-y-6">
            {currentUser?.role === "Admin" ? (
              <>
                {/* 1. Pending Tasks Kanban / Priority Board */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="font-bold text-base text-indigo-400 flex items-center gap-2"><Kanban className="w-4 h-4" /> Admin Task Board & Prioritization</h2>
                  </div>

                  <form onSubmit={handleAddAdminTask} className="flex gap-2 text-xs">
                    <input type="text" required value={newAdminTaskTitle} onChange={(e) => setNewAdminTaskTitle(e.target.value)} placeholder="Post new pending task..." className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white" />
                    <select value={newAdminTaskPriority} onChange={(e) => setNewAdminTaskPriority(e.target.value)} className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white">
                      <option value="High">High Priority</option>
                      <option value="Medium">Medium Priority</option>
                      <option value="Low">Low Priority</option>
                    </select>
                    <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl font-semibold">+ Post Task</button>
                  </form>

                  <div className="grid md:grid-cols-3 gap-4 text-xs">
                    {["High", "Medium", "Low"].map((prioLevel) => (
                      <div key={prioLevel} className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2">
                        <div className="font-bold text-slate-300 flex items-center justify-between">
                          <span>{prioLevel} Priority</span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800">{adminTasks.filter(t => t.priority === prioLevel).length}</span>
                        </div>
                        <div className="space-y-2">
                          {adminTasks.filter(t => t.priority === prioLevel).map((t) => (
                            <div key={t.id} className="bg-slate-900 border border-slate-800 p-2.5 rounded-lg flex items-center justify-between">
                              <div>
                                <div className="font-semibold text-white">{t.title}</div>
                                <div className="text-[10px] text-slate-400">Assignee: {t.assignee}</div>
                              </div>
                              <button onClick={() => setAdminTasks(prev => prev.filter(x => x.id !== t.id))} className="text-rose-400"><Trash2 className="w-3.5 h-3.5" /></button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 2. Leave Approval & Free Days Quota Manager */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                  <h2 className="font-bold text-base text-amber-400 flex items-center gap-2"><Palmtree className="w-4 h-4" /> Leave Requests & Free Days Quota (Admin Only)</h2>
                  <div className="divide-y divide-slate-800 text-xs">
                    {members.map((m) => {
                      const freeTotal = m.days_off_total ?? 22;
                      const freeUsed = m.days_off_used ?? 0;
                      const freeLeft = Math.max(0, freeTotal - freeUsed);

                      return (
                        <div key={m.id} className="py-3 flex flex-wrap items-center justify-between gap-4">
                          <div>
                            <div className="font-bold text-white">{m.name}</div>
                            <div className="text-slate-400">{m.role} • <span className="text-emerald-400 font-semibold">{freeLeft} Free Days Left</span></div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="bg-slate-950 border border-slate-800 px-3 py-1 rounded-lg flex items-center gap-2">
                              <span>Total Quota: {freeTotal}d</span>
                              <button onClick={() => handleAdjustMemberDays(m.id, "days_off_total", -1)} className="px-1.5 bg-slate-800 rounded">-</button>
                              <button onClick={() => handleAdjustMemberDays(m.id, "days_off_total", 1)} className="px-1.5 bg-slate-800 rounded">+</button>
                            </div>
                            <button onClick={() => exportWeeklyScheduleCSV(m.id)} className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1">
                              <Download className="w-3.5 h-3.5" /> Export CSV
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="pt-3 border-t border-slate-800 space-y-2">
                    <h3 className="font-bold text-xs text-slate-300">Pending Leave Requests</h3>
                    {leaveRequests.map((req) => (
                      <div key={req.id} className="bg-slate-950 p-2.5 rounded-xl flex items-center justify-between text-xs">
                        <span>{req.member_name} — {req.leave_type === "day_off" ? "Day Off" : "Sick Day"} ({req.leave_date})</span>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-amber-400">{req.status}</span>
                          {req.status === "pending" && <button onClick={() => handleReviewLeave(req.id, "approved")} className="bg-emerald-600 text-white px-2 py-1 rounded">Approve</button>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3. Admin-Only AI Monthly Evaluation Report */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                  <h2 className="font-bold text-base text-indigo-400 flex items-center gap-2"><Sparkles className="w-4 h-4" /> Admin AI Monthly Evaluation Report</h2>
                  <div className="flex flex-wrap gap-3 items-center text-xs">
                    <select value={selectedMonthIdx} onChange={(e) => setSelectedMonthIdx(Number(e.target.value))} className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white">
                      {MONTHS.map((m, idx) => (<option key={m} value={idx}>{m} 2026</option>))}
                    </select>
                    <select value={reportTargetMemberId} onChange={(e) => setReportTargetMemberId(e.target.value)} className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white">
                      {members.map((m) => (<option key={m.id} value={m.id}>{m.name}</option>))}
                    </select>
                    <button onClick={generateAdminMonthlyReport} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl font-semibold">Generate Monthly Report</button>
                  </div>
                  {aiMonthlyNarrative && <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl font-mono text-xs whitespace-pre-line text-slate-200">{aiMonthlyNarrative}</div>}
                </div>
              </>
            ) : (
              <div className="bg-amber-500/10 border border-amber-500/30 text-amber-300 p-5 rounded-2xl text-xs">
                Restricted Area. Only Admins can access exports, quotas, and admin task boards.
              </div>
            )}
          </div>
        )}
      </main>

      {/* TASK MODAL */}
      {selectedCell && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-sm">Task Slot ({ALL_SLOTS.find((s) => s.id === selectedCell.slotId)?.label})</h3>
              <button onClick={() => setSelectedCell(null)} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleSaveTask} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Task Title</label>
                <input type="text" required value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="Enter task..." className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white" />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Category</label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.values(categories).map((cat) => (
                    <button type="button" key={cat.id} onClick={() => setFormCategory(cat.id)} className={`p-2 rounded-xl border text-left font-medium transition ${formCategory === cat.id ? `${cat.bg} ${cat.border} text-white` : "border-slate-800 bg-slate-950 text-slate-400"}`}>{cat.label}</button>
                  ))}
                </div>
              </div>
              <div className="flex justify-between pt-2">
                <button type="button" onClick={handleDeleteTask} className="text-rose-400 font-semibold">Clear Slot</button>
                <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl font-semibold">Save Task</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LEAVE MODAL */}
      {showLeaveModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-sm">Request Day Off / Sick Day</h3>
              <button onClick={() => setShowLeaveModal(false)} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleRequestLeave} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Leave Type</label>
                <select value={leaveType} onChange={(e) => setLeaveType(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white">
                  <option value="day_off">🌴 Day Off</option>
                  <option value="sick_day">🤒 Sick Day</option>
                </select>
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Date</label>
                <input type="date" value={leaveDate} onChange={(e) => setLeaveDate(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white" />
              </div>
              <button type="submit" className="w-full bg-amber-600 hover:bg-amber-500 text-white py-2.5 rounded-xl font-semibold">Submit Request</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}