"use client";
import { useEffect, useState } from "react";
import { account, tablesDB, DB_ID, ITEMS_TABLE, ID, Query } from "@/lib/appwrite";

type Item = {
  $id: string;
  type: string;
  title: string;
  description: string;
  status: string;
  ownerId: string;
  verifyQuestion: string;
};

const STOP = new Set(["the","and","with","near","for","has","have","was","lost","found","its","this","that","from","are","you"]);
function words(s: string) {
  return new Set(
    s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/)
      .filter((w) => w.length > 2 && !STOP.has(w))
  );
}
function score(a: string, b: string) {
  const A = words(a), B = words(b);
  let common = 0;
  A.forEach((w) => { if (B.has(w)) common++; });
  return common / Math.max(1, Math.min(A.size, B.size));
}

export default function Home() {
  const [user, setUser] = useState<{ $id: string; name: string } | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [form, setForm] = useState({ type: "found", title: "", description: "", verifyQuestion: "" });
  const [matches, setMatches] = useState<{ item: Item; score: number }[] | null>(null);
  const [matchFor, setMatchFor] = useState("");
  const [msg, setMsg] = useState("");

  async function loadItems() {
    const res = await tablesDB.listRows({
      databaseId: DB_ID,
      tableId: ITEMS_TABLE,
      queries: [Query.orderDesc("$createdAt"), Query.limit(100)],
    });
    setItems(res.rows as unknown as Item[]);
  }

  useEffect(() => {
    account.get()
      .then((u) => { setUser(u); loadItems(); })
      .catch(() => { window.location.href = "/login"; });
  }, []);

  async function post(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    try {
      await tablesDB.createRow({
        databaseId: DB_ID,
        tableId: ITEMS_TABLE,
        rowId: ID.unique(),
        data: {
          type: form.type,
          title: form.title,
          description: form.description,
          status: "open",
          ownerId: user!.$id,
          verifyQuestion: form.type === "found" ? form.verifyQuestion || "-" : "-",
        },
      });
      setForm({ ...form, title: "", description: "", verifyQuestion: "" });
      await loadItems();
      setMsg("Posted!");
    } catch (err: any) {
      setMsg(err.message);
    }
  }

  function findMatches(item: Item) {
    const other = item.type === "lost" ? "found" : "lost";
    const text = item.title + " " + item.description;
    const ranked = items
      .filter((i) => i.type === other && i.status === "open")
      .map((i) => ({ item: i, score: score(text, i.title + " " + i.description) }))
      .filter((m) => m.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
    setMatchFor(item.title);
    setMatches(ranked);
  }

  async function logout() {
    await account.deleteSession({ sessionId: "current" });
    window.location.href = "/login";
  }

  if (!user) return <main className="p-8 text-white bg-gray-950 min-h-screen">Loading...</main>;

  return (
    <main className="min-h-screen bg-gray-950 text-white p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">FoundIt</h1>
        <div className="text-sm">
          {user.name} · <button onClick={logout} className="text-pink-400">Log out</button>
        </div>
      </div>

      <form onSubmit={post} className="bg-gray-900 p-4 rounded space-y-3">
        <h2 className="font-semibold">Post an item</h2>
        <select className="w-full p-2 rounded bg-gray-800" value={form.type}
          onChange={(e) => setForm({ ...form, type: e.target.value })}>
          <option value="found">I found something</option>
          <option value="lost">I lost something</option>
        </select>
        <input required className="w-full p-2 rounded bg-gray-800" placeholder="Title (e.g. Black backpack)"
          value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <textarea required className="w-full p-2 rounded bg-gray-800" placeholder="Describe it: colour, brand, where, details"
          value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        {form.type === "found" && (
          <input required className="w-full p-2 rounded bg-gray-800"
            placeholder="Verification question only the owner can answer"
            value={form.verifyQuestion} onChange={(e) => setForm({ ...form, verifyQuestion: e.target.value })} />
        )}
        <button className="w-full p-2 rounded bg-pink-600 font-semibold">Post</button>
        {msg && <p className="text-sm text-pink-300">{msg}</p>}
      </form>

      {matches && (
        <div className="bg-gray-900 p-4 rounded">
          <h2 className="font-semibold mb-2">Matches for "{matchFor}"</h2>
          {matches.length === 0 && <p className="text-sm text-gray-400">No matches yet.</p>}
          {matches.map((m) => (
            <div key={m.item.$id} className="border-t border-gray-800 py-2">
              <div className="font-medium">{m.item.title} <span className="text-pink-400 text-sm">{Math.round(m.score * 100)}% match</span></div>
              <div className="text-sm text-gray-400">{m.item.description}</div>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-2">
        <h2 className="font-semibold">All items</h2>
        {items.map((i) => (
          <div key={i.$id} className="bg-gray-900 p-3 rounded flex justify-between gap-3">
            <div>
              <div className="font-medium">
                <span className={i.type === "lost" ? "text-red-400" : "text-green-400"}>[{i.type}]</span> {i.title}
              </div>
              <div className="text-sm text-gray-400">{i.description}</div>
            </div>
            <button onClick={() => findMatches(i)} className="text-sm bg-gray-800 px-3 rounded h-9 shrink-0">
              Find matches
            </button>
          </div>
        ))}
      </div>
    </main>
  );
}