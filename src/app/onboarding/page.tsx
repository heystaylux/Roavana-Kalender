// src/app/onboarding/page.tsx
// Onboarding – 3 Schritte: Objekt anlegen → iCal-Feeds verbinden → Fertig

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

const STEPS = ["Dein Objekt", "Plattformen verbinden", "Alles bereit"];

const PLATFORM_GUIDES = [
  {
    id: "AIRBNB", name: "Airbnb", icon: "🏠", color: "#FF385C",
    steps: [
      "Airbnb öffnen → Inserate",
      "Dein Inserat auswählen",
      "Verfügbarkeit → Kalender exportieren",
      "iCal-Link kopieren",
    ],
  },
  {
    id: "BOOKING", name: "Booking.com", icon: "🏨", color: "#003580",
    steps: [
      "Booking Extranet öffnen",
      "Deine Unterkunft auswählen",
      "Kalender → iCal / Kalender-Feed",
      "Link für Exporte kopieren",
    ],
  },
  {
    id: "TRAUMFERIENWOHNUNG", name: "Traumferienwohnung", icon: "🌿", color: "#00A651",
    steps: [
      "Traumferienwohnung Vermieter-Login",
      "Mein Konto → Buchungskalender",
      "iCal-Export → Link generieren",
      "URL kopieren",
    ],
  },
];

export default function OnboardingPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Step 1: Objekt
  const [property, setProperty] = useState({ name: "", address: "", city: "", country: "Deutschland", emoji: "🏠" });
  const [createdPropertyId, setCreatedPropertyId] = useState<string | null>(null);

  // Step 2: iCal Feeds
  const [feeds, setFeeds] = useState<Array<{ platform: string; url: string; name: string }>>([]);
  const [currentFeed, setCurrentFeed] = useState({ platform: "AIRBNB", url: "", name: "" });
  const [openGuide, setOpenGuide] = useState<string | null>(null);

  const emojis = ["🏠", "🏖️", "🏔️", "🌻", "🏡", "🌊", "🌿", "🏰"];

  const saveProperty = async () => {
    if (!property.name || !property.address) { setError("Bitte Name und Adresse ausfüllen"); return; }
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(property),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setCreatedPropertyId(data.id);
      setStep(1);
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  const addFeed = () => {
    if (!currentFeed.url || !currentFeed.name) return;
    setFeeds(f => [...f, { ...currentFeed }]);
    setCurrentFeed({ platform: "AIRBNB", url: "", name: "" });
  };

  const saveFeedsAndFinish = async () => {
    setSaving(true); setError("");
    try {
      // Alle Feeds anlegen
      for (const feed of feeds) {
        await fetch("/api/ical-feeds", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...feed, propertyId: createdPropertyId }),
        });
      }
      // Onboarding als erledigt markieren
      await fetch("/api/onboarding-complete", { method: "POST" });
      setStep(2);
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;1,400&family=Inter:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0E0F0D; color: #F2EDE4; font-family: 'Inter', sans-serif; min-height: 100vh; }
        .page { min-height: 100vh; display: flex; flex-direction: column; align-items: center; padding: 40px 20px;
          background: radial-gradient(ellipse 70% 50% at 50% 0%, rgba(200,169,110,0.06) 0%, transparent 70%); }
        .top-logo { font-family: 'Playfair Display', serif; font-size: 18px; color: #F2EDE4; margin-bottom: 40px; }
        .top-logo span { color: #C8A96E; font-style: italic; }
        .steps { display: flex; align-items: center; gap: 0; margin-bottom: 40px; }
        .step-item { display: flex; align-items: center; gap: 8px; }
        .step-num { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600; transition: all 0.3s; }
        .step-num.done    { background: #6ABF8A; color: #0E0F0D; }
        .step-num.active  { background: #C8A96E; color: #0E0F0D; }
        .step-num.pending { background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.3); }
        .step-lbl { font-size: 13px; }
        .step-lbl.active  { color: #C8A96E; font-weight: 500; }
        .step-lbl.done    { color: #6ABF8A; }
        .step-lbl.pending { color: rgba(255,255,255,0.3); }
        .step-line { width: 36px; height: 1px; background: rgba(255,255,255,0.1); margin: 0 4px; }
        .card { width: 100%; max-width: 540px; background: #161713; border: 1px solid rgba(255,255,255,0.07); border-radius: 20px; padding: 36px; }
        .card-title { font-family: 'Playfair Display', serif; font-size: 24px; color: #F2EDE4; margin-bottom: 6px; }
        .card-sub { font-size: 14px; color: rgba(255,255,255,0.35); margin-bottom: 28px; line-height: 1.6; }
        .fg { margin-bottom: 16px; }
        .flbl { font-size: 10.5px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.9px; color: rgba(255,255,255,0.3); margin-bottom: 6px; display: block; }
        .finp, .fsel { width: 100%; padding: 11px 14px; border-radius: 9px; border: 1px solid rgba(255,255,255,0.1); background: #1E201B; color: #F2EDE4; font-size: 14px; font-family: 'Inter', sans-serif; outline: none; transition: border-color 0.15s; }
        .finp::placeholder { color: rgba(255,255,255,0.2); }
        .finp:focus, .fsel:focus { border-color: #C8A96E; }
        .frow { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .emoji-row { display: flex; gap: 8px; flex-wrap: wrap; }
        .emoji-btn { width: 40px; height: 40px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.08); background: none; font-size: 20px; cursor: pointer; transition: all 0.15s; display: flex; align-items: center; justify-content: center; }
        .emoji-btn.selected { border-color: #C8A96E; background: rgba(200,169,110,0.1); }
        .error { background: rgba(217,107,91,0.1); border: 1px solid rgba(217,107,91,0.25); border-radius: 8px; padding: 10px 14px; font-size: 13px; color: #D96B5B; margin-bottom: 16px; }
        .btn-main { width: 100%; padding: 13px; border-radius: 10px; background: #C8A96E; color: #0E0F0D; font-size: 15px; font-weight: 600; cursor: pointer; border: none; font-family: 'Inter', sans-serif; transition: all 0.18s; margin-top: 8px; }
        .btn-main:hover { background: #D4B578; }
        .btn-main:disabled { opacity: 0.6; cursor: not-allowed; }
        .btn-skip { width: 100%; padding: 11px; border-radius: 10px; background: none; border: 1px solid rgba(255,255,255,0.08); color: rgba(255,255,255,0.4); font-size: 14px; cursor: pointer; font-family: 'Inter', sans-serif; margin-top: 10px; transition: all 0.15s; }
        .btn-skip:hover { border-color: rgba(255,255,255,0.15); color: rgba(255,255,255,0.6); }
        .guide-box { background: #1E201B; border-radius: 10px; padding: 14px 16px; margin-bottom: 16px; }
        .guide-header { display: flex; align-items: center; gap: 10px; cursor: pointer; }
        .guide-icon { font-size: 20px; }
        .guide-name { font-size: 14px; font-weight: 500; flex: 1; }
        .guide-toggle { font-size: 12px; color: rgba(255,255,255,0.3); }
        .guide-steps { margin-top: 12px; }
        .guide-step { display: flex; gap: 10px; margin-bottom: 8px; font-size: 13px; color: rgba(255,255,255,0.55); align-items: flex-start; }
        .guide-step-num { width: 20px; height: 20px; border-radius: 50%; background: rgba(200,169,110,0.15); color: #C8A96E; font-size: 11px; font-weight: 600; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 1px; }
        .feed-added { display: flex; align-items: center; gap: 10px; background: #1E201B; border-radius: 8px; padding: 10px 14px; margin-bottom: 8px; }
        .feed-remove { width: 24px; height: 24px; border-radius: 6px; border: none; background: rgba(217,107,91,0.1); color: #D96B5B; cursor: pointer; font-size: 12px; display: flex; align-items: center; justify-content: center; margin-left: auto; }
        .success-icon { width: 72px; height: 72px; border-radius: 50%; background: rgba(106,191,138,0.12); border: 1px solid rgba(106,191,138,0.25); display: flex; align-items: center; justify-content: center; font-size: 36px; margin: 0 auto 24px; }
        .success-title { font-family: 'Playfair Display', serif; font-size: 28px; text-align: center; color: #F2EDE4; margin-bottom: 12px; }
        .success-sub { font-size: 14px; color: rgba(255,255,255,0.35); text-align: center; line-height: 1.7; margin-bottom: 28px; }
        .success-list { background: #1E201B; border-radius: 10px; padding: 16px; margin-bottom: 24px; }
        .success-item { display: flex; align-items: center; gap: 10px; padding: 6px 0; font-size: 13px; color: rgba(255,255,255,0.6); }
        .check { color: #6ABF8A; font-size: 15px; }
      `}</style>

      <div className="page">
        <div className="top-logo">Roavana<span>.Kalender</span></div>

        {/* Step Indicator */}
        <div className="steps">
          {STEPS.map((s, i) => (
            <div key={s} className="step-item">
              {i > 0 && <div className="step-line"/>}
              <div className={`step-num ${i < step ? "done" : i === step ? "active" : "pending"}`}>
                {i < step ? "✓" : i + 1}
              </div>
              <span className={`step-lbl ${i < step ? "done" : i === step ? "active" : "pending"}`}>{s}</span>
            </div>
          ))}
        </div>

        <div className="card">
          {/* ── SCHRITT 0: OBJEKT ── */}
          {step === 0 && <>
            <div className="card-title">Dein erstes Objekt</div>
            <p className="card-sub">Füge deine Ferienwohnung hinzu. Du kannst später weitere Objekte ergänzen.</p>

            <div className="fg">
              <label className="flbl">Emoji</label>
              <div className="emoji-row">
                {emojis.map(e => (
                  <button key={e} className={`emoji-btn ${property.emoji === e ? "selected" : ""}`}
                    onClick={() => setProperty(p => ({ ...p, emoji: e }))}>{e}</button>
                ))}
              </div>
            </div>

            <div className="fg"><label className="flbl">Objektname *</label>
              <input className="finp" placeholder="z.B. Strandhaus Sylt" value={property.name}
                onChange={e => setProperty(p => ({ ...p, name: e.target.value }))}/>
            </div>
            <div className="fg"><label className="flbl">Adresse *</label>
              <input className="finp" placeholder="Strandweg 12" value={property.address}
                onChange={e => setProperty(p => ({ ...p, address: e.target.value }))}/>
            </div>
            <div className="frow">
              <div className="fg"><label className="flbl">Stadt</label>
                <input className="finp" placeholder="Sylt" value={property.city}
                  onChange={e => setProperty(p => ({ ...p, city: e.target.value }))}/>
              </div>
              <div className="fg"><label className="flbl">Land</label>
                <select className="fsel" value={property.country}
                  onChange={e => setProperty(p => ({ ...p, country: e.target.value }))}>
                  {["Deutschland","Österreich","Schweiz","Italien","Spanien","Frankreich","Portugal","Griechenland","Kroatien","Andere"].map(c=>
                    <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>

            {error && <div className="error">{error}</div>}
            <button className="btn-main" onClick={saveProperty} disabled={saving}>
              {saving ? "Speichere…" : "Weiter →"}
            </button>
          </>}

          {/* ── SCHRITT 1: ICAL FEEDS ── */}
          {step === 1 && <>
            <div className="card-title">Plattformen verbinden</div>
            <p className="card-sub">Verbinde deine Buchungsplattformen per iCal-Link. Roavana.Kalender synchronisiert alle 15 Minuten automatisch.</p>

            {/* Anleitungen */}
            {PLATFORM_GUIDES.map(p => (
              <div key={p.id} className="guide-box">
                <div className="guide-header" onClick={() => setOpenGuide(openGuide === p.id ? null : p.id)}>
                  <span className="guide-icon">{p.icon}</span>
                  <span className="guide-name">{p.name}</span>
                  <span className="guide-toggle">{openGuide === p.id ? "▲" : "▼"} Anleitung</span>
                </div>
                {openGuide === p.id && (
                  <div className="guide-steps">
                    {p.steps.map((s, i) => (
                      <div key={i} className="guide-step">
                        <div className="guide-step-num">{i + 1}</div>
                        <span>{s}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Hinzugefügte Feeds */}
            {feeds.map((f, i) => (
              <div key={i} className="feed-added">
                <span>{PLATFORM_GUIDES.find(p => p.id === f.platform)?.icon}</span>
                <span style={{fontSize: 13, color: "rgba(255,255,255,0.7)", flex: 1}}>{f.name}</span>
                <button className="feed-remove" onClick={() => setFeeds(fl => fl.filter((_, j) => j !== i))}>✕</button>
              </div>
            ))}

            {/* Feed hinzufügen */}
            <div className="fg" style={{marginTop: 12}}>
              <label className="flbl">Plattform</label>
              <select className="fsel" value={currentFeed.platform}
                onChange={e => setCurrentFeed(f => ({ ...f, platform: e.target.value }))}>
                {PLATFORM_GUIDES.map(p => <option key={p.id} value={p.id}>{p.icon} {p.name}</option>)}
              </select>
            </div>
            <div className="fg"><label className="flbl">Bezeichnung</label>
              <input className="finp" placeholder="z.B. Strandhaus – Airbnb" value={currentFeed.name}
                onChange={e => setCurrentFeed(f => ({ ...f, name: e.target.value }))}/>
            </div>
            <div className="fg"><label className="flbl">iCal-URL (.ics)</label>
              <input className="finp" placeholder="https://…ical.com/…ics" value={currentFeed.url}
                onChange={e => setCurrentFeed(f => ({ ...f, url: e.target.value }))}/>
            </div>
            <button className="btn-skip" onClick={addFeed}>+ Feed hinzufügen</button>

            {error && <div className="error" style={{marginTop: 12}}>{error}</div>}
            <button className="btn-main" style={{marginTop: 16}} onClick={saveFeedsAndFinish} disabled={saving}>
              {saving ? "Speichere…" : feeds.length > 0 ? `${feeds.length} Feed${feeds.length > 1 ? "s" : ""} speichern & weiter →` : "Jetzt überspringen →"}
            </button>
            <button className="btn-skip" onClick={saveFeedsAndFinish}>Später verbinden</button>
          </>}

          {/* ── SCHRITT 2: FERTIG ── */}
          {step === 2 && <>
            <div className="success-icon">✅</div>
            <div className="success-title">Alles bereit!</div>
            <p className="success-sub">
              Dein Roavana.Kalender ist eingerichtet. Buchungen werden jetzt automatisch synchronisiert und Doppelbuchungen verhindert.
            </p>
            <div className="success-list">
              {[
                "Objekt angelegt",
                feeds.length > 0 ? `${feeds.length} iCal-Feed${feeds.length > 1 ? "s" : ""} verbunden` : "Feeds können jederzeit ergänzt werden",
                "Automatischer Sync alle 15 Minuten",
                "E-Mail-Benachrichtigungen bei Konflikten aktiv",
              ].map(item => (
                <div key={item} className="success-item"><span className="check">✓</span>{item}</div>
              ))}
            </div>
            <button className="btn-main" onClick={() => router.push("/dashboard")}>
              Zum Dashboard →
            </button>
          </>}
        </div>
      </div>
    </>
  );
}
