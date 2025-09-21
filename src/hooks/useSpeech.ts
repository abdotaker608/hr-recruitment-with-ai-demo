"use client";
import { useEffect, useRef, useState } from "react";

export function useSTT() {
  const recRef = useRef<any>(null);
  const timeoutRef = useRef<NodeJS.Timeout>(null);
  const forceStopRef = useRef(false);
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);

  useEffect(() => {
    const SR =
      (window as any).webkitSpeechRecognition ||
      (window as any).SpeechRecognition;
    if (SR) {
      const r = new SR();
      r.continuous = false;
      r.interimResults = true;
      r.lang = "en-US";
      recRef.current = r;
      setSupported(true);
    }
  }, []);

  function start(onText: (text: string) => void) {
    if (!recRef.current) return;
    setListening(true);
    let final = "";
    recRef.current.onresult = (e: any) => {
      forceStopRef.current = false;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);

      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += t + " ";
        else interim += t;
      }
      onText((final + interim).trim());
    };

    recRef.current.onend = () => {
      if (!forceStopRef.current) {
        recRef.current.start();
        timeoutRef.current = setTimeout(() => {
          forceStopRef.current = true;
          recRef.current.stop();
        }, 3000); // 3 seconds threshold for the user (silence in-between speech)
      } else setListening(false);
    };

    recRef.current.start();
  }

  function stop() {
    recRef.current?.stop();
    setListening(false);
  }

  return { supported, listening, start, stop };
}

export function speak(text: string) {
  if (typeof window === "undefined") return;
  const u = new SpeechSynthesisUtterance(text);
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}
