const XP_KEY = "lazytopper.xp";
const STREAK_KEY = "lazytopper.streak";

export function awardXP(amount: number): number {
  let current = 0;
  try {
    current = Number(localStorage.getItem(XP_KEY) || 0);
  } catch {}
  const next = current + amount;
  try {
    localStorage.setItem(XP_KEY, String(next));
  } catch {}
  return next;
}

export function getXP(): number {
  try {
    return Number(localStorage.getItem(XP_KEY) || 0);
  } catch {
    return 0;
  }
}

export function showXPToast(amount: number): void {
  const toast = document.createElement("div");
  toast.className = "lt-xp-toast";
  toast.textContent = `+${amount} XP`;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2000);
}

export function triggerConfetti(): void {
  const overlay = document.createElement("div");
  overlay.className = "lt-confetti-overlay";
  const colors = ["#58cc02", "#1cb0f6", "#ff9600", "#ffc800", "#ce82ff", "#ff4b4b"];
  for (let i = 0; i < 40; i++) {
    const piece = document.createElement("div");
    piece.className = "lt-confetti-piece";
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.background = colors[Math.floor(Math.random() * colors.length)];
    piece.style.animationDelay = `${Math.random() * 0.8}s`;
    piece.style.animationDuration = `${1.5 + Math.random() * 1.5}s`;
    piece.style.width = `${6 + Math.random() * 8}px`;
    piece.style.height = `${6 + Math.random() * 8}px`;
    overlay.appendChild(piece);
  }
  document.body.appendChild(overlay);
  setTimeout(() => overlay.remove(), 3500);
}

export function triggerSparkle(x: number, y: number): void {
  const burst = document.createElement("div");
  burst.className = "lt-sparkle-burst";
  burst.style.left = `${x}px`;
  burst.style.top = `${y}px`;
  for (let i = 0; i < 6; i++) {
    const star = document.createElement("div");
    star.className = "lt-sparkle-star";
    const angle = (i / 6) * 360;
    const dist = 20 + Math.random() * 20;
    star.style.left = `${Math.cos(angle * Math.PI / 180) * dist}px`;
    star.style.top = `${Math.sin(angle * Math.PI / 180) * dist}px`;
    star.style.animationDelay = `${Math.random() * 0.2}s`;
    burst.appendChild(star);
  }
  document.body.appendChild(burst);
  setTimeout(() => burst.remove(), 1200);
}

export function incrementDailyGoal(): void {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const raw = localStorage.getItem("lazytopper.dailyGoal");
    let data = { date: today, done: 0, goal: 5 };
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.date === today) {
        data = { ...parsed, done: (parsed.done || 0) + 1 };
      } else {
        data.done = 1;
        data.goal = parsed?.goal || 5;
      }
    } else {
      data.done = 1;
    }
    localStorage.setItem("lazytopper.dailyGoal", JSON.stringify(data));
    if (data.done === data.goal) {
      triggerConfetti();
      showXPToast(25);
      awardXP(25);
    }
  } catch {}
}

export function celebrateMilestone(xpAmount: number): void {
  triggerConfetti();
  showXPToast(xpAmount);
}
