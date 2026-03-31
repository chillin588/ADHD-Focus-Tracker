import { useState, useEffect, useRef, useCallback } from "react";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const WORK_DURATION = 20 * 60;
const BREAK_DURATION = 5 * 60;

function getToday() {
  return new Date().toISOString().split("T")[0];
}

function getWeekKey() {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff)).toISOString().split("T")[0];
}

function loadStorage() {
  try {
    return JSON.parse(localStorage.getItem("adhd-focus") || "{}");
  } catch {
    return {};
  }
}

function saveStorage(data) {
  localStorage.setItem("adhd-focus", JSON.stringify(data));
}

export default function App() {
  const [darkMode, setDarkMode] = useState(() => {
    const s = loadStorage();
    return s.darkMode ?? true;
  });

  const [tasks, setTasks] = useState(() => {
    const s = loadStorage();
    if (s.today === getToday()) return s.tasks || ["", "", ""];
    return ["", "", ""];
  });

  const [mustWin, setMustWin] = useState(() => {
    const s = loadStorage();
    if (s.today === getToday()) return s.mustWin ?? null;
    return null;
  });

  const [checks, setChecks] = useState(() => {
    const s = loadStorage();
    if (s.today === getToday()) return s.checks || [false, false, false];
    return [false, false, false];
  });

  const [sprintCount, setSprintCount] = useState(() => {
    const s = loadStorage();
    if (s.today === getToday()) return s.sprintCount || 0;
    return 0;
  });

  const [weekData, setWeekData] = useState(() => {
    const s = loadStorage();
    return s.weekData || {};
  });

  const [streak, setStreak] = useState(() => {
    const s = loadStorage();
    return s.streak || 0;
  });

  const [timerSeconds, setTimerSeconds] = useState(WORK_DURATION);
  const [timerRunning, setTimerRunning] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [distractionMsg, setDistractionMsg] = useState(false);
  const [activeTab, setActiveTab] = useState("tasks");
  const [pulse, setPulse] = useState(false);

  const intervalRef = useRef(null);
  const distractionRef = useRef(null);

  // Persist to storage
  useEffect(() => {
    const s = loadStorage();
    const score = checks.filter(Boolean).length;
    const today = getToday();
    const wk = getWeekKey();

    const newWeekData = { ...weekData };
    if (!newWeekData[wk]) newWeekData[wk] = {};
    newWeekData[wk][today] = score;

    saveStorage({
      ...s,
      today,
      tasks,
      mustWin,
      checks,
      sprintCount,
      darkMode,
      weekData: newWeekData,
      streak,
    });
    setWeekData(newWeekData);
  }, [tasks, mustWin, checks, sprintCount, darkMode, streak]);

  // Timer
  useEffect(() => {
    if (timerRunning) {
      intervalRef.current = setInterval(() => {
        setTimerSeconds((s) => {
          if (s <= 1) {
            if (!isBreak) {
              setSprintCount((c) => {
                const next = c + 1;
                if (next >= 3) {
                  setChecks((prev) => {
                    const n = [...prev];
                    n[2] = true;
                    return n;
                  });
                }
                return next;
              });
              setIsBreak(true);
              setPulse(true);
              setTimeout(() => setPulse(false), 600);
              return BREAK_DURATION;
            } else {
              setIsBreak(false);
              return WORK_DURATION;
            }
          }
          return s - 1;
        });
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [timerRunning, isBreak]);

  const resetTimer = () => {
    setTimerRunning(false);
    setIsBreak(false);
    setTimerSeconds(WORK_DURATION);
  };

  const fmt = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  const score = checks.filter(Boolean).length;

  const handleDistraction = () => {
    clearTimeout(distractionRef.current);
    setDistractionMsg(true);
    distractionRef.current = setTimeout(() => setDistractionMsg(false), 4000);
  };

  // Weekly bar chart data
  const wk = getWeekKey();
  const todayStr = getToday();
  const weekScores = DAYS.map((_, i) => {
    const d = new Date(wk);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().split("T")[0];
    return { day: DAYS[i], score: weekData[wk]?.[key] ?? null, key };
  });
  const weekTotal = weekScores.reduce((a, b) => a + (b.score || 0), 0);

  const dm = darkMode;
  const bg = dm ? "bg-[#0e0e10]" : "bg-[#f5f4f0]";
  const card = dm ? "bg-[#18181b] border-[#2a2a2e]" : "bg-white border-[#e2e0d8]";
  const text = dm ? "text-[#f0efe9]" : "text-[#1a1a18]";
  const muted = dm ? "text-[#888]" : "text-[#888]";
  const accent = "#f5a623";
  const accentDim = dm ? "#3a2a08" : "#fef3d7";
  const tabActive = dm ? "bg-[#f5a623] text-[#0e0e10]" : "bg-[#f5a623] text-[#0e0e10]";
  const tabInactive = dm ? "text-[#888] hover:text-[#f0efe9]" : "text-[#888] hover:text-[#1a1a18]";

  const progressPct = ((WORK_DURATION - timerSeconds) / WORK_DURATION) * 100;
  const breakPct = ((BREAK_DURATION - timerSeconds) / BREAK_DURATION) * 100;
  const pct = isBreak ? breakPct : progressPct;
  const radius = 72;
  const circ = 2 * Math.PI * radius;
  const dash = (pct / 100) * circ;

  return (
    <div className={`min-h-screen ${bg} ${text} font-mono transition-colors duration-300`}
      style={{ fontFamily: "'DM Mono', 'Fira Mono', 'Courier New', monospace" }}>

      {/* Header */}
      <div className={`sticky top-0 z-50 ${dm ? "bg-[#0e0e10]/90" : "bg-[#f5f4f0]/90"} backdrop-blur-sm border-b ${dm ? "border-[#2a2a2e]" : "border-[#e2e0d8]"} px-4 py-3 flex items-center justify-between`}>
        <div>
          <span className="text-lg font-bold tracking-tight" style={{ color: accent }}>FOCUS</span>
          <span className={`text-lg font-bold tracking-tight ${text}`}>.APP</span>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-xs ${muted}`}>🔥 {streak}d</span>
          <button
            onClick={() => setDarkMode(!dm)}
            className={`text-xs px-2 py-1 rounded border ${dm ? "border-[#2a2a2e] text-[#888]" : "border-[#e2e0d8] text-[#888]"}`}>
            {dm ? "☀" : "☾"}
          </button>
        </div>
      </div>

      {/* Score pill */}
      <div className="px-4 pt-4">
        <div className={`rounded-xl border ${card} p-4 flex items-center justify-between`}>
          <div>
            <div className={`text-xs ${muted} uppercase tracking-widest mb-1`}>Today's Score</div>
            <div className="flex gap-1 items-end">
              {[0, 1, 2].map((i) => (
                <div key={i}
                  className={`w-6 h-6 rounded-sm transition-all duration-300 ${i < score ? "opacity-100" : "opacity-20"}`}
                  style={{ backgroundColor: i < score ? accent : (dm ? "#333" : "#ccc") }} />
              ))}
              <span className="ml-2 text-2xl font-bold">{score}<span className={`text-base ${muted}`}>/3</span></span>
            </div>
          </div>
          <div className="text-right">
            <div className={`text-xs ${muted} uppercase tracking-widest mb-1`}>Sprints</div>
            <div className="text-2xl font-bold">{sprintCount}<span className={`text-base ${muted}`}>/3+</span></div>
          </div>
        </div>
      </div>

      {/* Nav Tabs */}
      <div className={`mx-4 mt-4 flex rounded-xl border ${card} p-1 gap-1`}>
        {["tasks", "timer", "score", "week"].map((t) => (
          <button key={t}
            onClick={() => setActiveTab(t)}
            className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${activeTab === t ? tabActive : tabInactive}`}>
            {t === "tasks" ? "📋" : t === "timer" ? "⏱" : t === "score" ? "✓" : "📊"}
            <span className="ml-1 hidden sm:inline">{t}</span>
          </button>
        ))}
      </div>

      <div className="px-4 pb-8 mt-4 space-y-4">

        {/* TASKS TAB */}
        {activeTab === "tasks" && (
          <div className="space-y-3">
            <div className={`text-xs ${muted} uppercase tracking-widest`}>Max 3 Tasks — Pick 1 Must Win</div>
            {tasks.map((task, i) => (
              <div key={i} className={`rounded-xl border ${card} p-4 space-y-2`}>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold ${muted}`}>{i + 1}</span>
                  <input
                    type="text"
                    value={task}
                    onChange={(e) => {
                      const t = [...tasks];
                      t[i] = e.target.value;
                      setTasks(t);
                    }}
                    placeholder={i === 0 ? "Most important task..." : `Task ${i + 1}...`}
                    className={`flex-1 bg-transparent text-base font-medium outline-none placeholder:${muted} ${text}`}
                    style={{ fontSize: "1rem" }}
                  />
                  {task && (
                    <button
                      onClick={() => {
                        const t = [...tasks];
                        t[i] = "";
                        setTasks(t);
                        if (mustWin === i) setMustWin(null);
                      }}
                      className={`text-xs ${muted}`}>✕</button>
                  )}
                </div>
                {task && (
                  <button
                    onClick={() => setMustWin(mustWin === i ? null : i)}
                    className={`w-full py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all border ${mustWin === i
                        ? "border-transparent text-[#0e0e10]"
                        : dm ? "border-[#2a2a2e] text-[#888] hover:border-[#f5a623]" : "border-[#e2e0d8] text-[#888] hover:border-[#f5a623]"
                      }`}
                    style={mustWin === i ? { backgroundColor: accent } : {}}>
                    {mustWin === i ? "⭐ MUST WIN" : "Set as Must Win"}
                  </button>
                )}
              </div>
            ))}
            {mustWin !== null && tasks[mustWin] && (
              <div className="rounded-xl p-4" style={{ backgroundColor: accentDim, border: `1px solid ${accent}40` }}>
                <div className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: accent }}>Must Win Today</div>
                <div className={`text-base font-bold ${text}`}>{tasks[mustWin]}</div>
              </div>
            )}
          </div>
        )}

        {/* TIMER TAB */}
        {activeTab === "timer" && (
          <div className="space-y-4">
            <div className={`text-xs ${muted} uppercase tracking-widest`}>
              {isBreak ? "☕ Break Time" : "🔥 Focus Sprint"} — Sprint #{sprintCount + 1}
            </div>

            {/* Circular timer */}
            <div className={`rounded-2xl border ${card} p-6 flex flex-col items-center gap-6`}>
              <div className={`relative transition-all ${pulse ? "scale-105" : "scale-100"}`}
                style={{ transition: "transform 0.3s ease" }}>
                <svg width="180" height="180" className="-rotate-90">
                  <circle cx="90" cy="90" r={radius}
                    fill="none"
                    stroke={dm ? "#2a2a2e" : "#e2e0d8"}
                    strokeWidth="8" />
                  <circle cx="90" cy="90" r={radius}
                    fill="none"
                    stroke={isBreak ? "#4ade80" : accent}
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${circ}`}
                    strokeDashoffset={`${circ - dash}`}
                    style={{ transition: "stroke-dashoffset 1s linear" }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-4xl font-bold tabular-nums" style={{ letterSpacing: "-1px" }}>
                    {fmt(timerSeconds)}
                  </div>
                  <div className={`text-xs ${muted} mt-1`}>{isBreak ? "BREAK" : "WORK"}</div>
                </div>
              </div>

              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setTimerRunning(!timerRunning)}
                  className="flex-1 py-4 rounded-xl text-base font-bold uppercase tracking-widest transition-all"
                  style={{ backgroundColor: timerRunning ? (dm ? "#2a2a2e" : "#e2e0d8") : accent, color: timerRunning ? (dm ? "#f0efe9" : "#1a1a18") : "#0e0e10" }}>
                  {timerRunning ? "⏸ PAUSE" : "▶ START"}
                </button>
                <button
                  onClick={resetTimer}
                  className={`py-4 px-5 rounded-xl text-base font-bold border ${dm ? "border-[#2a2a2e] text-[#888]" : "border-[#e2e0d8] text-[#888]"}`}>
                  ↺
                </button>
              </div>

              <div className="w-full space-y-1">
                <div className={`text-xs ${muted} uppercase tracking-widest`}>Session Progress</div>
                <div className="flex gap-2">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: dm ? "#2a2a2e" : "#e2e0d8" }}>
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{ backgroundColor: accent, width: i < sprintCount ? "100%" : i === sprintCount && !isBreak && timerRunning ? `${pct}%` : "0%" }} />
                    </div>
                  ))}
                </div>
                <div className={`text-xs ${muted}`}>{sprintCount} of 3 sprints complete</div>
              </div>
            </div>
          </div>
        )}

        {/* SCORE TAB */}
        {activeTab === "score" && (
          <div className="space-y-3">
            <div className={`text-xs ${muted} uppercase tracking-widest`}>Daily Checklist</div>
            {[
              { label: "Started immediately (no doom-scroll)", icon: "⚡" },
              { label: "Completed Must Win Task", icon: "⭐" },
              { label: "Completed 3 focus sprints", icon: "🔥" },
            ].map((item, i) => (
              <button
                key={i}
                onClick={() => {
                  const n = [...checks];
                  n[i] = !n[i];
                  setChecks(n);
                }}
                className={`w-full rounded-xl border ${card} p-4 flex items-center gap-4 transition-all text-left`}
                style={checks[i] ? { borderColor: accent, backgroundColor: accentDim } : {}}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg flex-shrink-0 transition-all`}
                  style={{ backgroundColor: checks[i] ? accent : (dm ? "#2a2a2e" : "#f0f0ec") }}>
                  {checks[i] ? "✓" : item.icon}
                </div>
                <span className={`text-sm font-medium leading-snug ${checks[i] ? "" : muted}`}
                  style={checks[i] ? { color: dm ? "#f0efe9" : "#1a1a18" } : {}}>
                  {item.label}
                </span>
              </button>
            ))}

            {/* Score summary */}
            <div className={`rounded-xl border ${card} p-5 text-center`}>
              <div className="text-6xl font-black mb-2"
                style={{ color: score === 3 ? accent : score === 2 ? "#60a5fa" : score === 1 ? "#a78bfa" : (dm ? "#333" : "#ccc") }}>
                {score}/3
              </div>
              <div className={`text-sm ${muted}`}>
                {score === 0 ? "Let's go — start now." :
                  score === 1 ? "Good start. Keep going." :
                    score === 2 ? "Almost perfect. One more!" :
                      "🔥 Perfect day. Outstanding."}
              </div>
            </div>
          </div>
        )}

        {/* WEEK TAB */}
        {activeTab === "week" && (
          <div className="space-y-4">
            <div className="flex items-baseline justify-between">
              <div className={`text-xs ${muted} uppercase tracking-widest`}>This Week</div>
              <div className="text-xl font-bold">{weekTotal}<span className={`text-sm ${muted}`}>/21</span></div>
            </div>

            {/* Bar chart */}
            <div className={`rounded-2xl border ${card} p-5`}>
              <div className="flex items-end gap-2 h-28">
                {weekScores.map(({ day, score: s, key }) => {
                  const isToday = key === todayStr;
                  const height = s === null ? 4 : Math.max(8, (s / 3) * 100);
                  return (
                    <div key={day} className="flex-1 flex flex-col items-center gap-2">
                      <div className={`text-xs font-bold ${s !== null ? "" : muted}`}
                        style={{ color: s !== null ? (isToday ? accent : (dm ? "#f0efe9" : "#1a1a18")) : undefined }}>
                        {s !== null ? s : ""}
                      </div>
                      <div className="w-full flex items-end" style={{ height: "80px" }}>
                        <div className="w-full rounded-t-md transition-all duration-700"
                          style={{
                            height: `${height}px`,
                            backgroundColor: isToday ? accent : s === 3 ? (dm ? "#374151" : "#d1d5db") : s === 2 ? (dm ? "#2d3748" : "#e5e7eb") : s === 1 ? (dm ? "#252535" : "#efefef") : (dm ? "#1a1a1d" : "#f5f5f5"),
                            opacity: s === null ? 0.3 : 1,
                          }} />
                      </div>
                      <div className={`text-xs ${isToday ? "" : muted}`}
                        style={{ color: isToday ? accent : undefined, fontWeight: isToday ? "bold" : "normal" }}>
                        {day}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Streak */}
            <div className={`rounded-xl border ${card} p-4 flex items-center justify-between`}>
              <div>
                <div className={`text-xs ${muted} uppercase tracking-widest mb-1`}>Current Streak</div>
                <div className="text-3xl font-black">🔥 {streak} days</div>
              </div>
              <button
                onClick={() => {
                  if (score > 0) setStreak((s) => s + 1);
                }}
                className={`text-xs px-3 py-2 rounded-lg border font-bold ${dm ? "border-[#2a2a2e] text-[#888]" : "border-[#e2e0d8] text-[#888]"}`}>
                +1 Day
              </button>
            </div>

            <div className={`rounded-xl border ${card} p-4`}>
              <div className={`text-xs ${muted} uppercase tracking-widest mb-2`}>Performance</div>
              <div className="space-y-1">
                {["Inconsistent", "Building Momentum", "On a Roll", "Locked In", "Unstoppable"].map((label, i) => {
                  const active = Math.floor(weekTotal / 4) === i || (i === 4 && weekTotal >= 16);
                  return (
                    <div key={i} className={`text-sm flex items-center gap-2 ${active ? "font-bold" : muted}`}
                      style={{ color: active ? accent : undefined }}>
                      <span>{active ? "▶" : "·"}</span>
                      <span>{label}</span>
                      <span className={`text-xs ${muted}`}>({i * 4}–{i * 4 + 3} pts)</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Distraction Button — always visible */}
        <div className="pt-2">
          <button
            onClick={handleDistraction}
            className={`w-full py-4 rounded-xl border-2 text-sm font-bold uppercase tracking-widest transition-all ${dm ? "border-[#2a2a2e] text-[#444] hover:border-[#f5a623] hover:text-[#f5a623]" : "border-[#e2e0d8] text-[#bbb] hover:border-[#f5a623] hover:text-[#f5a623]"}`}>
            😵 I'm getting distracted
          </button>

          {distractionMsg && (
            <div className="mt-3 rounded-xl p-4 text-center"
              style={{ backgroundColor: accentDim, border: `2px solid ${accent}` }}>
              <div className="text-base font-black" style={{ color: accent }}>
                Back to the task.
              </div>
              <div className={`text-sm mt-1 ${muted}`}>Just 2 minutes. You can do it.</div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
