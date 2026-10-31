"use client";
import { useEffect, useState } from "react";
import { account, tablesDB, DB_ID, ITEMS_TABLE, CLAIMS_TABLE, ID, Query } from "@/lib/appwrite";

type Item = {
  $id: string; type: string; title: string; description: string;
  status: string; ownerId: string; verifyQuestion: string;
};
type Claim = {
  $id: string; itemId: string; claimerId: string; claimerName: string;
  answer: string; status: string;
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
  const [claims, setClaims] = useState<Claim[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [form, setForm] = useState({ type: "found", title: "", description: "", verifyQuestion: "" });
  const [matches, setMatches] = useState<{ item: Item; score: number }[] | null>(null);
  const [matchFor, setMatchFor] = useState("");
  const [msg, setMsg] = useState("");

  async function loadAll() {
    const it = await tablesDB.listRows({
      databaseId: DB_ID, tableId: ITEMS_TABLE,
      queries: [Query.orderDesc("$createdAt"), Query.limit(100)],
    });
    setItems(it.rows as unknown as Item[]);
    const cl = await tablesDB.listRows({
      databaseId: DB_ID, tableId: CLAIMS_TABLE,
      queries: [Query.limit(200)],
    });
    setClaims(cl.rows as unknown as Claim[]);
  }

  useEffect(() => {
    account.get()
      .then((u) => { setUser(u); loadAll(); })
      .catch(() => { window.location.href = "/login"; });
  }, []);

  async function post(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    try {
      await tablesDB.createRow({
        databaseId: DB_ID, tableId: ITEMS_TABLE, rowId: ID.unique(),
        data: {
          type: form.type, title: form.title, description: form.description,
          status: "open", ownerId: user!.$id,
          verifyQuestion: form.type === "found" ? form.verifyQuestion || "-" : "-",
        },
      });
      setForm({ ...form, title: "", description: "", verifyQuestion: "" });
      await loadAll();
      setMsg("Posted!");
    } catch (err: any) { setMsg(err.message); }
  }

  async function claim(item: Item) {
    const answer = (answers[item.$id] || "").trim();
    if (!answer) { setMsg("Type your answer first."); return; }
    try {
      await tablesDB.createRow({
        databaseId: DB_ID, tableId: CLAIMS_TABLE, rowId: ID.unique(),
        data: {
          itemId: item.$id, claimerId: user!.$id, claimerName: user!.name,
          answer, status: "pending",
        },
      });
      setMsg("Claim sent to the finder!");
      await loadAll();
    } catch (err: any) { setMsg(err.message); }
  }

  async function decide(c: Claim, item: Item, approve: boolean) {
    try {
      await tablesDB.updateRow({
        databaseId: DB_ID, tableId: CLAIMS_TABLE, rowId: c.$id,
        data: { status: approve ? "approved" : "rejected" },
      });
      if (approve) {
        await tablesDB.updateRow({
          databaseId: DB_ID, tableId: ITEMS_TABLE, rowId: item.$id,
          data: { status: "returned" },
        });
      }
      await loadAll();
    } catch (err: any) { setMsg(err.message); }
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
        {items.map((i) => {
          const isMine = i.ownerId === user.$id;
          const itemClaims = claims.filter((c) => c.itemId === i.$id);
          const myClaim = itemClaims.find((c) => c.claimerId === user.$id);
          return (
            <div key={i.$id} className="bg-gray-900 p-3 rounded space-y-2">
              <div className="flex justify-between gap-3">
                <div>
                  <div className="font-medium">
                    <span className={i.type === "lost" ? "text-red-400" : "text-green-400"}>[{i.type}]</span> {i.title}
                    {i.status === "returned" && <span className="ml-2 text-xs bg-green-700 px-2 py-0.5 rounded">Returned ✓</span>}
                  </div>
                  <div className="text-sm text-gray-400">{i.description}</div>
                </div>
                <button onClick={() => findMatches(i)} className="text-sm bg-gray-800 px-3 rounded h-9 shrink-0">
                  Find matches
                </button>
              </div>

              {i.type === "found" && i.status === "open" && !isMine && !myClaim && (
                <div className="bg-gray-800 p-2 rounded space-y-2">
                  <div className="text-sm">Is this yours? Answer to claim: <b>{i.verifyQuestion}</b></div>
                  <div className="flex gap-2">
                    <input className="flex-1 p-2 rounded bg-gray-700 text-sm" placeholder="Your answer"
                      value={answers[i.$id] || ""}
                      onChange={(e) => setAnswers({ ...answers, [i.$id]: e.target.value })} />
                    <button onClick={() => claim(i)} className="bg-pink-600 px-3 rounded text-sm">Claim</button>
                  </div>
                </div>
              )}

              {myClaim && (
                <div className="text-sm text-pink-300">Your claim: {myClaim.status}</div>
              )}

              {isMine && itemClaims.map((c) => (
                <div key={c.$id} className="bg-gray-800 p-2 rounded text-sm space-y-1">
                  <div><b>{c.claimerName}</b> answered: "{c.answer}" · <span className="text-pink-300">{c.status}</span></div>
                  {c.status === "pending" && i.status === "open" && (
                    <div className="flex gap-2">
                      <button onClick={() => decide(c, i, true)} className="bg-green-700 px-3 py-1 rounded">Approve</button>
                      <button onClick={() => decide(c, i, false)} className="bg-red-700 px-3 py-1 rounded">Reject</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </main>
  );
}