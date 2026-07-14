"use client";

import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import AdminClient from "./admin/admin-client";
import { buildUniqueQuestionPool, getAssessmentCriteria, getPapers, getRelevantTopics, Level, Question, subjectCatalog, subjects } from "./data";
import { BrandLockup, BrandLogo } from "./logo";
import { buildTestPlan, isSingleTopicPaper, topicLimitFor, type TestMode } from "./test-policy";

type Stage = "loading" | "signin" | "recovery-code" | "account" | "premium" | "admin" | "onboarding" | "home" | "reports" | "status" | "mistakes" | "setup" | "test" | "result";
type Answers = Record<string, string>;
type TopicScore = { code: string; title: string; percent: number; possible: number; earned: number };
type CriterionScore = { code: string; name: string; description: string; percent: number; possible: number; earned: number };
type Mistake = { id: string; topicCode: string; topicTitle: string; prompt: string; modelAnswer: string; answer: string; skill: string };
type Attempt = {
  id: number; subjectId: string; subjectName: string; level: string; paperId: string; paperName: string;
  mode: TestMode; percent: number; grade: number; durationSeconds: number; topicBreakdown: TopicScore[]; criteriaBreakdown: CriterionScore[];
  questionIds: string[]; difficultyTrail: string[]; mistakes: Mistake[]; createdAt: string;
};
type PremiumRequest = {
  id: number; amountKrw: number; paymentMethod: "bank_transfer" | "paypal" | "other"; payerName: string;
  paymentReference: string; note: string; status: "pending" | "approved" | "rejected"; adminNote: string;
  createdAt: string; reviewedAt: string | null;
};
type MeData = {
  user: { email: string; displayName: string; isAdmin: boolean };
  premium: boolean;
  premiumRequest: PremiumRequest | null;
  selectedSubjects: string[];
  subjectLevels: Record<string, Level>;
  attempts: Attempt[];
};

const SITES_ORIGIN = "https://ib-subject-diagnostic.justinamwoo.chatgpt.site";
const isStaticPages = () => typeof window !== "undefined" && window.location.hostname.endsWith("github.io");
const apiFetch = (path: string, init: RequestInit = {}) => {
  const token = typeof window !== "undefined" ? localStorage.getItem("ibsd-session-token") : null;
  const headers = new Headers(init.headers);
  if (token) headers.set("authorization", `Bearer ${token}`);
  return fetch(`${isStaticPages() ? SITES_ORIGIN : ""}${path}`, { ...init, headers });
};

const gradeFromPercent = (percent: number) => percent >= 84 ? 7 : percent >= 72 ? 6 : percent >= 60 ? 5 : percent >= 48 ? 4 : percent >= 36 ? 3 : percent >= 22 ? 2 : 1;
const normalize = (value: string) => value.toLocaleLowerCase().replace(/[–—]/g, "-").replace(/[^\p{L}\p{N}\s-]/gu, " ");
const formatTime = (seconds: number) => `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
const formatDuration = (seconds: number) => seconds ? `${Math.floor(seconds / 60)}m ${seconds % 60}s` : "—";

type ThemeName = "blue" | "teal" | "violet" | "rose" | "orange" | "slate";
const themes: Record<ThemeName, { name: string; blue: string; navy: string; soft: string; line: string; rgb: string }> = {
  blue: { name: "Blue", blue: "#155eef", navy: "#0b2d6b", soft: "#eaf2ff", line: "#d9e5f5", rgb: "21,94,239" },
  teal: { name: "Teal", blue: "#087f75", navy: "#074f4a", soft: "#e5f7f4", line: "#cfe8e4", rgb: "8,127,117" },
  violet: { name: "Violet", blue: "#7357d9", navy: "#3d2d7a", soft: "#f0ecff", line: "#dfd8f5", rgb: "115,87,217" },
  rose: { name: "Rose", blue: "#c7446b", navy: "#762640", soft: "#fdeaf0", line: "#f0d5de", rgb: "199,68,107" },
  orange: { name: "Orange", blue: "#c76319", navy: "#74380d", soft: "#fff0e4", line: "#f1ddce", rgb: "199,99,25" },
  slate: { name: "Slate", blue: "#42617d", navy: "#21394f", soft: "#eaf0f5", line: "#d7e0e7", rgb: "66,97,125" },
};

function applyTheme(name: ThemeName) {
  const theme = themes[name]; const root = document.documentElement;
  root.style.setProperty("--blue", theme.blue); root.style.setProperty("--navy", theme.navy);
  root.style.setProperty("--subject", theme.blue); root.style.setProperty("--subject-soft", theme.soft);
  root.style.setProperty("--wash", theme.soft); root.style.setProperty("--line", theme.line); root.style.setProperty("--theme-rgb", theme.rgb);
}

function ThemePicker({ value, onChange }: { value: ThemeName; onChange: (theme: ThemeName) => void }) {
  return <details className="theme-picker"><summary aria-label="Choose site theme color" title="Theme color"/><div className="theme-menu">{(Object.entries(themes) as Array<[ThemeName, (typeof themes)[ThemeName]]>).map(([key, theme]) => <button type="button" key={key} className={value === key ? "active" : ""} aria-label={`${theme.name} theme`} title={theme.name} style={{ "--swatch": theme.blue } as React.CSSProperties} onClick={(event) => { onChange(key); (event.currentTarget.closest("details") as HTMLDetailsElement | null)?.removeAttribute("open"); }}><i/></button>)}</div></details>;
}

function scoreQuestion(question: Question, answer: string) {
  if (!answer) return 0;
  if (question.responseType === "mcq") return Number(answer) === question.correctIndex ? question.marks : 0;
  if (question.responseType === "diagram") {
    try {
      const diagram = JSON.parse(answer) as { paths?: string[]; labels?: Array<{ text?: string }>; explanation?: string };
      const explanation = diagram.explanation ?? "";
      const response = normalize(explanation);
      const hits = question.keywords.filter((keyword) => response.includes(normalize(keyword))).length / Math.max(question.keywords.length, 1);
      const structure = Math.min(((diagram.paths?.length ?? 0) / 4) * .65 + ((diagram.labels?.filter((label) => label.text?.trim()).length ?? 0) / 4) * .35, 1);
      const development = Math.min(explanation.trim().length / 180, 1);
      return Math.round(question.marks * Math.min(structure * .42 + hits * .38 + development * .2, 1));
    } catch { return 0; }
  }
  const response = normalize(answer);
  const hits = question.keywords.filter((keyword) => response.includes(normalize(keyword))).length;
  const coverage = hits / Math.max(question.keywords.length, 1);
  const development = Math.min(answer.trim().length / (question.responseType === "extended" ? 900 : question.responseType === "code" ? 140 : 110), 1);
  const languageResponse = question.responseType === "extended" && Boolean(question.criterionCodes?.length);
  return Math.round(question.marks * Math.min(languageResponse ? coverage * .38 + development * .62 : coverage * 0.72 + development * 0.28, 1));
}

function scoreCriterion(question: Question, answer: string, criterion: { name: string; keywords?: string[] }) {
  if (!answer.trim()) return 0;
  if (question.responseType === "mcq") return scoreQuestion(question, answer);
  const lower = answer.toLowerCase();
  const words = answer.trim().split(/\s+/).filter(Boolean);
  const characterCount = Array.from(answer.replace(/\s/g, "")).length;
  const paragraphs = answer.split(/\n\s*\n/).filter((part) => part.trim()).length;
  const name = criterion.name.toLowerCase();
  const topicHits = question.keywords.filter((keyword) => lower.includes(keyword.toLowerCase())).length / Math.max(question.keywords.length, 1);
  const analysisTerms = ["because", "therefore", "suggests", "implies", "effect", "however", "왜냐하면", "따라서", "보여준다", "효과", "그러나", "parce que", "donc", "suggère", "effet", "cependant", "perché", "quindi", "suggerisce", "effetto", "tuttavia", "因此", "说明", "效果", "然而", "なぜなら", "したがって", "示して", "効果", "しかし"];
  const organizationTerms = ["however", "therefore", "furthermore", "in contrast", "overall", "그러나", "따라서", "더 나아가", "반면", "종합하면", "cependant", "donc", "en revanche", "dans l'ensemble", "tuttavia", "quindi", "invece", "nel complesso", "然而", "因此", "相比之下", "总的来说", "しかし", "したがって", "一方", "全体として"];
  const analysisHits = analysisTerms.filter((term) => lower.includes(term)).length / 4;
  const evidenceHits = [/“[^”]+”/, /「[^」]+」/, /『[^』]+』/, /"[^"]+"/, /for example|예를 들어|par exemple|per esempio|例如|例えば/i, /evidence|근거|preuve|prova|证据|根拠/i].filter((pattern) => pattern.test(answer)).length / 2;
  const organization = Math.min((paragraphs >= 2 ? .55 : .25) + (organizationTerms.filter((term) => lower.includes(term)).length * .12), 1);
  const lengthControl = Math.min(Math.max(words.length / (question.responseType === "extended" ? 180 : 70), characterCount / (question.responseType === "extended" ? 650 : 220)), 1);
  const lexicalVariety = Math.min(new Set(Array.from(normalize(answer).replace(/\s/g, ""))).size / Math.max(characterCount, 1) * 4, 1);
  const language = lengthControl * .62 + lexicalVariety * .38;
  let coverage = topicHits;
  if (name.includes("analysis") || name.includes("evaluation")) coverage = Math.min(analysisHits * .55 + evidenceHits * .45, 1);
  else if (name.includes("focus") || name.includes("organization")) coverage = organization;
  else if (name.includes("language")) coverage = Math.min(language, 1);
  else if (name.includes("message")) coverage = Math.min(topicHits * .55 + Math.min(words.length / 120, 1) * .45, 1);
  else if (name.includes("conceptual")) coverage = Math.min(organization * .35 + topicHits * .35 + (/(audience|purpose|register|format|tone)/i.test(answer) ? .3 : 0), 1);
  else if (name.includes("knowledge") || name.includes("interpretation")) coverage = Math.min(topicHits * .5 + evidenceHits * .5, 1);
  else if (name.includes("receptive")) return scoreQuestion(question, answer);
  return Math.round(question.marks * Math.min(coverage, 1));
}

export default function DiagnosticClient({ initialName }: { initialName: string }) {
  const [stage, setStage] = useState<Stage>("loading");
  const [authMode, setAuthMode] = useState<"login" | "register" | "reset">("login");
  const [authUsername, setAuthUsername] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [adminSetupCode, setAdminSetupCode] = useState("");
  const [authRecoveryCode, setAuthRecoveryCode] = useState("");
  const [issuedRecoveryCode, setIssuedRecoveryCode] = useState("");
  const [authNotice, setAuthNotice] = useState("");
  const [authError, setAuthError] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [me, setMe] = useState<MeData | null>(null);
  const [subjectId, setSubjectId] = useState(subjects[0].id);
  const [level, setLevel] = useState<Level>("HL");
  const [paperId, setPaperId] = useState("p1");
  const [testMode, setTestMode] = useState<TestMode>("diagnostic");
  const [codeLanguage, setCodeLanguage] = useState<"python" | "java">("python");
  const [selectedTopicCodes, setSelectedTopicCodes] = useState<string[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionPool, setQuestionPool] = useState<Question[]>([]);
  const [targetQuestionCount, setTargetQuestionCount] = useState(8);
  const [adaptiveLevel, setAdaptiveLevel] = useState(3);
  const [difficultyTrail, setDifficultyTrail] = useState<string[]>([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [startedAt, setStartedAt] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [timeLimit, setTimeLimit] = useState(0);
  const [plannedMinutes, setPlannedMinutes] = useState(60);
  const [savedResult, setSavedResult] = useState<{ percent: number; grade: number; comparison: Attempt | null; durationSeconds: number } | null>(null);
  const [saveError, setSaveError] = useState("");
  const [theme, setTheme] = useState<ThemeName>("blue");
  const [levelSaving, setLevelSaving] = useState(false);
  const [levelSaveStatus, setLevelSaveStatus] = useState("");
  const [premiumAmount, setPremiumAmount] = useState("");
  const [premiumMethod, setPremiumMethod] = useState<PremiumRequest["paymentMethod"]>("bank_transfer");
  const [premiumPayer, setPremiumPayer] = useState("");
  const [premiumReference, setPremiumReference] = useState("");
  const [premiumNote, setPremiumNote] = useState("");
  const [premiumBusy, setPremiumBusy] = useState(false);
  const [premiumMessage, setPremiumMessage] = useState("");
  const finishGuard = useRef(false);

  useEffect(() => {
    const saved = localStorage.getItem("ibsd-theme") as ThemeName | null;
    const next = saved && themes[saved] ? saved : "blue";
    const frame = window.requestAnimationFrame(() => { setTheme(next); applyTheme(next); });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const changeTheme = (next: ThemeName) => { setTheme(next); applyTheme(next); localStorage.setItem("ibsd-theme", next); };

  const loadMe = async (nextStage = true) => {
    const response = await apiFetch("/api/me", { cache: "no-store" });
    if (!response.ok) throw new Error("Could not load your account.");
    const data = await response.json() as MeData;
    setMe(data);
    if (nextStage) setStage(data.selectedSubjects.length === 6 ? "home" : "onboarding");
    return data;
  };

  const submitAuth = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthBusy(true); setAuthError(""); setAuthNotice("");
    try {
      const endpoint = authMode === "login" ? "login" : authMode === "register" ? "register" : "reset-password";
      const response = await apiFetch(`/api/auth/${endpoint}`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify(authMode === "reset"
          ? { username: authUsername, recoveryCode: authRecoveryCode, newPassword: authPassword }
          : { username: authUsername, password: authPassword, adminCode: adminSetupCode }),
      });
      const data = await response.json() as { error?: string; token?: string; recoveryCode?: string; message?: string };
      if (!response.ok) { setAuthError(data.error ?? "Could not complete the request."); return; }
      if (authMode === "reset") {
        setAuthMode("login"); setAuthPassword(""); setAuthRecoveryCode("");
        setAuthNotice(data.message ?? "Password reset complete. Log in with your new password.");
        return;
      }
      if (isStaticPages() && data.token) localStorage.setItem("ibsd-session-token", data.token);
      setAuthPassword(""); setAdminSetupCode("");
      if (authMode === "register" && data.recoveryCode) {
        setIssuedRecoveryCode(data.recoveryCode); setStage("recovery-code");
        return;
      }
      await loadMe();
    } catch { setAuthError("Could not reach the server. Please try again shortly."); }
    finally { setAuthBusy(false); }
  };

  const logOut = async () => {
    await apiFetch("/api/auth/logout", { method: "POST" });
    localStorage.removeItem("ibsd-session-token");
    setMe(null); setAuthPassword(""); setAuthError(""); setStage("signin");
    window.scrollTo({ top: 0 });
  };

  const generateRecoveryCode = async () => {
    setAuthBusy(true); setAuthError("");
    try {
      const response = await apiFetch("/api/auth/recovery-code", { method: "POST" });
      const data = await response.json() as { recoveryCode?: string; error?: string };
      if (!response.ok || !data.recoveryCode) throw new Error(data.error ?? "Could not create a recovery code.");
      setIssuedRecoveryCode(data.recoveryCode);
    } catch (error) { setAuthError(error instanceof Error ? error.message : "Could not create a recovery code."); }
    finally { setAuthBusy(false); }
  };

  const submitPremiumRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setPremiumBusy(true); setPremiumMessage("");
    try {
      const response = await apiFetch("/api/premium/request", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({
        amountKrw: premiumAmount, paymentMethod: premiumMethod, payerName: premiumPayer, paymentReference: premiumReference, note: premiumNote,
      }) });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "The Premium application could not be submitted.");
      await loadMe(false); setPremiumMessage("Payment confirmation submitted. Premium will activate after the administrator verifies and accepts it.");
    } catch (error) { setPremiumMessage(error instanceof Error ? error.message : "The Premium application could not be submitted."); }
    finally { setPremiumBusy(false); }
  };

  useEffect(() => {
    let active = true;
    apiFetch("/api/me", { cache: "no-store" }).then(async (response) => {
      if (response.status === 401) return null;
      if (!response.ok) throw new Error("Account unavailable");
      return response.json() as Promise<MeData>;
    }).then((data) => {
      if (!active) return;
      if (!data) { setStage("signin"); return; }
      setMe(data);
      setStage(data.selectedSubjects?.length === 6 ? "home" : "onboarding");
    }).catch(() => { if (active) { setAuthError("Could not reach the account service. Please reload and try again."); setStage("signin"); } });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (me?.premium || me?.premiumRequest?.status !== "pending") return;
    let active = true;
    const refresh = () => apiFetch("/api/me", { cache: "no-store" }).then((response) => response.ok ? response.json() as Promise<MeData> : null).then((data) => { if (active && data) setMe(data); }).catch(() => undefined);
    const timer = window.setInterval(refresh, 15_000);
    return () => { active = false; window.clearInterval(timer); };
  }, [me?.premium, me?.premiumRequest?.status]);

  const subject = useMemo(() => subjects.find((item) => item.id === subjectId) ?? subjects[0], [subjectId]);
  const papers = useMemo(() => getPapers(subject, level), [subject, level]);
  const paper = useMemo(() => papers.find((item) => item.id === paperId) ?? papers[0], [papers, paperId]);
  const topics = useMemo(() => getRelevantTopics(subject, level, paper), [subject, level, paper]);
  const includedTopics = useMemo(() => topics.filter((topic) => selectedTopicCodes.includes(topic.code)), [topics, selectedTopicCodes]);
  const topicLimit = useMemo(() => topicLimitFor(subject, paper), [subject, paper]);
  const singleTopicPaper = useMemo(() => isSingleTopicPaper(subject.id, paper.id), [subject.id, paper.id]);
  const rangeLabel = includedTopics.map((topic) => topic.code).join(" · ");

  const result = useMemo(() => {
    const earned = questions.reduce((sum, question) => sum + scoreQuestion(question, answers[question.id] ?? ""), 0);
    const possible = questions.reduce((sum, question) => sum + question.marks, 0);
    const percent = possible ? Math.round((earned / possible) * 100) : 0;
    return { earned, possible, percent, grade: gradeFromPercent(percent) };
  }, [questions, answers]);

  const topicBreakdown = useMemo<TopicScore[]>(() => includedTopics.map((topic) => {
    const selected = questions.filter((question) => question.topicCode === topic.code);
    const possible = selected.reduce((sum, question) => sum + question.marks, 0);
    const earned = selected.reduce((sum, question) => sum + scoreQuestion(question, answers[question.id] ?? ""), 0);
    return { code: topic.code, title: topic.title, possible, earned, percent: possible ? Math.round((earned / possible) * 100) : 0 };
  }).filter((topic) => topic.possible > 0).sort((a, b) => a.percent - b.percent), [includedTopics, questions, answers]);

  const criteriaBreakdown = useMemo<CriterionScore[]>(() => getAssessmentCriteria(subject, paper).map((criterion) => {
    const selected = questions.filter((question) => question.criterionCodes?.includes(criterion.code));
    const possible = selected.reduce((sum, question) => sum + question.marks, 0);
    const earned = selected.reduce((sum, question) => sum + scoreCriterion(question, answers[question.id] ?? "", criterion), 0);
    return { code: criterion.code, name: criterion.name, description: criterion.description, possible, earned, percent: possible ? Math.round((earned / possible) * 100) : 0 };
  }).filter((criterion) => criterion.possible > 0), [subject, paper, questions, answers]);

  const mistakes = useMemo<Mistake[]>(() => questions.filter((question) => scoreQuestion(question, answers[question.id] ?? "") < question.marks).map((question) => ({
    id: question.id, topicCode: question.topicCode, topicTitle: question.topicTitle, prompt: question.prompt,
    modelAnswer: question.modelAnswer, answer: answers[question.id] ?? "", skill: question.skill,
  })), [questions, answers]);

  const chooseSubject = (id: string) => {
    const next = subjects.find((item) => item.id === id);
    if (!next) return;
    const savedLevel = me?.subjectLevels?.[id];
    const nextLevel: Level = savedLevel && next.levels.includes(savedLevel) ? savedLevel : next.levels.includes("SL") ? "SL" : "HL";
    const nextPapers = getPapers(next, nextLevel);
    const nextTopics = getRelevantTopics(next, nextLevel, nextPapers[0]);
    setSubjectId(id); setLevel(nextLevel); setPaperId(nextPapers[0].id);
    setSelectedTopicCodes(nextTopics.slice(0, Math.min(2, nextTopics.length)).map((topic) => topic.code));
    setTestMode("diagnostic"); setStage("setup"); window.scrollTo({ top: 0 });
  };

  const changeLevel = (nextLevel: Level) => {
    if (levelSaving || nextLevel === level) return;
    const previousLevel = level; const previousPaperId = paperId; const previousTopics = selectedTopicCodes;
    const nextPapers = getPapers(subject, nextLevel);
    const nextPaper = nextPapers.find((item) => item.id === paperId) ?? nextPapers[0];
    const nextTopics = getRelevantTopics(subject, nextLevel, nextPaper);
    setLevel(nextLevel); setPaperId(nextPaper.id); setSelectedTopicCodes(nextTopics[0] ? [nextTopics[0].code] : []); setSaveError(""); setLevelSaveStatus("Saving…");
    if (me?.selectedSubjects.includes(subject.id)) {
      const nextLevels = { ...me.subjectLevels, [subject.id]: nextLevel };
      setMe((currentMe) => currentMe ? { ...currentMe, subjectLevels: nextLevels } : currentMe);
      setLevelSaving(true);
      void apiFetch("/api/profile/level", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ subjectId: subject.id, level: nextLevel }) }).then(async (response) => {
        if (!response.ok) throw new Error("Could not save the course level.");
        const saved = await response.json() as { subjectLevels: Record<string, Level>; level: Level };
        setMe((currentMe) => currentMe ? { ...currentMe, subjectLevels: saved.subjectLevels } : currentMe);
        setLevelSaveStatus(`${saved.level} saved to your account`);
      }).catch(() => {
        setLevel(previousLevel); setPaperId(previousPaperId); setSelectedTopicCodes(previousTopics); setMe((currentMe) => currentMe ? { ...currentMe, subjectLevels: me.subjectLevels } : currentMe);
        setLevelSaveStatus(""); setSaveError("The course level could not be saved, so it was changed back. Please try again.");
      }).finally(() => setLevelSaving(false));
    }
  };

  const changePaper = (nextPaperId: string) => {
    const nextPaper = papers.find((item) => item.id === nextPaperId) ?? papers[0];
    const nextTopics = getRelevantTopics(subject, level, nextPaper);
    setPaperId(nextPaperId); setSelectedTopicCodes(nextTopics[0] ? [nextTopics[0].code] : []);
  };

  const chooseTopic = (code: string, index: number) => {
    void index;
    setSelectedTopicCodes((currentCodes) => {
      if (currentCodes.includes(code)) return currentCodes.length === 1 ? currentCodes : currentCodes.filter((item) => item !== code);
      if (topicLimit === 1) return [code];
      if (currentCodes.length >= topicLimit) return currentCodes;
      return [...currentCodes, code];
    });
  };

  const startTest = () => {
    const premium = Boolean(me?.premium);
    if (!premium && (me?.attempts.length ?? 0) > 0) { setSaveError("Your free account has already used its one test. Premium access is required to take another test."); return; }
    const previousIds = me?.attempts.flatMap((attempt) => attempt.questionIds ?? []) ?? [];
    const seed = (me?.attempts.length ?? 0) * 997 + (testMode === "monthly" ? new Date().getFullYear() * 12 + new Date().getMonth() : includedTopics.length * 37);
    const pool = buildUniqueQuestionPool(subject, level, paper, includedTopics, premium, codeLanguage, seed, previousIds);
    const plan = buildTestPlan(subject, paper, includedTopics.length, premium, testMode, pool);
    const first = pool.find((question) => question.difficultyLevel === 3) ?? pool.find((question) => question.difficulty === "Standard") ?? pool[0];
    if (!first) { setSaveError("No unused questions remain for this exact selection. Choose another topic or paper while the bank refreshes."); return; }
    finishGuard.current = false;
    setQuestionPool(pool); setTargetQuestionCount(plan.questionCount); setQuestions([first]); setAnswers({}); setCurrent(0); setAdaptiveLevel(3);
    setDifficultyTrail([first.difficulty]); setStartedAt(Date.now()); setTimeLimit(plan.seconds); setTimeLeft(plan.seconds); setPlannedMinutes(plan.plannedMinutes); setSavedResult(null); setSaveError(""); setStage("test"); window.scrollTo({ top: 0 });
  };

  const goToQuestion = (index: number) => {
    setCurrent(index);
    window.requestAnimationFrame(() => document.querySelector(".question-stage")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const nextAdaptiveQuestion = () => {
    if (current < questions.length - 1) { goToQuestion(current + 1); return; }
    if (questions.length >= targetQuestionCount) return;
    const activeQuestion = questions[current];
    const ratio = activeQuestion ? scoreQuestion(activeQuestion, answers[activeQuestion.id] ?? "") / Math.max(activeQuestion.marks, 1) : 0;
    const nextLevel = ratio >= 0.7 ? Math.min(5, adaptiveLevel + 1) : ratio < 0.45 ? Math.max(1, adaptiveLevel - 1) : adaptiveLevel;
    const desired = nextLevel <= 2 ? "Foundation" : nextLevel === 3 ? "Standard" : "Challenge";
    const used = new Set(questions.map((question) => question.id));
    const topicUse = new Map(includedTopics.map((topic) => [topic.code, questions.filter((question) => question.topicCode === topic.code).length]));
    const available = questionPool.filter((question) => !used.has(question.id));
    const next = available.filter((question) => question.difficultyLevel === nextLevel || (!question.difficultyLevel && question.difficulty === desired)).sort((a, b) => (topicUse.get(a.topicCode) ?? 0) - (topicUse.get(b.topicCode) ?? 0))[0]
      ?? available.sort((a, b) => (topicUse.get(a.topicCode) ?? 0) - (topicUse.get(b.topicCode) ?? 0))[0];
    if (!next) return;
    setAdaptiveLevel(nextLevel); setDifficultyTrail((trail) => [...trail, next.difficulty]); setQuestions((items) => [...items, next]);
    setCurrent(questions.length);
    window.requestAnimationFrame(() => document.querySelector(".question-stage")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const finish = async () => {
    if (stage !== "test" || finishGuard.current) return;
    finishGuard.current = true;
    const comparison = testMode === "monthly" ? me?.attempts.find((attempt) => attempt.mode === "monthly" && attempt.subjectId === subject.id && attempt.paperId === paper.id) ?? null : null;
    const durationSeconds = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
    setSavedResult({ percent: result.percent, grade: result.grade, comparison, durationSeconds });
    setStage("result"); window.scrollTo({ top: 0 });
    const response = await apiFetch("/api/attempts", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({
      subjectId: subject.id, subjectName: subject.name, level, paperId: paper.id, paperName: paper.name, mode: testMode,
      percent: result.percent, grade: result.grade, durationSeconds, topicBreakdown, criteriaBreakdown, questionIds: questions.map((question) => question.id), difficultyTrail, mistakes,
    }) });
    if (response.ok) await loadMe(false);
    else { const data = await response.json() as { error?: string }; setSaveError(data.error ?? "The result could not be saved."); }
  };

  useEffect(() => {
    if (stage !== "test" || timeLimit <= 0) return;
    const timer = window.setInterval(() => setTimeLeft((value) => {
      if (value <= 1) {
        window.clearInterval(timer);
        window.setTimeout(() => document.getElementById("timed-auto-submit")?.click(), 0);
        return 0;
      }
      return value - 1;
    }), 1000);
    return () => window.clearInterval(timer);
  }, [stage, testMode, timeLimit]);

  const goHome = () => { setStage("home"); window.scrollTo({ top: 0 }); };
  const answered = questions.filter((question) => (answers[question.id] ?? "").trim()).length;
  const selectedCatalog = (me?.selectedSubjects ?? []).map((id) => subjectCatalog.find((item) => item.id === id)).filter(Boolean);
  const allMistakes = me?.attempts.flatMap((attempt) => attempt.mistakes.map((mistake) => ({ ...mistake, attempt }))) ?? [];
  const freeLocked = !me?.premium && (me?.attempts.length ?? 0) >= 1;

  if (stage === "loading") return <main className="loading-screen"><BrandLogo/><strong>Loading your learning profile…</strong></main>;
  if (stage === "signin") return <main className="loading-screen auth-screen"><div className="auth-card"><BrandLogo/><span className="eyebrow">{authMode === "reset" ? "ACCOUNT RECOVERY" : "STUDENT ACCOUNT"}</span><h1>{authMode === "login" ? "Log in" : authMode === "register" ? "Create account" : "Reset password"}</h1><p>{authMode === "reset" ? "Enter the recovery code that was issued by this site, then choose a new password." : "Use a site username and password to save your subjects, test results and Premium access."}</p>{authMode !== "reset" && <div className="auth-tabs"><button type="button" className={authMode === "login" ? "active" : ""} onClick={() => { setAuthMode("login"); setAuthError(""); setAuthNotice(""); }}>Log in</button><button type="button" className={authMode === "register" ? "active" : ""} onClick={() => { setAuthMode("register"); setAuthError(""); setAuthNotice(""); }}>Sign up</button></div>}<form className="account-form" onSubmit={submitAuth}><label><span>Username</span><input autoComplete="username" value={authUsername} onChange={(event) => setAuthUsername(event.target.value)} placeholder="Lowercase letters, numbers or underscores" minLength={3} maxLength={24} required/></label>{authMode === "reset" && <label><span>Recovery code</span><input autoComplete="off" value={authRecoveryCode} onChange={(event) => setAuthRecoveryCode(event.target.value.toUpperCase())} placeholder="XXXXX-XXXXX-XXXXX-XXXXX" required/></label>}<label><span>{authMode === "reset" ? "New password" : "Password"}</span><input type="password" autoComplete={authMode === "login" ? "current-password" : "new-password"} value={authPassword} onChange={(event) => setAuthPassword(event.target.value)} placeholder="At least 8 characters" minLength={8} maxLength={128} required/></label>{authMode === "register" && authUsername.trim().toLowerCase() === "justinnamwoo1003" && <label><span>One-time administrator setup code</span><input type="password" autoComplete="off" value={adminSetupCode} onChange={(event) => setAdminSetupCode(event.target.value)} placeholder="Required only for initial admin registration" required/></label>}{authNotice && <div className="auth-notice" role="status">{authNotice}</div>}{authError && <div className="auth-error" role="alert">{authError}</div>}<button className="primary-button" disabled={authBusy}>{authBusy ? "Working…" : authMode === "login" ? "Log in" : authMode === "register" ? "Create account" : "Reset password"} <span>→</span></button></form>{authMode === "login" && <button type="button" className="forgot-link" onClick={() => { setAuthMode("reset"); setAuthError(""); setAuthNotice(""); setAuthPassword(""); }}>Forgot password?</button>}{authMode === "reset" && <button type="button" className="forgot-link" onClick={() => { setAuthMode("login"); setAuthError(""); setAuthRecoveryCode(""); setAuthPassword(""); }}>← Back to login</button>}{authMode === "register" && <small>You will receive a one-time recovery code after registration. Save it somewhere private.</small>}</div></main>;
  if (stage === "recovery-code") return <main className="loading-screen auth-screen"><div className="auth-card recovery-card"><BrandLogo/><span className="eyebrow">SAVE THIS ONCE</span><h1>Your recovery code</h1><p>This code is the only self-service way to reset your password. Store it somewhere private; it will not be shown again.</p><code>{issuedRecoveryCode}</code><button className="primary-button" onClick={() => void loadMe()}>I saved the code <span>→</span></button></div></main>;
  if (stage === "onboarding") return <SubjectOnboarding name={me?.user.displayName ?? initialName} current={me?.selectedSubjects ?? []} currentLevels={me?.subjectLevels ?? {}} onSaved={async () => { await loadMe(); }} />;

  return <main className="app-shell">
    <header className="topbar">
      <button className="brand" onClick={goHome} aria-label="Go to dashboard"><BrandLockup/></button>
      <nav className="topbar-actions">
        <button className={`nav-link ${stage === "home" ? "active" : ""}`} onClick={goHome}>Dashboard</button>
        <button className={`nav-link ${stage === "reports" ? "active" : ""}`} onClick={() => setStage("reports")}>Reports</button>
        {me?.premium && <button className={`nav-link ${stage === "status" ? "active" : ""}`} onClick={() => setStage("status")}>Current status</button>}
        <button className={`nav-link ${stage === "mistakes" ? "active" : ""}`} onClick={() => setStage("mistakes")}>Mistake bank</button>
        {me?.premium && <span className="premium-access">★ Premium Access</span>}
        <ThemePicker value={theme} onChange={changeTheme}/>
        {me?.user.isAdmin && <button className={`admin-link ${stage === "admin" ? "active" : ""}`} type="button" onClick={() => setStage("admin")}>Admin</button>}
        <span className="account-identity" title={me?.user.email}>{me?.user.email}</span>
        <button className={`account-link ${stage === "account" ? "active" : ""}`} type="button" onClick={() => { setIssuedRecoveryCode(""); setAuthError(""); setStage("account"); }}>Account</button>
        <button className="signout-link" type="button" onClick={() => void logOut()}>Log out</button>
      </nav>
    </header>

    {stage === "home" && <div className="page-container home-page">
      <section className="dashboard-hero"><div><span className="eyebrow">WELCOME BACK</span><h1>{me?.user.displayName ?? initialName}</h1><p>Your six IB subjects, progress checks and next revision priorities in one place.</p></div><div className={`membership-card ${me?.premium ? "premium" : ""}`}><span>{me?.premium ? "PREMIUM MEMBER" : "FREE ACCOUNT"}</span><strong>{me?.premium ? "Full diagnostic access" : "Quick diagnostics"}</strong><small>{me?.premium ? "Monthly tests · growth reports · revision queue · mistake bank" : "An admin can enable Premium for this account."}</small></div></section>

      <section className="section-heading compact"><div><span className="step-label">01</span><h2>Your six subjects</h2></div><button className="quiet-button" onClick={() => setStage("onboarding")}>Change subjects</button></section>
      <div className="subject-grid selected-six">{selectedCatalog.map((choice) => {
        if (!choice) return null;
        const active = subjects.find((item) => item.id === choice.id);
        return <button type="button" key={choice.id} className={`subject-card ${!active ? "coming" : ""} ${freeLocked ? "locked-subject" : ""}`} disabled={!active} onClick={() => active && chooseSubject(active.id)} style={active ? { "--subject": active.color, "--subject-soft": active.softColor } as React.CSSProperties : undefined}>
          <span className="subject-badge">{active?.shortName ?? choice.name.split(" ").map((word) => word[0]).join("").slice(0, 3)}</span><span className="subject-card-copy"><span className="subject-title-row"><strong>{choice.name}</strong><em>{me?.subjectLevels?.[choice.id] ?? (choice.levels.includes("SL") ? "SL" : "HL")}</em></span><small>{freeLocked ? "Free test completed · Premium required for another attempt" : active ? active.description : choice.availability === "unavailable" ? "Selected subject · practical/portfolio assessment is not suitable for this diagnostic" : "Selected subject · test bank coming in the next expansion"}</small></span><span className="arrow">{freeLocked ? "LOCKED" : active ? "→" : choice.availability === "unavailable" ? "N/A" : "SOON"}</span>
        </button>;
      })}</div>

      {me?.premium ? <PremiumDashboard attempts={me.attempts} onReports={() => setStage("reports")} onMistakes={() => setStage("mistakes")} onStatus={() => setStage("status")} /> : <section className="premium-promo"><div><span className="eyebrow">{me?.premiumRequest?.status === "pending" ? "PAYMENT UNDER REVIEW" : freeLocked ? "FREE TEST USED" : "PREMIUM"}</span><h2>{me?.premiumRequest?.status === "pending" ? "Your Premium request is pending" : freeLocked ? "Your free diagnostic is complete" : "Unlock your full progress system"}</h2><p>{me?.premiumRequest?.status === "pending" ? "The administrator will verify your payment reference. Premium activates only after acceptance." : me?.premiumRequest?.status === "rejected" ? `Your previous request was not accepted${me.premiumRequest.adminNote ? `: ${me.premiumRequest.adminNote}` : ". You can submit corrected payment details."}` : freeLocked ? "All further subject tests are now locked until Premium is approved." : "Submit your payment confirmation for administrator review."}</p><button className="premium-apply-button" onClick={() => { setPremiumMessage(""); setStage("premium"); }}>{me?.premiumRequest?.status === "pending" ? "View request status" : me?.premiumRequest?.status === "rejected" ? "Resubmit payment details" : "Apply for Premium"} <span>→</span></button></div><ul><li>Unlimited adaptive retakes with different questions</li><li>Timed monthly tests with before/after comparison</li><li>Current-status map, revision queue and mistake bank</li></ul></section>}
    </div>}

    {stage === "reports" && <ReportsView premium={Boolean(me?.premium)} attempts={me?.attempts ?? []} onBack={goHome} />}
    {stage === "status" && <StatusView premium={Boolean(me?.premium)} attempts={me?.attempts ?? []} onBack={goHome} />}
    {stage === "mistakes" && <MistakeBank premium={Boolean(me?.premium)} mistakes={allMistakes} onBack={goHome} />}
    {stage === "premium" && <PremiumApplication request={me?.premiumRequest ?? null} message={premiumMessage} amount={premiumAmount} method={premiumMethod} payer={premiumPayer} reference={premiumReference} note={premiumNote} busy={premiumBusy} onAmount={setPremiumAmount} onMethod={setPremiumMethod} onPayer={setPremiumPayer} onReference={setPremiumReference} onNote={setPremiumNote} onSubmit={submitPremiumRequest} onRefresh={async () => { setPremiumMessage(""); await loadMe(false); }} onBack={goHome}/>}
    {stage === "admin" && me?.user.isAdmin && <AdminClient adminName={me.user.displayName} embedded onBack={goHome}/>}
    {stage === "account" && <div className="page-container report-page"><button className="back-link" onClick={goHome}>← Dashboard</button><div className="report-heading"><span className="eyebrow">ACCOUNT SECURITY</span><h1>Password recovery</h1><p>Create a new recovery code while you are signed in. Generating one immediately invalidates the previous code.</p></div><section className="account-security-card"><div><strong>Recovery code</strong><p>Keep it outside this site, such as in a password manager. Anyone with the code and your username can reset your password.</p></div>{issuedRecoveryCode ? <><code>{issuedRecoveryCode}</code><span className="recovery-warning">This is shown once. Save it before leaving this page.</span></> : <button className="primary-button" disabled={authBusy} onClick={() => void generateRecoveryCode()}>{authBusy ? "Creating…" : "Create new recovery code"} <span>→</span></button>}{authError && <div className="auth-error" role="alert">{authError}</div>}</section></div>}

    {stage === "setup" && <div className="page-container setup-page" style={{ "--subject": subject.color, "--subject-soft": subject.softColor } as React.CSSProperties}>
      <button className="back-link" disabled={levelSaving} onClick={goHome}>{levelSaving ? "Saving course level…" : "← Dashboard"}</button>
      <div className="setup-heading"><span className="subject-badge large">{subject.shortName}</span><div><span className="eyebrow">PROGRESS-BASED TEST</span><h1>{subject.name}</h1><p>{subject.description}</p></div></div>
      <SetupBlock number="1" title="Choose course level" subtitle="SL and HL show different topic coverage and papers."><div className="level-switch">{subject.levels.map((item) => <button key={item} disabled={levelSaving} className={level === item ? "selected" : ""} onClick={() => changeLevel(item)}><strong>{item}</strong><span>{item === "HL" ? "Core plus HL-only content" : "SL syllabus content only"}</span></button>)}</div>{levelSaveStatus && <div className={`level-save-status ${levelSaving ? "saving" : "saved"}`}><i/>{levelSaveStatus}</div>}</SetupBlock>
      <SetupBlock number="2" title="Choose the paper" subtitle="Question structure follows the selected assessment style."><div className="paper-grid">{papers.map((item) => <button key={item.id} className={`paper-card ${paper.id === item.id ? "selected" : ""}`} onClick={() => changePaper(item.id)}><span className="radio-dot"/><strong>{item.name}</strong><p>{item.description}</p><small>{item.format}</small></button>)}</div>{subject.id === "cs" && paper.id === "p2" && <div className="code-language"><div><strong>Programming language</strong><span>IB Paper 2 provides equivalent Python and Java versions.</span></div><div><button className={codeLanguage === "python" ? "selected" : ""} onClick={() => setCodeLanguage("python")}>Python</button><button className={codeLanguage === "java" ? "selected" : ""} onClick={() => setCodeLanguage("java")}>Java</button></div></div>}</SetupBlock>
      <SetupBlock number="3" title="Select exactly what you want to test" subtitle={singleTopicPaper ? "This is an essay-heavy paper, so choose one topic for a realistic focused response within 60 minutes." : `Choose individual topics. This paper supports up to ${topicLimit} topics while preserving a one-hour maximum.`} side={`${includedTopics.length}/${topicLimit} topics`}><div className="topic-list">{topics.map((topic, index) => { const included = selectedTopicCodes.includes(topic.code); return <button type="button" key={topic.code} className={`topic-row ${included ? "included" : ""}`} onClick={() => chooseTopic(topic.code, index)}><span className="topic-check">{included ? "✓" : ""}</span><strong>{topic.code}</strong><span>{topic.title}</span>{topic.level === "HL" && <b>HL only</b>}</button>; })}</div><div className="coverage-note"><strong>{singleTopicPaper ? "Focused essay policy" : "Smart coverage policy"}</strong><span>{singleTopicPaper ? "The selected topic receives one complete IB-style task instead of several rushed essays." : "The adaptive sequence rotates through least-used selected topics first, then adjusts difficulty."}</span></div></SetupBlock>
      <SetupBlock number="4" title="Choose test mode" subtitle="Monthly Progress Test is timed and compares results with your previous month."><div className="tier-grid">
        <button className={`tier-card ${testMode === "diagnostic" ? "selected" : ""}`} onClick={() => setTestMode("diagnostic")}><span className="tier-top"><strong>{me?.premium ? "Deep diagnostic" : "Quick diagnostic"}</strong><em>{me?.premium ? "PREMIUM" : "FREE"}</em></span><p>Paper-aware question budget · timed for 15–60 minutes</p><ul><li>Paper-specific question types</li><li>Every selected topic is prioritized before repeats</li><li>Estimated grade and answer review</li></ul></button>
        <button className={`tier-card premium ${testMode === "monthly" ? "selected" : ""} ${!me?.premium ? "locked" : ""}`} disabled={!me?.premium} onClick={() => me?.premium && setTestMode("monthly")}><span className="popular">MONTHLY CHECK-IN</span><span className="tier-top"><strong>Monthly Progress Test</strong><em>PREMIUM</em></span><p>Paper-aware adaptive test · maximum 60-minute timer</p><ul><li>Previous-test comparison</li><li>Topic gains and remaining gaps</li><li>Speed and score change</li></ul></button>
      </div></SetupBlock>
      {saveError && <div className="inline-error">{saveError}</div>}<div className="start-panel"><div><strong>{subject.name} {level} · {paper.name}</strong><span>{includedTopics.length} topics · {paper.id === "concept" ? "timed adaptive concept MCQ" : testMode === "monthly" ? "timed monthly progress test" : "timed adaptive diagnostic"} · maximum 60 minutes</span></div><button className="primary-button" disabled={!includedTopics.length || freeLocked || levelSaving} onClick={startTest}>{levelSaving ? "Saving level…" : freeLocked ? "Free test already used" : `Start ${testMode === "monthly" ? "monthly test" : "diagnostic"}`} <span>→</span></button></div>
    </div>}

    {stage === "test" && questions[current] && <div className="test-layout" style={{ "--subject": subject.color, "--subject-soft": subject.softColor } as React.CSSProperties}>
      <aside className="test-sidebar"><div><span className="eyebrow">{subject.name} {level}</span><h2>{paper.name}</h2><p>{rangeLabel} · {subject.id === "cs" && paper.id === "p2" ? `${codeLanguage === "python" ? "Python" : "Java"} · ` : ""}{testMode === "monthly" ? "Monthly" : me?.premium ? "Premium" : "Quick"}</p><div className={`timer ${timeLeft < 300 ? "urgent" : ""}`}><span>TIME LEFT</span><strong>{formatTime(timeLeft)}</strong></div></div><div className="adaptive-indicator"><span>ADAPTIVE LEVEL</span><strong>Level {adaptiveLevel} · {adaptiveLevel === 1 ? "Recognition" : adaptiveLevel === 2 ? "Basic explanation" : adaptiveLevel === 3 ? "Multi-step application" : adaptiveLevel === 4 ? "Evaluation & integration" : "Synthesis under uncertainty"}</strong><small>Only one demand dimension changes after each response.</small></div><div className="question-map">{questions.map((question, index) => <button type="button" key={question.id} aria-label={`Open question ${index + 1}`} className={`${index === current ? "active" : ""} ${(answers[question.id] ?? "").trim() ? "answered" : ""}`} onClick={() => goToQuestion(index)}><span>{index + 1}</span><small>{question.topicCode}</small></button>)}</div><div className="sidebar-progress"><span><strong>{answered}</strong> answered · target {targetQuestionCount} · {plannedMinutes} min</span><div><i style={{ width: `${(questions.length / targetQuestionCount) * 100}%` }}/></div></div></aside>
      <section className="question-stage"><button id="timed-auto-submit" className="sr-only" onClick={() => void finish()}>Auto submit</button><div className="question-topline"><span>Question {current + 1} of {targetQuestionCount}</span><span>Responses submit when time ends</span></div><QuestionCard question={questions[current]} answer={answers[questions[current].id] ?? ""} onAnswer={(value) => setAnswers({ ...answers, [questions[current].id]: value })}/><div className="question-actions"><button type="button" className="secondary-button" disabled={current === 0} onClick={() => goToQuestion(current - 1)}>Previous</button>{current === questions.length - 1 && questions.length >= targetQuestionCount ? <button type="button" className="primary-button" onClick={() => void finish()}>Finish & analyse <span>→</span></button> : <button type="button" className="primary-button" onClick={nextAdaptiveQuestion}>Next question <span>→</span></button>}</div></section>
    </div>}

    {stage === "result" && savedResult && <div className="page-container result-page" style={{ "--subject": subject.color, "--subject-soft": subject.softColor } as React.CSSProperties}>
      <section className="result-hero"><div><span className="eyebrow">{testMode === "monthly" ? "MONTHLY TEST COMPLETE" : "DIAGNOSTIC COMPLETE"}</span><h1>{subject.name} {level}</h1><p>{paper.name} · {rangeLabel}</p></div><div className="score-card"><span>Estimated performance</span><strong>{savedResult.percent}<small>%</small></strong><p>Practice grade <b>{savedResult.grade}</b> · {result.earned}/{result.possible} estimated marks</p></div></section>
      {testMode === "monthly" && <GrowthSummary current={savedResult.percent} previous={savedResult.comparison} currentBreakdown={topicBreakdown} duration={savedResult.durationSeconds}/>} 
      <div className="result-disclaimer">Formative practice estimate, not an official IB grade prediction. Open responses are estimated from concept coverage and development.</div>
      {saveError && <div className="inline-error">{saveError}</div>}
      {criteriaBreakdown.length > 0 && <section className="result-section"><div className="section-heading compact"><div><span className="step-label">CR</span><h2>Assessment criteria match</h2></div><p>How closely this response currently meets each language criterion</p></div><div className="criteria-grid">{criteriaBreakdown.map((criterion) => <div className="criterion-card" key={criterion.code}><span>{criterion.code}</span><div><strong>{criterion.name}</strong><p>{criterion.description}</p></div><em className={criterion.percent >= 75 ? "secure" : criterion.percent >= 50 ? "developing" : "needs-work"}>{criterion.percent}% · {criterion.percent >= 75 ? "Meets well" : criterion.percent >= 50 ? "Partly meets" : "Not yet met"}</em></div>)}</div></section>}
      {me?.premium ? <><section className="result-section"><div className="section-heading compact"><div><span className="step-label">01</span><h2>Topic diagnosis</h2></div><p>Weakest topic first</p></div><div className="topic-results">{topicBreakdown.map((topic) => <div key={topic.code} className="topic-result-row"><span className="result-code">{topic.code}</span><div><strong>{topic.title}</strong><span><i style={{ width: `${topic.percent}%` }}/></span></div><em className={topic.percent < 50 ? "needs-work" : topic.percent < 72 ? "developing" : "secure"}>{topic.percent}%</em></div>)}</div></section><section className="diagnostic-grid"><div className="insight-card warning"><span className="card-kicker">REVISION QUEUE #1</span><h3>{topicBreakdown[0]?.code} {topicBreakdown[0]?.title}</h3><p>Rebuild the central relationship, correct your lowest-scoring response, then complete one transfer question.</p></div><div className="insight-card"><span className="card-kicker">MISTAKE BANK</span><h3>{mistakes.length} responses saved</h3><p>Your missed and partially developed responses are now available from the dashboard for targeted retry.</p></div></section></> : <section className="quick-result"><div><span className="card-kicker">NEXT STEP</span><h2>Review {topicBreakdown[0]?.code} {topicBreakdown[0]?.title}</h2><p>Correct the lowest-scoring topic, then retry a paper-specific question.</p></div><div className="premium-lock"><span>Premium report</span><strong>Detailed progress is locked</strong><p>An administrator can grant Premium to your account. The badge and features appear automatically after approval.</p></div></section>}
      <section className="answer-review"><div className="section-heading compact"><div><span className="step-label">02</span><h2>Answer review</h2></div><p>Original practice markschemes</p></div>{questions.map((question, index) => <details key={question.id}><summary><span>{index + 1}</span><div><strong>{question.topicCode} · {question.commandTerm ?? question.skill}</strong><p>{question.prompt}</p></div><em>{scoreQuestion(question, answers[question.id] ?? "")}/{question.marks}</em></summary><div className="review-body"><div><span>Your response</span><p>{formatAnswerForReview(question, answers[question.id] ?? "")}</p></div><div className="model-points"><span>Markscheme requirements</span>{question.markschemePoints?.length ? <ol>{question.markschemePoints.map((point) => <li key={point}>{point}</li>)}</ol> : <p>{question.modelAnswer}</p>}<small>Key coverage: {question.keywords.join(" · ")}</small>{question.commonErrors?.length ? <p className="common-errors"><strong>Common errors:</strong> {question.commonErrors.join(" · ")}</p> : null}</div></div></details>)}</section>
      <div className="result-actions"><button className="secondary-button" onClick={goHome}>Back to dashboard</button>{me?.premium ? <button className="primary-button" onClick={() => setStage("setup")}>Retake with different questions <span>→</span></button> : <span className="free-result-lock">Free attempt used · further tests are locked</span>}</div>
    </div>}
    <footer><span>IB Subject Diagnostic</span><p>Independent practice tool. Not affiliated with or endorsed by the International Baccalaureate Organization.</p></footer>
  </main>;
}

function SubjectOnboarding({ name, current, currentLevels, onSaved }: { name: string; current: string[]; currentLevels: Record<string, Level>; onSaved: () => Promise<void> }) {
  const [selected, setSelected] = useState<string[]>(current);
  const [levels, setLevels] = useState<Record<string, Level>>(() => Object.fromEntries(current.map((id) => {
    const course = subjectCatalog.find((item) => item.id === id);
    const saved = currentLevels[id];
    return [id, saved ?? (course?.levels.includes("SL") ? "SL" : "HL")];
  })));
  const [pendingSubject, setPendingSubject] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const groups = Array.from(new Set(subjectCatalog.map((subject) => subject.group)));
  const defaultLevel = (id: string): Level => subjectCatalog.find((item) => item.id === id)?.levels.includes("SL") ? "SL" : "HL";
  const addOrRemove = (id: string) => {
    if (selected.includes(id)) { setSelected((items) => items.filter((item) => item !== id)); return; }
    if (selected.length >= 6) { setPendingSubject(id); return; }
    setSelected((items) => [...items, id]); setLevels((items) => ({ ...items, [id]: items[id] ?? defaultLevel(id) }));
  };
  const save = async () => {
    setSaving(true); setSaveError("");
    const response = await apiFetch("/api/profile/subjects", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ subjects: selected, subjectLevels: levels }) });
    if (response.ok) await onSaved(); else setSaveError((await response.json() as { error?: string }).error ?? "Could not save the subject selection.");
    setSaving(false);
  };
  const replaceSubject = (oldId: string) => { if (!pendingSubject) return; const nextId = pendingSubject; setSelected((items) => items.map((id) => id === oldId ? nextId : id)); setLevels((items) => ({ ...items, [nextId]: items[nextId] ?? defaultLevel(nextId) })); setPendingSubject(null); };
  return <main className="onboarding-page"><div className="onboarding-header"><BrandLogo/><div><span className="eyebrow">SET UP YOUR DASHBOARD</span><h1>Choose your six IB subjects, {name}.</h1><p>Select each course and set its SL or HL level here. The saved level becomes the default whenever you open that subject.</p></div><div className="selection-counter"><strong>{selected.length}/6</strong><span>selected</span></div></div><div className="catalog-groups">{groups.map((group) => <section key={group}><h2>{group}</h2><div className="catalog-grid">{subjectCatalog.filter((subject) => subject.group === group).map((subject) => { const active = selected.includes(subject.id); const status = subject.availability ?? (subject.testAvailable ? "available" : "planned"); const availableLevels = (["SL", "HL"] as Level[]).filter((item) => subject.levels.includes(item)); return <div key={subject.id} className={`catalog-card ${active ? "selected" : ""}`}><button type="button" className="catalog-main" onClick={() => addOrRemove(subject.id)}><span className="catalog-check">{active ? "✓" : ""}</span><span><strong>{subject.name}</strong><small>{active ? `${levels[subject.id] ?? defaultLevel(subject.id)} selected` : subject.levels}</small></span><em className={status === "available" ? "available" : status === "unavailable" ? "unavailable" : "soon"}>{status === "available" ? "Test available" : status === "unavailable" ? "Unavailable" : "Coming next"}</em></button>{active && <div className="catalog-levels" aria-label={`${subject.name} course level`}>{availableLevels.map((item) => <button type="button" key={item} className={levels[subject.id] === item ? "active" : ""} onClick={() => setLevels((currentMap) => ({ ...currentMap, [subject.id]: item }))}>{item}</button>)}</div>}</div>; })}</div></section>)}</div>{saveError && <div className="inline-error">{saveError}</div>}<div className="onboarding-save"><div><strong>Choose exactly six subjects and levels</strong><span>You can change both later from the dashboard.</span></div><button className="primary-button" disabled={selected.length !== 6 || saving} onClick={() => void save()}>{saving ? "Saving…" : "Save my subjects"} <span>→</span></button></div>{pendingSubject && <div className="subject-swap-backdrop" role="dialog" aria-modal="true" aria-label="Replace a subject"><div className="subject-swap"><span className="eyebrow">REPLACE A SUBJECT</span><h2>Add {subjectCatalog.find((item) => item.id === pendingSubject)?.name}</h2><p>Choose which current subject to replace.</p><div>{selected.map((id) => <button type="button" key={id} onClick={() => replaceSubject(id)}>{subjectCatalog.find((item) => item.id === id)?.name ?? id}<span>Replace →</span></button>)}</div><button type="button" className="secondary-button" onClick={() => setPendingSubject(null)}>Cancel</button></div></div>}</main>;
}

export function PremiumApplication({ request, message, amount, method, payer, reference, note, busy, onAmount, onMethod, onPayer, onReference, onNote, onSubmit, onRefresh, onBack }: {
  request: PremiumRequest | null; message: string; amount: string; method: PremiumRequest["paymentMethod"]; payer: string; reference: string; note: string; busy: boolean;
  onAmount: (value: string) => void; onMethod: (value: PremiumRequest["paymentMethod"]) => void; onPayer: (value: string) => void; onReference: (value: string) => void; onNote: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void; onRefresh: () => Promise<void>; onBack: () => void;
}) {
  const pending = request?.status === "pending";
  return <div className="page-container report-page premium-application-page"><button className="back-link" onClick={onBack}>← Dashboard</button><div className="report-heading"><span className="eyebrow">PREMIUM APPLICATION</span><h1>Submit payment for review</h1><p>Confirm the current price and payment destination with the administrator before paying, then enter the matching details below. This form records a payment claim for manual verification; it does not charge a card or confirm that money was received.</p></div>
    {request && <section className={`request-summary ${request.status}`}><div><span>LATEST REQUEST</span><strong>{request.status === "pending" ? "Waiting for administrator review" : request.status === "approved" ? "Payment accepted" : "Payment not accepted"}</strong><p>₩{request.amountKrw.toLocaleString()} · {request.paymentMethod.replace("_", " ")} · reference {request.paymentReference}</p>{request.adminNote && <small>Administrator note: {request.adminNote}</small>}</div><b>{request.status}</b></section>}
    {pending ? <section className="pending-actions"><p>The administrator must match your payer name, amount and reference with the external payment record before accepting it.</p><button className="secondary-button" disabled={busy} onClick={() => void onRefresh()}>{busy ? "Refreshing…" : "Refresh approval status"}</button></section> : <form className="premium-form" onSubmit={onSubmit}><div className="payment-safety"><strong>Before submitting</strong><ul><li>Complete the payment outside this site after confirming the price and destination.</li><li>Use the exact payer name and reference shown by the payment provider.</li><li>Never enter a card number, banking password, security code or full bank-account number here.</li><li>Premium remains locked until the administrator accepts the request.</li></ul></div><div className="premium-form-grid"><label><span>Amount paid (KRW)</span><input inputMode="numeric" value={amount} onChange={(event) => onAmount(event.target.value.replace(/[^0-9]/g, ""))} placeholder="For example, 10000" required/></label><label><span>Payment method</span><select value={method} onChange={(event) => onMethod(event.target.value as PremiumRequest["paymentMethod"])}><option value="bank_transfer">Bank transfer</option><option value="paypal">PayPal</option><option value="other">Other</option></select></label><label><span>Payer name</span><input value={payer} onChange={(event) => onPayer(event.target.value)} minLength={2} maxLength={80} placeholder="Name used for payment" required/></label><label><span>Payment reference</span><input value={reference} onChange={(event) => onReference(event.target.value)} minLength={4} maxLength={120} placeholder="Transfer memo or transaction ID" required/></label><label className="full"><span>Note to administrator (optional)</span><textarea value={note} onChange={(event) => onNote(event.target.value)} maxLength={500} rows={4} placeholder="Add any detail needed to match the payment."/></label></div><button className="primary-button" disabled={busy}>{busy ? "Submitting…" : "Submit for payment review"} <span>→</span></button></form>}
    {message && <div className="premium-message" role="status">{message}</div>}
  </div>;
}

function PremiumDashboard({ attempts, onReports, onMistakes, onStatus }: { attempts: Attempt[]; onReports: () => void; onMistakes: () => void; onStatus: () => void }) {
  const topicRows = attempts.flatMap((attempt) => attempt.topicBreakdown.map((topic) => ({ ...topic, subjectName: attempt.subjectName, subjectId: attempt.subjectId }))).sort((a, b) => a.percent - b.percent).slice(0, 3);
  const mistakeCount = attempts.reduce((sum, attempt) => sum + attempt.mistakes.length, 0);
  return <section className="premium-tools"><div className="section-heading compact"><div><span className="step-label">02</span><h2>Premium study tools</h2></div><button className="quiet-button" onClick={onReports}>Open full report →</button></div><div className="tool-grid four"><button className="tool-card" onClick={onStatus}><span>CURRENT STATUS</span><strong>{attempts.length ? "See completed and weak topics" : "Build your topic map"}</strong><p>Each tested topic is marked Secure, Developing or Priority so you know what counts as completed.</p></button><button className="tool-card" onClick={onReports}><span>MONTHLY REPORT</span><strong>{attempts.filter((attempt) => attempt.mode === "monthly").length ? "Track your score change" : "Build your first baseline"}</strong><p>Compare score, topic accuracy and completion time month by month.</p></button><button className="tool-card" onClick={onMistakes}><span>MISTAKE BANK</span><strong>{mistakeCount} saved gaps</strong><p>Retry missed and underdeveloped responses without searching old tests.</p></button><div className="tool-card"><span>SMART REVISION QUEUE</span><strong>{topicRows[0] ? `${topicRows[0].subjectName}: ${topicRows[0].code}` : "Complete a diagnostic first"}</strong><p>{topicRows.length ? topicRows.map((topic) => `${topic.code} ${topic.percent}%`).join(" · ") : "Your three weakest topics will be ranked here."}</p></div></div></section>;
}

function StatusView({ premium, attempts, onBack }: { premium: boolean; attempts: Attempt[]; onBack: () => void }) {
  const latestByTopic = new Map<string, { subject: string; code: string; title: string; percent: number; date: string }>();
  attempts.forEach((attempt) => attempt.topicBreakdown.forEach((topic) => {
    const key = `${attempt.subjectId}:${topic.code}`;
    if (!latestByTopic.has(key)) latestByTopic.set(key, { subject: attempt.subjectName, code: topic.code, title: topic.title, percent: topic.percent, date: attempt.createdAt });
  }));
  const rows = Array.from(latestByTopic.values()).sort((a, b) => a.percent - b.percent);
  const secure = rows.filter((row) => row.percent >= 75).length;
  const developing = rows.filter((row) => row.percent >= 50 && row.percent < 75).length;
  const priority = rows.filter((row) => row.percent < 50).length;
  return <div className="page-container report-page"><button className="back-link" onClick={onBack}>← Dashboard</button><div className="report-heading"><span className="eyebrow">PREMIUM CURRENT STATUS</span><h1>Your topic readiness map</h1><p>A topic counts as completed when the latest diagnostic reaches 75%. Results from a later retake replace the earlier status.</p></div>{!premium ? <LockedFeature title="Current status" text="Premium access is required for persistent topic readiness tracking."/> : <><div className="status-summary"><div><strong>{secure}</strong><span>Secure / completed</span></div><div><strong>{developing}</strong><span>Developing</span></div><div><strong>{priority}</strong><span>Priority gaps</span></div></div>{rows.length ? <div className="status-list">{rows.map((row) => <div key={`${row.subject}-${row.code}`} className="status-row"><span>{row.code}</span><div><strong>{row.subject} · {row.title}</strong><small>Latest evidence {new Date(row.date).toLocaleDateString("en-GB")}</small></div><em className={row.percent >= 75 ? "secure" : row.percent >= 50 ? "developing" : "needs-work"}>{row.percent}% · {row.percent >= 75 ? "Completed" : row.percent >= 50 ? "Developing" : "Priority"}</em><p>{row.percent >= 75 ? "Maintain with a monthly check or a challenge question." : row.percent >= 50 ? "Review the missing link, then retry this topic." : "Relearn the core relationship before another paper-style response."}</p></div>)}</div> : <div className="empty-state"><strong>No tested topics yet</strong><p>Complete a diagnostic and your first readiness map will appear here.</p></div>}</>}</div>;
}

function ReportsView({ premium, attempts, onBack }: { premium: boolean; attempts: Attempt[]; onBack: () => void }) {
  const monthly = attempts.filter((attempt) => attempt.mode === "monthly");
  const latest = monthly[0]; const previous = monthly.find((attempt) => latest && attempt.subjectId === latest.subjectId && attempt.paperId === latest.paperId && attempt.id !== latest.id);
  return <div className="page-container report-page"><button className="back-link" onClick={onBack}>← Dashboard</button><div className="report-heading"><span className="eyebrow">PREMIUM REPORTS</span><h1>Progress over time</h1><p>Monthly tests create comparable checkpoints; ordinary diagnostics remain visible in the activity history.</p></div>{!premium ? <LockedFeature title="Premium reports" text="An administrator must approve Premium for this account before monthly comparisons are available."/> : <>{latest ? <GrowthSummary current={latest.percent} previous={previous ?? null} currentBreakdown={latest.topicBreakdown} duration={latest.durationSeconds}/> : <div className="empty-state"><strong>No monthly baseline yet</strong><p>Start a Monthly Progress Test from any available subject to create your first comparison point.</p></div>}<section className="result-section"><div className="section-heading compact"><div><span className="step-label">01</span><h2>Test history</h2></div><p>{attempts.length} saved attempts</p></div><div className="history-table"><div className="history-row head"><span>Date</span><span>Subject</span><span>Mode</span><span>Time</span><span>Result</span></div>{attempts.map((attempt) => <div className="history-row" key={attempt.id}><span>{new Date(attempt.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span><span><strong>{attempt.subjectName} {attempt.level}</strong><small>{attempt.paperName}</small></span><span>{attempt.mode === "monthly" ? "Monthly" : "Diagnostic"}</span><span>{formatDuration(attempt.durationSeconds)}</span><span><b>{attempt.percent}%</b> · Grade {attempt.grade}</span></div>)}</div></section></>}</div>;
}

function MistakeBank({ premium, mistakes, onBack }: { premium: boolean; mistakes: Array<Mistake & { attempt: Attempt }>; onBack: () => void }) {
  return <div className="page-container report-page"><button className="back-link" onClick={onBack}>← Dashboard</button><div className="report-heading"><span className="eyebrow">PREMIUM TOOL</span><h1>Mistake bank</h1><p>Every missed or partially developed response is kept with the model points for targeted retry.</p></div>{!premium ? <LockedFeature title="Mistake bank" text="Premium access is required to save and revisit mistakes across tests."/> : mistakes.length ? <div className="mistake-list">{mistakes.map((mistake, index) => <details key={`${mistake.attempt.id}-${mistake.id}-${index}`}><summary><span>{mistake.topicCode}</span><div><strong>{mistake.attempt.subjectName} · {mistake.skill}</strong><p>{mistake.prompt}</p></div><em>{new Date(mistake.attempt.createdAt).toLocaleDateString("en-GB")}</em></summary><div className="review-body"><div><span>Your previous response</span><p>{mistake.answer || "No answer"}</p></div><div className="model-points"><span>Model points</span><p>{mistake.modelAnswer}</p></div></div></details>)}</div> : <div className="empty-state"><strong>Your mistake bank is empty</strong><p>Complete a Premium diagnostic or monthly test. Any lost-mark responses will appear here.</p></div>}</div>;
}

function GrowthSummary({ current, previous, currentBreakdown, duration }: { current: number; previous: Attempt | null; currentBreakdown: TopicScore[]; duration: number }) {
  const delta = previous ? current - previous.percent : null;
  const gains = previous ? currentBreakdown.map((topic) => { const old = previous.topicBreakdown.find((item) => item.code === topic.code); return { ...topic, delta: old ? topic.percent - old.percent : null }; }).filter((topic) => topic.delta !== null).sort((a, b) => (b.delta ?? 0) - (a.delta ?? 0)) : [];
  const timeDelta = previous ? duration - previous.durationSeconds : null;
  return <section className="growth-summary"><div><span>{previous ? "SCORE CHANGE" : "BASELINE CREATED"}</span><strong>{delta === null ? `${current}%` : `${delta >= 0 ? "+" : ""}${delta} pts`}</strong><p>{previous ? `${previous.percent}% → ${current}%` : "Your next monthly test will compare against this result."}</p></div><div><span>BIGGEST TOPIC GAIN</span><strong>{gains[0] ? `${gains[0].code} ${gains[0].delta! >= 0 ? "+" : ""}${gains[0].delta}` : "Baseline"}</strong><p>{gains[0]?.title ?? "Complete the same paper next month to measure improvement."}</p></div><div><span>COMPLETION TIME</span><strong>{formatDuration(duration)}</strong><p>{timeDelta === null ? "First timed record" : timeDelta <= 0 ? `${Math.abs(timeDelta)}s faster than before` : `${timeDelta}s slower than before`}</p></div></section>;
}

function LockedFeature({ title, text }: { title: string; text: string }) { return <div className="locked-feature"><span>PREMIUM ACCESS REQUIRED</span><h2>{title}</h2><p>{text}</p></div>; }
function SetupBlock({ number, title, subtitle, side, children }: { number: string; title: string; subtitle: string; side?: string; children: React.ReactNode }) { return <section className="setup-block"><div className="setup-number">{number}</div><div className="setup-content"><div className="block-title"><div><h2>{title}</h2><p>{subtitle}</p></div>{side && <span className="range-count">{side}</span>}</div>{children}</div></section>; }
function QuestionCard({ question, answer, onAnswer }: { question: Question; answer: string; onAnswer: (value: string) => void }) {
  return <article className="question-card">
    <div className="question-meta"><span>{question.topicCode} · {question.topicTitle}</span><span>{question.commandTerm ?? question.skill}</span><span>[{question.marks} mark{question.marks !== 1 ? "s" : ""}]</span>{question.difficultyLevel && <span>D{question.difficultyLevel}</span>}{question.premiumOnly && <em>Premium depth</em>}</div>
    {question.syllabusPath && <div className="syllabus-path"><strong>{question.syllabusProfile}</strong><span>{question.syllabusPath}</span><em>{question.section} · ~{question.estimatedMinutes} min</em></div>}
    {question.context && <div className="source-box"><strong>Source</strong><p>{question.context}</p></div>}
    {question.visual && <QuestionVisual type={question.visual} data={question.visualData}/>}
    {question.starterCode && <div className="starter-code"><span>{question.codeLanguage ?? "python"}</span><pre>{question.starterCode}</pre></div>}
    <h1>{question.prompt}</h1>
    {question.responseType === "mcq" ? <div className="choice-list">{question.choices?.map((choice, index) => <button key={`${choice}-${index}`} className={answer === String(index) ? "selected" : ""} onClick={() => onAnswer(String(index))}><span>{String.fromCharCode(65 + index)}</span><p>{choice}</p></button>)}</div> : question.responseType === "diagram" ? <DiagramPad value={answer} onChange={onAnswer}/> : <div className={`response-area ${question.responseType === "code" ? "code-response" : ""}`}><textarea value={answer} spellCheck={question.responseType !== "code"} onChange={(event) => onAnswer(event.target.value)} placeholder={question.responseType === "code" ? `Write valid ${question.codeLanguage ?? "Python"} code here…` : question.responseType === "extended" ? "Build a structured response with evidence, reasoning and a supported conclusion…" : "Write a concise exam-style answer and show your reasoning…"} rows={question.responseType === "extended" || question.responseType === "code" ? 13 : 7}/><span>{question.responseType === "code" ? `${answer.split("\n").length} lines` : `${answer.trim().split(/\s+/).filter(Boolean).length} words`}</span></div>}
    <div className="question-note"><strong>Assessment demand</strong><span>{question.difficulty} · {question.skill}. The item uses an original parallel stimulus and a markscheme-first structure.</span></div>
  </article>;
}

type DiagramData = { paths: string[]; labels: Array<{ x: number; y: number; text: string }>; explanation: string };
const emptyDiagram = (): DiagramData => ({ paths: [], labels: [], explanation: "" });
function parseDiagram(value: string): DiagramData { try { const parsed = JSON.parse(value) as DiagramData; return { paths: parsed.paths ?? [], labels: parsed.labels ?? [], explanation: parsed.explanation ?? "" }; } catch { return emptyDiagram(); } }
function formatAnswerForReview(question: Question, answer: string) { if (question.responseType === "mcq") return question.choices?.[Number(answer)] ?? "No answer"; if (question.responseType !== "diagram") return answer || "No answer"; const d = parseDiagram(answer); return `${d.paths.length} diagram elements · labels: ${d.labels.map((label) => label.text).filter(Boolean).join(", ") || "none"} · explanation: ${d.explanation || "none"}`; }

function DiagramPad({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const data = parseDiagram(value); const [tool, setTool] = useState<"draw" | "label">("draw"); const [draft, setDraft] = useState(""); const [labelText, setLabelText] = useState("D");
  const save = (next: DiagramData) => onChange(JSON.stringify(next));
  const addPreset = (kind: "axes" | "down" | "up" | "vertical") => {
    const presets = { axes: ["M70 300 L70 35", "M70 300 L560 300"], down: ["M120 70 C220 105 360 205 510 270"], up: ["M120 270 C250 205 365 115 510 70"], vertical: ["M315 45 L315 300"] };
    save({ ...data, paths: [...data.paths, ...presets[kind]] });
  };
  const point = (event: React.PointerEvent<SVGSVGElement>) => { const rect = event.currentTarget.getBoundingClientRect(); return { x: Math.round((event.clientX - rect.left) * 600 / rect.width), y: Math.round((event.clientY - rect.top) * 350 / rect.height) }; };
  const begin = (event: React.PointerEvent<SVGSVGElement>) => { const p = point(event); if (tool === "label") { save({ ...data, labels: [...data.labels, { ...p, text: labelText || "Label" }] }); return; } event.currentTarget.setPointerCapture(event.pointerId); setDraft(`M${p.x} ${p.y}`); };
  const move = (event: React.PointerEvent<SVGSVGElement>) => { if (!draft || tool !== "draw") return; const p = point(event); setDraft((path) => `${path} L${p.x} ${p.y}`); };
  const end = () => { if (!draft) return; save({ ...data, paths: [...data.paths, draft] }); setDraft(""); };
  return <div className="diagram-pad"><div className="diagram-toolbar"><button type="button" onClick={() => addPreset("axes")}>+ Axes</button><button type="button" onClick={() => addPreset("down")}>+ Downward curve</button><button type="button" onClick={() => addPreset("up")}>+ Upward curve</button><button type="button" onClick={() => addPreset("vertical")}>+ Vertical line</button><button type="button" className={tool === "draw" ? "active" : ""} onClick={() => setTool("draw")}>Free draw</button><input aria-label="Diagram label" value={labelText} onChange={(event) => setLabelText(event.target.value)} placeholder="Label"/><button type="button" className={tool === "label" ? "active" : ""} onClick={() => setTool("label")}>Place label</button><button type="button" onClick={() => save({ ...data, paths: data.paths.slice(0, -1) })}>Undo</button><button type="button" onClick={() => save(emptyDiagram())}>Clear</button></div><svg viewBox="0 0 600 350" onPointerDown={begin} onPointerMove={move} onPointerUp={end} onPointerCancel={end} role="img" aria-label="Interactive economics diagram answer canvas"><rect width="600" height="350"/><g>{data.paths.map((path, index) => <path key={`${path}-${index}`} d={path}/>) }{draft && <path d={draft} className="draft"/>}{data.labels.map((label, index) => <text key={`${label.text}-${index}`} x={label.x} y={label.y}>{label.text}</text>)}</g></svg><div className="diagram-help"><strong>How to answer</strong><span>Add axes → add curves/lines → type a label and choose “Place label” → click the diagram. Use Free draw for shifts, arrows and areas.</span></div><textarea value={data.explanation} onChange={(event) => save({ ...data, explanation: event.target.value })} rows={6} placeholder="Explain the diagram using its labels and the economic mechanism…"/></div>;
}

function QuestionVisual({ type, data }: { type: NonNullable<Question["visual"]>; data?: Question["visualData"] }) {
  const label = type === "motion-graph" ? "velocity / m s⁻¹" : type === "function-graph" ? "f(x)" : type === "data-graph" ? "measured value" : "Figure 1";
  if (type === "data-table" && data?.columns?.length && data.rows?.length) return <figure className="question-visual stimulus-table"><figcaption>{data.title ?? "Table 1: stimulus data"}</figcaption><div className="table-scroll"><table><thead><tr><th scope="col">Period / group</th>{data.columns.map((column) => <th scope="col" key={column}>{column}</th>)}</tr></thead><tbody>{data.rows.map((row) => <tr key={row.label}><th scope="row">{row.label}</th>{row.values.map((value, index) => <td key={`${row.label}-${index}`}>{value}</td>)}</tr>)}</tbody></table></div>{data.note && <p>{data.note}</p>}</figure>;
  if (type === "bar-chart" && data?.categories?.length && data.y?.length === data.categories.length) {
    const values = data.y; const min = Math.min(0, ...values); const max = Math.max(0, ...values); const span = Math.max(max - min, 1); const zeroY = 205 - ((0 - min) / span) * 150; const barWidth = Math.min(70, 390 / values.length); const gap = 500 / values.length;
    return <figure className="question-visual"><figcaption>{data.title ?? "Figure 1: stimulus data"}</figcaption><svg viewBox="0 0 640 285" role="img" aria-label={`${data.yLabel ?? "Value"} bar chart`}><path className="axis" d={`M70 35V205M70 ${zeroY}H610`}/>{values.map((value, index) => { const height = Math.abs(value) / span * 150; const x = 90 + index * gap + (gap - barWidth) / 2; const y = value >= 0 ? zeroY - height : zeroY; return <g key={`${data.categories?.[index]}-${index}`}><rect className="bar" x={x} y={y} width={barWidth} height={Math.max(height, 2)} rx="5"/><text className="bar-value" x={x + barWidth / 2} y={value >= 0 ? y - 8 : y + height + 15}>{value}{data.yLabel?.includes("%") ? "%" : ""}</text><text className="bar-label" x={x + barWidth / 2} y="232">{data.categories?.[index]}</text></g>; })}<text className="axis-label y" x="16" y="26">{data.yLabel ?? "Value"}</text></svg>{data.note && <p>{data.note}</p>}</figure>;
  }
  if (type === "geo-map") return <figure className="question-visual"><figcaption>{data?.title ?? "Figure 1: spatial pattern"}</figcaption><svg viewBox="0 0 640 300" role="img" aria-label="Schematic choropleth map showing a transport corridor, urban core, rural periphery and hazard-exposed districts"><path className="region low" d="M55 42L260 28L305 120L230 270L55 230Z"/><path className="region medium" d="M260 28L520 48L590 210L395 270L305 120Z"/><path className="region high" d="M205 92L360 70L455 142L355 220L230 185Z"/><path className="corridor" d="M75 238C190 194 270 155 365 112S505 70 570 58"/><path className="hazard" d="M82 62L190 50L207 125L105 145Z M455 176L565 165L580 228L482 246Z"/><circle cx="325" cy="145" r="10"/><text x="325" y="170">Urban core</text><text x="130" y="205">Rural periphery</text><text x="478" y="92">Transport corridor</text><g className="map-key"><rect x="75" y="270" width="18" height="12" className="key-low"/><text x="125" y="280">Lower</text><rect x="185" y="270" width="18" height="12" className="key-medium"/><text x="240" y="280">Medium</text><rect x="300" y="270" width="18" height="12" className="key-high"/><text x="345" y="280">Higher</text><rect x="420" y="270" width="18" height="12" className="key-hazard"/><text x="505" y="280">Hazard-exposed</text></g></svg>{data?.rows?.length && <div className="mini-data-row">{data.rows.map((row) => <span key={row.label}><strong>{row.label}</strong>{row.values.join(" → ")}</span>)}</div>}{data?.note && <p>{data.note}</p>}</figure>;
  if (type === "process-flow" && data?.nodes?.length) return <figure className="question-visual process-visual"><figcaption>{data.title ?? "Figure 1: process flow"}</figcaption><div className="process-nodes">{data.nodes.map((node, index) => <div key={`${node}-${index}`}><span>{index + 1}</span><strong>{node}</strong>{index < (data.nodes?.length ?? 0) - 1 && <i aria-hidden="true">→</i>}</div>)}</div>{data.note && <p>{data.note}</p>}</figure>;
  if (type === "network") return <figure className="question-visual"><figcaption>Figure 1: network topology</figcaption><svg viewBox="0 0 640 220" role="img" aria-label="Network containing a router, switch, server and three clients"><rect x="275" y="18" width="90" height="44" rx="8"/><text x="320" y="45">Router</text><rect x="275" y="92" width="90" height="44" rx="8"/><text x="320" y="119">Switch</text><rect x="60" y="164" width="100" height="40" rx="8"/><text x="110" y="189">Client A</text><rect x="270" y="164" width="100" height="40" rx="8"/><text x="320" y="189">Server</text><rect x="480" y="164" width="100" height="40" rx="8"/><text x="530" y="189">Client B</text><path d="M320 62V92M300 136L110 164M320 136V164M340 136L530 164"/></svg></figure>;
  if (type === "logic") return <figure className="question-visual"><figcaption>Figure 1: logic circuit</figcaption><svg viewBox="0 0 640 210" role="img" aria-label="Two inputs pass through an AND gate, followed by a NOT gate"><text x="35" y="68">A</text><text x="35" y="145">B</text><path d="M55 62H210M55 139H210M210 35H285A55 55 0 0 1 285 165H210Z M340 100H445M445 60L535 100L445 140Z M535 100H595"/><circle cx="548" cy="100" r="12"/><text x="605" y="106">Q</text><text x="243" y="106">AND</text><text x="466" y="106">NOT</text></svg></figure>;
  if (type === "erd") return <figure className="question-visual"><figcaption>Figure 1: entity–relationship diagram</figcaption><svg viewBox="0 0 640 230" role="img" aria-label="Student and Course entities connected through Enrollment"><rect x="25" y="45" width="150" height="120" rx="8"/><text x="100" y="73">STUDENT</text><text x="45" y="105">PK student_id</text><text x="45" y="135">name</text><rect x="245" y="70" width="150" height="80" rx="8"/><text x="320" y="98">ENROLLMENT</text><text x="265" y="130">grade</text><rect x="465" y="45" width="150" height="120" rx="8"/><text x="540" y="73">COURSE</text><text x="485" y="105">PK course_id</text><text x="485" y="135">title</text><path d="M175 105H245M395 105H465"/><text x="197" y="96">1:M</text><text x="414" y="96">M:1</text></svg></figure>;
  if (type === "circuit") return <figure className="question-visual"><figcaption>Figure 1: electrical circuit</figcaption><svg viewBox="0 0 640 220" role="img" aria-label="Cell connected to two parallel resistors and an ammeter"><path d="M90 55H290M350 55H545V180H90V55M290 30V80M315 20V90M350 55H315M200 55V105H440V55M200 105V150H440V105"/><rect x="270" y="91" width="100" height="28"/><text x="320" y="111">R₁ = 6 Ω</text><rect x="270" y="136" width="100" height="28"/><text x="320" y="156">R₂ = 3 Ω</text><circle cx="510" cy="180" r="25"/><text x="510" y="187">A</text></svg></figure>;
  if (type === "wave") return <figure className="question-visual"><figcaption>Figure 1: wave at one instant</figcaption><svg viewBox="0 0 640 230" role="img" aria-label="Sinusoidal wave with displacement and distance axes"><path className="axis" d="M55 190V25M55 110H610"/><path className="plot" d="M55 110C95 25 135 25 175 110S255 195 295 110S375 25 415 110S495 195 535 110S595 45 610 70"/><text x="15" y="25">y</text><text x="590" y="136">x / m</text><path d="M95 48H375M95 42V54M375 42V54"/><text x="227" y="38">λ</text></svg></figure>;
  if (type === "data-graph" && data?.x?.length && data.y?.length === data.x.length) {
    const minX = Math.min(...data.x); const maxX = Math.max(...data.x); const minY = Math.min(...data.y); const maxY = Math.max(...data.y);
    const xPad = Math.max((maxX - minX) * .12, .01); const yPad = Math.max((maxY - minY) * .18, data.uncertainty ?? .01);
    const sx = (value: number) => 72 + ((value - (minX - xPad)) / ((maxX + xPad) - (minX - xPad))) * 520;
    const sy = (value: number) => 202 - ((value - (minY - yPad)) / ((maxY + yPad) - (minY - yPad))) * 158;
    const plot = data.x.map((value, index) => `${index ? "L" : "M"}${sx(value).toFixed(1)} ${sy(data.y[index]).toFixed(1)}`).join(" ");
    return <figure className="question-visual data-plot"><figcaption>Figure 1: experimental data with uncertainty</figcaption><svg viewBox="0 0 640 260" role="img" aria-label={`${data.yLabel} plotted against ${data.xLabel}`}><path className="axis" d="M65 210V28M65 210H610"/><path className="best-fit" d={plot}/>{data.x.map((value, index) => { const cx = sx(value); const cy = sy(data.y[index]); const error = Math.abs(sy(data.y[index] + (data.uncertainty ?? 0)) - cy); return <g key={`${value}-${index}`}>{error > 0 && <><path className="error-bar" d={`M${cx} ${cy-error}V${cy+error}`}/><path className="error-bar" d={`M${cx-5} ${cy-error}H${cx+5}M${cx-5} ${cy+error}H${cx+5}`}/></>}<circle cx={cx} cy={cy} r="5"/><text className="tick-label" x={cx} y={229}>{value.toFixed(2)}</text></g>;})}<text className="axis-label y" x="18" y="25">{data.yLabel}</text><text className="axis-label" x="520" y="251">{data.xLabel}</text></svg></figure>;
  }
  return <figure className="question-visual"><figcaption>Figure 1: {type === "motion-graph" ? "velocity–time graph" : type === "function-graph" ? "function model" : "experimental data"}</figcaption><svg viewBox="0 0 640 250" role="img" aria-label={label}><path className="axis" d="M65 205V25M65 205H610"/><path className="plot" d={type === "motion-graph" ? "M65 180L190 70L330 70L470 165L580 165" : type === "function-graph" ? "M70 190C155 187 195 165 245 122S350 35 430 75S520 175 595 190" : "M80 182L160 160L240 135L320 115L400 82L480 70L570 45"}/><text x="8" y="30">{label}</text><text x="545" y="232">{type === "motion-graph" ? "time / s" : "independent variable"}</text>{type === "data-graph" && [80,160,240,320,400,480,570].map((x,index)=><circle key={x} cx={x} cy={[182,160,135,115,82,70,45][index]} r="5"/>)}</svg></figure>;
}
