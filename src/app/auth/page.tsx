// src/app/auth/page.tsx
// Login-Seite – Google & Apple Sign-In, Roavana Brand Design

"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function AuthPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasError = searchParams.get("error");
  const [loading, setLoading] = useState<string | null>(null);

  useEffect(() => {
    if (status === "authenticated") {
      const user = session.user as any;
      router.replace(user.onboardingDone ? "/dashboard" : "/onboarding");
    }
  }, [status, session, router]);

  const handleSignIn = async (provider: "google" | "apple") => {
    setLoading(provider);
    await signIn(provider, { callbackUrl: "/onboarding" });
  };

  return (
    <>
      <style suppressHydrationWarning>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;1,400&family=Inter:wght@300;400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0E0F0D; color: #F2EDE4; font-family: 'Inter', sans-serif; min-height: 100vh; }
        .page {
          min-height: 100vh; display: flex; align-items: center; justify-content: center;
          padding: 20px;
          background: radial-gradient(ellipse 80% 60% at 50% -10%, rgba(200,169,110,0.07) 0%, transparent 70%);
        }
        .card {
          width: 100%; max-width: 400px;
          background: #161713; border: 1px solid rgba(255,255,255,0.07);
          border-radius: 20px; padding: 44px 36px;
          box-shadow: 0 24px 80px rgba(0,0,0,0.6);
        }
        .logo { font-family: 'Playfair Display', serif; font-size: 22px; font-weight: 500; color: #F2EDE4; text-align: center; margin-bottom: 4px; }
        .logo span { color: #C8A96E; font-style: italic; }
        .tagline { text-align: center; font-size: 12px; color: rgba(255,255,255,0.25); text-transform: uppercase; letter-spacing: 2px; margin-bottom: 40px; }
        .heading { font-family: 'Playfair Display', serif; font-size: 26px; text-align: center; color: #F2EDE4; margin-bottom: 8px; }
        .sub { font-size: 14px; color: rgba(255,255,255,0.35); text-align: center; line-height: 1.6; margin-bottom: 36px; }
        .btn-provider {
          width: 100%; display: flex; align-items: center; justify-content: center; gap: 12px;
          padding: 14px; border-radius: 12px; font-size: 15px; font-weight: 500;
          cursor: pointer; transition: all 0.18s; border: none; font-family: 'Inter', sans-serif;
          margin-bottom: 12px; position: relative;
        }
        .btn-google { background: #fff; color: #1A1A1A; }
        .btn-google:hover { background: #f5f5f5; transform: translateY(-1px); box-shadow: 0 8px 24px rgba(0,0,0,0.25); }
        .btn-apple  { background: #1A1A1A; color: #fff; border: 1px solid rgba(255,255,255,0.12); }
        .btn-apple:hover  { background: #222; transform: translateY(-1px); box-shadow: 0 8px 24px rgba(0,0,0,0.4); }
        .btn-provider:disabled { opacity: 0.6; cursor: not-allowed; transform: none !important; }
        .divider { display: flex; align-items: center; gap: 14px; margin: 24px 0; }
        .div-line { flex: 1; height: 1px; background: rgba(255,255,255,0.07); }
        .div-text { font-size: 12px; color: rgba(255,255,255,0.2); }
        .error-box {
          background: rgba(217,107,91,0.1); border: 1px solid rgba(217,107,91,0.25);
          border-radius: 10px; padding: 12px 16px; margin-bottom: 24px;
          font-size: 13px; color: #D96B5B; text-align: center;
        }
        .footer { margin-top: 32px; font-size: 11px; color: rgba(255,255,255,0.18); text-align: center; line-height: 1.7; }
        .footer a { color: rgba(200,169,110,0.6); text-decoration: none; }
        .footer a:hover { color: #C8A96E; }
        .spinner { width: 16px; height: 16px; border-radius: 50%; border: 2px solid rgba(0,0,0,0.2); border-top-color: currentColor; animation: spin 0.7s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .google-icon { width: 20px; height: 20px; flex-shrink: 0; }
        .apple-icon  { width: 18px; height: 18px; flex-shrink: 0; }
      `}</style>

      <div className="page">
        <div className="card">
          <div className="logo">Roavana<span>.Kalender</span></div>
          <div className="tagline">Buchungsmanagement</div>

          <h1 className="heading">Willkommen zurück</h1>
          <p className="sub">Melde dich an, um deine Buchungen plattformübergreifend zu verwalten.</p>

          {hasError && (
            <div className="error-box">
              Anmeldung fehlgeschlagen. Bitte versuche es erneut.
            </div>
          )}

          {/* Google */}
          <button
            className="btn-provider btn-google"
            onClick={() => handleSignIn("google")}
            disabled={!!loading}
          >
            {loading === "google" ? (
              <span className="spinner" style={{ borderTopColor: "#4285F4" }} />
            ) : (
              <svg className="google-icon" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            )}
            Mit Google anmelden
          </button>

          {/* Apple Sign-In – wird nach Live-Schaltung aktiviert
          <button
         className="btn-provider btn-apple"
         onClick={() => handleSignIn("apple")}
         disabled={!!loading}
      >
         {loading === "apple" ? (
            <span className="spinner" style={{ borderTopColor: "#fff" }} />
          ) : (
             <svg .../>
            )}
            Mit Apple anmelden
          </button>
          */}

          <div className="divider">
            <div className="div-line"/>
            <span className="div-text">Sicher & verschlüsselt</span>
            <div className="div-line"/>
          </div>

          <div className="footer">
            Mit der Anmeldung stimmst du unseren{" "}
            <a href="https://roavana.de/agb/" target="_blank">AGB</a> und der{" "}
            <a href="https://roavana.de/datenschutz/" target="_blank">Datenschutzerklärung</a> zu.
            <br/><br/>
            © 2026 Roavana Travel GbR · Arthur-Pollack Str. 14, 01796 Pirna
          </div>
        </div>
      </div>
    </>
  );
}
