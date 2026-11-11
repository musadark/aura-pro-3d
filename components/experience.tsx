"use client";
import { useEffect, useRef, useState } from "react";
import type { SceneController } from "@/lib/aura-scene";

const chapters = [
  { id: "origin", name: "Начало" }, { id: "sound", name: "Погружение" },
  { id: "design", name: "Дизайн" }, { id: "case", name: "С собой" },
];

export default function Experience() {
  const root = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const controller = useRef<SceneController | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const [chapter, setChapter] = useState(0);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [motionOverride, setMotionOverride] = useState<boolean | null>(null);
  const [reduced, setReduced] = useState(false);
  const motionEnabled = motionOverride ?? !reduced;
  const motionPreference = useRef(motionEnabled);
  motionPreference.current = motionEnabled;
  const [finish, setFinish] = useState<"graphite" | "pearl">("graphite");
  const [angle, setAngle] = useState(0);

  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(media.matches);
    try {
      const saved = sessionStorage.getItem("aura-motion");
      if (saved !== null) setMotionOverride(saved === "on");
    } catch { /* The switch also works when browser storage is unavailable. */ }
    sync(); media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);
  useEffect(() => {
    let cancelled = false;
    import("@/lib/aura-scene").then(({ createAuraScene }) => {
      if (cancelled || !canvas.current || !root.current) return;
      try {
        controller.current = createAuraScene(canvas.current, root.current, {
          onChapter: setChapter,
          onReady: () => { setFailed(false); setReady(true); },
          onError: () => { setFailed(true); setReady(false); },
        });
        controller.current.setMotion(motionPreference.current);
      } catch { setFailed(true); }
    }).catch(() => setFailed(true));
    return () => { cancelled = true; controller.current?.dispose(); controller.current = null; };
  }, []);
  useEffect(() => { controller.current?.setMotion(motionEnabled); }, [motionEnabled, ready]);
  useEffect(() => { controller.current?.setFinish(finish); }, [finish, ready]);
  useEffect(() => { controller.current?.setAngle(angle * Math.PI / 180); }, [angle, ready]);

  // Keep the same chapters navigable if WebGL is unavailable.
  useEffect(() => {
    if (!failed) return;
    const update = () => {
      if (!root.current) return;
      const box = root.current.getBoundingClientRect();
      const progress = Math.max(0, Math.min(3, -box.top / Math.max(1, box.height - innerHeight) * 3));
      const index = Math.round(progress);
      setChapter(index);
      root.current.style.setProperty("--progress", String(progress / 3));
      root.current.style.setProperty("--light", index === 2 ? "1" : "0");
      root.current.style.setProperty("--origin-title", index === 0 ? ".07" : "0");
      root.current.style.setProperty("--pro-title", index === 2 ? ".14" : "0");
      root.current.style.setProperty("--final-title", index === 3 ? ".8" : "0");
    };
    update(); addEventListener("scroll", update, { passive: true }); addEventListener("resize", update);
    return () => { removeEventListener("scroll", update); removeEventListener("resize", update); };
  }, [failed]);

  function navigate(index: number) {
    if (!root.current) return;
    const y = root.current.offsetTop + (root.current.offsetHeight - innerHeight) * index / 3;
    history.replaceState(null, "", `#${chapters[index].id}`);
    scrollTo({ top: y, behavior: motionEnabled ? "smooth" : "instant" });
  }
  function toggleMotion() {
    const next = !motionEnabled;
    setMotionOverride(next);
    try { sessionStorage.setItem("aura-motion", next ? "on" : "off"); } catch { /* Optional persistence. */ }
  }
  useEffect(() => {
    const initial = chapters.findIndex(c => `#${c.id}` === location.hash);
    if (initial > 0) requestAnimationFrame(() => navigate(initial));
    // Initial hash only; scrolling stays native.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  function openDetails(event: React.MouseEvent<HTMLButtonElement>) {
    trigger.current = event.currentTarget; dialog.current?.showModal();
  }
  function chapterLink(index: number, text: React.ReactNode, className = "") {
    return <a className={className} href={`#${chapters[index].id}`} onClick={e => { e.preventDefault(); navigate(index); }}>{text}</a>;
  }

  return <>
    <a className="skip-link" href="#experience-content" onClick={() => navigate(0)}>К описанию</a>
    <main ref={root} className={`experience ${failed ? "fallback" : ""}`} data-chapter={chapter} data-motion={motionEnabled ? "on" : "off"}>
      <div className="stage">
        <div className="atmosphere" aria-hidden="true"><div className="light-shaft" /><div className="grain" /></div>
        <div className="large-type type-origin" aria-hidden="true">AURA</div>
        <div className="large-type type-pro" aria-hidden="true">PRO</div>
        <div className="large-type type-finale" aria-hidden="true">KEEP LISTENING</div>
        <div className="scene" role="img" aria-label="Трёхмерная композиция: пара наушников AURA PRO, каменные скалы и зарядный кейс">
          <img className={`poster ${ready ? "is-hidden" : ""}`} src="./poster.svg" alt="" />
          <canvas ref={canvas} className={ready ? "is-ready" : ""} aria-hidden="true" />
        </div>
        <header className="header">
          {chapterLink(0, <><span className="brand-icon" aria-hidden="true">◒</span> AURA<span className="brand-period">®</span></>, "brand")}
          <nav aria-label="Основная навигация">{chapterLink(1, "Погружение")}{chapterLink(2, "Дизайн")}{chapterLink(3, "AURA PRO", "nav-product")}</nav>
          <button className="motion-button" onClick={toggleMotion} aria-pressed={!motionEnabled} aria-label={motionEnabled ? "Остановить анимацию" : "Включить плавную анимацию"}>
            <span className={`equalizer ${!motionEnabled ? "paused" : ""}`} aria-hidden="true"><i /><i /><i /><i /></span><span>{motionEnabled ? "Движение" : "Статика"}</span>
          </button>
        </header>
        <nav className="chapter-nav" aria-label="Сцены">
          {chapters.map((item, index) => <a href={`#${item.id}`} key={item.id} aria-label={`${index + 1}. ${item.name}`} aria-current={chapter === index ? "step" : undefined} onClick={e => { e.preventDefault(); navigate(index); }}><span className="chapter-line" /><span className="chapter-number">0{index + 1}</span><span className="chapter-name">{item.name}</span></a>)}
        </nav>
        <div id="experience-content" className="copy-layer" tabIndex={-1}>
          <section className="copy-panel hero-panel" aria-hidden={chapter !== 0} inert={chapter !== 0}>
            <p className="eyebrow"><span className="signal" /> AURA PRO / SOUND IN ITS PUREST FORM</p>
            <h1>Тише мир.<br /><span>Ближе музыка.</span></h1>
            <p className="description">Оставь лишнее за пределами звука.<br />Только ты. И то, что хочется слышать.</p>
            {chapterLink(1, <>Начать погружение <span aria-hidden="true">↘</span></>, "text-link")}
          </section>
          <section className="copy-panel sound-panel" aria-hidden={chapter !== 1} inert={chapter !== 1}>
            <p className="eyebrow">01 / ПОГРУЖЕНИЕ</p><h2>Твой звук.<br /><span>Твоё пространство.</span></h2>
            <p className="description">Между тобой и музыкой —<br />ничего лишнего.</p><span className="detail-rule" /><p className="micro">ВДОХНОВЛЕНО ТИШИНОЙ</p>
          </section>
          <section className="copy-panel design-panel" aria-hidden={chapter !== 2} inert={chapter !== 2}>
            <div><p className="eyebrow">02 / ФОРМА И СВЕТ</p><h2>Маленькая форма.<br />Большое впечатление.</h2></div>
            <div className="design-note"><span className="note-mark">↗</span><p>Мягкие линии.<br />Графитовый блеск.<br />Каждая деталь на своём месте.</p><span className="micro">AURA — DESIGN STUDY 001</span></div>
          </section>
          <section className="copy-panel case-panel" aria-hidden={chapter !== 3} inert={chapter !== 3}>
            <p className="eyebrow">03 / ВСЕГДА РЯДОМ</p><h2>У музыки<br />есть свой дом.</h2>
            <p className="description">Одна история. Два наушника.<br />Продолжение — с тобой.</p>
            <button className="pill-button" onClick={openDetails}>Рассмотреть AURA PRO <span aria-hidden="true">↗</span></button>
          </section>
        </div>
        <div className="model-label" aria-hidden="true"><span className="tiny-cross">+</span><span>AURA PRO<br /><small>{finish === "graphite" ? "GRAPHITE" : "PEARL"} / CONCEPT 001</small></span></div>
        <footer className="stage-footer">
          <span className="edition">КОНЦЕПТ НАУШНИКОВ <span>—</span> 2026</span>
          <button className="scroll-cue" onClick={() => navigate(chapter === 3 ? 0 : chapter + 1)}><span>{chapter === 3 ? "Вернуться к началу" : "Прокрути, чтобы исследовать"}</span><span aria-hidden="true">{chapter === 3 ? "↑" : "↓"}</span></button>
          <span className="scene-counter">0{chapter + 1} <span>/ 04</span></span>
        </footer>
        <div className="progress-track" aria-hidden="true"><div /></div>
      </div>
      {chapters.map((item, index) => <span key={item.id} id={item.id} className="chapter-target" style={{ top: `${index * 100 / 3}%` }} aria-hidden="true" />)}
    </main>
    <dialog ref={dialog} className="model-dialog" onClose={() => trigger.current?.focus()} onClick={e => { if (e.target === dialog.current) dialog.current.close(); }}>
      <div className="dialog-content">
        <button className="close-dialog" onClick={() => dialog.current?.close()} aria-label="Закрыть">×</button>
        <p className="eyebrow">AURA / DESIGN STUDY 001</p><h2>В деталях.</h2><p>Концепт наушников AURA PRO.<br />Выбери оттенок и свой ракурс.</p>
        <fieldset className="finishes"><legend>Отделка</legend>{(["graphite", "pearl"] as const).map(value => <button key={value} className={`finish ${value}`} aria-pressed={finish === value} onClick={() => setFinish(value)}><span />{value === "graphite" ? "Графит" : "Жемчуг"}</button>)}</fieldset>
        <label className="rotation-control">Поворот модели <output>{angle}°</output><input type="range" min="-180" max="180" value={angle} onChange={e => setAngle(Number(e.target.value))} /></label>
        <button className="pill-button" onClick={() => dialog.current?.close()}>Посмотреть результат <span aria-hidden="true">↗</span></button>
        <p className="concept-note">Вымышленный бренд и демонстрационная модель. Сайт не принимает заказы.</p>
      </div>
    </dialog>
    <noscript><div className="no-script">AURA PRO — концепт наушников. Для интерактивного путешествия включи JavaScript.</div></noscript>
  </>;
}
