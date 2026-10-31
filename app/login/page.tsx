"use client";
import { useState } from "react";
import { account, ID } from "@/lib/appwrite";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    try {
      if (mode === "signup") {
        await account.create({ userId: ID.unique(), email, password, name });
      }
      await account.createEmailPasswordSession({ email, password });
      window.location.href = "/";
    } catch (err: any) {
      setMsg(err.message);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-950 text-white">
      <form onSubmit={submit} className="w-80 space-y-3">
        <h1 className="text-2xl font-bold">FoundIt</h1>
        {mode === "signup" && (
          <input className="w-full p-2 rounded bg-gray-800" placeholder="Name"
            value={name} onChange={(e) => setName(e.target.value)} />
        )}
        <input className="w-full p-2 rounded bg-gray-800" placeholder="Email"
          value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="w-full p-2 rounded bg-gray-800" type="password"
          placeholder="Password (min 8 chars)"
          value={password} onChange={(e) => setPassword(e.target.value)} />
        <button className="w-full p-2 rounded bg-pink-600 font-semibold">
          {mode === "login" ? "Log in" : "Sign up"}
        </button>
        <p className="text-sm text-pink-300 cursor-pointer"
          onClick={() => setMode(mode === "login" ? "signup" : "login")}>
          {mode === "login" ? "New here? Sign up" : "Have an account? Log in"}
        </p>
        {msg && <p className="text-red-400 text-sm">{msg}</p>}
      </form>
    </main>
  );
}