import React, { useCallback, useEffect, useRef, useState } from "react";
import "./App.css";

type Role = "user" | "assistant" | "system";
type ChatMessage = { role: Role; content: string };

// 🔧 System prompt that governs behavior
const SYSTEM_PROMPT = `
You are Akwaaba’s travel assistant for Ghana. Behavior rules:

1) Basic informational queries → answer concisely with no call-to-action.

2) Planning / arranging / booking intent (itineraries, trips, venues, hotels, transport, events, crawls, day trips):
   - Give a clear, concise plan/answer.
   - Then ASK: "Do you want to schedule a 30 mins call to book this?"
   - Do NOT include any link in this question.
   - If the user replies with an affirmative intent (e.g., "yes", "sure", "book", "schedule", "ok", "let's do it"):
       Reply with ONLY: "Great — book a 30 mins call here: https://calendly.com/theakwaabaapp/30min"
   - If the user declines, continue helping in chat without any link.

3) If you don't have the answer or the request needs human intervention, reply exactly:
   "don't have answer, but you can talk to someone on WhatsApp: https://wa.me/233598954903"

4) Never suggest 15-minute calls. Only the 30-minute Calendly flow described above.

5) Be brief, practical, accurate, and Ghana-focused. No upsell unless asked.

`.trim();

export default function App() {
  // your fine-tuned model id
  const [model,setModel] = useState<string>("ft:gpt-3.5-turbo-0125:personal::C8lrJn2O");

  // if you want to type the key each run, empty this string; keeping your current default:
  const [apiKey, setApiKey] = useState<string>("");

  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "system", content: SYSTEM_PROMPT },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrollerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    scrollerRef.current?.scrollTo({
      top: scrollerRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, loading]);

  const send = useCallback(async () => {
    if (!apiKey.trim()) {
      setError("Missing OpenAI API key.");
      return;
    }
    const prompt = input.trim();
    if (!prompt) return;

    setError(null);
    setLoading(true);

    // append user turn (system stays as first item)
    const newMessages = [...messages, { role: "user" as Role, content: prompt }];
    setMessages(newMessages);
    setInput("");

    try {
      const r = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: newMessages.map(({ role, content }) => ({ role, content })),
          temperature: 0.7,
        }),
      });

      if (!r.ok) {
        const text = await r.text();
        throw new Error(text || `HTTP ${r.status}`);
      }

      const data = await r.json();
      const reply: string =
        data?.choices?.[0]?.message?.content ?? "(no reply from model)";
      setMessages([...newMessages, { role: "assistant", content: reply }]);
    } catch (e: any) {
      setError(e?.message || "Request failed");
      setMessages([
        ...newMessages,
        { role: "assistant", content: "don't have answer, but you can talk to someone on WhatsApp: https://wa.me/233598954903" },
      ]);
    } finally {
      setLoading(false);
    }
  }, [apiKey, input, messages, model]);

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      void send();
    }
  }

  return (
    <div className="app">
  <header className="topbar">
    <div className="stack">
      <label className="label">API Key</label>
      <input
        className="input"
        type="password"
        placeholder="sk-..."
        value={apiKey}
        onChange={(e) => setApiKey(e.target.value)}
      />
    </div>
   
  
  </header>

  {error && <div className="error">⚠️ {error}</div>}

  <main className="chat" ref={scrollerRef}>
    {messages
      .filter((m) => m.role !== "system")
      .map((m, i) => (
        <div
          key={i}
          className={`bubble ${m.role === "user" ? "user" : "assistant"}`}
        >
          <div className="meta">
            {m.role === "user" ? "You" : "Assistant"}
          </div>
          <div className="content">{m.content}</div>
        </div>
      ))}
    {loading && <div className="bubble assistant">Thinking…</div>}
  </main>

  <footer className="composer">
    <textarea
      className="textbox"
      placeholder="Type your prompt…  (Ctrl/Cmd + Enter to send)"
      rows={3}
      value={input}
      onChange={(e) => setInput(e.target.value)}
      onKeyDown={onKeyDown}
    />
    <button className="send" onClick={send} disabled={loading || !input.trim()}>
      {loading ? "Sending…" : "Send"}
    </button>
  </footer>
</div>

  );
}
