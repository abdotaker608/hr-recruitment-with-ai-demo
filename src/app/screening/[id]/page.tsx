"use client";

import { speak, useSTT } from "@/hooks/useSpeech";
import { useEffect, useMemo, useRef, useState } from "react";

export default function ScreeningChat({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [id, setId] = useState("");

  useEffect(() => {
    (async () => {
      setId((await params).id);
    })();
  }, []);

  const [messages, setMessages] = useState<
    { role: "assistant" | "candidate"; content: string }[]
  >([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const stt = useSTT();

  useEffect(() => {
    // auto-speak assistant messages
    const last = messages[messages.length - 1];
    if (last?.role === "assistant" && last.content) speak(last.content);
  }, [messages]);

  useEffect(() => {
    ref.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendCandidateTurn() {
    if (!input.trim()) return;
    const content = input.trim();
    setInput("");
    setMessages((m) => [...m, { role: "candidate", content }]);

    await fetch(`/api/screenings/${id}/turn`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "candidate", content }),
    });
  }

  async function askAssistant() {
    setLoading(true);
    setMessages((m) => [...m, { role: "assistant", content: "" }]);
    const idx = messages.length; // position where assistant message will be

    const res = await fetch(`/api/screenings/${id}/chat`, { method: "POST" });
    if (!res.body) {
      setLoading(false);
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();

    let acc = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      acc += chunk;
      setMessages((curr) => {
        const copy = [...curr];
        copy[idx] = { role: "assistant", content: acc };
        return copy;
      });
    }
    setLoading(false);
  }

  const [finishing, setFinishing] = useState(false);

  async function autoFinish() {
    setFinishing(true);
    // Collect the conversation text so far (simple join)
    const transcript = messages
      .map((m) => `${m.role}: ${m.content}`)
      .join("\n");
    await fetch(`/api/screenings/${id}/finish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript }),
    });
    window.location.href = `/report/${id}`;
  }

  return (
    <main className="p-6 max-w-3xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Screening Session</h1>

      <div className="border rounded p-3 space-y-3 min-h-[360px]">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.role === "assistant" ? "" : "justify-end"}`}
          >
            <div
              className={`px-3 py-2 rounded max-w-[80%] whitespace-pre-wrap ${
                m.role === "assistant"
                  ? "bg-gray-100"
                  : "bg-blue-600 text-white"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        <div ref={ref} />
      </div>

      <div className="flex gap-2">
        <input
          ref={inputRef}
          className="border rounded px-3 py-2 flex-1"
          placeholder='Type your answer… e.g. "salary: 55k EGP"'
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") sendCandidateTurn();
          }}
        />
        <button
          onClick={sendCandidateTurn}
          className="px-4 py-2 rounded bg-blue-600 text-white"
        >
          Send
        </button>
        <button
          onClick={() => {
            if (!stt.supported)
              return alert("Speech recognition not supported in this browser.");
            if (stt.listening) stt.stop();
            else
              stt.start((text) => {
                setInput(text);
                console.log(inputRef.current);
                if (inputRef.current) {
                  inputRef.current.focus(); // Ensure the element is focused
                  inputRef.current.scrollLeft = inputRef.current.scrollWidth;
                }
              });
          }}
          className={`px-3 py-2 rounded border ${
            stt.listening ? "bg-red-100" : ""
          }`}
          title="Toggle mic"
        >
          {stt.listening ? "Stop Mic" : "Mic"}
        </button>
        <button
          onClick={askAssistant}
          disabled={loading}
          className="px-4 py-2 rounded bg-gray-900 text-white disabled:opacity-50"
        >
          {loading ? "Thinking…" : "Ask Next"}
        </button>
        <button
          onClick={autoFinish}
          disabled={finishing}
          className="px-4 py-2 rounded bg-green-600 text-white disabled:opacity-50"
        >
          {finishing ? "Finishing…" : "Auto-Finish → Report"}
        </button>
      </div>

      <div className="text-sm text-gray-600">
        Tip: include baseline answers like <code>salary: …</code>,{" "}
        <code>notice: …</code>, etc. When done, go to{" "}
        <a className="underline" href={`/report/${id}`}>
          Report
        </a>
        .
      </div>
    </main>
  );
}
