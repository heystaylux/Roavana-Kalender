"use client";
// src/app/pricing/page.tsx
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

const PLANS = [
  {
    id: "starter", name: "Starter", emoji: "🌱",
    price: { monthly: 9, yearly: 7 },
    tag: null, color: "#70C48A", colorB: "rgba(112,196,138,0.09)", colorBorder: "rgba(112,196,138,0.2)",
    features: [
      { text: "1 Ferienwohnung", ok: true }, { text: "5 iCal-Feeds", ok: true },
      { text: "Manueller Sync", ok: true }, { text: "Konflikt-Erkennung", ok: true },
      { text: "Auto-Sync alle 15 Min.", ok: false }, { text: "E-Mail-Alerts", ok: false },
      { text: "Mehrere Objekte", ok: false }, { text: "Prioritäts-Support", ok: false },
    ],
    cta: "Starter starten",
    priceKey: "STRIPE_PRICE_STARTER",
  },
  {
    id: "pro", name: "Pro", emoji: "⚡",
    price: { monthly: 19, yearly: 15 },
    tag: "Beliebteste Wahl", color: "#C9A96E", colorB: "rgba(201,169,110,0.09)", colorBorder: "rgba(201,169,110,0.28)",
    features: [
      { text: "Bis 5 Ferienwohnungen", ok: true }, { text: "Unbegrenzte iCal-Feeds", ok: true },
      { text: "Auto-Sync alle 15 Min.", ok: true }, { text: "Konflikt-Erkennung", ok: true },
      { text: "E-Mail-Alerts sofort", ok: true }, { text: "Buchungs-Statistiken", ok: true },
      { text: "Mehrere Objekte", ok: true }, { text: "Prioritäts-Support", ok: false },
    ],
    cta: "Pro starten",
    priceKey: "STRIPE_PRICE_PRO",
  },
  {
    id: "business", name: "Business", emoji: "🏢",
    price: { monthly: 39, yearly: 31 },
    tag: "Für Profis", color: "#6B9FD4", colorB: "rgba(107,159,212,0.09)", colorBorder: "rgba(107,159,212,0.2)",
    features: [
      { text: "Unbegrenzte Objekte", ok: true }, { text: "Unbegrenzte iCal-Feeds", ok: true },
      { text: "Auto-Sync alle 5 Min.", ok: true }, { text: "Sofort-Konflikt-Schutz", ok: true },
      { text: "E-Mail + SMS Alerts", ok: true }, { text: "Erweiterte Statistiken", ok: true },
      { text: "API-Zugang", ok: true }, { text: "Prioritäts-Support 24/7", ok: true },
    ],
    cta: "Business starten",
    priceKey: "STRIPE_PRICE_BUSINESS",
  },
];

export default function PricingPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [yearly, setYearly] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);

  const handleCheckout = async (plan: typeof PLANS[0]) => {
    if (!session) { router.push("/auth"); return; }
    setLoading(plan.id);
    try {
      const priceId = process.env[`NEXT_PUBLIC_${plan.priceKey}`] ?? "";
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId, plan: plan.id.toUpperCase() }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch { /* handle */ }
    finally { setLoading(null); }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;1,400&family=Sora:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0A0B09; color: #EBE6DC; font-family: 'Sora', sans-serif; min-height: 100vh; -webkit-font-smoothing: antialiased; }
        .page { max-width: 1000px; margin: 0 auto; padding: 60px 20px 80px; }
        .back { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: rgba(255,255,255,0.3); cursor: pointer; margin-bottom: 40px; border: none; background: none; font-family: 'Sora', sans-serif; }
        .back:hover { color: #EBE6DC; }
        .hero { text-align: center; margin-bottom: 40px; }
        .logo-wm { font-family: 'Playfair Display', serif; font-size: 20px; color: #EBE6DC; margin-bottom: 24px; }
        .logo-wm em { color: #C9A96E; font-style: italic; }
        h1 { font-family: 'Playfair Display', serif; font-size: clamp(32px, 5vw, 52px); font-weight: 500; line-height: 1.1; margin-bottom: 14px; }
        h1 em { color: #C9A96E; font-style: italic; }
        .sub { font-size: 16px; color: rgba(235,230,220,0.55); max-width: 460px; margin: 0 auto 28px; line-height: 1.7; }
        .trial { display: inline-flex; align-items: center; gap: 8px; background: rgba(112,196,138,0.09); border: 1px solid rgba(112,196,138,0.2); border-radius: 99px; padding: 8px 18px; font-size: 13px; color: #70C48A; font-weight: 500; }
        .toggle-row { display: flex; align-items: center; justify-content: center; gap: 12px; margin: 32px 0 44px; }
        .toggle-lbl { font-size: 13.5px; color: rgba(235,230,220,0.45); }
        .toggle-lbl.on { color: #EBE6DC; font-weight: 500; }
        .btgl { width: 44px; height: 24px; border-radius: 99px; cursor: pointer; position: relative; transition: background .2s; border: none; }
        .btgl.on { background: #C9A96E; }
        .btgl.off { background: rgba(255,255,255,0.1); }
        .btgl::after { content: ''; position: absolute; top: 3px; left: 3px; width: 18px; height: 18px; border-radius: 50%; background: #fff; transition: transform .2s; box-shadow: 0 1px 4px rgba(0,0,0,0.35); }
        .btgl.on::after { transform: translateX(20px); }
        .save { background: rgba(112,196,138,0.09); color: #70C48A; border: 1px solid rgba(112,196,138,0.18); border-radius: 99px; padding: 3px 9px; font-size: 11px; font-weight: 600; margin-left: 6px; }
        .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
        .plan { background: #0F1009; border-radius: 14px; padding: 26px 22px 22px; display: flex; flex-direction: column; position: relative; transition: transform .2s, box-shadow .2s; }
        .plan:hover { transform: translateY(-3px); box-shadow: 0 14px 40px rgba(0,0,0,0.45); }
        .plan-stripe { position: absolute; top: 0; left: 0; right: 0; height: 2px; border-radius: 14px 14px 0 0; }
        .plan-tag { display: inline-flex; align-items: center; gap: 5px; font-size: 10px; font-weight: 600; padding: 3px 9px; border-radius: 99px; margin-bottom: 12px; text-transform: uppercase; letter-spacing: .8px; align-self: flex-start; }
        .plan-emoji { font-size: 26px; margin-bottom: 8px; display: block; }
        .plan-name { font-family: 'Playfair Display', serif; font-size: 22px; font-weight: 500; color: #EBE6DC; margin-bottom: 5px; }
        .plan-desc { font-size: 12px; color: rgba(235,230,220,0.45); margin-bottom: 20px; }
        .plan-amount { font-family: 'Playfair Display', serif; font-size: 44px; font-weight: 400; color: #EBE6DC; letter-spacing: -1px; line-height: 1; }
        .plan-amount sup { font-size: 20px; vertical-align: super; }
        .plan-amount sub { font-size: 14px; color: rgba(235,230,220,0.45); font-family: 'Sora', sans-serif; font-weight: 300; }
        .plan-billed { font-size: 11px; color: rgba(235,230,220,0.28); margin: 6px 0 20px; }
        .divider { height: 1px; background: rgba(255,255,255,0.055); margin-bottom: 18px; }
        .feats { display: flex; flex-direction: column; gap: 8px; margin-bottom: 24px; flex: 1; }
        .feat { display: flex; align-items: center; gap: 8px; font-size: 12.5px; }
        .fc { width: 16px; height: 16px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 9px; flex-shrink: 0; }
        .fc.ok { background: rgba(112,196,138,0.1); color: #70C48A; }
        .fc.no { background: rgba(255,255,255,0.04); color: rgba(255,255,255,0.18); }
        .plan-btn { width: 100%; padding: 12px; border-radius: 9px; font-size: 13.5px; font-weight: 600; cursor: pointer; border: none; font-family: 'Sora', sans-serif; transition: all .2s; }
        .plan-btn.sand { background: #C9A96E; color: #0A0B09; }
        .plan-btn.sand:hover { background: #D4B578; transform: translateY(-1px); }
        .plan-btn.outline { background: none; border: 1px solid; }
        .plan-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none !important; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { width: 12px; height: 12px; border-radius: 50%; border: 2px solid rgba(0,0,0,0.2); border-top-color: #0A0B09; animation: spin .7s linear infinite; display: inline-block; margin-right: 6px; }
        .footer { text-align: center; margin-top: 48px; font-size: 12px; color: rgba(255,255,255,0.2); }
        .footer a { color: rgba(201,169,110,0.5); text-decoration: none; }
      `}</style>

      <div className="page">
        <button className="back" onClick={() => router.push("/dashboard")}>← Zurück zum Dashboard</button>

        <div className="hero">
          <div className="logo-wm">Roavana<em>.Kalender</em></div>
          <h1>Keine Doppelbuchungen.<br /><em>Kein Stress.</em></h1>
          <p className="sub">Verbinde alle Plattformen. Automatisch synchronisiert. Konflikte sofort erkannt.</p>
          <div className="trial">🎁 <strong>14 Tage kostenlos</strong> – keine Kreditkarte nötig</div>
        </div>

        <div className="toggle-row">
          <span className={`toggle-lbl ${!yearly ? "on" : ""}`}>Monatlich</span>
          <button className={`btgl ${yearly ? "on" : "off"}`} onClick={() => setYearly(y => !y)} />
          <span className={`toggle-lbl ${yearly ? "on" : ""}`}>Jährlich <span className="save">2 Monate gratis</span></span>
        </div>

        <div className="grid">
          {PLANS.map(plan => {
            const price = yearly ? plan.price.yearly : plan.price.monthly;
            const isFeatured = plan.id === "pro";
            const isLoading = loading === plan.id;
            return (
              <div key={plan.id} className="plan" style={{ border: `1px solid ${isFeatured ? plan.colorBorder : "rgba(255,255,255,0.055)"}` }}>
                <div className="plan-stripe" style={{ background: plan.color }} />
                {plan.tag && (
                  <div className="plan-tag" style={{ background: plan.colorB, color: plan.color }}>⭐ {plan.tag}</div>
                )}
                <span className="plan-emoji">{plan.emoji}</span>
                <div className="plan-name">{plan.name}</div>
                <div className="plan-desc">
                  {plan.id === "starter" ? "Perfekt zum Einstieg" : plan.id === "pro" ? "Für aktive Vermieter" : "Für Profi-Vermieter"}
                </div>
                <div className="plan-amount"><sup>€</sup>{price}<sub>/Mo</sub></div>
                <div className="plan-billed">{yearly ? `€${price * 12}/Jahr – du sparst €${(plan.price.monthly - price) * 12}` : "Monatlich kündbar"}</div>
                <div className="divider" />
                <div className="feats">
                  {plan.features.map((f, i) => (
                    <div key={i} className="feat">
                      <div className={`fc ${f.ok ? "ok" : "no"}`}>{f.ok ? "✓" : "–"}</div>
                      <span style={{ color: f.ok ? "#EBE6DC" : "rgba(235,230,220,0.38)" }}>{f.text}</span>
                    </div>
                  ))}
                </div>
                <button
                  className={`plan-btn ${isFeatured ? "sand" : "outline"}`}
                  style={!isFeatured ? { borderColor: plan.colorBorder, color: plan.color } : {}}
                  onClick={() => handleCheckout(plan)}
                  disabled={isLoading}
                >
                  {isLoading ? <><span className="spin" />Weiterleitung…</> : `14 Tage gratis – ${plan.cta}`}
                </button>
              </div>
            );
          })}
        </div>

        <div className="footer">
          Zahlungen sicher via <strong style={{ color: "rgba(235,230,220,0.5)" }}>Stripe</strong> ·
          {" "}<a href="/pricing">AGB</a> · <a href="/pricing">Datenschutz</a> ·
          {" "}© 2026 Roavana Travel GbR
        </div>
      </div>
    </>
  );
}
