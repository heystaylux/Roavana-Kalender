"use client";
// src/app/dashboard/DashboardClient.tsx
// Interaktiver Dashboard-Client – alle State-Logik hier

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";

// ── Typen ──────────────────────────────────────────────────────────────────
type Property = { id: string; name: string; emoji: string; address: string };
type Booking  = { id: string; propertyId: string; platform: string; guestName: string | null; checkIn: string; checkOut: string; guests: number; revenue: number | null; status: string; property?: { name: string; emoji: string } };
type Feed     = { id: string; propertyId: string; platform: string; name: string; url: string; status: string; lastSynced: string | null; property?: { name: string; emoji: string } };

type Props = {
  user: any;
  initialProperties: Property[];
  initialBookings: Booking[];
  initialFeeds: Feed[];
};

const PLAT: Record<string, { name: string; icon: string; color: string; bg: string }> = {
  AIRBNB:             { name: "Airbnb",              icon: "🏠", color: "#FF385C", bg: "rgba(255,56,92,0.12)"   },
  BOOKING:            { name: "Booking.com",          icon: "🏨", color: "#003580", bg: "rgba(30,80,200,0.14)"  },
  TRAUMFERIENWOHNUNG: { name: "Traumferienwohnung",   icon: "🌿", color: "#00A651", bg: "rgba(0,166,81,0.12)"   },
  MANUAL:             { name: "Manuell",              icon: "✍️", color: "#C8A96E", bg: "rgba(200,169,110,0.12)"},
};

function fmtDE(d: string) {
  return new Date(d).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

function detectConflicts(bookings: Booking[]) {
  const conflicts: { a: Booking; b: Booking }[] = [];
  const byProp: Record<string, Booking[]> = {};
  bookings.forEach(b => { (byProp[b.propertyId] = byProp[b.propertyId] || []).push(b); });
  Object.values(byProp).forEach(arr => {
    for (let i = 0; i < arr.length; i++) {
      for (let j = i + 1; j < arr.length; j++) {
        const a = arr[i], b = arr[j];
        if (new Date(a.checkIn) < new Date(b.checkOut) && new Date(b.checkIn) < new Date(a.checkOut)) {
          conflicts.push({ a, b });
        }
      }
    }
  });
  return conflicts;
}

// ── Styles ─────────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;1,400&family=Sora:wght@300;400;500;600&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html, body { background: #0A0B09; color: #EBE6DC; font-family: 'Sora', sans-serif; min-height: 100vh; -webkit-font-smoothing: antialiased; }
::-webkit-scrollbar { width: 4px; }
::-webkit-scrollbar-thumb { background: rgba(201,169,110,0.2); border-radius: 99px; }

.app { display: grid; grid-template-columns: 232px 1fr; min-height: 100vh; }
.sidebar { background: #0F1009; border-right: 1px solid rgba(255,255,255,0.055); display: flex; flex-direction: column; position: sticky; top: 0; height: 100vh; overflow-y: auto; }
.logo-block { padding: 22px 18px 18px; border-bottom: 1px solid rgba(255,255,255,0.055); }
.logo-wm { font-family: 'Playfair Display', serif; font-size: 18px; color: #EBE6DC; }
.logo-wm em { color: #C9A96E; font-style: italic; }
.logo-tag { font-size: 9px; letter-spacing: 2px; text-transform: uppercase; color: rgba(255,255,255,0.18); margin-top: 3px; }
.nav-sec { padding: 14px 12px 4px; font-size: 9px; text-transform: uppercase; letter-spacing: 1.8px; color: rgba(255,255,255,0.18); font-weight: 600; }
.nitem { display: flex; align-items: center; gap: 9px; padding: 9px 12px; margin: 1px 6px; border-radius: 7px; cursor: pointer; color: #A09B94; font-size: 12.5px; border: none; background: none; width: calc(100% - 12px); text-align: left; font-family: 'Sora', sans-serif; transition: all .15s; }
.nitem:hover { background: #181A14; color: #EBE6DC; }
.nitem.on { background: rgba(201,169,110,0.09); color: #C9A96E; }
.propbtn { display: flex; align-items: center; gap: 9px; padding: 9px 12px; margin: 1px 6px; border-radius: 7px; cursor: pointer; color: #A09B94; font-size: 12px; border: none; background: none; width: calc(100% - 12px); text-align: left; font-family: 'Sora', sans-serif; transition: all .15s; }
.propbtn:hover { background: #181A14; color: #EBE6DC; }
.propbtn.on { background: rgba(201,169,110,0.06); color: #EBE6DC; }
.pname { font-size: 12.5px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ploc { font-size: 10px; color: rgba(255,255,255,0.22); margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sb-bottom { margin-top: auto; padding: 12px 14px 16px; border-top: 1px solid rgba(255,255,255,0.055); }
.plan-badge { display: flex; align-items: center; gap: 8px; background: rgba(201,169,110,0.08); border: 1px solid rgba(201,169,110,0.15); border-radius: 8px; padding: 10px 12px; margin-bottom: 10px; cursor: pointer; transition: all .15s; }
.plan-badge:hover { background: rgba(201,169,110,0.12); }
.plan-badge-name { font-size: 12px; font-weight: 600; color: #C9A96E; }
.plan-badge-hint { font-size: 10px; color: rgba(255,255,255,0.3); margin-top: 1px; }
.signout-btn { display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-radius: 7px; border: 1px solid rgba(255,255,255,0.06); background: none; cursor: pointer; color: rgba(255,255,255,0.3); font-size: 12px; font-family: 'Sora', sans-serif; width: 100%; transition: all .15s; }
.signout-btn:hover { background: rgba(217,107,91,0.08); color: #D96B5B; border-color: rgba(217,107,91,0.15); }

.main { display: flex; flex-direction: column; }
.topbar { background: #0F1009; border-bottom: 1px solid rgba(255,255,255,0.055); padding: 13px 24px; display: flex; align-items: center; gap: 12px; position: sticky; top: 0; z-index: 20; }
.topbar-title { font-family: 'Playfair Display', serif; font-size: 19px; font-weight: 500; color: #EBE6DC; flex: 1; }
.topbar-title em { color: #C9A96E; font-style: italic; }
.user-chip { display: flex; align-items: center; gap: 8px; background: #181A14; border: 1px solid rgba(255,255,255,0.07); border-radius: 99px; padding: 5px 12px 5px 6px; }
.user-avatar { width: 24px; height: 24px; border-radius: 50%; background: rgba(201,169,110,0.2); display: flex; align-items: center; justify-content: center; font-size: 12px; overflow: hidden; flex-shrink: 0; }
.user-name { font-size: 12px; color: #A09B94; }

.btn { display: inline-flex; align-items: center; gap: 7px; padding: 8px 16px; border-radius: 8px; font-size: 12.5px; font-weight: 500; cursor: pointer; border: none; font-family: 'Sora', sans-serif; transition: all .18s; white-space: nowrap; }
.btn-sand { background: #C9A96E; color: #0A0B09; }
.btn-sand:hover { background: #D4B578; transform: translateY(-1px); box-shadow: 0 4px 14px rgba(201,169,110,0.28); }
.btn-ghost { background: #181A14; color: #A09B94; border: 1px solid rgba(255,255,255,0.09); }
.btn-ghost:hover { background: #1E2019; color: #EBE6DC; }
.btn-green { background: rgba(112,196,138,0.09); color: #70C48A; border: 1px solid rgba(112,196,138,0.18); }
.btn-red { background: rgba(217,107,91,0.09); color: #D96B5B; border: 1px solid rgba(217,107,91,0.18); }
.btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none !important; }

.content { padding: 20px 24px; flex: 1; background: #0A0B09; }
.stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 18px; }
.stat { background: #0F1009; border: 1px solid rgba(255,255,255,0.055); border-radius: 11px; padding: 16px 18px; position: relative; overflow: hidden; }
.stat-stripe { position: absolute; top: 0; left: 0; right: 0; height: 2px; }
.stat-lbl { font-size: 9.5px; text-transform: uppercase; letter-spacing: 1.2px; color: rgba(255,255,255,0.25); margin-bottom: 9px; font-weight: 500; }
.stat-val { font-family: 'Playfair Display', serif; font-size: 28px; font-weight: 400; color: #EBE6DC; line-height: 1; }
.stat-hint { font-size: 10.5px; color: rgba(255,255,255,0.28); margin-top: 6px; }
.chip { display: inline-flex; align-items: center; gap: 3px; font-size: 10px; padding: 2px 7px; border-radius: 99px; margin-top: 7px; font-weight: 500; }
.chip-g { background: rgba(112,196,138,0.09); color: #70C48A; }
.chip-r { background: rgba(217,107,91,0.09); color: #D96B5B; }
.chip-s { background: rgba(201,169,110,0.09); color: #C9A96E; }
.chip-d { background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.35); }

.conflict-banner { background: rgba(217,107,91,0.09); border: 1px solid rgba(217,107,91,0.2); border-radius: 10px; padding: 12px 16px; display: flex; align-items: center; gap: 12px; margin-bottom: 16px; animation: fadeIn .3s ease; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: none; } }
.cb-title { font-size: 13px; font-weight: 600; color: #D96B5B; }
.cb-desc { font-size: 11.5px; color: rgba(217,107,91,0.7); margin-top: 2px; }
.cb-btn { padding: 6px 12px; border-radius: 6px; background: #D96B5B; color: #fff; font-size: 11.5px; font-weight: 600; cursor: pointer; border: none; font-family: 'Sora', sans-serif; }

.two-col { display: grid; grid-template-columns: 1fr 290px; gap: 16px; }
.rcol { display: flex; flex-direction: column; gap: 14px; }
.card { background: #0F1009; border: 1px solid rgba(255,255,255,0.055); border-radius: 11px; overflow: hidden; margin-bottom: 16px; }
.card:last-child { margin-bottom: 0; }
.chead { padding: 14px 18px; border-bottom: 1px solid rgba(255,255,255,0.055); display: flex; align-items: center; gap: 10px; }
.chead-r { margin-left: auto; display: flex; gap: 8px; align-items: center; }
.ctitle { font-family: 'Playfair Display', serif; font-size: 15px; font-weight: 500; color: #EBE6DC; }
.csub { font-size: 11px; color: rgba(255,255,255,0.28); margin-top: 1px; }

.blist { padding: 2px 0; }
.bitem { display: flex; align-items: flex-start; gap: 11px; padding: 12px 18px; border-bottom: 1px solid rgba(255,255,255,0.055); cursor: pointer; transition: background .12s; }
.bitem:last-child { border-bottom: none; }
.bitem:hover { background: #131509; }
.bplat { width: 30px; height: 30px; border-radius: 8px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 14px; }
.bguest { font-size: 13px; font-weight: 500; color: #EBE6DC; }
.bdates { font-size: 11px; color: rgba(255,255,255,0.28); margin-top: 2px; }
.bprop { font-size: 10px; color: rgba(255,255,255,0.2); margin-top: 1px; }
.bmeta { text-align: right; flex-shrink: 0; }
.brev { font-family: 'Playfair Display', serif; font-size: 15px; color: #EBE6DC; }
.bstat { font-size: 10px; padding: 2px 6px; border-radius: 99px; display: inline-block; margin-top: 3px; }
.bs-c { background: rgba(112,196,138,0.09); color: #70C48A; }
.bs-p { background: rgba(201,169,110,0.09); color: #C9A96E; }

.ical-row { display: flex; align-items: center; gap: 12px; padding: 13px 18px; border-bottom: 1px solid rgba(255,255,255,0.055); }
.ical-row:last-child { border-bottom: none; }
.ical-nm { font-size: 13px; font-weight: 500; color: #EBE6DC; }
.ical-url { font-size: 10.5px; color: rgba(255,255,255,0.22); margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 200px; }
.is-ok { background: rgba(112,196,138,0.09); color: #70C48A; font-size: 10.5px; padding: 2px 7px; border-radius: 99px; }
.is-err { background: rgba(217,107,91,0.09); color: #D96B5B; font-size: 10.5px; padding: 2px 7px; border-radius: 99px; }
.icon-btn { width: 26px; height: 26px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.09); background: none; cursor: pointer; color: #A09B94; font-size: 12px; display: flex; align-items: center; justify-content: center; transition: all .15s; flex-shrink: 0; }
.icon-btn:hover { background: #181A14; color: #EBE6DC; }
.icon-del:hover { background: rgba(217,107,91,0.09); color: #D96B5B; }

.rev-card { background: linear-gradient(140deg, #141609 0%, #0A0B09 100%); border: 1px solid rgba(255,255,255,0.09); border-radius: 11px; padding: 18px; }
.rl { font-size: 9.5px; text-transform: uppercase; letter-spacing: 1.4px; color: rgba(255,255,255,0.22); margin-bottom: 6px; }
.rv { font-family: 'Playfair Display', serif; font-size: 34px; font-weight: 400; color: #EBE6DC; letter-spacing: -0.5px; }
.rh { font-size: 10.5px; color: rgba(255,255,255,0.22); margin-top: 4px; }
.rbars { margin-top: 16px; display: flex; flex-direction: column; gap: 8px; }
.rbar-row { display: flex; align-items: center; gap: 9px; }
.rbar-lbl { font-size: 10.5px; color: rgba(255,255,255,0.35); width: 52px; flex-shrink: 0; }
.rbar-track { flex: 1; height: 3px; background: rgba(255,255,255,0.06); border-radius: 99px; overflow: hidden; }
.rbar-fill { height: 100%; border-radius: 99px; }
.rbar-val { font-size: 10.5px; color: rgba(255,255,255,0.3); width: 44px; text-align: right; flex-shrink: 0; }

.plat-row { display: flex; align-items: center; gap: 11px; padding: 11px 16px; border-bottom: 1px solid rgba(255,255,255,0.055); }
.plat-row:last-child { border-bottom: none; }
.plat-ic { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 15px; flex-shrink: 0; }
.plat-nm { font-size: 12.5px; font-weight: 500; color: #EBE6DC; }
.plat-ct { font-size: 10.5px; color: rgba(255,255,255,0.28); margin-top: 1px; }
.toggle { width: 32px; height: 17px; border-radius: 99px; border: none; cursor: pointer; position: relative; transition: background .2s; flex-shrink: 0; }
.tog-on { background: #70C48A; }
.tog-off { background: rgba(255,255,255,0.1); }
.toggle::after { content: ''; position: absolute; top: 2px; left: 2px; width: 13px; height: 13px; border-radius: 50%; background: #fff; transition: transform .2s; box-shadow: 0 1px 3px rgba(0,0,0,0.4); }
.tog-on::after { transform: translateX(15px); }

.overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.65); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 20px; backdrop-filter: blur(5px); animation: fadeIn .2s ease; }
.modal { background: #0F1009; border: 1px solid rgba(255,255,255,0.1); border-radius: 14px; width: 100%; max-width: 460px; box-shadow: 0 24px 60px rgba(0,0,0,0.7); animation: scaleIn .2s ease; }
@keyframes scaleIn { from { transform: scale(.96); opacity: 0; } to { transform: scale(1); opacity: 1; } }
.mhead { padding: 20px 22px 15px; border-bottom: 1px solid rgba(255,255,255,0.055); display: flex; align-items: center; justify-content: space-between; }
.mttl { font-family: 'Playfair Display', serif; font-size: 17px; font-weight: 500; color: #EBE6DC; }
.mclose { width: 27px; height: 27px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.09); background: none; cursor: pointer; color: rgba(255,255,255,0.35); font-size: 13px; display: flex; align-items: center; justify-content: center; }
.mclose:hover { background: #181A14; color: #EBE6DC; }
.mbody { padding: 20px 22px; }
.mfoot { padding: 13px 22px; border-top: 1px solid rgba(255,255,255,0.055); display: flex; gap: 9px; justify-content: flex-end; }
.fg { margin-bottom: 14px; }
.flbl { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: .9px; color: rgba(255,255,255,0.28); margin-bottom: 5px; display: block; }
.finp, .fsel { width: 100%; padding: 10px 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.09); background: #181A14; color: #EBE6DC; font-size: 13px; font-family: 'Sora', sans-serif; outline: none; transition: border-color .15s; }
.finp::placeholder { color: rgba(255,255,255,0.18); }
.finp:focus, .fsel:focus { border-color: #A8844E; }
.frow { display: grid; grid-template-columns: 1fr 1fr; gap: 11px; }
.info-box { background: rgba(201,169,110,0.07); border: 1px solid rgba(201,169,110,0.14); border-radius: 8px; padding: 11px 14px; font-size: 12.5px; color: rgba(201,169,110,0.8); line-height: 1.6; margin-bottom: 14px; }

.toast { position: fixed; bottom: 20px; right: 20px; background: #181A14; border: 1px solid rgba(255,255,255,0.09); color: #EBE6DC; padding: 11px 16px; border-radius: 9px; font-size: 13px; font-weight: 500; box-shadow: 0 8px 32px rgba(0,0,0,0.5); z-index: 200; display: flex; align-items: center; gap: 8px; animation: slideUp .25s ease; }
@keyframes slideUp { from { transform: translateY(12px); opacity: 0; } to { transform: none; opacity: 1; } }
.spin-ring { width: 11px; height: 11px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.15); border-top-color: #EBE6DC; animation: spin .7s linear infinite; display: inline-block; }
@keyframes spin { to { transform: rotate(360deg); } }
.empty { padding: 36px 20px; text-align: center; color: rgba(255,255,255,0.18); font-size: 13px; }

/* Kalender */
.cal-wrap { padding: 14px 16px; }
.cal-nav { display: flex; align-items: center; gap: 8px; }
.nav-btn { width: 26px; height: 26px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.09); background: none; cursor: pointer; color: #A09B94; font-size: 13px; display: flex; align-items: center; justify-content: center; transition: all .15s; }
.nav-btn:hover { background: #181A14; color: #EBE6DC; }
.nav-lbl { font-size: 13px; font-weight: 500; color: #EBE6DC; min-width: 110px; text-align: center; }
.wdays { display: grid; grid-template-columns: repeat(7, 1fr); margin: 12px 0 4px; }
.wday { text-align: center; font-size: 9.5px; font-weight: 600; color: rgba(255,255,255,0.2); text-transform: uppercase; padding: 3px; }
.dgrid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; }
.dcell { position: relative; aspect-ratio: 1; border-radius: 5px; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 12px; color: #A09B94; cursor: pointer; transition: all .12s; }
.dcell:hover { background: #181A14; }
.dcell.oth { color: rgba(255,255,255,0.12); }
.dcell.tod { background: rgba(201,169,110,0.09); color: #C9A96E; font-weight: 600; }
.dots { position: absolute; bottom: 2px; left: 50%; transform: translateX(-50%); display: flex; gap: 2px; }
.dot { width: 4px; height: 4px; border-radius: 50%; }
`;

const MONTHS_DE = ["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"];
const WD = ["Mo","Di","Mi","Do","Fr","Sa","So"];
const todayStr = new Date().toISOString().split("T")[0];

export default function DashboardClient({ user, initialProperties, initialBookings, initialFeeds }: Props) {
  const router = useRouter();
  const [navItem, setNavItem]         = useState("dashboard");
  const [propF, setPropF]             = useState("all");
  const [bookings, setBookings]       = useState(initialBookings);
  const [properties]                  = useState(initialProperties);
  const [feeds, setFeeds]             = useState(initialFeeds);
  const [syncing, setSyncing]         = useState(false);
  const [toggles, setToggles]         = useState({ AIRBNB: true, BOOKING: true, TRAUMFERIENWOHNUNG: true });
  const [toast, setToast]             = useState<{ msg: string; icon: string } | null>(null);
  const [showAdd, setShowAdd]         = useState(false);
  const [showIcal, setShowIcal]       = useState(false);
  const [showAddProp, setShowAddProp] = useState(false);
  const [newProp, setNewProp] = useState({ name: "", address: "", city: "", country: "Deutschland", emoji: "🏠" });
  const [viewDate, setViewDate]       = useState(new Date());
  const [newB, setNewB]               = useState({ propertyId: properties[0]?.id ?? "", platform: "MANUAL", guestName: "", checkIn: "", checkOut: "", guests: 2, revenue: "" });
  const [newF, setNewF]               = useState({ propertyId: properties[0]?.id ?? "", platform: "AIRBNB", name: "", url: "" });

  const showToast = (msg: string, icon = "✅") => {
    setToast({ msg, icon });
    setTimeout(() => setToast(null), 3000);
  };

  const filt = propF === "all" ? bookings : bookings.filter(b => b.propertyId === propF);
  const conflicts = detectConflicts(filt);
  const totalRev = filt.reduce((s, b) => s + (b.revenue ?? 0), 0);
  const revByPlat: Record<string, number> = {};
  filt.forEach(b => { revByPlat[b.platform] = (revByPlat[b.platform] || 0) + (b.revenue ?? 0); });
  const maxRev = Math.max(...Object.values(revByPlat), 1);
  const upcoming = [...filt]
    .filter(b => new Date(b.checkIn) >= new Date(todayStr))
    .sort((a, b) => new Date(a.checkIn).getTime() - new Date(b.checkIn).getTime())
    .slice(0, 6);

  // ── Sync ────────────────────────────────────────────────────────────────
  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/sync-ical", { method: "POST" });
      const data = await res.json();
      showToast(`Sync: +${data.added ?? 0} neu, ${data.conflicts ?? 0} Konflikte`, "🔄");
      router.refresh();
    } catch {
      showToast("Sync fehlgeschlagen", "❌");
    } finally {
      setSyncing(false);
    }
  };

  // ── Buchung hinzufügen ──────────────────────────────────────────────────
  const addBooking = async () => {
    if (!newB.guestName || !newB.checkIn || !newB.checkOut) return;
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newB, revenue: Number(newB.revenue) || 0, guests: Number(newB.guests) }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "CONFLICT") showToast("Doppelbuchung erkannt!", "🚫");
        else showToast(data.message ?? "Fehler", "❌");
        return;
      }
      setBookings(prev => [...prev, { ...data, property: properties.find(p => p.id === data.propertyId) }]);
      setShowAdd(false);
      setNewB({ propertyId: properties[0]?.id ?? "", platform: "MANUAL", guestName: "", checkIn: "", checkOut: "", guests: 2, revenue: "" });
      showToast("Buchung hinzugefügt!");
    } catch { showToast("Fehler beim Speichern", "❌"); }
  };

  // ── Feed hinzufügen ────────────────────────────────────────────────────
  const addFeed = async () => {
    if (!newF.url || !newF.name) return;
    try {
      const res = await fetch("/api/ical-feeds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newF),
      });
      const data = await res.json();
      if (!res.ok) { showToast("Fehler: " + JSON.stringify(data.error), "❌"); return; }
      setFeeds(prev => [...prev, { ...data, property: properties.find(p => p.id === data.propertyId) }]);
      setShowIcal(false);
      setNewF({ propertyId: properties[0]?.id ?? "", platform: "AIRBNB", name: "", url: "" });
      showToast("Feed hinzugefügt & Sync gestartet!", "📅");
    } catch { showToast("Fehler", "❌"); }
  };

  // ── Feed löschen ───────────────────────────────────────────────────────
  const deleteFeed = async (id: string) => {
    await fetch(`/api/ical-feeds?id=${id}`, { method: "DELETE" });
    setFeeds(prev => prev.filter(f => f.id !== id));
    showToast("Feed entfernt", "🗑️");
  };

  // ── Kalender ───────────────────────────────────────────────────────────
  const yr = viewDate.getFullYear(), mo = viewDate.getMonth();
  const dim = new Date(yr, mo + 1, 0).getDate();
  const off = (new Date(yr, mo, 1).getDay() || 7) - 1;
  const prevDim = new Date(yr, mo, 0).getDate();
  const getForDay = (day: number) => {
    const ds = `${yr}-${String(mo + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const dt = new Date(ds + "T12:00:00");
    return filt.filter(b => dt >= new Date(b.checkIn) && dt < new Date(b.checkOut));
  };
  const cells: { day: number; cur: boolean }[] = [];
  for (let i = 0; i < off; i++) cells.push({ day: prevDim - off + i + 1, cur: false });
  for (let d = 1; d <= dim; d++) cells.push({ day: d, cur: true });
  while (cells.length % 7 !== 0) cells.push({ day: cells.length - off - dim + 1, cur: false });

  const filtFeeds = propF === "all" ? feeds : feeds.filter(f => f.propertyId === propF);
  const plan = (user as any)?.subscriptionPlan ?? "FREE";

  return (
    <>
      <style suppressHydrationWarning>{CSS}</style>
      <div className="app">
        {/* SIDEBAR */}
        <aside className="sidebar">
          <div className="logo-block">
            <div className="logo-wm">Roavana<em>.Kalender</em></div>
            <div className="logo-tag">Buchungsmanagement</div>
          </div>

          <div className="nav-sec">Navigation</div>
          {[
            { id: "dashboard", ic: "▦",  lbl: "Dashboard"    },
            { id: "ical",      ic: "📅", lbl: "iCal Feeds"   },
            { id: "bookings",  ic: "📋", lbl: "Buchungen"    },
            { id: "objekte",    ic: "🏠", lbl: "Objekte"     },
            { id: "pricing",   ic: "⚡", lbl: "Pläne & Abo"  },
          ].map(n => (
            <button key={n.id} className={`nitem ${navItem === n.id ? "on" : ""}`}
              onClick={() => { setNavItem(n.id); if (n.id === "pricing") router.push("/pricing"); }}>
              <span style={{ fontSize: 14 }}>{n.ic}</span>{n.lbl}
            </button>
          ))}

          <div className="nav-sec">Objekte</div>
          <button className={`propbtn ${propF === "all" ? "on" : ""}`} onClick={() => setPropF("all")}>
            <span style={{ fontSize: 16 }}>🌍</span>
            <div><div className="pname">Alle Objekte</div><div className="ploc">{properties.length} Ferienwohnungen</div></div>
          </button>
          {properties.map(p => (
            <button key={p.id} className={`propbtn ${propF === p.id ? "on" : ""}`} onClick={() => setPropF(p.id)}>
              <span style={{ fontSize: 16 }}>{p.emoji}</span>
              <div><div className="pname">{p.name}</div><div className="ploc">{p.address}</div></div>
            </button>
          ))}

          <div className="sb-bottom">
            <div className="plan-badge" onClick={() => router.push("/pricing")}>
              <span style={{ fontSize: 18 }}>⚡</span>
              <div>
                <div className="plan-badge-name">{plan} Plan</div>
                <div className="plan-badge-hint">
                  {plan === "FREE" ? "Upgrade für Auto-Sync" : "Abo verwalten →"}
                </div>
              </div>
            </div>
            <button className="signout-btn" onClick={() => signOut({ callbackUrl: "/auth" })}>
              <span>↩</span> Abmelden ({user?.name?.split(" ")[0] ?? "User"})
            </button>
          </div>
        </aside>

        {/* MAIN */}
        <main className="main">
          <div className="topbar">
            <div className="topbar-title">
              {propF === "all" ? "Alle Objekte" : properties.find(p => p.id === propF)?.name} <em>Übersicht</em>
            </div>
            <div className="user-chip">
              <div className="user-avatar">
                {user?.image
                  ? <img src={user.image} width={24} height={24} style={{ objectFit: "cover" }} alt="" />
                  : <span>👤</span>}
              </div>
              <span className="user-name">{user?.name?.split(" ")[0] ?? user?.email}</span>
            </div>
            <button className="btn btn-ghost" onClick={handleSync} disabled={syncing}>
              {syncing ? <span className="spin-ring" /> : "↻"} {syncing ? "Sync…" : "iCal Sync"}
            </button>
            <button className="btn btn-green" onClick={() => setShowIcal(true)}>+ Feed</button>
            <button className="btn btn-sand" onClick={() => setShowAdd(true)}>+ Buchung</button>
          </div>

          <div className="content">
            {/* KONFLIKTE */}
            {conflicts.map((c, i) => (
              <div key={i} className="conflict-banner">
                <span style={{ fontSize: 18 }}>⚠️</span>
                <div style={{ flex: 1 }}>
                  <div className="cb-title">Doppelbuchung erkannt</div>
                  <div className="cb-desc">
                    {c.a.guestName} ({PLAT[c.a.platform]?.name}) & {c.b.guestName} ({PLAT[c.b.platform]?.name})
                    {" – "}{properties.find(p => p.id === c.a.propertyId)?.name}
                  </div>
                </div>
                <button className="cb-btn" onClick={() => {
                  setBookings(prev => prev.filter(b => b.id !== (c.a.revenue ?? 0) <= (c.b.revenue ?? 0) ? c.a.id : c.b.id));
                  showToast("Konflikt gelöst!");
                }}>Lösen</button>
              </div>
            ))}

            {/* STATS */}
            <div className="stats">
              <div className="stat"><div className="stat-stripe" style={{ background: "#C9A96E" }} /><div className="stat-lbl">Buchungen</div><div className="stat-val">{filt.length}</div><div className="stat-hint">Alle Plattformen</div><div className="chip chip-g">✓ Aktiv</div></div>
              <div className="stat"><div className="stat-stripe" style={{ background: "#70C48A" }} /><div className="stat-lbl">Umsatz</div><div className="stat-val">€{totalRev.toLocaleString("de-DE")}</div><div className="stat-hint">Aktuelle Buchungen</div><div className="chip chip-s">💰</div></div>
              <div className="stat"><div className="stat-stripe" style={{ background: conflicts.length ? "#D96B5B" : "#70C48A" }} /><div className="stat-lbl">Konflikte</div><div className="stat-val" style={{ color: conflicts.length ? "#D96B5B" : "#70C48A" }}>{conflicts.length}</div><div className="stat-hint">Doppelbuchungen</div>{conflicts.length === 0 ? <div className="chip chip-g">✓ Sauber</div> : <div className="chip chip-r">! Aktion</div>}</div>
              <div className="stat"><div className="stat-stripe" style={{ background: "#6B9FD4" }} /><div className="stat-lbl">iCal Feeds</div><div className="stat-val">{feeds.length}</div><div className="stat-hint">{feeds.filter(f => f.status === "OK").length} aktiv</div><div className="chip chip-d">⏰ 15 Min.</div></div>
            </div>

            {/* iCAL VIEW */}
            {navItem === "ical" && (
              <div className="card">
                <div className="chead">
                  <div><div className="ctitle">iCal Feeds</div><div className="csub">Alle Kalender-Verbindungen</div></div>
                  <div className="chead-r"><button className="btn btn-green" style={{ fontSize: 11, padding: "6px 11px" }} onClick={() => setShowIcal(true)}>+ Feed</button></div>
                </div>
                {filtFeeds.length === 0
                  ? <div className="empty">Noch keine Feeds – klicke auf "+ Feed"</div>
                  : filtFeeds.map(f => {
                    const pl = PLAT[f.platform];
                    return (
                      <div key={f.id} className="ical-row">
                        <div className="bplat" style={{ background: pl?.bg }}>{pl?.icon}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="ical-nm">{f.name}</div>
                          <div className="ical-url">{f.url}</div>
                          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", marginTop: 1 }}>
                            {f.property?.emoji} {f.property?.name}
                          </div>
                        </div>
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <div className={f.status === "OK" ? "is-ok" : "is-err"}>
                            {f.status === "OK" ? "✓ Aktiv" : "✕ Fehler"}
                          </div>
                          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", marginTop: 3 }}>
                            {f.lastSynced ? new Date(f.lastSynced).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }) : "Noch nie"}
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 5 }}>
                          <button className="icon-btn" onClick={() => showToast(`${f.name} wird synced…`, "🔄")}>↻</button>
                          <button className="icon-btn icon-del" onClick={() => deleteFeed(f.id)}>✕</button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}

            {/* OBJEKTE VERWALTEN */}
{navItem === "objekte" && (
  <div className="card">
    <div className="chead">
      <div><div className="ctitle">Objekte verwalten</div><div className="csub">Ferienwohnungen hinzufügen & löschen</div></div>
      <div className="chead-r">
        <button className="btn btn-sand" onClick={() => setShowAddProp(true)}>+ Objekt</button>
      </div>
    </div>
    {properties.length === 0
      ? <div className="empty">Noch keine Objekte – füge dein erstes hinzu!</div>
      : properties.map(p => (
        <div key={p.id} style={{display:"flex",alignItems:"center",gap:12,padding:"14px 18px",borderBottom:"1px solid rgba(255,255,255,0.055)"}}>
          <span style={{fontSize:24}}>{p.emoji}</span>
          <div style={{flex:1}}>
            <div style={{fontSize:13.5,fontWeight:500,color:"#EBE6DC"}}>{p.name}</div>
            <div style={{fontSize:11,color:"rgba(255,255,255,0.28)",marginTop:2}}>{p.address}</div>
          </div>
          <button className="btn btn-red" style={{fontSize:11,padding:"6px 12px"}}
            onClick={async () => {
              if(!confirm(`"${p.name}" wirklich löschen?`)) return;
              await fetch(`/api/properties?id=${p.id}`, { method: "DELETE" });
              window.location.reload();
            }}>
            🗑️ Löschen
          </button>
        </div>
      ))
    }
  </div>
)}
            {/* DASHBOARD / BOOKINGS */}
            {(navItem === "dashboard" || navItem === "bookings") && (
              <div className="two-col">
                <div>
                  {/* KALENDER */}
                  {navItem === "dashboard" && (
                    <div className="card">
                      <div className="chead">
                        <div><div className="ctitle">Kalender</div><div className="csub">Alle Buchungen im Überblick</div></div>
                        <div className="chead-r">
                          <button className="nav-btn" onClick={() => setViewDate(new Date(yr, mo - 1, 1))}>‹</button>
                          <span style={{ fontSize: 13, fontWeight: 500, color: "#EBE6DC", minWidth: 110, textAlign: "center" }}>{MONTHS_DE[mo]} {yr}</span>
                          <button className="nav-btn" onClick={() => setViewDate(new Date(yr, mo + 1, 1))}>›</button>
                        </div>
                      </div>
                      <div className="cal-wrap">
                        <div className="wdays">{WD.map(w => <div key={w} className="wday">{w}</div>)}</div>
                        <div className="dgrid">
                          {cells.map((c, i) => {
                            const bks = c.cur ? getForDay(c.day) : [];
                            const ds = c.cur ? `${yr}-${String(mo + 1).padStart(2, "0")}-${String(c.day).padStart(2, "0")}` : "";
                            return (
                              <div key={i} className={`dcell ${!c.cur ? "oth" : ""} ${ds === todayStr ? "tod" : ""}`}>
                                {c.day}
                                {bks.length > 0 && <div className="dots">{bks.slice(0, 3).map(b => <div key={b.id} className="dot" style={{ background: PLAT[b.platform]?.color }} />)}</div>}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* BUCHUNGEN */}
                  <div className="card">
                    <div className="chead"><div><div className="ctitle">
                      {navItem === "bookings" ? "Alle Buchungen" : "Bevorstehende"}
                    </div><div className="csub">Chronologisch sortiert</div></div></div>
                    <div className="blist">
                      {(navItem === "bookings" ? filt : upcoming).length === 0
                        ? <div className="empty">Keine Buchungen – füge eine hinzu!</div>
                        : (navItem === "bookings" ? filt : upcoming).map(b => {
                          const pl = PLAT[b.platform];
                          return (
                            <div key={b.id} className="bitem">
                              <div className="bplat" style={{ background: pl?.bg }}>{pl?.icon}</div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div className="bguest">{b.guestName ?? "Gast"}</div>
                                <div className="bdates">{fmtDE(b.checkIn)} → {fmtDE(b.checkOut)} · {b.guests} Gäste</div>
                                <div className="bprop">{b.property?.emoji} {b.property?.name}</div>
                              </div>
                              <div className="bmeta">
                                <div className="brev">{b.revenue ? `€${b.revenue}` : "–"}</div>
                                <div className={`bstat ${b.status === "CONFIRMED" ? "bs-c" : "bs-p"}`}>
                                  {b.status === "CONFIRMED" ? "Bestätigt" : "Ausstehend"}
                                </div>
                                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", marginTop: 2 }}>{pl?.name}</div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </div>

                {/* RECHTE SPALTE */}
                <div className="rcol">
                  <div className="rev-card">
                    <div className="rl">Umsatz nach Plattform</div>
                    <div className="rv">€{totalRev.toLocaleString("de-DE")}</div>
                    <div className="rh">Alle aktiven Buchungen</div>
                    <div className="rbars">
                      {Object.entries(revByPlat).map(([k, v]) => (
                        <div key={k} className="rbar-row">
                          <span className="rbar-lbl">{PLAT[k]?.name?.split(".")[0]}</span>
                          <div className="rbar-track"><div className="rbar-fill" style={{ width: `${(v / maxRev) * 100}%`, background: PLAT[k]?.color }} /></div>
                          <span className="rbar-val">€{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="card">
                    <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.055)" }}>
                      <div className="ctitle" style={{ fontSize: 13 }}>Plattformen</div>
                    </div>
                    {Object.entries(PLAT).filter(([k]) => k !== "MANUAL").map(([k, p]) => (
                      <div key={k} className="plat-row">
                        <div className="plat-ic" style={{ background: p.bg }}>{p.icon}</div>
                        <div>
                          <div className="plat-nm">{p.name}</div>
                          <div className="plat-ct">{filt.filter(b => b.platform === k).length} Buchungen</div>
                        </div>
                        <button className={`toggle ${toggles[k as keyof typeof toggles] ? "tog-on" : "tog-off"}`}
                          style={{ marginLeft: "auto" }}
                          onClick={() => setToggles(t => ({ ...t, [k]: !t[k as keyof typeof toggles] }))} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* ADD BOOKING MODAL */}
      {showAdd && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && setShowAdd(false)}>
          <div className="modal">
            <div className="mhead"><div className="mttl">Neue Buchung</div><button className="mclose" onClick={() => setShowAdd(false)}>✕</button></div>
            <div className="mbody">
              <div className="fg"><label className="flbl">Objekt</label>
                <select className="fsel" value={newB.propertyId} onChange={e => setNewB(p => ({ ...p, propertyId: e.target.value }))}>
                  {properties.map(p => <option key={p.id} value={p.id}>{p.emoji} {p.name}</option>)}
                </select>
              </div>
              <div className="frow">
                <div className="fg"><label className="flbl">Plattform</label>
                  <select className="fsel" value={newB.platform} onChange={e => setNewB(p => ({ ...p, platform: e.target.value }))}>
                    {Object.entries(PLAT).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.name}</option>)}
                  </select>
                </div>
                <div className="fg"><label className="flbl">Gastname</label>
                  <input className="finp" placeholder="Max Mustermann" value={newB.guestName} onChange={e => setNewB(p => ({ ...p, guestName: e.target.value }))} />
                </div>
              </div>
              <div className="frow">
                <div className="fg"><label className="flbl">Check-in</label><input className="finp" type="date" value={newB.checkIn} onChange={e => setNewB(p => ({ ...p, checkIn: e.target.value }))} /></div>
                <div className="fg"><label className="flbl">Check-out</label><input className="finp" type="date" value={newB.checkOut} onChange={e => setNewB(p => ({ ...p, checkOut: e.target.value }))} /></div>
              </div>
              <div className="frow">
                <div className="fg"><label className="flbl">Gäste</label><input className="finp" type="number" min="1" value={newB.guests} onChange={e => setNewB(p => ({ ...p, guests: Number(e.target.value) }))} /></div>
                <div className="fg"><label className="flbl">Umsatz €</label><input className="finp" type="number" placeholder="0" value={newB.revenue} onChange={e => setNewB(p => ({ ...p, revenue: e.target.value }))} /></div>
              </div>
            </div>
            <div className="mfoot">
              <button className="btn btn-ghost" onClick={() => setShowAdd(false)}>Abbrechen</button>
              <button className="btn btn-sand" onClick={addBooking}>Prüfen & Speichern</button>
            </div>
          </div>
        </div>
      )}

      {/* ADD ICAL MODAL */}
      {showIcal && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && setShowIcal(false)}>
          <div className="modal">
            <div className="mhead"><div className="mttl">iCal Feed hinzufügen</div><button className="mclose" onClick={() => setShowIcal(false)}>✕</button></div>
            <div className="mbody">
              <div className="info-box">
                📌 <strong>Airbnb:</strong> Inserate → Verfügbarkeit → Kalender exportieren<br />
                📌 <strong>Booking:</strong> Extranet → Kalender → iCal exportieren<br />
                📌 <strong>Traumferienwohnung:</strong> Konto → Buchungskalender → iCal-Export
              </div>
              <div className="fg"><label className="flbl">Objekt</label>
                <select className="fsel" value={newF.propertyId} onChange={e => setNewF(p => ({ ...p, propertyId: e.target.value }))}>
                  {properties.map(p => <option key={p.id} value={p.id}>{p.emoji} {p.name}</option>)}
                </select>
              </div>
              <div className="fg"><label className="flbl">Plattform</label>
                <select className="fsel" value={newF.platform} onChange={e => setNewF(p => ({ ...p, platform: e.target.value }))}>
                  {Object.entries(PLAT).filter(([k]) => k !== "MANUAL").map(([k, v]) => <option key={k} value={k}>{v.icon} {v.name}</option>)}
                </select>
              </div>
              <div className="fg"><label className="flbl">Bezeichnung</label><input className="finp" placeholder="Strandhaus – Airbnb" value={newF.name} onChange={e => setNewF(p => ({ ...p, name: e.target.value }))} /></div>
              <div className="fg"><label className="flbl">iCal-URL (.ics)</label><input className="finp" placeholder="https://…/calendar/ical/….ics" value={newF.url} onChange={e => setNewF(p => ({ ...p, url: e.target.value }))} /></div>
            </div>
            <div className="mfoot">
              <button className="btn btn-ghost" onClick={() => setShowIcal(false)}>Abbrechen</button>
              <button className="btn btn-sand" onClick={addFeed}>Feed hinzufügen</button>
            </div>
          </div>
        </div>
      )}

      {showAddProp && (
  <div className="overlay" onClick={e => e.target === e.currentTarget && setShowAddProp(false)}>
    <div className="modal">
      <div className="mhead"><div className="mttl">Neues Objekt</div><button className="mclose" onClick={() => setShowAddProp(false)}>✕</button></div>
      <div className="mbody">
        <div className="fg"><label className="flbl">Emoji</label>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {["🏠","🏖️","🏔️","🌻","🏡","🌊","🌿","🏰"].map(e => (
              <button key={e} onClick={() => setNewProp(p => ({...p, emoji: e}))}
                style={{width:36,height:36,borderRadius:8,border:`1px solid ${newProp.emoji===e?"#C9A96E":"rgba(255,255,255,0.09)"}`,background:newProp.emoji===e?"rgba(201,169,110,0.1)":"none",cursor:"pointer",fontSize:18}}>
                {e}
              </button>
            ))}
          </div>
        </div>
        <div className="fg"><label className="flbl">Name *</label><input className="finp" placeholder="Strandhaus Sylt" value={newProp.name} onChange={e => setNewProp(p => ({...p, name: e.target.value}))}/></div>
        <div className="fg"><label className="flbl">Adresse *</label><input className="finp" placeholder="Strandweg 12" value={newProp.address} onChange={e => setNewProp(p => ({...p, address: e.target.value}))}/></div>
        <div className="frow">
          <div className="fg"><label className="flbl">Stadt</label><input className="finp" placeholder="Sylt" value={newProp.city} onChange={e => setNewProp(p => ({...p, city: e.target.value}))}/></div>
          <div className="fg"><label className="flbl">Land</label>
            <select className="fsel" value={newProp.country} onChange={e => setNewProp(p => ({...p, country: e.target.value}))}>
              {["Deutschland","Österreich","Schweiz","Italien","Spanien","Portugal"].map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>
      </div>
      <div className="mfoot">
        <button className="btn btn-ghost" onClick={() => setShowAddProp(false)}>Abbrechen</button>
        <button className="btn btn-sand" onClick={async () => {
          if(!newProp.name || !newProp.address) return;
          await fetch("/api/properties", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify(newProp) });
          setShowAddProp(false);
          window.location.reload();
        }}>Speichern</button>
      </div>
    </div>
  </div>
)}

      {toast && <div className="toast"><span style={{ fontSize: 17 }}>{toast.icon}</span>{toast.msg}</div>}
    </>
  );
}
