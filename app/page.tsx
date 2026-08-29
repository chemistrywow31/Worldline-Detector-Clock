"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Mode = "time" | "worldline";

type Fortune = {
  label: string;
  title: string;
  copy: string;
  score: number;
};

const FORTUNES: Fortune[] = [
  {
    label: "極佳",
    title: "收束之外，出現了新的可能。",
    copy: "今天適合把延宕的決定推過臨界點。微小的行動，會在另一端形成清楚的回聲。",
    score: 96,
  },
  {
    label: "上昇",
    title: "世界線正向有利的位置偏移。",
    copy: "直覺比計畫更快抵達答案。留意午後出現的邀請，別忽略那個看似偶然的訊號。",
    score: 88,
  },
  {
    label: "安定",
    title: "吸引子場維持穩定收束。",
    copy: "今天不必急著改變所有事。守住節奏、完成眼前的一步，本身就是最好的推進。",
    score: 79,
  },
  {
    label: "微偏移",
    title: "細小變數正在暗處累積。",
    copy: "多確認一次訊息與時間，能避開不必要的誤差。晚上適合整理思緒，重新校準方向。",
    score: 71,
  },
  {
    label: "特異點",
    title: "今日觀測值無法被常規解釋。",
    copy: "計畫外的事反而可能帶來突破。保持好奇，但在做關鍵選擇前，先讓自己安靜十秒。",
    score: 84,
  },
];

const PLACEHOLDER_TIME = ["0", "0", ".", "0", "0", ".", "0", "0"];

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function getTimeChars(date: Date | null) {
  if (!date) return PLACEHOLDER_TIME;
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  return [hours[0], hours[1], ".", minutes[0], minutes[1], ".", seconds[0], seconds[1]];
}

function getWorldlineChars(reading: string) {
  const digits = reading.replace(".", "").padEnd(7, "0");
  return [digits[0], ".", ...digits.slice(1)];
}

function getDateKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function createWorldline() {
  const sample = new Uint32Array(1);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(sample);
  } else {
    sample[0] = Math.floor(Math.random() * 0xffffffff);
  }
  const raw = sample[0] % 2_000_000;
  const digits = String(raw).padStart(7, "0");
  return `${digits[0]}.${digits.slice(1)}`;
}

function loadWorldlineForDate(dateKey: string) {
  const storageKey = `divergence-meter:${dateKey}`;
  try {
    const saved = window.localStorage.getItem(storageKey);
    if (saved && /^[01]\.\d{6}$/.test(saved)) return saved;
    const generated = createWorldline();
    window.localStorage.setItem(storageKey, generated);
    return generated;
  } catch {
    return createWorldline();
  }
}

function getFortune(reading: string) {
  const hash = reading
    .replace(".", "")
    .split("")
    .reduce((total, digit, index) => total + Number(digit) * (index + 3), 0);
  return FORTUNES[hash % FORTUNES.length];
}

function Tube({ char, index, scanning }: { char: string; index: number; scanning: boolean }) {
  const isPoint = char === ".";
  return (
    <div className={`tube-unit${isPoint ? " point-tube" : ""}`} data-tube={index + 1}>
      <div className="tube-cap" aria-hidden="true" />
      <div className="tube-glass">
        <span className="getter" aria-hidden="true" />
        <span className="glass-shine" aria-hidden="true" />
        <span className="anode-mesh" aria-hidden="true" />
        {!isPoint && (
          <span className={`nixie-digit${scanning ? " is-scanning" : ""}`} aria-hidden="true">
            {char}
          </span>
        )}
        {isPoint && <span className="nixie-point" aria-hidden="true" />}
        <span className="cathode-traces" aria-hidden="true">0123456789</span>
      </div>
      <div className="tube-socket" aria-hidden="true">
        <span /><span /><span /><span /><span />
      </div>
    </div>
  );
}

export default function Home() {
  const [mode, setMode] = useState<Mode>("time");
  const [now, setNow] = useState<Date | null>(null);
  const [worldline, setWorldline] = useState("1.048596");
  const [scanning, setScanning] = useState(false);
  const [lockedCount, setLockedCount] = useState(8);
  const [noiseChars, setNoiseChars] = useState(() => Array(8).fill("0"));
  const scanInterval = useRef<number | null>(null);
  const scanTimeouts = useRef<number[]>([]);

  useEffect(() => {
    const immediate = window.setTimeout(() => setNow(new Date()), 0);
    const timer = window.setInterval(() => setNow(new Date()), 250);
    return () => {
      window.clearTimeout(immediate);
      window.clearInterval(timer);
    };
  }, []);

  const dateKey = now ? getDateKey(now) : null;

  useEffect(() => {
    if (!dateKey) return;
    const timer = window.setTimeout(() => setWorldline(loadWorldlineForDate(dateKey)), 0);
    return () => window.clearTimeout(timer);
  }, [dateKey]);

  const clearScan = useCallback(() => {
    if (scanInterval.current !== null) {
      window.clearInterval(scanInterval.current);
      scanInterval.current = null;
    }
    scanTimeouts.current.forEach((timer) => window.clearTimeout(timer));
    scanTimeouts.current = [];
  }, []);

  const runScan = useCallback(() => {
    clearScan();
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setScanning(false);
      setLockedCount(8);
      return;
    }
    setScanning(true);
    setLockedCount(0);
    scanInterval.current = window.setInterval(() => {
      setNoiseChars(Array.from({ length: 8 }, () => String(Math.floor(Math.random() * 10))));
    }, 58);

    for (let index = 0; index < 8; index += 1) {
      const timer = window.setTimeout(() => setLockedCount(index + 1), 500 + index * 92);
      scanTimeouts.current.push(timer);
    }

    const finishTimer = window.setTimeout(() => {
      if (scanInterval.current !== null) window.clearInterval(scanInterval.current);
      scanInterval.current = null;
      setLockedCount(8);
      setScanning(false);
    }, 500 + 8 * 92 + 140);
    scanTimeouts.current.push(finishTimer);
  }, [clearScan]);

  useEffect(() => clearScan, [clearScan]);

  const timeChars = useMemo(() => getTimeChars(now), [now]);
  const worldlineChars = useMemo(() => getWorldlineChars(worldline), [worldline]);
  const targetChars = mode === "time" ? timeChars : worldlineChars;
  const shownChars = targetChars.map((char, index) => {
    if (char === ".") return char;
    return scanning && index >= lockedCount ? noiseChars[index] : char;
  });

  const readableTime = now
    ? `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
    : "--:--:--";
  const readableDate = now
    ? new Intl.DateTimeFormat("zh-TW", { year: "numeric", month: "long", day: "numeric", weekday: "long" }).format(now)
    : "正在同步時間…";
  const zone = now ? Intl.DateTimeFormat().resolvedOptions().timeZone : "LOCAL";
  const fortune = useMemo(() => getFortune(worldline), [worldline]);
  const activeSegments = Math.round((fortune.score / 100) * 12);

  const switchMode = (nextMode: Mode) => {
    if (nextMode === mode) return;
    setMode(nextMode);
    runScan();
  };

  const deviceLabel = mode === "time"
    ? `目前時間 ${readableTime}`
    : `今日世界線變動率 ${worldline}，運勢 ${fortune.label}`;

  return (
    <main className="worldline-page">
      <div className="noise" aria-hidden="true" />
      <div className="ambient-orbit orbit-one" aria-hidden="true" />
      <div className="ambient-orbit orbit-two" aria-hidden="true" />

      <header className="site-header">
        <a className="wordmark" href="#observer" aria-label="回到世界線探測儀">
          <span className="wordmark-code">FGL // 204</span>
          <span className="wordmark-title">世界線探測儀</span>
        </a>

        <div className="mode-switch" aria-label="顯示模式">
          <span className={`switch-indicator ${mode}`} aria-hidden="true" />
          <button
            className={mode === "time" ? "active" : ""}
            type="button"
            aria-pressed={mode === "time"}
            onClick={() => switchMode("time")}
          >
            <span>01</span> 時間
          </button>
          <button
            className={mode === "worldline" ? "active" : ""}
            type="button"
            aria-pressed={mode === "worldline"}
            onClick={() => switchMode("worldline")}
          >
            <span>02</span> 世界線
          </button>
        </div>
      </header>

      <section className="hero" id="observer" aria-labelledby="hero-title">
        <div className="intro-panel" key={mode}>
          {mode === "time" ? (
            <>
              <p className="kicker"><span /> CHRONOGRAPH // ACTIVE</p>
              <h1 id="hero-title">時間仍在<br />向前運行。</h1>
              <div className="time-readout" aria-hidden="true">{readableTime}</div>
              <p className="date-line">{readableDate}</p>
              <div className="sync-row">
                <span className="sync-light" aria-hidden="true" />
                <span>SYNCHRONIZED</span>
                <i />
                <span>{zone}</span>
              </div>
            </>
          ) : (
            <>
              <p className="kicker"><span /> DIVERGENCE // OBSERVED</p>
              <h1 id="hero-title">今日的可能性，<br />已被觀測。</h1>
              <div className="fortune-result" aria-live="polite">
                <div className="fortune-heading">
                  <span>命運指數</span>
                  <strong>{fortune.score}<small>/100</small></strong>
                  <em>{fortune.label}</em>
                </div>
                <div className="signal-bar" aria-hidden="true">
                  {Array.from({ length: 12 }, (_, index) => (
                    <span className={index < activeSegments ? "lit" : ""} key={index} />
                  ))}
                </div>
                <h2>{fortune.title}</h2>
                <p>{fortune.copy}</p>
              </div>
              <button className="scan-button" type="button" onClick={runScan} disabled={scanning}>
                <span className="scan-icon" aria-hidden="true" />
                {scanning ? "觀測中…" : "再次觀測"}
              </button>
              <p className="daily-note">讀數儲存在此裝置，並於每日 00:00 重置。</p>
            </>
          )}
        </div>

        <div className="device-column">
          <div className="device-stage">
            <div className="device-aura" aria-hidden="true" />
            <div className={`device${scanning ? " scanning" : ""}`} role="img" aria-label={deviceLabel}>
              <div className="circuit-board">
                <div className="board-holes" aria-hidden="true" />
                <span className="board-stud stud-one" aria-hidden="true" />
                <span className="board-stud stud-two" aria-hidden="true" />
                <span className="board-stud stud-three" aria-hidden="true" />
                <span className="board-stud stud-four" aria-hidden="true" />

                <div className="tube-rack">
                  {shownChars.map((char, index) => (
                    <Tube char={char} index={index} scanning={scanning && index >= lockedCount} key={index} />
                  ))}
                </div>

                <div className="component-row" aria-hidden="true">
                  <span className="capacitor tall" />
                  <span className="capacitor short" />
                  <div className="resistor-bank amber">
                    {Array.from({ length: 7 }, (_, index) => <span key={index} />)}
                  </div>
                  <div className="resistor-bank blue">
                    {Array.from({ length: 4 }, (_, index) => <span key={index} />)}
                  </div>
                </div>
              </div>

              <div className="metal-base" aria-hidden="true">
                <span className="corner corner-left" />
                <span className="corner corner-right" />
                <span className="base-screw screw-left" />
                <span className="base-screw screw-right" />
                <span className="base-seam" />
              </div>
            </div>
            <div className="device-shadow" aria-hidden="true" />
          </div>

          <div className="device-legend">
            <span>{mode === "time" ? "LOCAL TIME" : "WORLD LINE"}</span>
            <i />
            <span>{mode === "time" ? "HH.MM.SS" : "DIVERGENCE RATIO"}</span>
            <strong>{mode === "time" ? readableTime : worldline}</strong>
          </div>
        </div>
      </section>

      <footer className="site-footer">
        <span>OPERATION SKULD</span>
        <i />
        <span>UNOFFICIAL OBSERVATION DEVICE</span>
        <i />
        <span>EL PSY KONGROO</span>
      </footer>
    </main>
  );
}
