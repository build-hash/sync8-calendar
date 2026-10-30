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
  FileText,
  CheckCircle,
  XCircle,
  HelpCircle,
  BookOpen,
  Sparkles,
  Palmtree,
  Thermometer,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Save,
} from "lucide-react";

// ============================================================================
// 1. SUPABASE & GEMINI CONFIGURATION
// ============================================================================
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const envGeminiKey = import.meta.env.VITE_GEMINI_API_KEY || "";

const supabase =
  supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith("http")
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

// ============================================================================
// 2. TIME SLOTS (No "4h morning / 4h afternoon" text—clean Morning & Afternoon)
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

// ============================================================================
// 3. TASK CATEGORIES & COLOR PALETTES (Personal, PM, Community, Other + Admin)
// ============================================================================
const COLOR_PALETTES = {
  blue: {
    bg: "bg-blue-600/20 hover:bg-blue-600/30",
    border: "border-blue-500",
    badge: "bg-blue-500 text-white",
  },
  purple: {
    bg: "bg-purple-600/20 hover:bg-purple-600/30",
    border: "border-purple-500",
    badge: "bg-purple-500 text-white",
  },
  amber: {
    bg: "bg-amber-500/20 hover:bg-amber-500/30",
    border: "border-amber-500",
    badge: "bg-amber-500 text-slate-950",
  },
  emerald: {
    bg: "bg-emerald-600/20 hover:bg-emerald-600/30",
    border: "border-emerald-500",
    badge: "bg-emerald-500 text-white",
  },
  rose: {
    bg: "bg-rose-600/20 hover:bg-rose-600/30",
    border: "border-rose-500",
    badge: "bg-rose-500 text-white",
  },
  teal: {
    bg: "bg-teal-600/20 hover:bg-teal-600/30",
    border: "border-teal-500",
    badge: "bg-teal-500 text-white",
  },
  cyan: {
    bg: "bg-cyan-600/20 hover:bg-cyan-600/30",
    border: "border-cyan-500",
    badge: "bg-cyan-500 text-slate-950",
  },
};

const DEFAULT_CATEGORIES = {
  personal: {
    id: "personal",
    label: "Personal Project",
    color_name: "blue",
    ...COLOR_PALETTES.blue,
  },
  pm: {
    id: "pm",
    label: "Project Management",
    color_name: "purple",
    ...COLOR_PALETTES.purple,
  },
  community: {
    id: "community",
    label: "Community Project",
    color_name: "amber",
    ...COLOR_PALETTES.amber,
  },
  other: {
    id: "other",
    label: "Other",
    color_name: "emerald",
    ...COLOR_PALETTES.emerald,
  },
};

// ============================================================================
// 4. PUBLIC HOLIDAYS (2026 Official Calendar)
// ============================================================================
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

const DEFAULT_MARKDOWN_RULES = `# Organization Operational Rules & Guidelines

## 1. Daily & Weekly Schedule Standards
- Every member manages their **Morning** (09:00–13:00) and **Afternoon** (14:00–18:00) 1-hour task blocks.
- Assign each slot to **Personal Project**, **Project Management**, **Community Project**, or custom categories created by the Admin.
- Use the **Weekly Schedule** tab to export your weekly report (including free days used and remaining).

## 2. Free Days Off & Sick Leave Policy
- Standard annual allocation is **22 Free Days** per year (Admin can adjust individual allocations at any time).
- Submit **Day Off** or **Sick Day** requests using the **Request Leave** button in the top navigation bar.
- **Admins** and **Moderators** review and approve/reject requests in the Leave Management panel.

## 3. Team Communication & Gemini AI Assistance
- Use **#general-team** for organization-wide updates or select any colleague for a private **1-on-1 Direct Message**.
- Type \`/help [your question]\` inside any chat channel to ask the connected **Gemini AI Assistant** for instant help.`;

// Helper: Get Monday-to-Sunday array of 7 dates for any selected date string
function getWeekDates(dateStr) {
  const base = new Date(dateStr + "T12:00:00");
  const dayOfWeek = base.getDay(); // 0 (Sun) to 6 (Sat)
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(base);
  monday.setDate(base.getDate() + diffToMonday);

  const days = [];
  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const iso = d.toISOString().split("T")[0];
    days.push({ dateKey: iso, dayName: dayNames[i], dayNum: d.getDate() });
  }
  return days;
}

// Helper: Simple Markdown Renderer for the Rules & Knowledge Base
function SimpleMarkdownView({ content }) {
  const lines = (content || "").split("\n");
  return (
    <div className="space-y-2 text-xs leading-relaxed text-slate-200">
      {lines.map((line, idx) => {
        if (line.startsWith("# ")) {
          return (
            <h1 key={idx} className="text-lg font-bold text-white border-b border-slate-800 pb-1.5 pt-2">
              {line.replace("# ", "")}
            </h1>
          );
        }
        if (line.startsWith("## ")) {
          return (
            <h2 key={idx} className="text-sm font-bold text-indigo-400 pt-3">
              {line.replace("## ", "")}
            </h2>
          );
        }
        if (line.startsWith("- ")) {
          return (
            <li key={idx} className="ml-4 list-disc text-slate-300">
              <span
                dangerouslySetInnerHTML={{
                  __html: line
                    .replace("- ", "")
                    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>')
                    .replace(/`(.*?)`/g, '<code class="bg-slate-800 text-indigo-300 px-1.5 py-0.5 rounded">$1</code>'),
                }}
              />
            </li>
          );
        }
        if (!line.trim()) return <div key={idx} className="h-1" />;
        return (
          <p
            key={idx}
            dangerouslySetInnerHTML={{
              __html: line
                .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>')
                .replace(/`(.*?)`/g, '<code class="bg-slate-800 text-indigo-300 px-1.5 py-0.5 rounded">$1</code>'),
            }}
          />
        );
      })}
    </div>
  );
}

// ============================================================================
// 5. MAIN APPLICATION COMPONENT
// ============================================================================
export default function App() {
  // Auth State
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [authDept, setAuthDept] = useState("Management");
  const [authError, setAuthError] = useState("");
  const [authSubmitting, setAuthSubmitting] = useState(false);

  // Navigation & Core State
  const [activeTab, setActiveTab] = useState("daily"); // daily | weekly | annual | individual | rules | admin
  const [selectedDate, setSelectedDate] = useState("2026-10-30");
  const [selectedMonthIdx, setSelectedMonthIdx] = useState(9); // October (0-indexed)
  const [members, setMembers] = useState([]);
  const [focusedMemberId, setFocusedMemberId] = useState("");
  const [tasks, setTasks] = useState({});
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [holidays, setHolidays] = useState(DEFAULT_HOLIDAYS_2026);
  const [leaveRequests, setLeaveRequests] = useState([]);

  // Chat State (Only General and 1-on-1 Direct Messages between members)
  const [messages, setMessages] = useState([]);
  const [chatTarget, setChatTarget] = useState("general"); // "general" or member.id
  const [chatInput, setChatInput] = useState("");
  const [aiThinking, setAiThinking] = useState(false);

  // Rules & Gemini Key State
  const [markdownRules, setMarkdownRules] = useState(DEFAULT_MARKDOWN_RULES);
  const [isEditingRules, setIsEditingRules] = useState(false);
  const [geminiKey, setGeminiKey] = useState(
    () => localStorage.getItem("sync8_gemini_key") || envGeminiKey
  );

  // AI Monthly Report State
  const [aiMonthlyNarrative, setAiMonthlyNarrative] = useState("");
  const [generatingReport, setGeneratingReport] = useState(false);

  // Task Modal State
  const [selectedCell, setSelectedCell] = useState(null);
  const [formTitle, setFormTitle] = useState("");
  const [formCategory, setFormCategory] = useState("personal");
  const [formNotes, setFormNotes] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringDaysCount, setRecurringDaysCount] = useState(5);
  const [commentInput, setCommentInput] = useState("");

  // Leave Modal State
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveType, setLeaveType] = useState("day_off");
  const [leaveDate, setLeaveDate] = useState("2026-10-30");
  const [leaveReason, setLeaveReason] = useState("");

  // Admin Forms State
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberRole, setNewMemberRole] = useState("Member");
  const [newMemberDept, setNewMemberDept] = useState("General");
  const [newCatLabel, setNewCatLabel] = useState("");
  const [newCatColor, setNewCatColor] = useState("teal");
  const [newHolidayDate, setNewHolidayDate] = useState("2026-06-24");
  const [newHolidayName, setNewHolidayName] = useState("");

  const [dbStatus, setDbStatus] = useState(supabase ? "Connecting..." : "Local Mode");

  // --------------------------------------------------------------------------
  // AUTH SESSION LISTENER
  // --------------------------------------------------------------------------
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

  // --------------------------------------------------------------------------
  // LOAD ALL DATA FROM SUPABASE
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!supabase || !session?.user) return;

    async function loadPlatformData() {
      try {
        const user = session.user;
        const userEmail = (user.email || "").toLowerCase();

        // 1. Profiles
        const { data: dbProfiles, error: errProf } = await supabase
          .from("profiles")
          .select("*")
          .order("created_at");
        if (errProf) throw errProf;

        let allMembers = (dbProfiles || []).map((m) => ({
          ...m,
          days_off_total: m.days_off_total ?? 22,
          days_off_used: m.days_off_used ?? 0,
          sick_days_used: m.sick_days_used ?? 0,
        }));

        let myProfile =
          allMembers.find((m) => m.id === user.id) ||
          allMembers.find((m) => m.email && m.email.toLowerCase() === userEmail);

        if (!myProfile) {
          const fullName =
            user.user_metadata?.full_name || userEmail.split("@")[0] || "Member";
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
        } else if (myProfile.id !== user.id) {
          const updatedProfile = { ...myProfile, id: user.id, email: userEmail };
          await supabase.from("profiles").delete().eq("id", myProfile.id);
          await supabase.from("profiles").upsert(updatedProfile);
          allMembers = allMembers.map((m) => (m.id === myProfile.id ? updatedProfile : m));
          myProfile = updatedProfile;
        }

        setMembers(allMembers);
        setFocusedMemberId(myProfile.id);

        // 2. Custom Categories
        const { data: dbCats } = await supabase.from("custom_categories").select("*");
        if (dbCats && dbCats.length > 0) {
          const mergedCats = { ...DEFAULT_CATEGORIES };
          dbCats.forEach((c) => {
            const pal = COLOR_PALETTES[c.color_name] || COLOR_PALETTES.teal;
            mergedCats[c.id] = {
              id: c.id,
              label: c.label,
              color_name: c.color_name,
              ...pal,
            };
          });
          setCategories(mergedCats);
        }

        // 3. Tasks & Task Comments
        const { data: dbTasks } = await supabase
          .from("schedule_tasks")
          .select("*, task_comments(*)");
        if (dbTasks) {
          const loaded = {};
          dbTasks.forEach((row) => {
            const key = `${row.task_date}_${row.slot_id}_${row.member_id}`;
            loaded[key] = {
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
          setTasks(loaded);
        }

        // 4. Leave Requests
        const { data: dbLeaves } = await supabase
          .from("leave_requests")
          .select("*")
          .order("created_at", { ascending: false });
        if (dbLeaves) setLeaveRequests(dbLeaves);

        // 5. Messages
        const { data: dbMsgs } = await supabase
          .from("messages")
          .select("*")
          .order("created_at");
        if (dbMsgs) {
          setMessages(
            dbMsgs.map((m) => ({
              id: m.id,
              channel: m.channel,
              recipientId: m.recipient_id,
              senderId: m.sender_id,
              senderName: m.sender_name,
              senderRole: m.sender_role,
              text: m.text,
              time: m.time_label,
            }))
          );
        }

        // 6. Markdown Rules & Custom Holidays
        const { data: dbSettings } = await supabase.from("app_settings").select("*");
        if (dbSettings) {
          const rulesRow = dbSettings.find((s) => s.key === "markdown_rules");
          if (rulesRow) setMarkdownRules(rulesRow.value);
          const holRow = dbSettings.find((s) => s.key === "custom_holidays");
          if (holRow) {
            try {
              setHolidays({ ...DEFAULT_HOLIDAYS_2026, ...JSON.parse(holRow.value) });
            } catch {}
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

  // Helper to check if a member has approved leave on a specific date
  const getMemberLeaveOnDate = (memberId, dateStr) => {
    return leaveRequests.find(
      (r) =>
        r.member_id === memberId &&
        r.leave_date === dateStr &&
        r.status === "approved"
    );
  };

  // --------------------------------------------------------------------------
  // AUTH HANDLERS
  // --------------------------------------------------------------------------
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

  // --------------------------------------------------------------------------
  // GEMINI AI HELPER FUNCTION (Calls Real Gemini API or Smart Fallback)
  // --------------------------------------------------------------------------
async function callGeminiAI(promptText, rawUserQuestion = "") {
    const activeKey = (geminiKey || envGeminiKey || "").trim();

    // 1. If a Gemini API Key is provided, try the current Gemini models in order
    if (activeKey) {
      const modelsToTry = [
        "gemini-3.8-flash",
        "gemini-3.5-flash-lite",
        "gemini-2.5-flash",
      ];

      for (const modelName of modelsToTry) {
        try {
          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${activeKey}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [{ role: "user", parts: [{ text: promptText }] }],
              }),
            }
          );

          const data = await response.json();
          if (response.ok) {
            const reply = data?.candidates?.[0]?.content?.parts
              ?.map((p) => p.text || "")
              .join("\n")
              .trim();
            if (reply) return reply;
          } else {
            console.warn(`Model ${modelName} returned:`, data?.error?.message);
          }
        } catch (err) {
          console.error(`Request error on ${modelName}:`, err);
        }
      }
    }

    // 2. Smart Local Q&A Assistant (Answers real questions using live app data)
    if (!rawUserQuestion) return null;
    const q = rawUserQuestion.toLowerCase();
    const freeTotal = currentUser?.days_off_total ?? 22;
    const freeUsed = currentUser?.days_off_used ?? 0;
    const freeLeft = Math.max(0, freeTotal - freeUsed);
    const sickUsed = currentUser?.sick_days_used ?? 0;

    // Questions about holidays
    if (q.includes("holiday") || q.includes("feriado") || q.includes("christmas") || q.includes("easter")) {
      const holList = Object.entries(holidays)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([d, name]) => `• ${d}: ${name}`)
        .join("\n");
      return `🎉 **2026 Public Holidays Calendar:**\n${holList}`;
    }

    // Questions about rules, guidelines, or policies
    if (q.includes("rule") || q.includes("policy") || q.includes("guideline") || q.includes("norma")) {
      return `📖 **Current Organization Rules:**\n${markdownRules}`;
    }

    // Questions about today's or selected date's schedule/tasks
    if (q.includes("task") || q.includes("schedule") || q.includes("today") || q.includes("working on") || q.includes("slot")) {
      const myTasksToday = ALL_SLOTS.map((s) => {
        const t = tasks[`${selectedDate}_${s.id}_${currentUser?.id}`];
        return t ? `• ${s.label}: **${t.title}** (${categories[t.category]?.label || t.category})` : null;
      }).filter(Boolean);

      return myTasksToday.length > 0
        ? `📅 **Your Tasks on ${selectedDate}:**\n${myTasksToday.join("\n")}`
        : `📅 You have no tasks scheduled yet on **${selectedDate}**. Click any Morning or Afternoon slot on the Daily or Weekly grid to assign one!`;
    }

    // Questions about team members or roles
    if (q.includes("member") || q.includes("team") || q.includes("who") || q.includes("admin") || q.includes("moderator")) {
      const roster = members.map((m) => `• ${m.name} (${m.role} — ${m.dept || "General"})`).join("\n");
      return `👥 **Active Team Roster (${members.length} members):**\n${roster}`;
    }

    // Questions about exporting CSV or monthly reports
    if (q.includes("export") || q.includes("csv") || q.includes("excel") || q.includes("report") || q.includes("download")) {
      return `📊 **How to Export & Generate Reports:**\n1. **Weekly CSV (with Free Days):** Go to the **Weekly Schedule** tab and click **Export Weekly CSV**.\n2. **Monthly AI Evaluation:** Go to the **AI Monthly Report** tab, select the month and member, and click **Generate AI Monthly Evaluation**.`;
    }

    // Questions about leave, vacation, sick days, or days off
    if (q.includes("free") || q.includes("leave") || q.includes("vacation") || q.includes("sick") || q.includes("day off")) {
      return `🌴 **Your Leave & Absence Summary:**\n• Free Days Left: **${freeLeft} days** (${freeUsed} used out of ${freeTotal})\n• Sick Days Logged: **${sickUsed} days**\nTo request a day off or log a sick day, click **+ Day Off / Sick** in the top bar.`;
    }

    // General help overview (and reminder to add Gemini API key for open-ended AI questions)
    return (
      `🤖 **Sync8 Assistant — Here is what you can ask me with \`/help\`:**\n` +
      `• \`/help what are my tasks today?\` — Lists your scheduled slots for ${selectedDate}\n` +
      `• \`/help public holidays\` — Lists all 2026 public holidays\n` +
      `• \`/help team members\` — Shows the team roster and roles\n` +
      `• \`/help rules\` — Displays the organization's Markdown guidelines\n` +
      `• \`/help how to export csv\` — Instructions for Weekly CSV & Monthly Reports\n\n` +
      `*(Tip: To unlock open-ended AI answers powered by Google Gemini, paste a free Gemini API key from aistudio.google.com into the **Admin & Leave** tab at the bottom!)*`
    );
  }

  // --------------------------------------------------------------------------
  // LEAVE MANAGEMENT (Request, Approve/Reject, Admin Add/Remove Free Days)
  // --------------------------------------------------------------------------
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

    if (supabase) {
      await supabase.from("leave_requests").upsert(newReq);
    }
  };

  const handleReviewLeave = async (reqId, newStatus) => {
    if (currentUser?.role !== "Admin" && currentUser?.role !== "Moderator") return;
    const targetReq = leaveRequests.find((r) => r.id === reqId);
    if (!targetReq || targetReq.status === newStatus) return;

    setLeaveRequests((prev) =>
      prev.map((r) => (r.id === reqId ? { ...r, status: newStatus } : r))
    );

    if (newStatus === "approved") {
      setMembers((prev) =>
        prev.map((m) => {
          if (m.id !== targetReq.member_id) return m;
          const updated = {
            ...m,
            days_off_used:
              targetReq.leave_type === "day_off"
                ? (m.days_off_used || 0) + 1
                : m.days_off_used || 0,
            sick_days_used:
              targetReq.leave_type === "sick_day"
                ? (m.sick_days_used || 0) + 1
                : m.sick_days_used || 0,
          };
          if (supabase) {
            supabase
              .from("profiles")
              .update({
                days_off_used: updated.days_off_used,
                sick_days_used: updated.sick_days_used,
              })
              .eq("id", m.id);
          }
          return updated;
        })
      );
    }

    if (supabase) {
      await supabase.from("leave_requests").update({ status: newStatus }).eq("id", reqId);
    }
  };

  // Admin can directly add or remove a member's total free days, used free days, or sick days
  const handleAdjustMemberDays = async (memberId, field, delta) => {
    if (currentUser?.role !== "Admin" && currentUser?.role !== "Moderator") return;
    setMembers((prev) =>
      prev.map((m) => {
        if (m.id !== memberId) return m;
        const nextVal = Math.max(0, (m[field] || 0) + delta);
        const updated = { ...m, [field]: nextVal };
        if (supabase) {
          supabase
            .from("profiles")
            .update({ [field]: nextVal })
            .eq("id", memberId);
        }
        return updated;
      })
    );
  };

  // --------------------------------------------------------------------------
  // TASK CREATION, RECURRING DAYS & COMMENTS
  // --------------------------------------------------------------------------
  const handleOpenCell = (dateKey, slotId, memberId) => {
    const key = `${dateKey}_${slotId}_${memberId}`;
    const existing = tasks[key];
    setSelectedCell({ dateKey, slotId, memberId });
    setFormTitle(existing ? existing.title : "");
    setFormCategory(existing ? existing.category : Object.keys(categories)[0]);
    setFormNotes(existing ? existing.notes : "");
    setIsRecurring(false);
    setRecurringDaysCount(5);
    setCommentInput("");
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

      const tObj = {
        id: taskId,
        title: formTitle.trim(),
        category: formCategory,
        notes: formNotes.trim(),
        comments: existing ? existing.comments : [],
      };

      updatedTasks[key] = tObj;
      upserts.push({
        id: taskId,
        task_date: dKey,
        slot_id: slotId,
        member_id: memberId,
        title: tObj.title,
        category: tObj.category,
        notes: tObj.notes,
      });
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

  // --------------------------------------------------------------------------
  // CHAT (General & 1-on-1 Direct Messages + Gemini /help Command)
  // --------------------------------------------------------------------------
  const activeChannelId = useMemo(() => {
    if (chatTarget === "general" || !currentUser) return "general";
    return `dm_${[currentUser.id, chatTarget].sort().join("_")}`;
  }, [chatTarget, currentUser]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !currentUser) return;

    const timeNow = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const rawText = chatInput.trim();
    const isDM = chatTarget !== "general";

    const userMsg = {
      id: Date.now(),
      channel: activeChannelId,
      recipientId: isDM ? chatTarget : null,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderRole: currentUser.role,
      text: rawText,
      time: timeNow,
    };

    setMessages((prev) => [...prev, userMsg]);
    setChatInput("");

    if (supabase) {
      await supabase.from("messages").insert({
        channel: userMsg.channel,
        recipient_id: userMsg.recipientId,
        sender_id: userMsg.senderId,
        sender_name: userMsg.senderName,
        sender_role: userMsg.senderRole,
        text: userMsg.text,
        time_label: userMsg.time,
      });
    }

    // Check for /help command
    if (rawText.toLowerCase().startsWith("/help")) {
      const question = rawText.slice(5).trim() || "How do I use this platform?";
      setAiThinking(true);

      const freeDaysLeft =
        (currentUser.days_off_total || 22) - (currentUser.days_off_used || 0);
      const systemContext = `You are the helpful AI assistant inside the Sync8 Team Schedule Platform.
Current User: ${currentUser.name} (${currentUser.role}, Dept: ${currentUser.dept}).
Free Days Left: ${freeDaysLeft} days (Used: ${currentUser.days_off_used || 0} of ${currentUser.days_off_total || 22}, Sick days: ${currentUser.sick_days_used || 0}).
Task Categories available: ${Object.values(categories).map((c) => c.label).join(", ")}.
Organization Rules: ${markdownRules}
Answer the user's question concisely and helpfully in 2-4 sentences: "${question}"`;

      const geminiReply = await callGeminiAI(systemContext, question);
      const replyText =
        geminiReply ||
        `🤖 Gemini Assistant: For "${question}" — You currently have ${freeDaysLeft} free days left (${currentUser.days_off_used || 0} used of ${currentUser.days_off_total || 22}). You can assign 1-hour tasks under ${Object.values(categories).map((c) => c.label).join(", ")}, export your Weekly CSV with leave balances in the Weekly tab, or check team rules in the Rules tab.`;

      const botMsg = {
        id: Date.now() + 1,
        channel: activeChannelId,
        recipientId: isDM ? currentUser.id : null,
        senderId: "gemini_ai",
        senderName: "Gemini AI (/help)",
        senderRole: "AI Assistant",
        text: replyText,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, botMsg]);
      setAiThinking(false);

      if (supabase) {
        await supabase.from("messages").insert({
          channel: botMsg.channel,
          recipient_id: botMsg.recipientId,
          sender_id: botMsg.senderId,
          sender_name: botMsg.senderName,
          sender_role: botMsg.senderRole,
          text: botMsg.text,
          time_label: botMsg.time,
        });
      }
    }
  };

  // --------------------------------------------------------------------------
  // EXPORTS: WEEKLY SCHEDULE CSV (With Free Days Used & Left) & MONTHLY CSV
  // --------------------------------------------------------------------------
  const exportWeeklyScheduleCSV = (memberId) => {
    const member = members.find((m) => m.id === memberId) || currentUser;
    if (!member) return;

    const freeTotal = member.days_off_total ?? 22;
    const freeUsed = member.days_off_used ?? 0;
    const freeLeft = Math.max(0, freeTotal - freeUsed);
    const sickUsed = member.sick_days_used ?? 0;

    let csv = `Member Name,${member.name}\n`;
    csv += `Role & Department,${member.role} - ${member.dept || "General"}\n`;
    csv += `Week Period,${weekDays[0].dateKey} to ${weekDays[6].dateKey}\n`;
    csv += `Free Days Allocated,${freeTotal}\n`;
    csv += `Free Days Used,${freeUsed}\n`;
    csv += `Free Days Left,${freeLeft}\n`;
    csv += `Sick Days Logged,${sickUsed}\n\n`;
    csv += `Date,Day,Period,Time Slot,Category,Task Title,Notes,Leave Status\n`;

    weekDays.forEach((wd) => {
      const leaveOnDay = getMemberLeaveOnDate(member.id, wd.dateKey);
      const holidayName = holidays[wd.dateKey];
      ALL_SLOTS.forEach((slot) => {
        const key = `${wd.dateKey}_${slot.id}_${member.id}`;
        const task = tasks[key];
        const catLabel = task ? categories[task.category]?.label || task.category : "";
        const statusLabel = leaveOnDay
          ? leaveOnDay.leave_type === "day_off"
            ? "APPROVED DAY OFF"
            : "SICK DAY"
          : holidayName
          ? `PUBLIC HOLIDAY (${holidayName})`
          : "Working";

        csv += `${wd.dateKey},${wd.dayName},${slot.period},${slot.label},"${catLabel}","${(
          task?.title || ""
        ).replace(/"/g, '""')}","${(task?.notes || "").replace(/"/g, '""')}","${statusLabel}"\n`;
      });
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Weekly_Schedule_${member.name.replace(/\s+/g, "_")}_${weekDays[0].dateKey}.csv`;
    a.click();
  };

  // --------------------------------------------------------------------------
  // INDIVIDUAL MONTHLY REPORT STATS & AI EVALUATION GENERATOR
  // --------------------------------------------------------------------------
  const monthlyStats = useMemo(() => {
    const targetId = focusedMemberId || currentUser?.id;
    const member = members.find((m) => m.id === targetId) || currentUser;
    const monthPrefix = `2026-${String(selectedMonthIdx + 1).padStart(2, "0")}`;

    let totalHours = 0;
    const byCategory = {};
    const byTaskTitle = {};

    Object.keys(categories).forEach((k) => {
      byCategory[k] = 0;
    });

    Object.entries(tasks).forEach(([key, task]) => {
      const [dateStr, , memId] = key.split("_");
      if (memId === targetId && dateStr.startsWith(monthPrefix)) {
        totalHours += 1;
        byCategory[task.category] = (byCategory[task.category] || 0) + 1;
        const cleanTitle = task.title.trim();
        byTaskTitle[cleanTitle] = {
          hours: (byTaskTitle[cleanTitle]?.hours || 0) + 1,
          category: categories[task.category]?.label || task.category,
        };
      }
    });

    return { member, monthPrefix, totalHours, byCategory, byTaskTitle };
  }, [focusedMemberId, currentUser, selectedMonthIdx, tasks, categories, members]);

  const handleGenerateAIMonthlyReport = async () => {
    const { member, totalHours, byCategory, byTaskTitle } = monthlyStats;
    if (!member) return;
    setGeneratingReport(true);

    const freeTotal = member.days_off_total ?? 22;
    const freeUsed = member.days_off_used ?? 0;
    const freeLeft = Math.max(0, freeTotal - freeUsed);

    const catSummary = Object.entries(byCategory)
      .map(([k, hrs]) => `${categories[k]?.label || k}: ${hrs}h`)
      .join(", ");

    const taskList = Object.entries(byTaskTitle)
      .map(([title, info]) => `- ${title} (${info.category}): ${info.hours} hours`)
      .join("\n");

    const prompt = `Write a professional Monthly Evaluation Report for ${member.name} (${member.role}, ${member.dept}) for ${MONTHS[selectedMonthIdx]} 2026.
Total hours logged: ${totalHours}h.
Hours by category: ${catSummary || "None"}.
Specific tasks performed and hours spent on each:
${taskList || "No specific tasks recorded yet in this month."}
Leave status: ${freeUsed} free days used, ${freeLeft} free days remaining (out of ${freeTotal}), ${member.sick_days_used || 0} sick days.
Provide: 1) Executive Summary, 2) Key Accomplishments & Time Allocation Analysis, 3) Evaluation & Recommendations for next month.`;

    const aiText = await callGeminiAI(prompt);

    if (aiText) {
      setAiMonthlyNarrative(aiText);
    } else {
      setAiMonthlyNarrative(
        `📋 EXECUTIVE MONTHLY EVALUATION — ${member.name.toUpperCase()} (${MONTHS[selectedMonthIdx]} 2026)\n\n` +
          `1. TIME ALLOCATION & PRODUCTIVITY:\n` +
          `${member.name} logged a total of ${totalHours} task hours during ${MONTHS[selectedMonthIdx]} 2026 across ${Object.keys(byTaskTitle).length} distinct activities (${catSummary}).\n\n` +
          `2. TASKS PERFORMED & HOURS SPENT:\n` +
          `${taskList || "• No tasks logged for this month yet. Click any slot on the Daily or Weekly schedule to log hours."}\n\n` +
          `3. ATTENDANCE & LEAVE BALANCE:\n` +
          `• Free Days Allocated: ${freeTotal} days\n` +
          `• Free Days Used: ${freeUsed} days | Free Days Left: ${freeLeft} days\n` +
          `• Sick Days Logged: ${member.sick_days_used || 0} days\n\n` +
          `4. MONTHLY EVALUATION VERDICT:\n` +
          ` Balanced distribution across Personal, Project Management, and Community deliverables. Ready for monthly coordinator sign-off.`
      );
    }
    setGeneratingReport(false);
  };

  // --------------------------------------------------------------------------
  // ADMIN CONTROLS: Custom Categories, Rules, Holidays, Members
  // --------------------------------------------------------------------------
  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCatLabel.trim() || currentUser?.role !== "Admin") return;
    const id = newCatLabel
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "_");
    const pal = COLOR_PALETTES[newCatColor] || COLOR_PALETTES.teal;

    const newCatObj = {
      id,
      label: newCatLabel.trim(),
      color_name: newCatColor,
      ...pal,
    };

    setCategories((prev) => ({ ...prev, [id]: newCatObj }));
    setNewCatLabel("");

    if (supabase) {
      await supabase.from("custom_categories").upsert({
        id,
        label: newCatObj.label,
        color_name: newCatColor,
      });
    }
  };

  const handleSaveMarkdownRules = async () => {
    setIsEditingRules(false);
    if (supabase && currentUser?.role === "Admin") {
      await supabase.from("app_settings").upsert({
        key: "markdown_rules",
        value: markdownRules,
      });
    }
  };

  const handleAddHoliday = async (e) => {
    e.preventDefault();
    if (!newHolidayDate || !newHolidayName.trim() || currentUser?.role !== "Admin") return;
    const updated = { ...holidays, [newHolidayDate]: newHolidayName.trim() };
    setHolidays(updated);
    setNewHolidayName("");
    if (supabase) {
      await supabase.from("app_settings").upsert({
        key: "custom_holidays",
        value: JSON.stringify(updated),
      });
    }
  };

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
      days_off_total: 22,
      days_off_used: 0,
      sick_days_used: 0,
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

  // ==========================================================================
  // RENDER AUTH SCREEN IF NOT LOGGED IN
  // ==========================================================================
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-200 flex items-center justify-center text-sm">
        Loading Sync8 Operations Platform...
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-xl text-white shadow-lg">
              S8
            </div>
            <div>
              <h1 className="font-bold text-lg">Sync8 Annual Platform</h1>
              <p className="text-xs text-slate-400">
                Team Schedule, Leave Management & AI Evaluation
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setAuthMode("login");
                setAuthError("");
              }}
              className={`py-2 rounded-lg transition ${
                authMode === "login" ? "bg-indigo-600 text-white" : "text-slate-400"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode("signup");
                setAuthError("");
              }}
              className={`py-2 rounded-lg transition ${
                authMode === "signup" ? "bg-indigo-600 text-white" : "text-slate-400"
              }`}
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
                  <input
                    type="text"
                    required
                    value={authName}
                    onChange={(e) => setAuthName(e.target.value)}
                    placeholder="e.g. Gabriel Manea"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Department</label>
                  <input
                    type="text"
                    required
                    value={authDept}
                    onChange={(e) => setAuthDept(e.target.value)}
                    placeholder="e.g. Management"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white"
                  />
                </div>
              </>
            )}
            <div>
              <label className="text-slate-400 block mb-1">Email Address</label>
              <input
                type="email"
                required
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                placeholder="you@organization.org"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white"
              />
            </div>
            <button
              type="submit"
              disabled={authSubmitting}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 rounded-xl shadow-lg transition"
            >
              {authSubmitting
                ? "Please wait..."
                : authMode === "signup"
                ? "Create Account"
                : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const currentUserFreeLeft = Math.max(
    0,
    (currentUser?.days_off_total ?? 22) - (currentUser?.days_off_used ?? 0)
  );

  // ==========================================================================
  // RENDER AUTHENTICATED PLATFORM
  // ==========================================================================
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* TOP NAVIGATION HEADER */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur px-6 py-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-lg shadow-lg shadow-indigo-600/30">
            S8
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-lg tracking-tight">Sync8 Platform</h1>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-medium flex items-center gap-1 ${
                  dbStatus === "Supabase Live"
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                    : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                }`}
              >
                <Database className="w-3 h-3" /> {dbStatus}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {members.length} Active Members • Free Days Left: <strong>{currentUserFreeLeft}d</strong>
            </p>
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <div className="flex flex-wrap items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700">
          {[
            { id: "daily", label: "Daily Schedule", icon: Clock },
            { id: "weekly", label: "Weekly Schedule", icon: Calendar },
            { id: "annual", label: "Annual & Holidays", icon: Palmtree },
            { id: "individual", label: "AI Monthly Report", icon: Sparkles },
            { id: "rules", label: "Rules & Docs", icon: BookOpen },
            { id: "admin", label: "Admin & Leave", icon: Shield },
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
                <Icon className="w-3.5 h-3.5" /> {tab.label}
              </button>
            );
          })}
        </div>

        {/* LEAVE REQUEST BUTTON & USER BADGE */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              setLeaveDate(selectedDate);
              setShowLeaveModal(true);
            }}
            className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <Palmtree className="w-3.5 h-3.5" /> + Day Off / Sick
          </button>

          <div className="bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700 text-xs flex items-center gap-2">
            <span className="w-6 h-6 rounded-md bg-indigo-600 text-white font-bold flex items-center justify-center text-[11px]">
              {currentUser?.avatar || "U"}
            </span>
            <div>
              <span className="font-semibold text-white">{currentUser?.name}</span>
              <span className="ml-2 px-1.5 py-0.5 rounded bg-slate-700 text-indigo-300 text-[10px] font-semibold">
                {currentUser?.role}
              </span>
            </div>
          </div>

          <button
            onClick={handleSignOut}
            title="Sign Out"
            className="bg-slate-800 hover:bg-rose-600/25 hover:text-rose-300 border border-slate-700 p-2 rounded-xl text-xs transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* DATE BAR, HOLIDAY ALERT & DYNAMIC CATEGORY LEGEND */}
      <div className="bg-slate-900/50 border-b border-slate-800 px-6 py-2.5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-xs text-slate-400 font-medium">Selected Date:</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1 text-xs text-white"
          />
          {holidays[selectedDate] && (
            <span className="bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1">
              🎉 Public Holiday: {holidays[selectedDate]}
            </span>
          )}
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

      {/* MAIN WORKSPACE + CHAT MESSENGER */}
      <div className="flex-1 flex overflow-hidden">
        <main className="flex-1 overflow-auto p-6">
          {/* ================================================================
              TAB 1: DAILY SCHEDULE (Morning & Afternoon Slots + Leave Badges)
             ================================================================ */}
          {activeTab === "daily" && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/60 text-xs text-slate-400">
                      <th className="p-3 sticky left-0 bg-slate-950 z-10 min-w-[220px]">
                        Member & Free Days Balance
                      </th>
                      {MORNING_SLOTS.map((slot) => (
                        <th key={slot.id} className="p-3 border-l border-slate-800 min-w-[135px]">
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
                        <th key={slot.id} className="p-3 border-l border-slate-800 min-w-[135px]">
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
                      const freeTotal = member.days_off_total ?? 22;
                      const freeUsed = member.days_off_used ?? 0;
                      const freeLeft = Math.max(0, freeTotal - freeUsed);
                      const sickUsed = member.sick_days_used ?? 0;
                      const approvedLeave = getMemberLeaveOnDate(member.id, selectedDate);

                      return (
                        <tr key={member.id} className="hover:bg-slate-800/20">
                          <td className="p-3 sticky left-0 bg-slate-900 z-10 border-r border-slate-800">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-indigo-400">
                                {member.avatar}
                              </div>
                              <div>
                                <div className="font-semibold text-slate-100">{member.name}</div>
                                <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 font-semibold">
                                    {freeLeft}d left
                                  </span>
                                  <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                                    {freeUsed}d used
                                  </span>
                                  {sickUsed > 0 && (
                                    <span className="px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-300">
                                      {sickUsed}d sick
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          {approvedLeave ? (
                            <td
                              colSpan={9}
                              className="p-3 border-l border-slate-800 text-center font-semibold"
                            >
                              <div
                                className={`py-3 rounded-xl border ${
                                  approvedLeave.leave_type === "day_off"
                                    ? "bg-amber-500/15 border-amber-500/40 text-amber-300"
                                    : "bg-rose-500/15 border-rose-500/40 text-rose-300"
                                }`}
                              >
                                {approvedLeave.leave_type === "day_off"
                                  ? `🌴 Approved Day Off (${approvedLeave.reason || "Vacation"})`
                                  : `🤒 Logged Sick Day (${approvedLeave.reason || "Medical Leave"})`}
                              </div>
                            </td>
                          ) : (
                            <>
                              {MORNING_SLOTS.map((slot) => {
                                const key = `${selectedDate}_${slot.id}_${member.id}`;
                                const task = tasks[key];
                                const cat = task
                                  ? categories[task.category] || DEFAULT_CATEGORIES.other
                                  : null;
                                return (
                                  <td
                                    key={slot.id}
                                    onClick={() => handleOpenCell(selectedDate, slot.id, member.id)}
                                    className="p-1.5 border-l border-slate-800/70 cursor-pointer align-top h-20"
                                  >
                                    {task ? (
                                      <div
                                        className={`h-full p-2 rounded-lg border-l-4 ${cat.bg} ${cat.border} flex flex-col justify-between`}
                                      >
                                        <div>
                                          <span
                                            className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${cat.badge}`}
                                          >
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
                                      <div className="h-full rounded-lg border border-dashed border-slate-800 hover:border-slate-600 flex items-center justify-center text-slate-600">
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
                                const cat = task
                                  ? categories[task.category] || DEFAULT_CATEGORIES.other
                                  : null;
                                return (
                                  <td
                                    key={slot.id}
                                    onClick={() => handleOpenCell(selectedDate, slot.id, member.id)}
                                    className="p-1.5 border-l border-slate-800/70 cursor-pointer align-top h-20"
                                  >
                                    {task ? (
                                      <div
                                        className={`h-full p-2 rounded-lg border-l-4 ${cat.bg} ${cat.border} flex flex-col justify-between`}
                                      >
                                        <div>
                                          <span
                                            className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${cat.badge}`}
                                          >
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
                                      <div className="h-full rounded-lg border border-dashed border-slate-800 hover:border-slate-600 flex items-center justify-center text-slate-600">
                                        <Plus className="w-4 h-4" />
                                      </div>
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

          {/* ================================================================
              TAB 2: WEEKLY SCHEDULE (7-Day Timetable Grid + Weekly CSV Export)
             ================================================================ */}
          {activeTab === "weekly" && (
            <div className="space-y-5">
              {(() => {
                const targetId = focusedMemberId || currentUser?.id;
                const member = members.find((m) => m.id === targetId) || currentUser;
                const freeTotal = member?.days_off_total ?? 22;
                const freeUsed = member?.days_off_used ?? 0;
                const freeLeft = Math.max(0, freeTotal - freeUsed);
                const sickUsed = member?.sick_days_used ?? 0;

                return (
                  <>
                    <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <h2 className="font-bold text-base">
                          Weekly Schedule ({weekDays[0].dateKey} — {weekDays[6].dateKey})
                        </h2>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1">
                          <span className="text-emerald-300 font-semibold">
                            Free Days Left: {freeLeft}d
                          </span>
                          <span>•</span>
                          <span className="text-amber-300 font-semibold">
                            Free Days Used: {freeUsed}d (of {freeTotal}d)
                          </span>
                          <span>•</span>
                          <span className="text-rose-300 font-semibold">
                            Sick Days: {sickUsed}d
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <select
                          value={targetId}
                          onChange={(e) => setFocusedMemberId(e.target.value)}
                          className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-white"
                        >
                          {members.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name} ({m.role})
                            </option>
                          ))}
                        </select>

                        <button
                          onClick={() => exportWeeklyScheduleCSV(targetId)}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow"
                        >
                          <Download className="w-3.5 h-3.5" /> Export Weekly CSV (with Free Days)
                        </button>
                      </div>
                    </div>

                    {/* 7-Day Monday-Sunday Grid */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-left text-xs">
                          <thead>
                            <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400">
                              <th className="p-3 sticky left-0 bg-slate-950 z-10 min-w-[140px]">
                                Time Slot
                              </th>
                              {weekDays.map((wd) => {
                                const hol = holidays[wd.dateKey];
                                const lv = getMemberLeaveOnDate(targetId, wd.dateKey);
                                return (
                                  <th
                                    key={wd.dateKey}
                                    className="p-3 border-l border-slate-800 min-w-[145px]"
                                  >
                                    <div className="font-bold text-white">
                                      {wd.dayName} ({wd.dateKey.slice(5)})
                                    </div>
                                    {hol && (
                                      <div className="text-[10px] text-amber-400 font-semibold mt-0.5">
                                        🎉 {hol}
                                      </div>
                                    )}
                                    {lv && (
                                      <div className="text-[10px] text-rose-400 font-semibold mt-0.5">
                                        {lv.leave_type === "day_off" ? "🌴 Day Off" : "🤒 Sick Day"}
                                      </div>
                                    )}
                                  </th>
                                );
                              })}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/70">
                            {ALL_SLOTS.map((slot) => (
                              <tr key={slot.id} className="hover:bg-slate-800/20">
                                <td className="p-3 sticky left-0 bg-slate-900 z-10 border-r border-slate-800">
                                  <div className="text-[10px] font-bold text-indigo-400">
                                    {slot.period}
                                  </div>
                                  <div className="font-mono text-slate-200">{slot.label}</div>
                                </td>
                                {weekDays.map((wd) => {
                                  const key = `${wd.dateKey}_${slot.id}_${targetId}`;
                                  const task = tasks[key];
                                  const cat = task
                                    ? categories[task.category] || DEFAULT_CATEGORIES.other
                                    : null;
                                  return (
                                    <td
                                      key={wd.dateKey}
                                      onClick={() => handleOpenCell(wd.dateKey, slot.id, targetId)}
                                      className="p-1.5 border-l border-slate-800/70 cursor-pointer align-top h-16"
                                    >
                                      {task ? (
                                        <div
                                          className={`h-full p-2 rounded-lg border-l-4 ${cat.bg} ${cat.border}`}
                                        >
                                          <span
                                            className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${cat.badge}`}
                                          >
                                            {cat.label}
                                          </span>
                                          <div className="font-semibold text-white mt-1 line-clamp-1">
                                            {task.title}
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="h-full rounded-lg border border-dashed border-slate-800 hover:border-slate-600 flex items-center justify-center text-slate-600">
                                          <Plus className="w-3.5 h-3.5" />
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
                  </>
                );
              })()}
            </div>
          )}

          {/* ================================================================
              TAB 3: 12-MONTH ANNUAL CALENDAR & PUBLIC HOLIDAYS
             ================================================================ */}
          {activeTab === "annual" && (
            <div className="space-y-6">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="font-bold text-base">2026 Annual Calendar & Public Holidays</h2>
                  <p className="text-xs text-slate-400">
                    Click any day to open its Daily Schedule. Highlighted amber dates indicate official Public Holidays.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  {Object.entries(holidays)
                    .slice(0, 6)
                    .map(([d, name]) => (
                      <span
                        key={d}
                        onClick={() => {
                          setSelectedDate(d);
                          setActiveTab("daily");
                        }}
                        className="cursor-pointer bg-amber-500/15 border border-amber-500/30 text-amber-300 px-2.5 py-1 rounded-lg"
                      >
                        <strong>{d.slice(5)}:</strong> {name}
                      </span>
                    ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {MONTHS.map((monthName, monthIndex) => {
                  const daysInMonth = new Date(2026, monthIndex + 1, 0).getDate();
                  return (
                    <div
                      key={monthName}
                      className="bg-slate-900 border border-slate-800 rounded-2xl p-4"
                    >
                      <h3 className="font-bold text-sm text-indigo-400 mb-3">
                        {monthName} 2026
                      </h3>
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
                              onClick={() => {
                                setSelectedDate(dateStr);
                                setActiveTab("daily");
                              }}
                              className={`py-1.5 rounded-lg font-medium transition ${
                                isSelected
                                  ? "bg-indigo-600 text-white font-bold"
                                  : holidayName
                                  ? "bg-amber-500/25 border border-amber-500/50 text-amber-300 font-bold"
                                  : "hover:bg-slate-800 text-slate-300"
                              }`}
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

          {/* ================================================================
              TAB 4: INDIVIDUAL AI MONTHLY REPORT (Tasks Performed & Hours Spent)
             ================================================================ */}
          {activeTab === "individual" && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="font-bold text-base flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-400" /> Individual Monthly Evaluation & Task Hours Report
                  </h2>
                  <p className="text-xs text-slate-400">
                    Detailed breakdown of every task performed, hours spent per task/category, and AI evaluation.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={selectedMonthIdx}
                    onChange={(e) => setSelectedMonthIdx(Number(e.target.value))}
                    className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-white"
                  >
                    {MONTHS.map((m, idx) => (
                      <option key={m} value={idx}>
                        {m} 2026
                      </option>
                    ))}
                  </select>

                  <select
                    value={focusedMemberId || currentUser?.id}
                    onChange={(e) => setFocusedMemberId(e.target.value)}
                    className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-white"
                  >
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.role})
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={handleGenerateAIMonthlyReport}
                    disabled={generatingReport}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    {generatingReport ? "Analyzing with AI..." : "Generate AI Monthly Evaluation"}
                  </button>
                </div>
              </div>

              {/* Hours by Category & Leave Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
                  <div className="text-slate-400">Total Monthly Hours</div>
                  <div className="text-2xl font-bold text-white mt-1">
                    {monthlyStats.totalHours}h
                  </div>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
                  <div className="text-slate-400">Free Days Left</div>
                  <div className="text-2xl font-bold text-emerald-400 mt-1">
                    {Math.max(
                      0,
                      (monthlyStats.member?.days_off_total ?? 22) -
                        (monthlyStats.member?.days_off_used ?? 0)
                    )}
                    d
                  </div>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
                  <div className="text-slate-400">Free Days Used</div>
                  <div className="text-2xl font-bold text-amber-400 mt-1">
                    {monthlyStats.member?.days_off_used ?? 0}d
                  </div>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
                  <div className="text-slate-400">Sick Days Logged</div>
                  <div className="text-2xl font-bold text-rose-400 mt-1">
                    {monthlyStats.member?.sick_days_used ?? 0}d
                  </div>
                </div>
              </div>

              {/* Tasks Performed & Hours Spent Table */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
                <h3 className="font-bold text-sm text-indigo-400">
                  Tasks Performed & Hours Spent ({MONTHS[selectedMonthIdx]} 2026)
                </h3>
                {Object.keys(monthlyStats.byTaskTitle).length === 0 ? (
                  <p className="text-xs text-slate-400">
                    No tasks logged for {monthlyStats.member?.name} in {MONTHS[selectedMonthIdx]} 2026 yet.
                  </p>
                ) : (
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400">
                        <th className="py-2">Task Performed</th>
                        <th className="py-2">Category</th>
                        <th className="py-2 text-right">Hours Spent</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {Object.entries(monthlyStats.byTaskTitle).map(([title, info]) => (
                        <tr key={title}>
                          <td className="py-2.5 font-semibold text-white">{title}</td>
                          <td className="py-2.5 text-slate-300">{info.category}</td>
                          <td className="py-2.5 text-right font-mono font-bold text-emerald-400">
                            {info.hours}h
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* AI Narrative Output */}
              {aiMonthlyNarrative && (
                <div className="bg-slate-900 border border-indigo-500/40 rounded-2xl p-6 font-mono text-xs text-slate-200 whitespace-pre-line leading-relaxed shadow-xl">
                  {aiMonthlyNarrative}
                </div>
              )}
            </div>
          )}

          {/* ================================================================
              TAB 5: MARKDOWN RULES & CONTENT HUB
             ================================================================ */}
          {activeTab === "rules" && (
            <div className="max-w-4xl mx-auto space-y-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-base flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-amber-400" /> Organization Rules & Guidelines (Markdown)
                  </h2>
                  <p className="text-xs text-slate-400">
                    Official internal documentation and operational standards.
                  </p>
                </div>
                {currentUser?.role === "Admin" && (
                  <button
                    onClick={() =>
                      isEditingRules ? handleSaveMarkdownRules() : setIsEditingRules(true)
                    }
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5"
                  >
                    {isEditingRules ? (
                      <>
                        <Save className="w-3.5 h-3.5" /> Save Markdown Rules
                      </>
                    ) : (
                      <>
                        <Edit3 className="w-3.5 h-3.5" /> Edit Markdown
                      </>
                    )}
                  </button>
                )}
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                {isEditingRules ? (
                  <textarea
                    rows={14}
                    value={markdownRules}
                    onChange={(e) => setMarkdownRules(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs text-slate-100 font-mono"
                  />
                ) : (
                  <SimpleMarkdownView content={markdownRules} />
                )}
              </div>
            </div>
          )}

          {/* ================================================================
              TAB 6: ADMIN & MODERATOR MANAGEMENT HUB
             ================================================================ */}
          {activeTab === "admin" && (
            <div className="max-w-5xl mx-auto space-y-6">
              {/* 1. Leave Approval Queue (Admins & Moderators) */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                <h2 className="font-bold text-base text-amber-400 flex items-center gap-2">
                  <Palmtree className="w-4 h-4" /> Days Off & Sick Days Approval Queue
                </h2>
                {leaveRequests.length === 0 ? (
                  <p className="text-xs text-slate-400">No leave or sick day requests submitted yet.</p>
                ) : (
                  <div className="space-y-2 text-xs">
                    {leaveRequests.map((req) => (
                      <div
                        key={req.id}
                        className="bg-slate-950 border border-slate-800 p-3 rounded-xl flex flex-wrap items-center justify-between gap-3"
                      >
                        <div>
                          <span className="font-bold text-white">{req.member_name}</span>
                          <span className="ml-2 px-2 py-0.5 rounded bg-slate-800 text-indigo-300 font-semibold">
                            {req.leave_type === "day_off" ? "🌴 Day Off" : "🤒 Sick Day"}
                          </span>
                          <span className="ml-2 text-slate-400">
                            Date: <strong>{req.leave_date}</strong> • {req.reason || "No notes"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2.5 py-0.5 rounded-full font-semibold ${
                              req.status === "approved"
                                ? "bg-emerald-500/20 text-emerald-300"
                                : req.status === "rejected"
                                ? "bg-rose-500/20 text-rose-300"
                                : "bg-amber-500/20 text-amber-300"
                            }`}
                          >
                            {req.status}
                          </span>
                          {(currentUser?.role === "Admin" || currentUser?.role === "Moderator") &&
                            req.status === "pending" && (
                              <>
                                <button
                                  onClick={() => handleReviewLeave(req.id, "approved")}
                                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1 rounded-lg font-semibold"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleReviewLeave(req.id, "rejected")}
                                  className="bg-rose-600 hover:bg-rose-500 text-white px-2.5 py-1 rounded-lg font-semibold"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 2. Member Directory & Free Days Quota Adjuster (+/-) */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                <h3 className="font-bold text-sm text-indigo-400">
                  Team Members, Roles & Free Days Management (Add / Remove Days)
                </h3>

                {currentUser?.role === "Admin" && (
                  <form
                    onSubmit={handleAddMember}
                    className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex flex-wrap gap-2 items-end text-xs"
                  >
                    <input
                      type="text"
                      required
                      value={newMemberName}
                      onChange={(e) => setNewMemberName(e.target.value)}
                      placeholder="Member Name"
                      className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white flex-1"
                    />
                    <input
                      type="email"
                      value={newMemberEmail}
                      onChange={(e) => setNewMemberEmail(e.target.value)}
                      placeholder="Email (optional)"
                      className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white flex-1"
                    />
                    <select
                      value={newMemberRole}
                      onChange={(e) => setNewMemberRole(e.target.value)}
                      className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                    >
                      <option value="Member">Member</option>
                      <option value="Moderator">Moderator</option>
                      <option value="Admin">Admin</option>
                    </select>
                    <button
                      type="submit"
                      className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-semibold"
                    >
                      + Add Member
                    </button>
                  </form>
                )}

                <div className="divide-y divide-slate-800 text-xs">
                  {members.map((m) => {
                    const freeTotal = m.days_off_total ?? 22;
                    const freeUsed = m.days_off_used ?? 0;
                    const freeLeft = Math.max(0, freeTotal - freeUsed);
                    const sickUsed = m.sick_days_used ?? 0;
                    const canManage =
                      currentUser?.role === "Admin" || currentUser?.role === "Moderator";

                    return (
                      <div
                        key={m.id}
                        className="py-3 flex flex-wrap items-center justify-between gap-4"
                      >
                        <div>
                          <div className="font-bold text-white">{m.name}</div>
                          <div className="text-slate-400">
                            {m.role} • {m.dept} •{" "}
                            <span className="text-emerald-400 font-semibold">
                              {freeLeft} Free Days Left
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                          {/* Total Free Days +/- */}
                          <div className="bg-slate-950 border border-slate-800 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                            <span className="text-slate-400">Total Quota:</span>
                            <strong className="text-white">{freeTotal}d</strong>
                            {canManage && (
                              <>
                                <button
                                  onClick={() =>
                                    handleAdjustMemberDays(m.id, "days_off_total", -1)
                                  }
                                  className="px-1.5 bg-slate-800 hover:bg-slate-700 rounded"
                                >
                                  -
                                </button>
                                <button
                                  onClick={() =>
                                    handleAdjustMemberDays(m.id, "days_off_total", 1)
                                  }
                                  className="px-1.5 bg-slate-800 hover:bg-slate-700 rounded"
                                >
                                  +
                                </button>
                              </>
                            )}
                          </div>

                          {/* Used Free Days +/- */}
                          <div className="bg-slate-950 border border-slate-800 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                            <span className="text-slate-400">Used:</span>
                            <strong className="text-amber-400">{freeUsed}d</strong>
                            {canManage && (
                              <>
                                <button
                                  onClick={() =>
                                    handleAdjustMemberDays(m.id, "days_off_used", -1)
                                  }
                                  className="px-1.5 bg-slate-800 hover:bg-slate-700 rounded"
                                >
                                  -
                                </button>
                                <button
                                  onClick={() =>
                                    handleAdjustMemberDays(m.id, "days_off_used", 1)
                                  }
                                  className="px-1.5 bg-slate-800 hover:bg-slate-700 rounded"
                                >
                                  +
                                </button>
                              </>
                            )}
                          </div>

                          {/* Sick Days +/- */}
                          <div className="bg-slate-950 border border-slate-800 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                            <span className="text-slate-400">Sick:</span>
                            <strong className="text-rose-400">{sickUsed}d</strong>
                            {canManage && (
                              <>
                                <button
                                  onClick={() =>
                                    handleAdjustMemberDays(m.id, "sick_days_used", -1)
                                  }
                                  className="px-1.5 bg-slate-800 hover:bg-slate-700 rounded"
                                >
                                  -
                                </button>
                                <button
                                  onClick={() =>
                                    handleAdjustMemberDays(m.id, "sick_days_used", 1)
                                  }
                                  className="px-1.5 bg-slate-800 hover:bg-slate-700 rounded"
                                >
                                  +
                                </button>
                              </>
                            )}
                          </div>

                          {currentUser?.role === "Admin" && (
                            <select
                              value={m.role}
                              onChange={(e) => handleChangeMemberRole(m.id, e.target.value)}
                              className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-white"
                            >
                              <option value="Member">Member</option>
                              <option value="Moderator">Moderator</option>
                              <option value="Admin">Admin</option>
                            </select>
                          )}

                          {currentUser?.role === "Admin" && m.id !== currentUser.id && (
                            <button
                              onClick={() => handleRemoveMember(m.id)}
                              className="text-rose-400 hover:text-rose-300"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 3. Admin Custom Task Category Creator & Public Holiday Creator */}
              {currentUser?.role === "Admin" && (
                <div className="grid md:grid-cols-2 gap-6">
                  <form
                    onSubmit={handleAddCategory}
                    className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 text-xs"
                  >
                    <h3 className="font-bold text-sm text-indigo-400">
                      Create Custom Task Category
                    </h3>
                    <input
                      type="text"
                      required
                      value={newCatLabel}
                      onChange={(e) => setNewCatLabel(e.target.value)}
                      placeholder="Category Name (e.g. Grant Writing)"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                    />
                    <select
                      value={newCatColor}
                      onChange={(e) => setNewCatColor(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                    >
                      {Object.keys(COLOR_PALETTES).map((c) => (
                        <option key={c} value={c}>
                          Color: {c.toUpperCase()}
                        </option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl font-semibold"
                    >
                      + Save Category
                    </button>
                  </form>

                  <form
                    onSubmit={handleAddHoliday}
                    className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 text-xs"
                  >
                    <h3 className="font-bold text-sm text-amber-400">
                      Add Public or Municipal Holiday
                    </h3>
                    <input
                      type="date"
                      required
                      value={newHolidayDate}
                      onChange={(e) => setNewHolidayDate(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                    />
                    <input
                      type="text"
                      required
                      value={newHolidayName}
                      onChange={(e) => setNewHolidayName(e.target.value)}
                      placeholder="Holiday Name (e.g. Municipal Holiday)"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                    />
                    <button
                      type="submit"
                      className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-xl font-semibold"
                    >
                      + Add Holiday to Annual Calendar
                    </button>
                  </form>
                </div>
              )}

              {/* 4. Optional Gemini API Key Input */}
              {currentUser?.role === "Admin" && (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2 text-xs">
                  <h3 className="font-bold text-sm text-emerald-400">
                    Gemini AI Connection Key (For /help Chat & Monthly AI Reports)
                  </h3>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      value={geminiKey}
                      onChange={(e) => {
                        setGeminiKey(e.target.value);
                        localStorage.setItem("sync8_gemini_key", e.target.value);
                      }}
                      placeholder="Paste VITE_GEMINI_API_KEY (or set in .env.local)"
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </main>

        {/* ==================================================================
            RIGHT SIDEBAR: CHAT (Only #general-team & 1-on-1 Member DMs + /help)
           ================================================================== */}
        <aside className="w-80 border-l border-slate-800 bg-slate-900/70 flex flex-col">
          <div className="p-3 border-b border-slate-800 flex items-center justify-between gap-2">
            <span className="text-xs font-bold flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-indigo-400" /> Team Chat
            </span>
            <select
              value={chatTarget}
              onChange={(e) => setChatTarget(e.target.value)}
              className="bg-slate-800 text-xs rounded-lg px-2 py-1 border border-slate-700 text-white"
            >
              <option value="general">#general-team (All Members)</option>
              {members
                .filter((m) => m.id !== currentUser?.id)
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    DM: {m.name}
                  </option>
                ))}
            </select>
          </div>

          <div className="p-2 bg-indigo-950/40 text-[11px] text-indigo-300 border-b border-slate-800 flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5 shrink-0" />
            <span>
              Type <code className="bg-indigo-900 px-1 py-0.5 rounded text-white">/help [question]</code> for Gemini AI.
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages
              .filter((m) => m.channel === activeChannelId)
              .map((msg) => (
                <div
                  key={msg.id}
                  className={`border rounded-xl p-2.5 text-xs ${
                    msg.senderId === "gemini_ai"
                      ? "bg-indigo-950/50 border-indigo-500/40"
                      : "bg-slate-950/80 border-slate-800"
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                    <span className="font-semibold text-indigo-300">{msg.senderName}</span>
                    <span>{msg.time}</span>
                  </div>
                  <p className="text-slate-200 whitespace-pre-line">{msg.text}</p>
                </div>
              ))}
            {aiThinking && (
              <div className="text-xs text-indigo-400 italic px-2">
                Gemini AI is thinking...
              </div>
            )}
          </div>

          <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-800 flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Message or /help..."
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
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

      {/* ====================================================================
          MODAL 1: TASK ASSIGNMENT, RECURRING MULTI-DAY & TASK COMMENTS
         ==================================================================== */}
      {selectedCell && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-sm">
                  Task Slot ({ALL_SLOTS.find((s) => s.id === selectedCell.slotId)?.label})
                </h3>
                <p className="text-xs text-slate-400">
                  {members.find((m) => m.id === selectedCell.memberId)?.name} • {selectedCell.dateKey}
                </p>
              </div>
              <button
                onClick={() => setSelectedCell(null)}
                className="text-slate-400 hover:text-white"
              >
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
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Category</label>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.values(categories).map((cat) => (
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
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white"
                  />
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                      <Repeat className="w-3.5 h-3.5 text-indigo-400" /> Repeat across consecutive days?
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
                      <span className="text-slate-400">Number of days:</span>
                      <input
                        type="number"
                        min={1}
                        max={30}
                        value={recurringDaysCount}
                        onChange={(e) => setRecurringDaysCount(parseInt(e.target.value) || 1)}
                        className="w-16 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center font-bold text-white"
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
                    {isRecurring ? `Save ${recurringDaysCount} Days` : "Save Task"}
                  </button>
                </div>
              </form>
            ) : (
              <div className="text-xs text-amber-300 bg-amber-500/10 p-3 rounded-xl">
                You can only edit your own schedule slots, or leave a comment below.
              </div>
            )}

            {/* Task Comments */}
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
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-white"
                  />
                  <button
                    type="button"
                    onClick={handleAddComment}
                    className="bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-xl font-semibold text-white"
                  >
                    Post
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL 2: REQUEST A DAY OFF OR SICK DAY
         ==================================================================== */}
      {showLeaveModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-sm">Log Day Off / Sick Day</h3>
              <button
                onClick={() => setShowLeaveModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleRequestLeave} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Leave Type</label>
                <select
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                >
                  <option value="day_off">🌴 Day Off / Free Day</option>
                  <option value="sick_day">🤒 Sick Day</option>
                </select>
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Date</label>
                <input
                  type="date"
                  value={leaveDate}
                  onChange={(e) => setLeaveDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Notes / Reason</label>
                <textarea
                  rows={2}
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  placeholder="Optional details for Admin / Moderator..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-amber-600 hover:bg-amber-500 text-white py-2.5 rounded-xl font-semibold"
              >
                Submit Request for Approval
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}