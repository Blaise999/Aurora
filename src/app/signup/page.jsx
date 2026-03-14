"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Mail,
  User,
  ArrowRight,
  Loader2,
  Sparkles,
  Globe,
  AtSign,
} from "lucide-react";

import { useSession } from "@/hooks/useSession";

export default function SignupPage() {
  const router = useRouter();
  const { isLoggedIn } = useSession();

  const [step, setStep] = useState("info");

  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [username, setUsername] = useState("");

  // UI only fields
  const [lastName, setLastName] = useState("");
  const [country, setCountry] = useState("");
  const [twitter, setTwitter] = useState("");
  const [bio, setBio] = useState("");

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const otpRefs = useRef([]);

  if (isLoggedIn) {
    router.replace("/profile");
    return null;
  }

  const handleSignupStart = async (e) => {
    e.preventDefault();

    if (!email.includes("@") || !firstName.trim()) {
      setError("Email and first name are required");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          firstName,
          username,
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Signup failed");

      setStep("otp");

      setTimeout(() => {
        otpRefs.current[0]?.focus();
      }, 100);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }

    if (newOtp.every((d) => d !== "")) {
      handleVerifyOtp(newOtp.join(""));
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();

    const text = e.clipboardData.getData("text").trim();

    if (!/^\d{6}$/.test(text)) return;

    const newOtp = text.split("");

    setOtp(newOtp);

    handleVerifyOtp(text);
  };

  const handleVerifyOtp = async (code) => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          code,
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Invalid code");

      setStep("success");

      setTimeout(() => {
        router.push("/connect-wallet");
      }, 1600);
    } catch (err) {
      setError(err.message);
      setOtp(["", "", "", "", "", ""]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">

      <div className="w-full max-w-lg">

        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-text">
            {step === "info"
              ? "Create Your Account"
              : step === "otp"
              ? "Verify Your Email"
              : "Welcome"}
          </h1>

          <p className="text-sm text-muted mt-2">
            {step === "info"
              ? "Join the platform and start exploring digital assets"
              : step === "otp"
              ? `Enter the code sent to ${email}`
              : "Preparing your wallet connection"}
          </p>
        </div>

        <div className="rounded-2xl border border-border-light bg-surface p-8 space-y-6">

          {step === "info" && (
            <form onSubmit={handleSignupStart} className="space-y-5">

              <div className="grid grid-cols-2 gap-4">

                <div>
                  <label className="text-xs text-muted uppercase tracking-wider">
                    First Name
                  </label>

                  <div className="relative mt-1">
                    <User size={16} className="absolute left-3 top-3 text-muted" />

                    <input
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-surface2 border border-border-light text-sm"
                      placeholder="Alex"
                      autoFocus
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-muted uppercase tracking-wider">
                    Last Name
                  </label>

                  <input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full mt-1 px-3 py-2.5 rounded-lg bg-surface2 border border-border-light text-sm"
                    placeholder="Doe"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-muted uppercase tracking-wider">
                  Email
                </label>

                <div className="relative mt-1">
                  <Mail size={16} className="absolute left-3 top-3 text-muted" />

                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-surface2 border border-border-light text-sm"
                    placeholder="you@email.com"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-muted uppercase tracking-wider">
                  Username
                </label>

                <div className="relative mt-1">
                  <AtSign size={16} className="absolute left-3 top-3 text-muted" />

                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-surface2 border border-border-light text-sm"
                    placeholder="username"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-muted uppercase tracking-wider">
                  Country
                </label>

                <div className="relative mt-1">
                  <Globe size={16} className="absolute left-3 top-3 text-muted" />

                  <select
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-surface2 border border-border-light text-sm"
                  >
                    <option value="">Select Country</option>
                    <option>Nigeria</option>
                    <option>United States</option>
                    <option>United Kingdom</option>
                    <option>Canada</option>
                    <option>Germany</option>
                    <option>France</option>
                    <option>Brazil</option>
                    <option>India</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-muted uppercase tracking-wider">
                  Twitter / X
                </label>

                <input
                  value={twitter}
                  onChange={(e) => setTwitter(e.target.value)}
                  className="w-full mt-1 px-3 py-2.5 rounded-lg bg-surface2 border border-border-light text-sm"
                  placeholder="@handle"
                />
              </div>

              <div>
                <label className="text-xs text-muted uppercase tracking-wider">
                  Bio
                </label>

                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full mt-1 px-3 py-2.5 rounded-lg bg-surface2 border border-border-light text-sm resize-none"
                  rows={3}
                  placeholder="Tell us a little about yourself..."
                />
              </div>

              {error && (
                <p className="text-xs text-red-400">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-lg bg-accent text-white flex items-center justify-center gap-2"
              >
                {loading ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <ArrowRight size={18} />
                )}
                {loading ? "Creating Account..." : "Create Account"}
              </button>
            </form>
          )}

          {step === "otp" && (
            <div className="space-y-6">

              <div className="flex justify-center gap-3" onPaste={handleOtpPaste}>
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => (otpRefs.current[i] = el)}
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    maxLength={1}
                    className="w-12 h-14 text-center text-xl font-bold rounded-lg bg-surface2 border border-border-light"
                  />
                ))}
              </div>

              {error && (
                <p className="text-sm text-red-400 text-center">{error}</p>
              )}

              <button
                onClick={() => handleVerifyOtp(otp.join(""))}
                disabled={loading}
                className="w-full py-3 rounded-lg bg-accent text-white flex items-center justify-center gap-2"
              >
                {loading ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <ArrowRight size={18} />
                )}
                Verify Code
              </button>

            </div>
          )}

          {step === "success" && (
            <div className="text-center py-8 space-y-4">

              <Sparkles size={40} className="mx-auto text-accent" />

              <h2 className="text-xl font-semibold">
                Account Created
              </h2>

              <p className="text-sm text-muted">
                Redirecting to wallet connection...
              </p>

              <Loader2 className="animate-spin mx-auto text-accent" />

            </div>
          )}

        </div>

        <p className="text-center text-sm text-muted mt-6">
          Already have an account?{" "}
          <a href="/login" className="text-accent hover:underline">
            Log in
          </a>
        </p>

      </div>
    </div>
  );
}