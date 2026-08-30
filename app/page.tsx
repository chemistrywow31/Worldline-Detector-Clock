"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { DivergenceScene } from "./components/DivergenceScene";

type Mode = "time" | "worldline";
type Locale = "zh-TW" | "en" | "ja";

type Fortune = {
  label: string;
  title: string;
  copy: string;
};

const DESTINY_GATE_TITLE = "未知世界線のシュタインズ・ゲート";
const STEINS_GATE_READING = "1.048596";
const STEINS_GATE_VALUE = Number(STEINS_GATE_READING);

const LANGUAGE_OPTIONS: { locale: Locale; short: string; label: string }[] = [
  { locale: "zh-TW", short: "中", label: "繁體中文" },
  { locale: "en", short: "EN", label: "English" },
  { locale: "ja", short: "日", label: "日本語" },
];

const UI = {
  "zh-TW": {
    htmlLang: "zh-Hant",
    dateLocale: "zh-TW",
    metaTitle: `${DESTINY_GATE_TITLE}｜世界線探測儀`,
    brandTitle: "世界線探測儀",
    homeLabel: "回到世界線探測儀",
    languageLabel: "介面語言",
    modeLabel: "顯示模式",
    timeMode: "時間",
    worldlineMode: "世界線",
    fullscreen: "全螢幕",
    exitFullscreen: "退出全螢幕",
    timeKicker: "時序觀測 // 啟動 // El Psy Kongroo",
    titleMotto: "觀測未知的收束，選擇尚未抵達的結局。",
    syncingTime: "正在同步時間…",
    synchronized: "已同步",
    worldlineKicker: "分歧率 // 隨機觀測",
    worldlineHeading: ["此刻的", "可能性，", "已被觀測。"],
    fortuneIndex: "命運指數",
    targetLabel: "收束目標",
    distanceLabel: "觀測誤差",
    scanning: "觀測中…",
    rescan: "重新產生世界線",
    dailyNote: "每次觀測都會產生新讀數；越接近 1.048596，命運指數越高。",
    localDate: "當地日期",
    sceneHint: "移動指標檢視裝置",
    localTime: "當地時間",
    worldLine: "世界線",
    randomSample: "隨機樣本",
    unofficialDevice: "非官方觀測裝置",
    sceneLoading: "正在啟動光學觀測場…",
    deviceTimeLabel: (time: string) => `目前時間 ${time}`,
    deviceWorldlineLabel: (reading: string, fortune: string) => `本次世界線變動率 ${reading}，運勢 ${fortune}`,
  },
  en: {
    htmlLang: "en",
    dateLocale: "en-US",
    metaTitle: `${DESTINY_GATE_TITLE} | Worldline Detector`,
    brandTitle: "Worldline Detector",
    homeLabel: "Back to the Worldline Detector",
    languageLabel: "Interface language",
    modeLabel: "Display mode",
    timeMode: "Time",
    worldlineMode: "World Line",
    fullscreen: "Fullscreen",
    exitFullscreen: "Exit fullscreen",
    timeKicker: "CHRONOGRAPH // ACTIVE // El Psy Kongroo",
    titleMotto: "Observe the unknown convergence. Choose the ending not yet reached.",
    syncingTime: "Synchronizing time…",
    synchronized: "SYNCHRONIZED",
    worldlineKicker: "DIVERGENCE // RANDOMIZED",
    worldlineHeading: ["This moment's", "possibility", "has been observed."],
    fortuneIndex: "Fate Index",
    targetLabel: "CONVERGENCE TARGET",
    distanceLabel: "OBSERVATION ERROR",
    scanning: "Observing…",
    rescan: "Generate another world line",
    dailyNote: "Every observation produces a new reading. The closer it is to 1.048596, the higher the Fate Index.",
    localDate: "LOCAL DATE",
    sceneHint: "MOVE POINTER TO INSPECT",
    localTime: "LOCAL TIME",
    worldLine: "WORLD LINE",
    randomSample: "RANDOM SAMPLE",
    unofficialDevice: "UNOFFICIAL OBSERVATION DEVICE",
    sceneLoading: "INITIALIZING OPTICAL FIELD…",
    deviceTimeLabel: (time: string) => `Current time ${time}`,
    deviceWorldlineLabel: (reading: string, fortune: string) => `World-line divergence ${reading}; fortune ${fortune}`,
  },
  ja: {
    htmlLang: "ja",
    dateLocale: "ja-JP",
    metaTitle: `${DESTINY_GATE_TITLE}｜世界線観測機`,
    brandTitle: "世界線観測機",
    homeLabel: "世界線観測機に戻る",
    languageLabel: "表示言語",
    modeLabel: "表示モード",
    timeMode: "時刻",
    worldlineMode: "世界線",
    fullscreen: "全画面",
    exitFullscreen: "全画面を終了",
    timeKicker: "時系列観測 // 起動 // El Psy Kongroo",
    titleMotto: "未知なる収束を観測せよ。未だ至らぬ結末を選べ。",
    syncingTime: "時刻を同期中…",
    synchronized: "同期済み",
    worldlineKicker: "ダイバージェンス // 無作為観測",
    worldlineHeading: ["この瞬間の", "可能性は、", "観測された。"],
    fortuneIndex: "運命指数",
    targetLabel: "収束目標",
    distanceLabel: "観測誤差",
    scanning: "観測中…",
    rescan: "世界線を再観測",
    dailyNote: "観測ごとに新たな数値を生成。1.048596 に近いほど運命指数が上昇します。",
    localDate: "現地日付",
    sceneHint: "ポインターで装置を検分",
    localTime: "現地時刻",
    worldLine: "世界線",
    randomSample: "無作為サンプル",
    unofficialDevice: "非公式観測装置",
    sceneLoading: "光学観測場を起動中…",
    deviceTimeLabel: (time: string) => `現在時刻 ${time}`,
    deviceWorldlineLabel: (reading: string, fortune: string) => `世界線変動率 ${reading}、運勢 ${fortune}`,
  },
} satisfies Record<Locale, {
  htmlLang: string;
  dateLocale: string;
  metaTitle: string;
  brandTitle: string;
  homeLabel: string;
  languageLabel: string;
  modeLabel: string;
  timeMode: string;
  worldlineMode: string;
  fullscreen: string;
  exitFullscreen: string;
  timeKicker: string;
  titleMotto: string;
  syncingTime: string;
  synchronized: string;
  worldlineKicker: string;
  worldlineHeading: string[];
  fortuneIndex: string;
  targetLabel: string;
  distanceLabel: string;
  scanning: string;
  rescan: string;
  dailyNote: string;
  localDate: string;
  sceneHint: string;
  localTime: string;
  worldLine: string;
  randomSample: string;
  unofficialDevice: string;
  sceneLoading: string;
  deviceTimeLabel: (time: string) => string;
  deviceWorldlineLabel: (reading: string, fortune: string) => string;
}>;

const STEINS_GATE_RESULT: Record<Locale, Fortune> = {
  "zh-TW": {
    label: "命運石之門",
    title: "境界面上的命運石之門",
    copy: "觀測值與 1.048596 完全一致。既定收束已被欺騙，未知的門扉此刻開啟。",
  },
  en: {
    label: "STEINS;GATE",
    title: "Open the Steins Gate",
    copy: "The observed value matches 1.048596 exactly. Convergence has been deceived, and the gate to the unknown now stands open.",
  },
  ja: {
    label: "シュタインズ・ゲート",
    title: "境界面上のシュタインズゲート",
    copy: "観測値は 1.048596 と完全に一致。既定の収束は欺かれ、未知への門は開かれた。",
  },
};

const FORTUNES: Record<Locale, Fortune[]> = {
  "zh-TW": [
    {
      label: "極吉",
      title: "距離命運石之門，只餘一道觀測誤差。",
      copy: "收束正在鬆動。今日適合將擱置已久的決斷推過臨界點。",
    },
    {
      label: "上吉",
      title: "世界線正朝有利座標偏移。",
      copy: "直覺會比計畫更早抵達答案。別忽略那個看似偶然的訊號。",
    },
    {
      label: "安定",
      title: "吸引子場維持中性收束。",
      copy: "不必急著改寫一切。守住節奏、完成眼前一步，就能維持座標。",
    },
    {
      label: "偏移",
      title: "觀測值正逐漸遠離目標收束。",
      copy: "再確認一次訊息與時間。一個小小誤差，可能將你帶往另一條世界線。",
    },
    {
      label: "大凶",
      title: "世界線已逸出可預測的收束範圍。",
      copy: "今日先不要強行改寫結果。停下、校準，等待下一個可被觀測的訊號。",
    },
  ],
  en: [
    {
      label: "EXCEPTIONAL",
      title: "Only a margin of observation separates you from Steins Gate.",
      copy: "Convergence is beginning to loosen. Today favors pushing a long-delayed decision beyond its critical point.",
    },
    {
      label: "FAVORABLE",
      title: "The world line is shifting toward favorable coordinates.",
      copy: "Trust the answer that arrives before the plan. Do not dismiss the signal that looks like chance.",
    },
    {
      label: "STABLE",
      title: "The attractor field is holding a neutral convergence.",
      copy: "There is no need to rewrite everything. Keep your rhythm and finish the next step to hold your coordinates.",
    },
    {
      label: "DRIFTING",
      title: "The observed value is moving away from target convergence.",
      copy: "Double-check the message and the time. One small error may carry you onto another world line.",
    },
    {
      label: "CRITICAL",
      title: "The world line has escaped the predictable convergence range.",
      copy: "Do not force an outcome today. Stop, recalibrate, and wait for the next observable signal.",
    },
  ],
  ja: [
    {
      label: "大吉",
      title: "シュタインズ・ゲートまで、残るはわずかな観測誤差のみ。",
      copy: "収束は揺らぎ始めている。今日は、先送りにしてきた決断を臨界点の向こうへ進める好機。",
    },
    {
      label: "吉",
      title: "世界線は有利な座標へ偏移している。",
      copy: "計画より先にたどり着く直感を信じよ。偶然に見える信号を見逃すな。",
    },
    {
      label: "安定",
      title: "アトラクタフィールドは中立的な収束を維持。",
      copy: "すべてを書き換える必要はない。リズムを守り、目の前の一歩を完遂せよ。",
    },
    {
      label: "偏移",
      title: "観測値は目標となる収束から遠ざかっている。",
      copy: "メッセージと時刻を再確認せよ。わずかな誤差が、別の世界線へと導くことがある。",
    },
    {
      label: "大凶",
      title: "世界線は予測可能な収束領域を逸脱した。",
      copy: "今日は結果を無理に書き換えるな。立ち止まり、座標を再調整し、次の信号を待て。",
    },
  ],
};

function DestinyGateTitle() {
  return (
    <Image
      className="destiny-title-art"
      src="/unknown-worldline-steins-gate-wordmark.png"
      width="640"
      height="225"
      alt=""
      aria-hidden="true"
      priority
      sizes="(max-width: 720px) calc(100vw - 28px), (max-width: 1120px) 600px, 34vw"
      style={{ width: "100%", maxWidth: "100%", height: "auto", objectFit: "contain", mixBlendMode: "lighten" }}
    />
  );
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function getClockReading(date: Date | null) {
  if (!date) return "0.000000";
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  return `0.${hours}${minutes}${seconds}`;
}

function getTimeChars(date: Date | null) {
  return getWorldlineChars(getClockReading(date));
}

function getWorldlineChars(reading: string) {
  const digits = reading.replace(".", "").padEnd(7, "0");
  return [digits[0], ".", ...digits.slice(1)];
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

function getFortune(reading: string, locale: Locale) {
  const distance = Math.abs(Number(reading) - STEINS_GATE_VALUE);

  if (distance === 0) {
    return {
      ...STEINS_GATE_RESULT[locale],
      score: 100,
      distance: 0,
      isSteinsGate: true,
    };
  }

  const normalizedCloseness = 1 - Math.min(distance, STEINS_GATE_VALUE) / STEINS_GATE_VALUE;
  const score = Math.min(99, Math.max(0, Math.round(normalizedCloseness * 100)));
  const tierIndex = score >= 85 ? 0 : score >= 65 ? 1 : score >= 45 ? 2 : score >= 25 ? 3 : 4;

  return {
    ...FORTUNES[locale][tierIndex],
    score,
    distance,
    isSteinsGate: false,
  };
}

export default function Home() {
  const [mode, setMode] = useState<Mode>("time");
  const [locale, setLocale] = useState<Locale>("zh-TW");
  const [now, setNow] = useState<Date | null>(null);
  const [worldline, setWorldline] = useState(() => createWorldline());
  const [scanning, setScanning] = useState(false);
  const [lockedCount, setLockedCount] = useState(8);
  const [noiseChars, setNoiseChars] = useState(() => Array(8).fill("0"));
  const scanInterval = useRef<number | null>(null);
  const scanTimeouts = useRef<number[]>([]);
  const sceneFrameRef = useRef<HTMLDivElement>(null);
  const t = UI[locale];

  useEffect(() => {
    const immediate = window.setTimeout(() => setNow(new Date()), 0);
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => {
      window.clearTimeout(immediate);
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    document.documentElement.lang = t.htmlLang;
    document.title = t.metaTitle;
  }, [t.htmlLang, t.metaTitle]);

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
  const clockReading = getClockReading(now);
  const readableDate = now
    ? new Intl.DateTimeFormat(t.dateLocale, { year: "numeric", month: "long", day: "numeric", weekday: "long" }).format(now)
    : t.syncingTime;
  const numericDate = now
    ? `${now.getFullYear()}.${pad(now.getMonth() + 1)}.${pad(now.getDate())}`
    : "----.--.--";
  const isoDate = now
    ? `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
    : undefined;
  const weekday = now
    ? new Intl.DateTimeFormat(t.dateLocale, { weekday: "long" }).format(now)
    : "—";
  const zone = now ? Intl.DateTimeFormat().resolvedOptions().timeZone : "LOCAL";
  const fortune = useMemo(() => getFortune(worldline, locale), [worldline, locale]);
  const activeSegments = fortune.score === 100
    ? 12
    : Math.min(11, Math.round((fortune.score / 100) * 12));

  const switchMode = (nextMode: Mode) => {
    if (nextMode === mode) return;
    if (nextMode === "worldline") setWorldline(createWorldline());
    setMode(nextMode);
    runScan();
  };

  const observeWorldline = () => {
    setWorldline(createWorldline());
    runScan();
  };

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement === sceneFrameRef.current) {
        await document.exitFullscreen();
      } else {
        await sceneFrameRef.current?.requestFullscreen();
      }
    } catch {
      // Browsers may reject fullscreen when it is disabled by device policy.
    }
  };

  const deviceLabel = mode === "time"
    ? t.deviceTimeLabel(readableTime)
    : t.deviceWorldlineLabel(worldline, fortune.label);

  return (
    <main className="worldline-page" data-locale={locale}>
      <div className="noise" aria-hidden="true" />
      <div className="ambient-orbit orbit-one" aria-hidden="true" />
      <div className="ambient-orbit orbit-two" aria-hidden="true" />

      <header className="site-header">
        <div className="brand-lockup">
          <span className="page-emblem" aria-hidden="true" />
          <a className="wordmark" href="#observer" aria-label={t.homeLabel}>
            <span className="wordmark-code">FGL</span>
            <span className="wordmark-title">{t.brandTitle}</span>
          </a>
        </div>

        <div className="header-actions">
          <div className="language-switch" role="group" aria-label={t.languageLabel}>
            {LANGUAGE_OPTIONS.map((option) => (
              <button
                className={locale === option.locale ? "active" : ""}
                key={option.locale}
                type="button"
                aria-label={option.label}
                aria-pressed={locale === option.locale}
                title={option.label}
                onClick={() => setLocale(option.locale)}
              >
                {option.short}
              </button>
            ))}
          </div>
          <div className="mode-switch" aria-label={t.modeLabel}>
            <span className={`switch-indicator ${mode}`} aria-hidden="true" />
            <button
              className={mode === "time" ? "active" : ""}
              type="button"
              aria-pressed={mode === "time"}
              onClick={() => switchMode("time")}
            >
              <span>01</span> {t.timeMode}
            </button>
            <button
              className={mode === "worldline" ? "active" : ""}
              type="button"
              aria-pressed={mode === "worldline"}
              onClick={() => switchMode("worldline")}
            >
              <span>02</span> {t.worldlineMode}
            </button>
          </div>
          <button className="fullscreen-trigger" type="button" onClick={toggleFullscreen}>
            <span className="fullscreen-icon" aria-hidden="true" />
            <span className="fullscreen-label">{t.fullscreen}</span>
          </button>
        </div>
      </header>

      <section className="hero" id="observer" aria-labelledby="hero-title">
        <div className="intro-panel" key={`${mode}-${locale}`}>
          {mode === "time" ? (
            <>
              <p className="kicker"><span /> {t.timeKicker}</p>
              <h1 className="destiny-heading" id="hero-title">
                <span className="sr-only">{DESTINY_GATE_TITLE}</span>
                <DestinyGateTitle />
              </h1>
              <p className="destiny-title-motto">{t.titleMotto}</p>
              <div className="time-readout" aria-hidden="true">{clockReading}</div>
              <p className="date-line">{readableDate}</p>
              <div className="sync-row">
                <span className="sync-light" aria-hidden="true" />
                <span>{t.synchronized}</span>
                <i />
                <span>{zone}</span>
              </div>
            </>
          ) : (
            <>
              <p className="kicker"><span /> {t.worldlineKicker}</p>
              <h1 className="worldline-heading" id="hero-title">
                {t.worldlineHeading.map((line, index) => (
                  <span key={line}>{line}{index < t.worldlineHeading.length - 1 && <br />}</span>
                ))}
              </h1>
              <div className={`fortune-result ${fortune.isSteinsGate ? "steins-gate-result" : ""}`} aria-live="polite">
                <div className="fortune-heading">
                  <span>{t.fortuneIndex}</span>
                  <strong>{fortune.score}<small>/100</small></strong>
                  <em>{fortune.label}</em>
                </div>
                <div className="signal-bar" aria-hidden="true">
                  {Array.from({ length: 12 }, (_, index) => (
                    <span className={index < activeSegments ? "lit" : ""} key={index} />
                  ))}
                </div>
                <dl className="fortune-coordinate">
                  <div>
                    <dt>{t.targetLabel}</dt>
                    <dd>{STEINS_GATE_READING}</dd>
                  </div>
                  <div>
                    <dt>{t.distanceLabel}</dt>
                    <dd><code>Δ {fortune.distance.toFixed(6)}</code></dd>
                  </div>
                </dl>
                <h2>{fortune.title}</h2>
                <p>{fortune.copy}</p>
              </div>
              <button className="scan-button" type="button" onClick={observeWorldline} disabled={scanning}>
                <span className="scan-icon" aria-hidden="true" />
                {scanning ? t.scanning : t.rescan}
              </button>
              <p className="daily-note">{t.dailyNote}</p>
            </>
          )}
        </div>

        <div className="device-column">
          <div className="device-stage">
            <div className="device-aura" aria-hidden="true" />
            <div className="scene-frame" role="img" aria-label={deviceLabel} ref={sceneFrameRef}>
              <DivergenceScene chars={shownChars} scanning={scanning} loadingLabel={t.sceneLoading} />
              <time className="scene-date" dateTime={isoDate}>
                <span>{t.localDate}</span>
                <strong>{numericDate}</strong>
                <em>{weekday}</em>
              </time>
              <div className="scene-hint" aria-hidden="true">{t.sceneHint}</div>
              <button className="fullscreen-exit" type="button" onClick={toggleFullscreen} aria-label={t.exitFullscreen}>
                <span aria-hidden="true" />
              </button>
              <span className="scene-corner corner-tl" aria-hidden="true" />
              <span className="scene-corner corner-br" aria-hidden="true" />
            </div>
          </div>

          <div className="device-legend">
            <span>{mode === "time" ? t.localTime : t.worldLine}</span>
            <i />
            <span>{mode === "time" ? "0.HHMMSS" : t.randomSample}</span>
            <strong>{mode === "time" ? clockReading : worldline}</strong>
          </div>
        </div>
      </section>

      <footer className="site-footer">
        <span>OPERATION SKULD</span>
        <i />
        <span>{t.unofficialDevice}</span>
        <i />
        <span>EL PSY KONGROO</span>
      </footer>
    </main>
  );
}
