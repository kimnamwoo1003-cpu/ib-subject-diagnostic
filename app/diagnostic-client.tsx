"use client";

import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import AdminClient from "./admin/admin-client";
import { getAptitudeQuestion } from "./aptitude-quiz";
import CommunityClient from "./community-client";
import { buildUniqueQuestionPool, getAssessmentCriteria, getPapers, getRelevantTopics, Level, Question, subjectCatalog, subjects } from "./data";
import GradeTracker from "./grade-tracker";
import { BrandLockup, BrandLogo } from "./logo";
import { buildTestPlan, isSingleTopicPaper, topicLimitFor, type TestMode } from "./test-policy";

type Stage = "loading" | "signin" | "recovery-code" | "account" | "premium" | "admin" | "community" | "onboarding" | "home" | "reports" | "status" | "mistakes" | "grades" | "setup" | "ready" | "paper" | "test" | "answers" | "result";
type DeliveryMode = "online" | "pdf";
type Answers = Record<string, string>;
type TopicScore = { code: string; title: string; percent: number; possible: number; earned: number };
type CriterionScore = { code: string; name: string; description: string; percent: number; possible: number; earned: number };
type Mistake = { id: string; topicCode: string; topicTitle: string; prompt: string; modelAnswer: string; answer: string; skill: string };
type AiMarkResult = { marksAwarded: number; maxMarks: number; feedback: string; metRequirements: string[]; missedRequirements: string[]; criteria?: Array<{ code: string; marksAwarded: number; maxMarks: number; feedback: string }> };
type AiMarkState = { status: "loading" } | { status: "error"; message: string } | { status: "done"; result: AiMarkResult };
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
  user: { email: string; displayName: string; isAdmin: boolean; sanction?: { kind: "suspended" | "banned"; until: string | null; reason: string } | null };
  premium: boolean;
  premiumRequest: PremiumRequest | null;
  selectedSubjects: string[];
  subjectLevels: Record<string, Level>;
  grade: string;
  uiLanguage: string;
  attempts: Attempt[];
};

const SITES_ORIGIN = "https://ibcurivo.com";
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

function selectPreparedQuestions(pool: Question[], count: number, topicCodes: string[]) {
  const selected: Question[] = [];
  const used = new Set<string>();
  const topicUse = new Map(topicCodes.map((code) => [code, 0]));
  const demandSequence = [3, 2, 4, 3, 1, 5];
  while (selected.length < count) {
    const desired = demandSequence[selected.length % demandSequence.length];
    const available = pool.filter((question) => !used.has(question.id));
    if (!available.length) break;
    available.sort((a, b) => {
      const topicDelta = (topicUse.get(a.topicCode) ?? 0) - (topicUse.get(b.topicCode) ?? 0);
      if (topicDelta) return topicDelta;
      return Math.abs((a.difficultyLevel ?? 3) - desired) - Math.abs((b.difficultyLevel ?? 3) - desired);
    });
    const next = available[0];
    selected.push(next); used.add(next.id); topicUse.set(next.topicCode, (topicUse.get(next.topicCode) ?? 0) + 1);
  }
  return selected;
}

type ThemeName = "blue" | "teal" | "violet" | "rose" | "orange" | "slate";
const themes: Record<ThemeName, { name: string; blue: string; navy: string; soft: string; line: string; rgb: string }> = {
  blue: { name: "Pine", blue: "#33604a", navy: "#22352b", soft: "#e6efe8", line: "#e6ddcc", rgb: "51,96,74" },
  teal: { name: "Teal", blue: "#087f75", navy: "#074f4a", soft: "#e5f7f4", line: "#cfe8e4", rgb: "8,127,117" },
  violet: { name: "Violet", blue: "#7357d9", navy: "#3d2d7a", soft: "#f0ecff", line: "#dfd8f5", rgb: "115,87,217" },
  rose: { name: "Rose", blue: "#c7446b", navy: "#762640", soft: "#fdeaf0", line: "#f0d5de", rgb: "199,68,107" },
  orange: { name: "Orange", blue: "#c76319", navy: "#74380d", soft: "#fff0e4", line: "#f1ddce", rgb: "199,99,25" },
  slate: { name: "Slate", blue: "#42617d", navy: "#21394f", soft: "#eaf0f5", line: "#d7e0e7", rgb: "66,97,125" },
};

const aiFeedbackLanguages: Array<{ code: string; label: string }> = [
  { code: "en", label: "English" },
  { code: "ko", label: "한국어" },
  { code: "ja", label: "日本語" },
  { code: "fr", label: "Français" },
  { code: "it", label: "Italiano" },
  { code: "zh", label: "中文" },
];

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
  const [paperDuration, setPaperDuration] = useState(0);
  const [plannedMinutes, setPlannedMinutes] = useState(60);
  const [savedResult, setSavedResult] = useState<{ percent: number; grade: number; comparison: Attempt | null; durationSeconds: number } | null>(null);
  const [saveError, setSaveError] = useState("");
  const [theme, setTheme] = useState<ThemeName>("blue");
  const [subjectsMenuOpen, setSubjectsMenuOpen] = useState(false);
  const [levelSaving, setLevelSaving] = useState(false);
  const [levelSaveStatus, setLevelSaveStatus] = useState("");
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfDownloaded, setPdfDownloaded] = useState(false);
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>("online");
  const [premiumAmount, setPremiumAmount] = useState("");
  const [premiumMethod, setPremiumMethod] = useState<PremiumRequest["paymentMethod"]>("bank_transfer");
  const [premiumPayer, setPremiumPayer] = useState("");
  const [premiumReference, setPremiumReference] = useState("");
  const [premiumNote, setPremiumNote] = useState("");
  const [premiumBusy, setPremiumBusy] = useState(false);
  const [premiumMessage, setPremiumMessage] = useState("");
  const [aiMarks, setAiMarks] = useState<Record<string, AiMarkState>>({});
  const [aiFeedbackLanguage, setAiFeedbackLanguage] = useState<string>(() => (typeof window !== "undefined" && localStorage.getItem("ibsd-ai-language")) || "en");
  const changeAiFeedbackLanguage = (next: string) => { setAiFeedbackLanguage(next); localStorage.setItem("ibsd-ai-language", next); };
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
    if (nextStage) setStage(data.user.sanction ? "account" : data.premium && window.location.hash.startsWith("#community") ? "community" : data.selectedSubjects.length === 6 ? "home" : "onboarding");
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

  const logActivity = (action: string, detail: Record<string, unknown> = {}, scope?: { subjectId?: string; level?: Level; paperId?: string }) => {
    void apiFetch("/api/activity", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, subjectId: (scope?.subjectId ?? subjectId) || undefined, level: scope?.level ?? level, paperId: (scope?.paperId ?? paperId) || undefined, detail }) }).catch(() => undefined);
  };

  const submitPremiumRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setPremiumBusy(true); setPremiumMessage("");
    try {
      const response = await apiFetch("/api/premium/request", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ amountKrw: premiumAmount, paymentMethod: premiumMethod, payerName: premiumPayer, paymentReference: premiumReference, note: premiumNote }) });
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
      setStage(data.user.sanction ? "account" : data.premium && window.location.hash.startsWith("#community") ? "community" : data.selectedSubjects?.length === 6 ? "home" : "onboarding");
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
  const downloadablePaper = useMemo(() => paper.id === "p1" || paper.id === "p1a" || paper.id === "concept" || /multiple.?choice|mcq/i.test(`${paper.name} ${paper.format}`), [paper]);
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
    setTestMode("diagnostic"); setStage("setup"); logActivity("subject_opened", {}, { subjectId: id, level: nextLevel, paperId: nextPapers[0].id }); window.scrollTo({ top: 0 });
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

  const prepareTest = () => {
    const premium = Boolean(me?.premium);
    if (!premium && (me?.attempts.length ?? 0) > 0) { setSaveError("Your free account has already used its one test. Premium access is required to take another test."); return; }
    const previousIds = me?.attempts.flatMap((attempt) => attempt.questionIds ?? []) ?? [];
    const seed = (me?.attempts.length ?? 0) * 997 + (testMode === "monthly" ? new Date().getFullYear() * 12 + new Date().getMonth() : includedTopics.length * 37);
    const pool = buildUniqueQuestionPool(subject, level, paper, includedTopics, premium, codeLanguage, seed, previousIds);
    const plan = buildTestPlan(subject, paper, includedTopics.length, premium, testMode, pool);
    const first = pool.find((question) => question.difficultyLevel === 3) ?? pool.find((question) => question.difficulty === "Standard") ?? pool[0];
    if (!first) { setSaveError("No unused questions remain for this exact selection. Choose another topic or paper while the bank refreshes."); return; }
    const prepared = downloadablePaper ? selectPreparedQuestions(pool, plan.questionCount, includedTopics.map((topic) => topic.code)) : [first];
    setQuestionPool(pool); setTargetQuestionCount(downloadablePaper ? prepared.length : plan.questionCount); setQuestions(prepared); setAnswers({}); setCurrent(0); setAdaptiveLevel(3);
    setDifficultyTrail(prepared.map((question) => question.difficulty)); setStartedAt(0); setPaperDuration(0); setTimeLimit(plan.seconds); setTimeLeft(plan.seconds); setPlannedMinutes(plan.plannedMinutes); setSavedResult(null); setSaveError(""); setPdfDownloaded(false); setDeliveryMode("online"); finishGuard.current = false; setStage("ready");
    logActivity("test_prepared", { topicCodes: includedTopics.map((topic) => topic.code), questionCount: downloadablePaper ? prepared.length : plan.questionCount, downloadable: downloadablePaper }); window.scrollTo({ top: 0 });
  };

  const startPreparedTest = (mode: DeliveryMode = "online") => {
    const nextMode = downloadablePaper ? mode : "online";
    if (nextMode === "pdf" && !pdfDownloaded) { setSaveError("Download the question paper before starting the PDF exam."); return; }
    setDeliveryMode(nextMode);
    setStartedAt(Date.now()); setTimeLeft(timeLimit); setPaperDuration(0); finishGuard.current = false;
    setStage(nextMode === "pdf" ? "paper" : "test");
    logActivity("test_started", { questionCount: targetQuestionCount, seconds: timeLimit, deliveryMode: nextMode, downloaded: pdfDownloaded });
    window.scrollTo({ top: 0 });
  };

  const openAnswerEntry = (timedOut = false) => {
    const elapsed = startedAt ? Math.max(1, Math.min(timeLimit, Math.round((Date.now() - startedAt) / 1000))) : 0;
    setPaperDuration(elapsed); setStage("answers"); setCurrent(0);
    logActivity("answer_entry_opened", { elapsedSeconds: elapsed, timedOut }); window.scrollTo({ top: 0 });
  };

  const downloadPaper = async () => {
    const element = document.getElementById("downloadable-question-paper");
    if (!element) return;
    setPdfBusy(true); setSaveError("");
    try {
      const { downloadElementAsPdf } = await import("./pdf-export");
      await downloadElementAsPdf(element, `${subject.shortName}-${level}-${paper.name}-question-paper.pdf`);
      setPdfDownloaded(true); logActivity("pdf_downloaded", { questionCount: questions.length });
    } catch (error) { setSaveError(error instanceof Error ? error.message : "The PDF could not be created."); }
    finally { setPdfBusy(false); }
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
    if ((stage !== "test" && stage !== "answers") || finishGuard.current) return;
    finishGuard.current = true;
    const comparison = testMode === "monthly" ? me?.attempts.find((attempt) => attempt.mode === "monthly" && attempt.subjectId === subject.id && attempt.paperId === paper.id) ?? null : null;
    const durationSeconds = Math.max(1, paperDuration || Math.round((Date.now() - startedAt) / 1000));
    setSavedResult({ percent: result.percent, grade: result.grade, comparison, durationSeconds });
    setStage("result"); window.scrollTo({ top: 0 });
    const response = await apiFetch("/api/attempts", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({
      subjectId: subject.id, subjectName: subject.name, level, paperId: paper.id, paperName: paper.name, mode: testMode,
      percent: result.percent, grade: result.grade, durationSeconds, topicBreakdown, criteriaBreakdown, questionIds: questions.map((question) => question.id), difficultyTrail, mistakes,
    }) });
    if (response.ok) { await loadMe(false); logActivity("test_submitted", { percent: result.percent, durationSeconds, questionCount: questions.length }); }
    else { const data = await response.json() as { error?: string }; setSaveError(data.error ?? "The result could not be saved."); finishGuard.current = false; }
  };

  const requestAiMark = async (question: Question) => {
    const answer = answers[question.id] ?? "";
    setAiMarks((current) => ({ ...current, [question.id]: { status: "loading" } }));
    try {
      const response = await apiFetch("/api/mark", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({
        prompt: question.prompt, context: question.context, commandTerm: question.commandTerm, responseType: question.responseType,
        marks: question.marks, modelAnswer: question.modelAnswer, markschemePoints: question.markschemePoints, commonErrors: question.commonErrors,
        criterionCodes: question.criterionCodes, answer: formatAnswerForReview(question, answer), language: aiFeedbackLanguage,
      }) });
      const data = await response.json() as { result?: AiMarkResult; error?: string };
      if (!response.ok || !data.result) { setAiMarks((current) => ({ ...current, [question.id]: { status: "error", message: data.error ?? "AI marking failed." } })); return; }
      setAiMarks((current) => ({ ...current, [question.id]: { status: "done", result: data.result! } }));
    } catch {
      setAiMarks((current) => ({ ...current, [question.id]: { status: "error", message: "AI marking failed." } }));
    }
  };

  useEffect(() => {
    if ((stage !== "test" && stage !== "paper") || timeLimit <= 0) return;
    const timer = window.setInterval(() => setTimeLeft((value) => {
      if (value <= 1) {
        window.clearInterval(timer);
        window.setTimeout(() => document.getElementById(stage === "paper" ? "timed-open-answers" : "timed-auto-submit")?.click(), 0);
        return 0;
      }
      return value - 1;
    }), 1000);
    return () => window.clearInterval(timer);
  }, [stage, testMode, timeLimit]);

  const goHome = () => { window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`); setStage("home"); window.scrollTo({ top: 0 }); };
  const openCommunity = () => { window.history.replaceState(null, "", "#community"); setStage("community"); window.scrollTo({ top: 0 }); };
  const answered = questions.filter((question) => (answers[question.id] ?? "").trim()).length;
  const selectedCatalog = (me?.selectedSubjects ?? []).map((id) => subjectCatalog.find((item) => item.id === id)).filter(Boolean);
  const allMistakes = me?.attempts.flatMap((attempt) => attempt.mistakes.map((mistake) => ({ ...mistake, attempt }))) ?? [];
  const freeLocked = !me?.premium && (me?.attempts.length ?? 0) >= 1;

  if (stage === "loading") return <main className="loading-screen"><BrandLogo/><strong>Loading your learning profile…</strong></main>;
  if (stage === "signin") return <main className="loading-screen auth-screen"><div className="auth-card"><BrandLogo/><span className="eyebrow">{authMode === "reset" ? "ACCOUNT RECOVERY" : "STUDENT ACCOUNT"}</span><h1>{authMode === "login" ? "Log in" : authMode === "register" ? "Create account" : "Reset password"}</h1><p>{authMode === "reset" ? "Enter the recovery code that was issued by this site, then choose a new password." : "Use a site username and password to save your subjects, test results and Premium access."}</p>{authMode !== "reset" && <div className="auth-tabs"><button type="button" className={authMode === "login" ? "active" : ""} onClick={() => { setAuthMode("login"); setAuthError(""); setAuthNotice(""); }}>Log in</button><button type="button" className={authMode === "register" ? "active" : ""} onClick={() => { setAuthMode("register"); setAuthError(""); setAuthNotice(""); }}>Sign up</button></div>}<form className="account-form" onSubmit={submitAuth}><label><span>Username</span><input autoComplete="username" value={authUsername} onChange={(event) => setAuthUsername(event.target.value)} placeholder="Lowercase letters, numbers or underscores" minLength={3} maxLength={24} required/></label>{authMode === "reset" && <label><span>Recovery code</span><input autoComplete="off" value={authRecoveryCode} onChange={(event) => setAuthRecoveryCode(event.target.value.toUpperCase())} placeholder="XXXXX-XXXXX-XXXXX-XXXXX" required/></label>}<label><span>{authMode === "reset" ? "New password" : "Password"}</span><input type="password" autoComplete={authMode === "login" ? "current-password" : "new-password"} value={authPassword} onChange={(event) => setAuthPassword(event.target.value)} placeholder="At least 8 characters" minLength={8} maxLength={128} required/></label>{authMode === "register" && authUsername.trim().toLowerCase() === "justinnamwoo1003" && <label><span>One-time administrator setup code</span><input type="password" autoComplete="off" value={adminSetupCode} onChange={(event) => setAdminSetupCode(event.target.value)} placeholder="Required only for initial admin registration" required/></label>}{authNotice && <div className="auth-notice" role="status">{authNotice}</div>}{authError && <div className="auth-error" role="alert">{authError}</div>}<button className="primary-button" disabled={authBusy}>{authBusy ? "Working…" : authMode === "login" ? "Log in" : authMode === "register" ? "Create account" : "Reset password"} <span>→</span></button></form>{authMode === "login" && <button type="button" className="forgot-link" onClick={() => { setAuthMode("reset"); setAuthError(""); setAuthNotice(""); setAuthPassword(""); }}>Forgot password?</button>}{authMode === "reset" && <button type="button" className="forgot-link" onClick={() => { setAuthMode("login"); setAuthError(""); setAuthRecoveryCode(""); setAuthPassword(""); }}>← Back to login</button>}{authMode === "register" && <small>You will receive a one-time recovery code after registration. Save it somewhere private.</small>}</div></main>;
  if (stage === "recovery-code") return <main className="loading-screen auth-screen"><div className="auth-card recovery-card"><BrandLogo/><span className="eyebrow">SAVE THIS ONCE</span><h1>Your recovery code</h1><p>This code is the only self-service way to reset your password. Store it somewhere private; it will not be shown again.</p><code>{issuedRecoveryCode}</code><button className="primary-button" onClick={() => void loadMe()}>I saved the code <span>→</span></button></div></main>;
  if (me?.user.sanction) return <main className="loading-screen auth-screen"><div className="auth-card sanction-card"><BrandLogo/><span className="eyebrow">ACCOUNT RESTRICTED</span><h1>{me.user.sanction.kind === "banned" ? "Account permanently suspended" : "Account temporarily suspended"}</h1><p>{me.user.sanction.reason}</p>{me.user.sanction.until && <strong>Access returns {new Date(me.user.sanction.until).toLocaleString("en-GB")}</strong>}<button className="secondary-button" onClick={() => void logOut()}>Log out</button></div></main>;
  if (stage === "onboarding") return !me?.grade
    ? <OnboardingWizard name={me?.user.displayName ?? initialName} onSaved={async () => { await loadMe(); }}/>
    : <SubjectOnboarding name={me?.user.displayName ?? initialName} current={me?.selectedSubjects ?? []} currentLevels={me?.subjectLevels ?? {}} onSaved={async () => { await loadMe(); }} />;
  if (stage === "community" && me?.premium) return <CommunityClient username={me.user.email} isAdmin={me.user.isAdmin} onBack={goHome}/>;

  return <div className="app-shell">
    <aside className="app-sidebar">
      <button className="brand" onClick={goHome} aria-label="Go to dashboard"><BrandLockup/></button>
      <nav className="sidebar-nav" aria-label="Main navigation">
        <button className={`sidebar-link ${stage === "home" ? "active" : ""}`} onClick={goHome}><span className="sidebar-icon">⌂</span>Home</button>
        <div className="sidebar-group">
          <button type="button" className="sidebar-link sidebar-group-toggle" onClick={() => setSubjectsMenuOpen((open) => !open)} aria-expanded={subjectsMenuOpen}><span className="sidebar-icon">▤</span>My Subjects<i className={`sidebar-caret ${subjectsMenuOpen ? "open" : ""}`}>⌄</i></button>
          {subjectsMenuOpen && <div className="sidebar-sublist">
            {selectedCatalog.map((choice) => {
              if (!choice) return null;
              const active = subjects.find((item) => item.id === choice.id);
              return <button type="button" key={choice.id} className={`sidebar-subject-row ${freeLocked ? "locked-subject" : ""}`} disabled={!active} onClick={() => active && chooseSubject(active.id)}>
                <span className="sidebar-subject-badge" style={active ? { "--subject": active.color, "--subject-soft": active.softColor } as React.CSSProperties : undefined}>{active?.shortName ?? choice.name.split(" ").map((word) => word[0]).join("").slice(0, 3)}</span>
                <span className="sidebar-subject-copy"><strong>{choice.name}</strong><small>{me?.subjectLevels?.[choice.id] ?? (choice.levels.includes("SL") ? "SL" : "HL")}</small></span>
              </button>;
            })}
            <button type="button" className="sidebar-sublist-manage" onClick={() => setStage("onboarding")}>Change subjects →</button>
          </div>}
        </div>
        <button className={`sidebar-link ${stage === "reports" ? "active" : ""}`} onClick={() => setStage("reports")}><span className="sidebar-icon">▥</span>Reports</button>
        <button className={`sidebar-link ${stage === "mistakes" ? "active" : ""}`} onClick={() => setStage("mistakes")}><span className="sidebar-icon">✕</span>Mistakes</button>
        {me?.premium && <button className={`sidebar-link ${stage === "status" ? "active" : ""}`} onClick={() => setStage("status")}><span className="sidebar-icon">◔</span>Status</button>}
        {me?.premium && <button className={`sidebar-link ${stage === "grades" ? "active" : ""}`} onClick={() => setStage("grades")}><span className="sidebar-icon">◈</span>Grades</button>}
        {me?.premium && <button className="sidebar-link commons-sidebar-link" onClick={openCommunity}><span className="sidebar-icon">◎</span>Commons</button>}
      </nav>
      <div className="sidebar-footer">
        <ThemePicker value={theme} onChange={changeTheme}/>
        <details className="account-menu">
          <summary aria-label="Open account menu"><span className="account-avatar">{(me?.user.displayName ?? "S").slice(0, 1).toUpperCase()}</span><span className="account-summary"><strong>{me?.user.displayName}</strong><small>{me?.premium ? "Premium member" : "Free member"}</small></span><i>⌄</i></summary>
          <div className="account-menu-panel">
            <header><span>Signed in as</span><strong title={me?.user.email}>{me?.user.email}</strong></header>
            {me?.premium && <span className="premium-access">★ Premium Access</span>}
            {!me?.premium && <button className={`account-link ${stage === "premium" ? "active" : ""}`} onClick={() => setStage("premium")}>{me?.premiumRequest?.status === "pending" ? "Payment pending" : "Apply for Premium"}</button>}
            {me?.user.isAdmin && <button className={`admin-link ${stage === "admin" ? "active" : ""}`} type="button" onClick={() => setStage("admin")}>Admin console</button>}
            <button className={`account-link ${stage === "account" ? "active" : ""}`} type="button" onClick={() => { setIssuedRecoveryCode(""); setAuthError(""); setStage("account"); }}>Account settings</button>
            <button className="signout-link" type="button" onClick={() => void logOut()}>Log out</button>
          </div>
        </details>
      </div>
    </aside>

    <main className="app-main">
    {stage === "home" && <div className="page-container home-page">
      <section className="dashboard-hero"><div><span className="eyebrow">WELCOME BACK</span><h1>{me?.user.displayName ?? initialName}</h1><p>Your six IB subjects, progress checks and next revision priorities in one place.</p></div><div className={`membership-card ${me?.premium ? "premium" : ""}`}><span>{me?.premium ? "PREMIUM MEMBER" : "FREE ACCOUNT"}</span><strong>{me?.premium ? "Full diagnostic access" : "Quick diagnostics"}</strong><small>{me?.premium ? "Monthly tests · growth reports · revision queue · mistake bank" : "An admin can enable Premium for this account."}</small></div></section>

      {me?.premium ? <PremiumDashboard attempts={me.attempts} onReports={() => setStage("reports")} onMistakes={() => setStage("mistakes")} onStatus={() => setStage("status")} /> : <section className="premium-promo"><div><span className="eyebrow">{me?.premiumRequest?.status === "pending" ? "PAYMENT UNDER REVIEW" : freeLocked ? "FREE TEST USED" : "PREMIUM"}</span><h2>{me?.premiumRequest?.status === "pending" ? "Your Premium request is pending" : freeLocked ? "Your free diagnostic is complete" : "Unlock your full progress system"}</h2><p>{me?.premiumRequest?.status === "pending" ? "The administrator will verify your payment reference. Premium activates only after acceptance." : me?.premiumRequest?.status === "rejected" ? `Your previous request was not accepted${me.premiumRequest.adminNote ? `: ${me.premiumRequest.adminNote}` : ". You can submit corrected payment details."}` : freeLocked ? "All further subject tests are now locked until Premium is approved." : "Submit your payment confirmation for administrator review."}</p><button className="premium-apply-button" onClick={() => { setPremiumMessage(""); setStage("premium"); }}>{me?.premiumRequest?.status === "pending" ? "View request status" : me?.premiumRequest?.status === "rejected" ? "Resubmit payment details" : "Apply for Premium"} <span>→</span></button></div><ul><li>Unlimited adaptive retakes with different questions</li><li>Timed monthly tests with before/after comparison</li><li>Current-status map, revision queue and mistake bank</li></ul></section>}
    </div>}

    {stage === "reports" && <ReportsView premium={Boolean(me?.premium)} attempts={me?.attempts ?? []} onBack={goHome} />}
    {stage === "status" && <StatusView premium={Boolean(me?.premium)} attempts={me?.attempts ?? []} onBack={goHome} />}
    {stage === "mistakes" && <MistakeBank premium={Boolean(me?.premium)} mistakes={allMistakes} onBack={goHome} />}
    {stage === "grades" && me?.premium && <GradeTracker selectedSubjects={me.selectedSubjects} subjectLevels={me.subjectLevels} onBack={goHome}/>}
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
      {saveError && <div className="inline-error">{saveError}</div>}<div className="start-panel"><div><strong>{subject.name} {level} · {paper.name}</strong><span>{includedTopics.length} topics · {downloadablePaper ? "downloadable question paper" : paper.id === "concept" ? "timed adaptive concept MCQ" : testMode === "monthly" ? "timed monthly progress test" : "timed adaptive diagnostic"} · maximum 60 minutes</span></div><button className="primary-button" disabled={!includedTopics.length || freeLocked || levelSaving} onClick={prepareTest}>{levelSaving ? "Saving level…" : freeLocked ? "Free test already used" : "Prepare test"} <span>→</span></button></div>
    </div>}

    {stage === "ready" && <div className="page-container ready-page" style={{ "--subject": subject.color, "--subject-soft": subject.softColor } as React.CSSProperties}>
      <button className="back-link" onClick={() => setStage("setup")}>← Test setup</button>
      <div className="ready-hero"><span className="eyebrow">TEST READY</span><h1>{subject.name} {level}</h1><p>{paper.name} · {rangeLabel}</p><div className="ready-summary"><div><strong>{targetQuestionCount}</strong><span>questions</span></div><div><strong>{plannedMinutes}</strong><span>minutes</span></div><div><strong>{questions.reduce((sum, question) => sum + question.marks, 0)}</strong><span>marks</span></div></div></div>
      {downloadablePaper ? <section className="delivery-section">
        <div className="delivery-heading"><span className="eyebrow">CHOOSE YOUR FORMAT</span><h2>How do you want to take this test?</h2><p>Both formats use the same questions, marks and time limit.</p></div>
        <div className="delivery-grid">
          <article className={deliveryMode === "online" ? "selected" : ""}>
            <button type="button" className="delivery-select" onClick={() => { setDeliveryMode("online"); setSaveError(""); }}><span className="delivery-icon">⌨</span><strong>Take online</strong><p>Read every stimulus and enter answers directly on this site. The timer and question navigation stay visible.</p><em>{deliveryMode === "online" ? "Selected" : "Select online"}</em></button>
            <button className="primary-button" onClick={() => startPreparedTest("online")}>Start online exam <span>→</span></button>
          </article>
          <article className={deliveryMode === "pdf" ? "selected" : ""}>
            <button type="button" className="delivery-select" onClick={() => { setDeliveryMode("pdf"); setSaveError(""); }}><span className="delivery-icon">PDF</span><strong>Use PDF</strong><p>Download and solve the printable paper first. When finished, return to enter answers for checking.</p><em>{pdfDownloaded ? "PDF ready" : deliveryMode === "pdf" ? "Selected" : "Select PDF"}</em></button>
            <div className="delivery-actions"><button className="secondary-button" disabled={pdfBusy} onClick={() => { setDeliveryMode("pdf"); void downloadPaper(); }}>{pdfBusy ? "Creating PDF…" : pdfDownloaded ? "Download again" : "Download PDF"}</button><button className="primary-button" disabled={!pdfDownloaded} onClick={() => startPreparedTest("pdf")}>{pdfDownloaded ? "Start PDF exam" : "Download first"} <span>→</span></button></div>
          </article>
        </div>
        <p className="delivery-timer-note">The {formatTime(timeLimit)} timer starts only after you choose a format and press its start button.</p>
      </section> : <section className="ready-steps"><article><span>1</span><div><strong>Start only when ready</strong><p>The timer has not started. Answer directly on this site; the {formatTime(timeLimit)} timer begins when you press Start online exam.</p></div><button className="primary-button" onClick={() => startPreparedTest("online")}>Start online exam <span>→</span></button></article></section>}
      {saveError && <div className="inline-error">{saveError}</div>}<PrintablePaper id="downloadable-question-paper" subjectName={subject.name} level={level} paperName={paper.name} minutes={plannedMinutes} questions={questions}/>
    </div>}

    {stage === "paper" && <div className="paper-session page-container" style={{ "--subject": subject.color, "--subject-soft": subject.softColor } as React.CSSProperties}><button id="timed-open-answers" className="sr-only" onClick={() => openAnswerEntry(true)}>Open answers</button><span className="eyebrow">PDF EXAM IN PROGRESS</span><h1>{subject.name} {level} · {paper.name}</h1><div className={`paper-timer ${timeLeft < 300 ? "urgent" : ""}`}><span>TIME LEFT</span><strong>{formatTime(timeLeft)}</strong><div><i style={{ width: `${Math.max(0, (timeLeft / Math.max(timeLimit, 1)) * 100)}%` }}/></div></div><section><strong>Work from your downloaded question paper.</strong><p>Your answers are not shown on screen during the timed session. When finished, stop the timer and enter your responses for checking. If time reaches zero, the answer-check section opens automatically.</p><button className="secondary-button" onClick={() => void downloadPaper()}>Download paper again</button></section><button className="primary-button finish-paper" onClick={() => openAnswerEntry(false)}>I finished — enter answers <span>→</span></button></div>}

    {stage === "answers" && <div className="page-container answer-entry-page" style={{ "--subject": subject.color, "--subject-soft": subject.softColor } as React.CSSProperties}><div className="answer-entry-heading"><span className="eyebrow">ANSWER CHECK</span><h1>Enter your completed responses</h1><p>The exam timer stopped at {formatTime(paperDuration)}. Transcribe your answers below, then submit once to see estimated marks and markscheme requirements.</p><div className="answer-progress"><strong>{answered}/{questions.length}</strong><span>responses entered</span></div></div><div className="answer-entry-list">{questions.map((question, index) => <section key={question.id}><div className="answer-number">Question {index + 1}</div><QuestionCard question={question} answer={answers[question.id] ?? ""} allowMathSymbols={subject.group === "Sciences" || subject.group === "Mathematics"} onAnswer={(value) => setAnswers((currentAnswers) => ({ ...currentAnswers, [question.id]: value }))}/></section>)}</div><div className="submit-answer-check"><div><strong>Ready to check?</strong><span>You can submit unanswered questions; they receive zero estimated marks.</span></div><button className="primary-button" onClick={() => void finish()}>Check answers & finish <span>→</span></button></div></div>}

    {stage === "test" && questions[current] && <div className="test-layout" style={{ "--subject": subject.color, "--subject-soft": subject.softColor } as React.CSSProperties}>
      <aside className="test-sidebar"><div><span className="eyebrow">{subject.name} {level}</span><h2>{paper.name}</h2><p>{rangeLabel} · {subject.id === "cs" && paper.id === "p2" ? `${codeLanguage === "python" ? "Python" : "Java"} · ` : ""}{testMode === "monthly" ? "Monthly" : me?.premium ? "Premium" : "Quick"}</p><div className={`timer ${timeLeft < 300 ? "urgent" : ""}`}><span>TIME LEFT</span><strong>{formatTime(timeLeft)}</strong></div></div><div className="adaptive-indicator"><span>ADAPTIVE LEVEL</span><strong>Level {adaptiveLevel} · {adaptiveLevel === 1 ? "Recognition" : adaptiveLevel === 2 ? "Basic explanation" : adaptiveLevel === 3 ? "Multi-step application" : adaptiveLevel === 4 ? "Evaluation & integration" : "Synthesis under uncertainty"}</strong><small>Only one demand dimension changes after each response.</small></div><div className="question-map">{questions.map((question, index) => <button type="button" key={question.id} aria-label={`Open question ${index + 1}`} className={`${index === current ? "active" : ""} ${(answers[question.id] ?? "").trim() ? "answered" : ""}`} onClick={() => goToQuestion(index)}><span>{index + 1}</span><small>{question.topicCode}</small></button>)}</div><div className="sidebar-progress"><span><strong>{answered}</strong> answered · target {targetQuestionCount} · {plannedMinutes} min</span><div><i style={{ width: `${(questions.length / targetQuestionCount) * 100}%` }}/></div></div></aside>
      <section className="question-stage"><button id="timed-auto-submit" className="sr-only" onClick={() => void finish()}>Auto submit</button><div className="question-topline"><span>Question {current + 1} of {targetQuestionCount}</span><span>Responses submit when time ends</span></div><QuestionCard question={questions[current]} answer={answers[questions[current].id] ?? ""} allowMathSymbols={subject.group === "Sciences" || subject.group === "Mathematics"} onAnswer={(value) => setAnswers({ ...answers, [questions[current].id]: value })}/><div className="question-actions"><button type="button" className="secondary-button" disabled={current === 0} onClick={() => goToQuestion(current - 1)}>Previous</button>{current === questions.length - 1 && questions.length >= targetQuestionCount ? <button type="button" className="primary-button" onClick={() => void finish()}>Finish & analyse <span>→</span></button> : <button type="button" className="primary-button" onClick={nextAdaptiveQuestion}>Next question <span>→</span></button>}</div></section>
    </div>}

    {stage === "result" && savedResult && <div className="page-container result-page" style={{ "--subject": subject.color, "--subject-soft": subject.softColor } as React.CSSProperties}>
      <section className="result-hero"><div><span className="eyebrow">{testMode === "monthly" ? "MONTHLY TEST COMPLETE" : "DIAGNOSTIC COMPLETE"}</span><h1>{subject.name} {level}</h1><p>{paper.name} · {rangeLabel}</p></div><div className="score-card"><span>Estimated performance</span><strong>{savedResult.percent}<small>%</small></strong><p>Practice grade <b>{savedResult.grade}</b> · {result.earned}/{result.possible} estimated marks</p></div></section>
      {testMode === "monthly" && <GrowthSummary current={savedResult.percent} previous={savedResult.comparison} currentBreakdown={topicBreakdown} duration={savedResult.durationSeconds}/>} 
      <div className="result-disclaimer">Formative practice estimate, not an official IB grade prediction. Open responses are estimated from concept coverage and development.</div>
      {saveError && <div className="inline-error">{saveError}</div>}
      {criteriaBreakdown.length > 0 && <section className="result-section"><div className="section-heading compact"><div><span className="step-label">CR</span><h2>Assessment criteria match</h2></div><p>How closely this response currently meets each language criterion</p></div><div className="criteria-grid">{criteriaBreakdown.map((criterion) => <div className="criterion-card" key={criterion.code}><span>{criterion.code}</span><div><strong>{criterion.name}</strong><p>{criterion.description}</p></div><em className={criterion.percent >= 75 ? "secure" : criterion.percent >= 50 ? "developing" : "needs-work"}>{criterion.percent}% · {criterion.percent >= 75 ? "Meets well" : criterion.percent >= 50 ? "Partly meets" : "Not yet met"}</em></div>)}</div></section>}
      {me?.premium ? <><section className="result-section"><div className="section-heading compact"><div><span className="step-label">01</span><h2>Topic diagnosis</h2></div><p>Weakest topic first</p></div><div className="topic-results">{topicBreakdown.map((topic) => <div key={topic.code} className="topic-result-row"><span className="result-code">{topic.code}</span><div><strong>{topic.title}</strong><span><i style={{ width: `${topic.percent}%` }}/></span></div><em className={topic.percent < 50 ? "needs-work" : topic.percent < 72 ? "developing" : "secure"}>{topic.percent}%</em></div>)}</div></section><section className="diagnostic-grid"><div className="insight-card warning"><span className="card-kicker">REVISION QUEUE #1</span><h3>{topicBreakdown[0]?.code} {topicBreakdown[0]?.title}</h3><p>Rebuild the central relationship, correct your lowest-scoring response, then complete one transfer question.</p></div><div className="insight-card"><span className="card-kicker">MISTAKE BANK</span><h3>{mistakes.length} responses saved</h3><p>Your missed and partially developed responses are now available from the dashboard for targeted retry.</p></div></section></> : <section className="quick-result"><div><span className="card-kicker">NEXT STEP</span><h2>Review {topicBreakdown[0]?.code} {topicBreakdown[0]?.title}</h2><p>Correct the lowest-scoring topic, then retry a paper-specific question.</p></div><div className="premium-lock"><span>Premium report</span><strong>Detailed progress is locked</strong><p>An administrator can grant Premium to your account. The badge and features appear automatically after approval.</p></div></section>}
      <section className="answer-review"><div className="section-heading compact"><div><span className="step-label">02</span><h2>Answer review</h2></div><p>Original practice markschemes</p><label className="ai-language-picker"><span>IB examiner AI feedback language</span><select value={aiFeedbackLanguage} onChange={(event) => changeAiFeedbackLanguage(event.target.value)}>{aiFeedbackLanguages.map((option) => <option key={option.code} value={option.code}>{option.label}</option>)}</select></label></div>{questions.map((question, index) => <details key={question.id}><summary><span>{index + 1}</span><div><strong>{question.topicCode} · {question.commandTerm ?? question.skill}</strong><p>{question.prompt}</p></div><em>{scoreQuestion(question, answers[question.id] ?? "")}/{question.marks}</em></summary><div className="review-body"><div><span>Your response</span><p>{formatAnswerForReview(question, answers[question.id] ?? "")}</p></div><div className="model-points"><span>Markscheme requirements</span>{question.markschemePoints?.length ? <ol>{question.markschemePoints.map((point) => <li key={point}>{point}</li>)}</ol> : <p>{question.modelAnswer}</p>}<small>Key coverage: {question.keywords.join(" · ")}</small>{question.commonErrors?.length ? <p className="common-errors"><strong>Common errors:</strong> {question.commonErrors.join(" · ")}</p> : null}</div>{question.responseType !== "mcq" && <AiMarkPanel state={aiMarks[question.id]} onRequest={() => void requestAiMark(question)}/>}</div></details>)}</section>
      <div className="result-actions"><button className="secondary-button" onClick={goHome}>Back to dashboard</button>{me?.premium ? <button className="primary-button" onClick={() => setStage("setup")}>Retake with different questions <span>→</span></button> : <span className="free-result-lock">Free attempt used · further tests are locked</span>}</div>
    </div>}
    <footer><span>IB Curivo</span><p>Independent practice tool. Not affiliated with or endorsed by the International Baccalaureate Organization.</p></footer>
    </main>
  </div>;
}

type WizardLang = "en" | "ko" | "ja" | "fr" | "it" | "zh";
const wizardLanguages: Array<{ code: WizardLang; label: string }> = [
  { code: "en", label: "English" },
  { code: "ko", label: "한국어" },
  { code: "ja", label: "日本語" },
  { code: "fr", label: "Français" },
  { code: "it", label: "Italiano" },
  { code: "zh", label: "中文" },
];

const wizardCopy: Record<WizardLang, Record<string, string>> = {
  en: { welcome: "Welcome to IB Curivo! Which language should I speak?", confirmLanguage: "Great, I'll speak in English from now on!", askGrade: "Nice to meet you! What grade are you in?", askTrack: "You're in Grade 10 — let's find your subjects together. Are you leaning more toward Sciences or Humanities?", askCandidates: "Good choice! Pick a few subjects you're considering — you can pick several.", quizIntro: "Let's try one quick sample question from each subject you picked", quizDone: "Nice work! Based on your answers, here's what I'd recommend.", goToPicker: "Now let's lock in your final six subjects" },
  ko: { welcome: "IB Curivo에 오신 걸 환영해요! 어떤 언어로 이야기할까요?", confirmLanguage: "좋아요, 이제부터 한국어로 이야기할게요!", askGrade: "만나서 반가워요! 지금 몇 학년이에요?", askTrack: "10학년이군요 — 어떤 과목이 맞을지 같이 찾아봐요. Sciences 쪽에 더 끌려요, Humanities 쪽에 더 끌려요?", askCandidates: "좋아요! 지금 생각하고 있는 과목들을 몇 개 골라볼래요 — 여러 개 선택 가능해요.", quizIntro: "고른 과목마다 짧은 샘플 문제를 하나씩 풀어볼게요", quizDone: "잘했어요! 답변을 보고 이런 과목들을 추천해볼게요.", goToPicker: "이제 최종 6과목을 확정해볼까요" },
  ja: { welcome: "IB Curivoへようこそ！どの言語で話しましょうか？", confirmLanguage: "了解です、これからは日本語で話しますね！", askGrade: "はじめまして！今、何年生ですか？", askTrack: "10年生ですね — 合う科目を一緒に探しましょう。Sciences寄りですか、Humanities寄りですか？", askCandidates: "いいですね！今考えている科目をいくつか選んでみてください — 複数選択できます。", quizIntro: "選んだ科目ごとに、簡単なサンプル問題を一つずつ試してみましょう", quizDone: "よくできました！答えをもとに、こんな科目がおすすめです。", goToPicker: "では最終的な6科目を決めましょう" },
  fr: { welcome: "Bienvenue sur IB Curivo ! Dans quelle langue veux-tu que je parle ?", confirmLanguage: "Parfait, je vais parler en français maintenant !", askGrade: "Ravi de te rencontrer ! Tu es en quelle année ?", askTrack: "Tu es en Grade 10 — trouvons tes matières ensemble. Tu es plutôt attiré par les Sciences ou les Humanities ?", askCandidates: "Bon choix ! Choisis quelques matières que tu envisages — tu peux en choisir plusieurs.", quizIntro: "Essayons une petite question type pour chaque matière choisie", quizDone: "Bien joué ! D'après tes réponses, voici ce que je recommande.", goToPicker: "Passons maintenant au choix final de tes six matières" },
  it: { welcome: "Benvenuto/a su IB Curivo! In quale lingua devo parlare?", confirmLanguage: "Perfetto, ora parlerò in italiano!", askGrade: "Piacere di conoscerti! In che anno sei?", askTrack: "Sei al Grade 10 — troviamo insieme le tue materie. Sei più orientato/a verso le Sciences o le Humanities?", askCandidates: "Ottima scelta! Scegli alcune materie che stai considerando — puoi sceglierne più di una.", quizIntro: "Proviamo una breve domanda di esempio per ogni materia scelta", quizDone: "Ottimo lavoro! In base alle tue risposte, ecco cosa ti consiglio.", goToPicker: "Ora scegliamo le tue sei materie definitive" },
  zh: { welcome: "欢迎来到 IB Curivo！你想用哪种语言交流？", confirmLanguage: "好的，接下来我会用中文和你交流！", askGrade: "很高兴认识你！你现在读几年级？", askTrack: "你是10年级 — 我们一起来找找适合你的科目吧。你更偏向 Sciences 还是 Humanities？", askCandidates: "不错的选择！挑几个你正在考虑的科目吧 — 可以多选。", quizIntro: "我们来试试每个科目的一道简单示例题", quizDone: "做得好！根据你的答案，我推荐这些科目。", goToPicker: "现在来确定你最终的六门科目吧" },
};

const scienceTrackIds = ["math", "math-ai", "physics", "chemistry", "biology", "cs", "ess", "sehs", "design-technology"];
const humanitiesTrackIds = ["economics", "business", "psychology", "history", "global-politics", "geography", "anthropology", "digital-society", "philosophy", "english-a", "english-b"];

function Mascot({ mood = "happy" }: { mood?: "happy" | "excited" }) {
  return <svg viewBox="0 0 160 176" className={`mascot mascot-${mood}`} role="img" aria-label="Curivo the dino guide">
    <path className="mascot-tail" d="M118 136q27-8 34 8-11 8-31 2Z"/>
    <ellipse className="mascot-limb" cx="60" cy="158" rx="16" ry="13"/>
    <ellipse className="mascot-limb" cx="104" cy="158" rx="16" ry="13"/>
    <ellipse className="mascot-limb" cx="30" cy="119" rx="13" ry="17" transform="rotate(-12 30 119)"/>
    <ellipse className="mascot-limb" cx="134" cy="119" rx="13" ry="17" transform="rotate(12 134 119)"/>
    <circle className="mascot-spike" cx="127" cy="54" r="9"/>
    <circle className="mascot-spike" cx="136" cy="77" r="10"/>
    <circle className="mascot-spike" cx="131" cy="101" r="9"/>
    <circle className="mascot-body" cx="80" cy="95" r="62"/>
    <ellipse className="mascot-belly" cx="80" cy="123" rx="33" ry="29"/>
    <g className="mascot-cap">
      <path d="M80 6 132 29 80 52 28 29Z"/>
      <rect x="75" y="29" width="10" height="15" rx="2"/>
      <path className="mascot-tassel" d="M118 33 125 59 117 66 110 59Z"/>
    </g>
    <path className="mascot-brow" d="M43 66l15-5"/>
    <path className="mascot-brow" d="M102 61l15 5"/>
    <g className="mascot-glasses">
      <circle cx="58" cy="80" r="19"/>
      <circle cx="102" cy="80" r="19"/>
      <path d="M77 80h6"/>
    </g>
    <g className="mascot-eyes"><circle cx="58" cy="80" r="6"/><circle cx="102" cy="80" r="6"/></g>
    <path className="mascot-mouth" d="M68 109q12 9 24 0"/>
  </svg>;
}

function SpeechBubble({ text }: { text: string }) {
  const [shown, setShown] = useState("");
  useEffect(() => {
    setShown("");
    let index = 0;
    const id = window.setInterval(() => {
      index += 1;
      setShown(text.slice(0, index));
      if (index >= text.length) window.clearInterval(id);
    }, 16);
    return () => window.clearInterval(id);
  }, [text]);
  return <div className="speech-bubble"><p>{shown}</p></div>;
}

function QuizStep({ question, subjectId, index, total, onAnswer }: { question: Question | null; subjectId: string; index: number; total: number; onAnswer: (value: string) => void }) {
  const [text, setText] = useState("");
  const subjectName = subjectCatalog.find((item) => item.id === subjectId)?.name ?? subjectId;
  if (!question) return <div className="wizard-quiz"><span className="eyebrow">{index + 1} / {total} · {subjectName}</span><p>No sample question is available for this subject yet.</p><button type="button" className="primary-button wizard-continue" onClick={() => onAnswer("")}>Skip <span>→</span></button></div>;
  return <div className="wizard-quiz"><span className="eyebrow">{index + 1} / {total} · {subjectName}</span><h2>{question.prompt}</h2>
    {question.responseType === "mcq"
      ? <div className="choice-list">{question.choices?.map((choice, choiceIndex) => <button type="button" key={choice} onClick={() => onAnswer(String(choiceIndex))}><span>{String.fromCharCode(65 + choiceIndex)}</span><p>{choice}</p></button>)}</div>
      : <div className="wizard-quiz-response"><textarea value={text} onChange={(event) => setText(event.target.value)} rows={4} placeholder="Write a quick answer…"/><button type="button" className="primary-button wizard-continue" onClick={() => onAnswer(text)}>Next <span>→</span></button></div>}
  </div>;
}

function OnboardingWizard({ name, onSaved }: { name: string; onSaved: () => Promise<void> }) {
  const [lang, setLang] = useState<WizardLang>("en");
  const [step, setStep] = useState<"welcome" | "grade" | "track" | "candidates" | "quiz" | "recommend" | "picker">("welcome");
  const [grade, setGrade] = useState<"10" | "11" | "12" | null>(null);
  const [track, setTrack] = useState<"science" | "humanities" | null>(null);
  const [candidates, setCandidates] = useState<string[]>([]);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizQuestions, setQuizQuestions] = useState<Array<{ subjectId: string; question: Question | null }>>([]);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [savingGrade, setSavingGrade] = useState(false);
  const t = wizardCopy[lang];

  const chooseGrade = async (value: "10" | "11" | "12") => {
    setGrade(value); setSavingGrade(true);
    await apiFetch("/api/profile/grade", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ grade: value, uiLanguage: lang }) }).catch(() => undefined);
    setSavingGrade(false);
    setStep(value === "10" ? "track" : "picker");
  };

  const toggleCandidate = (id: string) => setCandidates((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);

  const startQuiz = () => {
    const questions = candidates.map((subjectId) => ({ subjectId, question: getAptitudeQuestion(subjectId) }));
    setQuizQuestions(questions); setQuizIndex(0); setStep("quiz");
  };

  const answerQuiz = (value: string) => {
    const current = quizQuestions[quizIndex];
    if (current) setQuizAnswers((map) => ({ ...map, [current.subjectId]: value }));
    if (quizIndex + 1 < quizQuestions.length) setQuizIndex((index) => index + 1); else setStep("recommend");
  };

  const recommended = useMemo(() => quizQuestions.map(({ subjectId, question }) => {
    const answer = quizAnswers[subjectId];
    if (!question) return { subjectId, score: answer ? 1 : 0 };
    if (question.responseType === "mcq") return { subjectId, score: answer !== undefined && Number(answer) === question.correctIndex ? 2 : 0 };
    return { subjectId, score: answer && answer.trim().length > 5 ? 1 : 0 };
  }).filter((item) => item.score > 0).sort((a, b) => b.score - a.score).map((item) => item.subjectId), [quizQuestions, quizAnswers]);

  if (step === "picker") return <SubjectOnboarding name={name} current={grade === "10" ? recommended.slice(0, 6) : []} currentLevels={{}} onSaved={onSaved}/>;

  const currentQuiz = quizQuestions[quizIndex];
  const candidateList = track === "science" ? scienceTrackIds : humanitiesTrackIds;

  return <main className="wizard-page"><div className="mascot-wrap"><Mascot mood={step === "recommend" ? "excited" : "happy"}/></div>
    {step === "welcome" && <>
      <SpeechBubble text={t.welcome}/>
      <div className="wizard-choices">{wizardLanguages.map((option) => <button type="button" key={option.code} className={lang === option.code ? "selected" : ""} onClick={() => setLang(option.code)}>{option.label}</button>)}</div>
      <button type="button" className="primary-button wizard-continue" onClick={() => setStep("grade")}>{t.confirmLanguage} <span>→</span></button>
    </>}
    {step === "grade" && <><SpeechBubble text={t.askGrade}/><div className="wizard-choices">{(["10", "11", "12"] as const).map((value) => <button type="button" key={value} disabled={savingGrade} onClick={() => void chooseGrade(value)}>Grade {value}</button>)}</div></>}
    {step === "track" && <><SpeechBubble text={t.askTrack}/><div className="wizard-choices"><button type="button" onClick={() => { setTrack("science"); setStep("candidates"); }}>Sciences</button><button type="button" onClick={() => { setTrack("humanities"); setStep("candidates"); }}>Humanities</button></div></>}
    {step === "candidates" && <>
      <SpeechBubble text={t.askCandidates}/>
      <div className="wizard-candidate-grid">{candidateList.map((id) => { const subject = subjectCatalog.find((item) => item.id === id); if (!subject) return null; return <button type="button" key={id} className={candidates.includes(id) ? "selected" : ""} onClick={() => toggleCandidate(id)}>{subject.name}</button>; })}</div>
      <button type="button" className="primary-button wizard-continue" disabled={!candidates.length} onClick={startQuiz}>{t.quizIntro} <span>→</span></button>
    </>}
    {step === "quiz" && (currentQuiz ? <QuizStep question={currentQuiz.question} subjectId={currentQuiz.subjectId} index={quizIndex} total={quizQuestions.length} onAnswer={answerQuiz}/> : <p>Loading…</p>)}
    {step === "recommend" && <>
      <SpeechBubble text={t.quizDone}/>
      <ul className="wizard-recommend-list">{(recommended.length ? recommended : candidates).map((id) => <li key={id}>{subjectCatalog.find((item) => item.id === id)?.name ?? id}</li>)}</ul>
      <button type="button" className="primary-button wizard-continue" onClick={() => setStep("picker")}>{t.goToPicker} <span>→</span></button>
    </>}
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
  const hlCount = selected.filter((id) => levels[id] === "HL").length;
  const save = async () => {
    if (hlCount < 3 || hlCount > 4) { setSaveError("You need to choose 3–4 subjects at HL!"); return; }
    setSaving(true); setSaveError("");
    const response = await apiFetch("/api/profile/subjects", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ subjects: selected, subjectLevels: levels }) });
    if (response.ok) await onSaved(); else setSaveError((await response.json() as { error?: string }).error ?? "Could not save the subject selection.");
    setSaving(false);
  };
  const replaceSubject = (oldId: string) => { if (!pendingSubject) return; const nextId = pendingSubject; setSelected((items) => items.map((id) => id === oldId ? nextId : id)); setLevels((items) => ({ ...items, [nextId]: items[nextId] ?? defaultLevel(nextId) })); setPendingSubject(null); };
  return <main className="onboarding-page"><div className="onboarding-header"><BrandLogo/><div><span className="eyebrow">SET UP YOUR DASHBOARD</span><h1>Choose your six IB subjects, {name}.</h1><p>Select each course and set its SL or HL level here. The saved level becomes the default whenever you open that subject.</p></div><div className="selection-counter"><strong>{selected.length}/6</strong><span>selected</span></div></div>{selected.length === 6 && (hlCount < 3 || hlCount > 4) && <div className="inline-warning">You need to choose 3–4 subjects at HL! Currently {hlCount} HL selected.</div>}<div className="catalog-groups">{groups.map((group) => <section key={group}><h2>{group}</h2><div className="catalog-grid">{subjectCatalog.filter((subject) => subject.group === group).map((subject) => { const active = selected.includes(subject.id); const status = subject.availability ?? (subject.testAvailable ? "available" : "planned"); const availableLevels = (["SL", "HL"] as Level[]).filter((item) => subject.levels.includes(item)); return <div key={subject.id} className={`catalog-card ${active ? "selected" : ""}`}><button type="button" className="catalog-main" onClick={() => addOrRemove(subject.id)}><span className="catalog-check">{active ? "✓" : ""}</span><span><strong>{subject.name}</strong><small>{active ? `${levels[subject.id] ?? defaultLevel(subject.id)} selected` : subject.levels}</small></span><em className={status === "available" ? "available" : status === "unavailable" ? "unavailable" : "soon"}>{status === "available" ? "Test available" : status === "unavailable" ? "Unavailable" : "Coming next"}</em></button>{active && <div className="catalog-levels" aria-label={`${subject.name} course level`}>{availableLevels.map((item) => <button type="button" key={item} className={levels[subject.id] === item ? "active" : ""} onClick={() => setLevels((currentMap) => ({ ...currentMap, [subject.id]: item }))}>{item}</button>)}</div>}</div>; })}</div></section>)}</div>{saveError && <div className="inline-error">{saveError}</div>}<div className="onboarding-save"><div><strong>Choose exactly six subjects and levels</strong><span>You can change both later from the dashboard.</span></div><button className="primary-button" disabled={selected.length !== 6 || saving} onClick={() => void save()}>{saving ? "Saving…" : "Save my subjects"} <span>→</span></button></div>{pendingSubject && <div className="subject-swap-backdrop" role="dialog" aria-modal="true" aria-label="Replace a subject"><div className="subject-swap"><span className="eyebrow">REPLACE A SUBJECT</span><h2>Add {subjectCatalog.find((item) => item.id === pendingSubject)?.name}</h2><p>Choose which current subject to replace.</p><div>{selected.map((id) => <button type="button" key={id} onClick={() => replaceSubject(id)}>{subjectCatalog.find((item) => item.id === id)?.name ?? id}<span>Replace →</span></button>)}</div><button type="button" className="secondary-button" onClick={() => setPendingSubject(null)}>Cancel</button></div></div>}</main>;
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
function AiMarkPanel({ state, onRequest }: { state: AiMarkState | undefined; onRequest: () => void }) {
  if (!state) return <div className="ai-mark"><button type="button" className="secondary-button" onClick={onRequest}>Get mark with IB examiner AI</button></div>;
  if (state.status === "loading") return <div className="ai-mark"><p className="ai-mark-loading">Marking with IB examiner AI…</p></div>;
  if (state.status === "error") return <div className="ai-mark"><p className="inline-error">{state.message}</p><button type="button" className="secondary-button" onClick={onRequest}>Retry</button></div>;
  const { result } = state;
  return <div className="ai-mark ai-mark-result">
    <div className="ai-mark-heading"><span>AI MARK</span><strong>{result.marksAwarded}/{result.maxMarks}</strong></div>
    <p>{result.feedback}</p>
    {result.metRequirements.length > 0 && <p className="ai-mark-met"><strong>Met:</strong> {result.metRequirements.join(" · ")}</p>}
    {result.missedRequirements.length > 0 && <p className="ai-mark-missed"><strong>Missed:</strong> {result.missedRequirements.join(" · ")}</p>}
    {result.criteria?.length ? <ul className="ai-mark-criteria">{result.criteria.map((criterion) => <li key={criterion.code}><strong>{criterion.code}</strong> {criterion.marksAwarded}/{criterion.maxMarks} — {criterion.feedback}</li>)}</ul> : null}
    <button type="button" className="quiet-button" onClick={onRequest}>Re-mark</button>
  </div>;
}
function SetupBlock({ number, title, subtitle, side, children }: { number: string; title: string; subtitle: string; side?: string; children: React.ReactNode }) { return <section className="setup-block"><div className="setup-number">{number}</div><div className="setup-content"><div className="block-title"><div><h2>{title}</h2><p>{subtitle}</p></div>{side && <span className="range-count">{side}</span>}</div>{children}</div></section>; }
function QuestionCard({ question, answer, onAnswer, allowMathSymbols = false }: { question: Question; answer: string; onAnswer: (value: string) => void; allowMathSymbols?: boolean }) {
  return <article className="question-card">
    <div className="question-meta"><span>{question.topicCode} · {question.topicTitle}</span><span>{question.commandTerm ?? question.skill}</span><span>[{question.marks} mark{question.marks !== 1 ? "s" : ""}]</span>{question.difficultyLevel && <span>D{question.difficultyLevel}</span>}{question.premiumOnly && <em>Premium depth</em>}</div>
    {question.syllabusPath && <div className="syllabus-path"><strong>{question.syllabusProfile}</strong><span>{question.syllabusPath}</span><em>{question.section} · ~{question.estimatedMinutes} min</em></div>}
    {question.context && <div className="source-box"><strong>Source</strong><p>{question.context}</p></div>}
    {question.visual && <QuestionVisual type={question.visual} data={question.visualData}/>}
    {question.starterCode && <div className="starter-code"><span>{question.codeLanguage ?? "python"}</span><pre>{question.starterCode}</pre></div>}
    <h1>{question.prompt}</h1>
    {question.responseType === "mcq" ? <div className="choice-list">{question.choices?.map((choice, index) => <button type="button" key={`${choice}-${index}`} className={answer === String(index) ? "selected" : ""} onClick={() => onAnswer(String(index))}><span>{String.fromCharCode(65 + index)}</span><p>{choice}</p></button>)}</div> : question.responseType === "diagram" ? <DiagramPad value={answer} onChange={onAnswer}/> : <TextAnswer question={question} value={answer} onChange={onAnswer} allowMathSymbols={allowMathSymbols && question.responseType !== "code"}/>}
    <div className="question-note"><strong>Assessment demand</strong><span>{question.difficulty} · {question.skill}. The item uses an original parallel stimulus and a markscheme-first structure.</span></div>
  </article>;
}

const mathSymbols = ["×", "÷", "±", "√", "²", "³", "π", "θ", "Δ", "Σ", "∫", "∞", "≈", "≤", "≥", "≠", "→", "°", "μ", "λ", "Ω", "α", "β", "γ", "₀", "₁", "₂"];
function TextAnswer({ question, value, onChange, allowMathSymbols }: { question: Question; value: string; onChange: (value: string) => void; allowMathSymbols: boolean }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const insert = (symbol: string) => {
    const input = ref.current; const start = input?.selectionStart ?? value.length; const end = input?.selectionEnd ?? value.length;
    onChange(`${value.slice(0, start)}${symbol}${value.slice(end)}`);
    window.requestAnimationFrame(() => { input?.focus(); input?.setSelectionRange(start + symbol.length, start + symbol.length); });
  };
  return <div className={`response-area ${question.responseType === "code" ? "code-response" : ""}`}>{allowMathSymbols && <div className="symbol-palette" aria-label="Mathematics symbol palette"><span>Math symbols</span>{mathSymbols.map((symbol) => <button type="button" key={symbol} onClick={() => insert(symbol)}>{symbol}</button>)}</div>}<textarea ref={ref} value={value} spellCheck={question.responseType !== "code"} onChange={(event) => onChange(event.target.value)} placeholder={question.responseType === "code" ? `Write valid ${question.codeLanguage ?? "Python"} code here…` : question.responseType === "extended" ? "Build a structured response with evidence, reasoning and a supported conclusion…" : "Write a concise exam-style answer and show your reasoning…"} rows={question.responseType === "extended" || question.responseType === "code" ? 13 : 7}/><span>{question.responseType === "code" ? `${value.split("\n").length} lines` : `${value.trim().split(/\s+/).filter(Boolean).length} words`}</span></div>;
}

function PrintablePaper({ id, subjectName, level, paperName, minutes, questions }: { id: string; subjectName: string; level: Level; paperName: string; minutes: number; questions: Question[] }) {
  const totalMarks = questions.reduce((sum, question) => sum + question.marks, 0);
  return <div id={id} className="printable-paper" aria-hidden="true"><section data-pdf-page className="pdf-page pdf-cover"><BrandLogo/><span>IB-STYLE ORIGINAL PRACTICE</span><h1>{subjectName} {level}</h1><h2>{paperName}</h2><dl><div><dt>Time allowed</dt><dd>{minutes} minutes</dd></div><div><dt>Total marks</dt><dd>{totalMarks}</dd></div><div><dt>Questions</dt><dd>{questions.length}</dd></div></dl><div className="pdf-instructions"><strong>Instructions to candidates</strong><ul><li>Do not open the online answer-check section until you have finished the timed paper.</li><li>Write all working clearly. Unsupported answers may not receive full marks.</li><li>Use the data, figures and command terms provided in each question.</li><li>This is an original formative practice paper and is not an official IB examination.</li></ul></div><footer>IB Curivo · Question paper only · No markscheme included</footer></section>{questions.map((question, index) => <section data-pdf-page className="pdf-page pdf-question" key={question.id}><header><strong>{subjectName} {level}</strong><span>{paperName}</span></header><div className="pdf-question-meta"><span>Question {index + 1}</span><span>{question.topicCode} · {question.commandTerm ?? question.skill}</span><b>[{question.marks}]</b></div>{question.context && <div className="pdf-source"><strong>Source</strong><p>{question.context}</p></div>}{question.visual && <QuestionVisual type={question.visual} data={question.visualData}/>} {question.starterCode && <pre>{question.starterCode}</pre>}<h2>{question.prompt}</h2>{question.responseType === "mcq" ? <ol className="pdf-choices" type="A">{question.choices?.map((choice) => <li key={choice}>{choice}</li>)}</ol> : <div className="pdf-answer-space">{Array.from({ length: question.responseType === "extended" ? 17 : question.responseType === "code" ? 18 : question.responseType === "diagram" ? 14 : 10 }, (_, line) => <i key={line}/>)}</div>}<footer><span>{index + 1} / {questions.length}</span><span>Write answers in the space provided or on additional paper.</span></footer></section>)}</div>;
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

type VisualData = NonNullable<Question["visualData"]>;

function XYPlot({ x, y, xLabel, yLabel, uncertainty, markers, caption }: { x: number[]; y: number[]; xLabel?: string; yLabel?: string; uncertainty?: number; markers?: VisualData["markers"]; caption: string }) {
  const minX = Math.min(...x); const maxX = Math.max(...x); const minY = Math.min(...y); const maxY = Math.max(...y);
  const xPad = Math.max((maxX - minX) * .12, .01); const yPad = Math.max((maxY - minY) * .18, uncertainty ?? .01);
  const sx = (value: number) => 72 + ((value - (minX - xPad)) / ((maxX + xPad) - (minX - xPad))) * 520;
  const sy = (value: number) => 202 - ((value - (minY - yPad)) / ((maxY + yPad) - (minY - yPad))) * 158;
  const plot = x.map((value, index) => `${index ? "L" : "M"}${sx(value).toFixed(1)} ${sy(y[index]).toFixed(1)}`).join(" ");
  return <figure className="question-visual data-plot"><figcaption>{caption}</figcaption><svg viewBox="0 0 640 260" role="img" aria-label={`${yLabel ?? "y"} plotted against ${xLabel ?? "x"}`}>
    <path className="axis" d="M65 210V28M65 210H610"/>
    <path className="best-fit" d={plot}/>
    {x.map((value, index) => { const cx = sx(value); const cy = sy(y[index]); const error = uncertainty ? Math.abs(sy(y[index] + uncertainty) - cy) : 0; return <g key={`${value}-${index}`}>{error > 0 && <><path className="error-bar" d={`M${cx} ${cy - error}V${cy + error}`}/><path className="error-bar" d={`M${cx - 5} ${cy - error}H${cx + 5}M${cx - 5} ${cy + error}H${cx + 5}`}/></>}<circle cx={cx} cy={cy} r={uncertainty ? 5 : 3.5}/></g>; })}
    {markers?.map((marker, index) => { const mx1 = sx(marker.x1); const mx2 = sx(marker.x2); const my = 42 + index * 18; return <g key={`${marker.label}-${index}`}><path className="marker" d={`M${mx1} ${my}H${mx2}M${mx1} ${my - 6}V${my + 6}M${mx2} ${my - 6}V${my + 6}`}/><text className="marker-label" x={(mx1 + mx2) / 2} y={my - 10}>{marker.label}</text></g>; })}
    <text className="axis-label y" x="18" y="25">{yLabel ?? ""}</text>
    <text className="axis-label" x="520" y="251">{xLabel ?? ""}</text>
  </svg></figure>;
}

function BarChartVisual({ data }: { data: VisualData }) {
  const categories = data.categories ?? [];
  const series = data.series?.length ? data.series : [{ label: data.yLabel ?? "Value", y: data.y ?? [] }];
  const allValues = series.flatMap((item) => item.y);
  const min = Math.min(0, ...allValues); const max = Math.max(0, ...allValues); const span = Math.max(max - min, 1);
  const zeroY = 205 - ((0 - min) / span) * 150;
  const groupWidth = 520 / Math.max(categories.length, 1);
  const barWidth = Math.min(46, (groupWidth - 16) / series.length);
  return <figure className="question-visual"><figcaption>{data.title ?? "Figure 1: stimulus data"}</figcaption><svg viewBox="0 0 640 285" role="img" aria-label={`${data.yLabel ?? "Value"} bar chart`}>
    <path className="axis" d={`M70 35V205M70 ${zeroY}H610`}/>
    {categories.map((category, catIndex) => { const groupX = 80 + catIndex * groupWidth + (groupWidth - series.length * (barWidth + 4)) / 2; return <g key={`${category}-${catIndex}`}>
      {series.map((item, seriesIndex) => { const value = item.y[catIndex] ?? 0; const height = Math.abs(value) / span * 150; const x = groupX + seriesIndex * (barWidth + 4); const y = value >= 0 ? zeroY - height : zeroY; const err = item.error?.[catIndex]; const errHeight = err ? (err / span) * 150 : 0; return <g key={`${item.label}-${seriesIndex}`}>
        <rect className={`bar series-${seriesIndex}`} x={x} y={y} width={barWidth} height={Math.max(height, 2)} rx="4"/>
        {errHeight > 0 && <><path className="error-bar" d={`M${x + barWidth / 2} ${y - errHeight}V${y + errHeight}`}/><path className="error-bar" d={`M${x + barWidth / 2 - 5} ${y - errHeight}H${x + barWidth / 2 + 5}M${x + barWidth / 2 - 5} ${y + errHeight}H${x + barWidth / 2 + 5}`}/></>}
      </g>; })}
      <text className="bar-label" x={groupX + (barWidth + 4) * series.length / 2 - 2} y="232">{category}</text>
    </g>; })}
    <text className="axis-label y" x="16" y="26">{data.yLabel ?? "Value"}</text>
    {series.length > 1 && <g className="bar-legend">{series.map((item, index) => <g key={item.label} transform={`translate(${80 + index * 150},250)`}><rect className={`bar series-${index}`} width="14" height="14"/><text x="20" y="12">{item.label}</text></g>)}</g>}
  </svg>{data.note && <p>{data.note}</p>}</figure>;
}

function LayeredDiagram({ layers, title, note }: { layers: VisualData["layers"]; title?: string; note?: string }) {
  const list = layers ?? []; const n = list.length;
  const baseY = 195, cx = 155, maxW = 120, maxH = 130, minW = 30, minH = 28, labelLineEndX = 320, labelTextX = 328;
  return <figure className="question-visual"><figcaption>{title ?? "Figure 1: layered structure"}</figcaption><svg viewBox="0 0 640 240" role="img" aria-label={`Cross-section with ${n} labelled layers`}>
    <path className="axis" d="M40 210H305"/>
    {list.map((layer, index) => {
      const t = n > 1 ? index / (n - 1) : 0;
      const w = maxW - t * (maxW - minW); const h = maxH - t * (maxH - minH);
      const angle = Math.PI * 0.28;
      const labelX = cx + w * Math.cos(angle); const labelY = baseY - h * Math.sin(angle);
      const targetY = 26 + index * (188 / Math.max(n - 1, 1));
      return <g key={`${layer.label}-${index}`}>
        <path className="layer" d={`M${cx - w} ${baseY}A${w} ${h} 0 0 1 ${cx + w} ${baseY}`} fillOpacity={0.14 + (1 - t) * 0.5}/>
        <path className="marker" d={`M${labelX} ${labelY}H${labelLineEndX}`}/>
        <text className="layer-label" x={labelTextX} y={targetY + 4}>{layer.label}</text>
      </g>;
    })}
  </svg>{note && <p>{note}</p>}</figure>;
}

function CircularProcess({ nodes, title, note }: { nodes: string[]; title?: string; note?: string }) {
  const n = nodes.length; const cx = 300, cy = 118, r = 78;
  const angle = (index: number) => (index / n) * 2 * Math.PI - Math.PI / 2;
  const pos = (index: number, radius: number) => ({ x: cx + radius * Math.cos(angle(index)), y: cy + radius * Math.sin(angle(index)) });
  return <figure className="question-visual process-visual"><figcaption>{title ?? "Figure 1: cyclic process"}</figcaption><svg viewBox="0 0 640 240" role="img" aria-label={`Cyclic process with ${n} stages`}>
    {nodes.map((_, index) => { const a = pos(index, r); const b = pos((index + 1) % n, r); const mx = (a.x + b.x) / 2; const my = (a.y + b.y) / 2; const dx = b.x - a.x; const dy = b.y - a.y; const len = Math.hypot(dx, dy) || 1; const ux = dx / len; const uy = dy / len; const tipX = mx + ux * 9; const tipY = my + uy * 9; const b1x = mx - uy * 6 - ux * 9; const b1y = my + ux * 6 - uy * 9; const b2x = mx + uy * 6 - ux * 9; const b2y = my - ux * 6 - uy * 9; return <g key={`edge-${index}`}><path d={`M${a.x} ${a.y}L${b.x} ${b.y}`}/><path className="cycle-arrow" d={`M${tipX} ${tipY}L${b1x} ${b1y}L${b2x} ${b2y}Z`}/></g>; })}
    {nodes.map((label, index) => { const p = pos(index, r); const lp = pos(index, r + 46); const cos = Math.cos(angle(index)); const anchor = cos > 0.35 ? "start" : cos < -0.35 ? "end" : "middle"; return <g key={`${label}-${index}`}><circle cx={p.x} cy={p.y} r="14"/><text className="cycle-label" x={lp.x} y={lp.y + 4} style={{ textAnchor: anchor }}>{label}</text></g>; })}
  </svg>{note && <p>{note}</p>}</figure>;
}

function NetworkDiagram({ nodes, edges }: { nodes: NonNullable<VisualData["netNodes"]>; edges: NonNullable<VisualData["netEdges"]> }) {
  const sx = (x: number) => 45 + (x / 100) * 550; const sy = (y: number) => 25 + (y / 100) * 170;
  const byId = Object.fromEntries(nodes.map((node) => [node.id, node]));
  return <figure className="question-visual"><figcaption>Figure 1: network topology</figcaption><svg viewBox="0 0 640 220" role="img" aria-label={`Network with ${nodes.length} devices`}>
    {edges.map((edge, index) => { const a = byId[edge.from]; const b = byId[edge.to]; if (!a || !b) return null; return <path key={`${edge.from}-${edge.to}-${index}`} d={`M${sx(a.x)} ${sy(a.y)}L${sx(b.x)} ${sy(b.y)}`}/>; })}
    {nodes.map((node) => <g key={node.id}><rect x={sx(node.x) - 46} y={sy(node.y) - 20} width="92" height="40" rx="8"/><text x={sx(node.x)} y={sy(node.y) + 5}>{node.label}</text></g>)}
  </svg></figure>;
}

function ERDDiagram({ entities, relationships }: { entities: NonNullable<VisualData["entities"]>; relationships: NonNullable<VisualData["relationships"]> }) {
  const n = entities.length; const gap = 40; const boxW = Math.min(170, (620 - gap * (n - 1)) / n);
  const maxFields = Math.max(1, ...entities.map((entity) => entity.fields.length));
  const topY = 34; const boxH = 46 + maxFields * 20; const detourY = 12;
  const xs = entities.map((_, index) => 20 + index * (boxW + gap));
  const centerY = topY + boxH / 2;
  const indexByName = Object.fromEntries(entities.map((entity, index) => [entity.name, index]));
  return <figure className="question-visual"><figcaption>Figure 1: entity–relationship diagram</figcaption><svg viewBox={`0 0 640 ${topY + boxH + 20}`} role="img" aria-label={`Entity relationship diagram with ${n} entities`}>
    {relationships.map((rel, index) => {
      const ai = indexByName[rel.from]; const bi = indexByName[rel.to]; if (ai === undefined || bi === undefined) return null;
      const lo = Math.min(ai, bi); const hi = Math.max(ai, bi);
      const left = xs[lo] + boxW; const right = xs[hi];
      if (hi - lo === 1) return <g key={`${rel.from}-${rel.to}-${index}`}><path d={`M${left} ${centerY}H${right}`}/><text x={(left + right) / 2} y={centerY - 8}>{rel.label}</text></g>;
      const midLeft = xs[lo] + boxW / 2; const midRight = xs[hi] + boxW / 2;
      return <g key={`${rel.from}-${rel.to}-${index}`}><path d={`M${midLeft} ${topY}V${detourY}H${midRight}V${topY}`}/><text x={(midLeft + midRight) / 2} y={detourY - 4}>{rel.label}</text></g>;
    })}
    {entities.map((entity, index) => <g key={entity.name}><rect x={xs[index]} y={topY} width={boxW} height={boxH} rx="8"/><text className="entity-name" x={xs[index] + boxW / 2} y={topY + 24}>{entity.name.toUpperCase()}</text>{entity.fields.map((field, fieldIndex) => <text key={field} className="entity-field" x={xs[index] + 14} y={topY + 50 + fieldIndex * 20}>{field}</text>)}</g>)}
  </svg></figure>;
}

function gateDepths(gates: NonNullable<VisualData["gates"]>) {
  const depth: Record<string, number> = {}; const byId = Object.fromEntries(gates.map((gate) => [gate.id, gate]));
  const resolve = (id: string): number => { if (depth[id] !== undefined) return depth[id]; const gate = byId[id]; if (!gate) return 0; const d = 1 + Math.max(0, ...gate.inputs.map((inputId) => (byId[inputId] ? resolve(inputId) : 0))); depth[id] = d; return d; };
  gates.forEach((gate) => resolve(gate.id));
  return depth;
}

function LogicDiagram({ gates, gateInputs, outputLabel }: { gates: NonNullable<VisualData["gates"]>; gateInputs: string[]; outputLabel?: string }) {
  const depths = gateDepths(gates);
  const columns = new Map<number, typeof gates>();
  gates.forEach((gate) => { const d = depths[gate.id] ?? 1; const list = columns.get(d) ?? []; list.push(gate); columns.set(d, list); });
  const maxDepth = Math.max(1, ...gates.map((gate) => depths[gate.id] ?? 1));
  const colWidth = 420 / (maxDepth + 1);
  const positions: Record<string, { x: number; y: number }> = {};
  Array.from(columns.entries()).forEach(([depth, colGates]) => { const x = 110 + depth * colWidth; colGates.forEach((gate, i) => { positions[gate.id] = { x, y: 35 + (i + 0.5) * (170 / colGates.length) }; }); });
  const inputY = (index: number) => 25 + (index + 0.5) * (190 / Math.max(gateInputs.length, 1));
  const finalGate = gates.find((gate) => !gates.some((other) => other.inputs.includes(gate.id)));
  const outX = finalGate ? positions[finalGate.id].x + 65 : 560;
  const outY = finalGate ? positions[finalGate.id].y : 110;
  return <figure className="question-visual"><figcaption>Figure 1: logic circuit</figcaption><svg viewBox="0 0 640 220" role="img" aria-label={`Logic circuit with ${gates.length} gates`}>
    {gateInputs.map((label, index) => <text key={label} x="35" y={inputY(index) + 5}>{label}</text>)}
    {gates.flatMap((gate) => gate.inputs.map((inputId, i) => { const target = positions[gate.id]; if (!target) return null; const inputIndex = gateInputs.indexOf(inputId); const from = positions[inputId] ?? (inputIndex >= 0 ? { x: 55, y: inputY(inputIndex) } : null); if (!from) return null; return <path key={`${gate.id}-${inputId}-${i}`} d={`M${from.x} ${from.y}H${target.x - 40}V${target.y}H${target.x - 30}`}/>; }))}
    {gates.map((gate) => { const pos = positions[gate.id]; if (!pos) return null; return <g key={gate.id}>
      {gate.kind === "NOT" ? <path d={`M${pos.x - 30} ${pos.y - 24}V${pos.y + 24}L${pos.x + 24} ${pos.y}Z`}/> : <path d={`M${pos.x - 30} ${pos.y - 24}H${pos.x}A24 24 0 0 1 ${pos.x} ${pos.y + 24}H${pos.x - 30}Z`}/>}
      {(gate.kind === "NOT" || gate.kind === "NAND" || gate.kind === "NOR") && <circle cx={pos.x + 28} cy={pos.y} r="5"/>}
      <text className="gate-label" x={pos.x - 15} y={pos.y + 4}>{gate.kind}</text>
    </g>; })}
    {finalGate && positions[finalGate.id] && <path d={`M${positions[finalGate.id].x + (gates.find((g) => g.id === finalGate.id)?.kind === "NOT" || gates.find((g) => g.id === finalGate.id)?.kind.startsWith("N") ? 33 : 24)} ${outY}H${outX}`}/>}
    <text x={outX + 15} y={outY + 5}>{outputLabel ?? "Q"}</text>
  </svg></figure>;
}

function CircuitDiagram({ components, cellLabel }: { components: NonNullable<VisualData["components"]>; cellLabel?: string }) {
  const byBranch = new Map<number, typeof components>();
  components.forEach((component) => { const list = byBranch.get(component.branch) ?? []; list.push(component); byBranch.set(component.branch, list); });
  const branchRows = Array.from(byBranch.keys()).filter((n) => n > 0).sort((a, b) => a - b);
  const leftX = 90, rightX = 545, topY = 55, rowGap = 48;
  const bottomY = branchRows.length ? topY + branchRows.length * rowGap + 30 : topY + 95;
  const renderRow = (items: typeof components, y: number) => { const usable = rightX - leftX - 130; return items.map((component, i) => { const x = leftX + 65 + (items.length > 1 ? (i + 0.5) * (usable / items.length) : usable / 2);
    if (component.kind === "ammeter" || component.kind === "voltmeter") return <g key={`${component.label}-${x}-${y}`}><circle cx={x} cy={y} r="18"/><text x={x} y={y + 5}>{component.kind === "ammeter" ? "A" : "V"}</text></g>;
    if (component.kind === "switch") return <g key={`${component.label}-${x}-${y}`}><circle cx={x - 22} cy={y} r="3"/><path d={`M${x - 22} ${y}L${x + 16} ${y - 14}`}/><circle cx={x + 22} cy={y} r="3"/></g>;
    return <g key={`${component.label}-${x}-${y}`}><rect x={x - 40} y={y - 14} width="80" height="28"/><text x={x} y={y + 5}>{component.label}</text></g>; }); };
  return <figure className="question-visual"><figcaption>Figure 1: electrical circuit</figcaption><svg viewBox={`0 0 640 ${bottomY + 25}`} role="img" aria-label="Circuit diagram">
    <path d={`M${leftX} ${topY}V${bottomY}M${rightX} ${topY}V${bottomY}M${leftX} ${bottomY}H${rightX}M${leftX} ${topY}H${leftX + 30}M${leftX + 58} ${topY}H${rightX}`}/>
    <path d={`M${leftX + 30} ${topY - 16}V${topY + 16}M${leftX + 44} ${topY - 9}V${topY + 9}`}/>
    <text x={leftX + 15} y={topY - 24}>{cellLabel ?? "cell"}</text>
    {renderRow(byBranch.get(0) ?? [], topY)}
    {branchRows.map((branch, index) => <path key={`wire-${branch}`} d={`M${leftX} ${topY + (index + 1) * rowGap}H${rightX}`}/>)}
    {branchRows.map((branch, index) => renderRow(byBranch.get(branch) ?? [], topY + (index + 1) * rowGap))}
  </svg></figure>;
}

function QuestionVisual({ type, data }: { type: NonNullable<Question["visual"]>; data?: Question["visualData"] }) {
  if (type === "data-table" && data?.columns?.length && data.rows?.length) return <figure className="question-visual stimulus-table"><figcaption>{data.title ?? "Table 1: stimulus data"}</figcaption><div className="table-scroll"><table><thead><tr><th scope="col">Period / group</th>{data.columns.map((column) => <th scope="col" key={column}>{column}</th>)}</tr></thead><tbody>{data.rows.map((row) => <tr key={row.label}><th scope="row">{row.label}</th>{row.values.map((value, index) => <td key={`${row.label}-${index}`}>{value}</td>)}</tr>)}</tbody></table></div>{data.note && <p>{data.note}</p>}</figure>;
  if (type === "bar-chart" && data?.categories?.length && (data.series?.length || data.y?.length === data.categories.length)) return <BarChartVisual data={data}/>;
  if (type === "geo-map") return <figure className="question-visual"><figcaption>{data?.title ?? "Figure 1: spatial pattern"}</figcaption><svg viewBox="0 0 640 300" role="img" aria-label="Schematic choropleth map showing a transport corridor, urban core, rural periphery and hazard-exposed districts"><path className="region low" d="M55 42L260 28L305 120L230 270L55 230Z"/><path className="region medium" d="M260 28L520 48L590 210L395 270L305 120Z"/><path className="region high" d="M205 92L360 70L455 142L355 220L230 185Z"/><path className="corridor" d="M75 238C190 194 270 155 365 112S505 70 570 58"/><path className="hazard" d="M82 62L190 50L207 125L105 145Z M455 176L565 165L580 228L482 246Z"/><circle cx="325" cy="145" r="10"/><text x="325" y="170">Urban core</text><text x="130" y="205">Rural periphery</text><text x="478" y="92">Transport corridor</text><g className="map-key"><rect x="75" y="270" width="18" height="12" className="key-low"/><text x="125" y="280">Lower</text><rect x="185" y="270" width="18" height="12" className="key-medium"/><text x="240" y="280">Medium</text><rect x="300" y="270" width="18" height="12" className="key-high"/><text x="345" y="280">Higher</text><rect x="420" y="270" width="18" height="12" className="key-hazard"/><text x="505" y="280">Hazard-exposed</text></g></svg>{data?.rows?.length && <div className="mini-data-row">{data.rows.map((row) => <span key={row.label}><strong>{row.label}</strong>{row.values.join(" → ")}</span>)}</div>}{data?.note && <p>{data.note}</p>}</figure>;
  if (type === "process-flow" && data?.nodes?.length) return data.layout === "circular" ? <CircularProcess nodes={data.nodes} title={data.title} note={data.note}/> : <figure className="question-visual process-visual"><figcaption>{data.title ?? "Figure 1: process flow"}</figcaption><div className="process-nodes">{data.nodes.map((node, index) => <div key={`${node}-${index}`}><span>{index + 1}</span><strong>{node}</strong>{index < (data.nodes?.length ?? 0) - 1 && <i aria-hidden="true">→</i>}</div>)}</div>{data.note && <p>{data.note}</p>}</figure>;
  if (type === "layered-diagram" && data?.layers?.length) return <LayeredDiagram layers={data.layers} title={data.title} note={data.note}/>;
  if (type === "network" && data?.netNodes?.length) return <NetworkDiagram nodes={data.netNodes} edges={data.netEdges ?? []}/>;
  if (type === "network") return <figure className="question-visual"><figcaption>Figure 1: network topology</figcaption><svg viewBox="0 0 640 220" role="img" aria-label="Network containing a router, switch, server and three clients"><rect x="275" y="18" width="90" height="44" rx="8"/><text x="320" y="45">Router</text><rect x="275" y="92" width="90" height="44" rx="8"/><text x="320" y="119">Switch</text><rect x="60" y="164" width="100" height="40" rx="8"/><text x="110" y="189">Client A</text><rect x="270" y="164" width="100" height="40" rx="8"/><text x="320" y="189">Server</text><rect x="480" y="164" width="100" height="40" rx="8"/><text x="530" y="189">Client B</text><path d="M320 62V92M300 136L110 164M320 136V164M340 136L530 164"/></svg></figure>;
  if (type === "logic" && data?.gates?.length && data.gateInputs?.length) return <LogicDiagram gates={data.gates} gateInputs={data.gateInputs} outputLabel={data.outputLabel}/>;
  if (type === "logic") return <figure className="question-visual"><figcaption>Figure 1: logic circuit</figcaption><svg viewBox="0 0 640 210" role="img" aria-label="Two inputs pass through an AND gate, followed by a NOT gate"><text x="35" y="68">A</text><text x="35" y="145">B</text><path d="M55 62H210M55 139H210M210 35H285A55 55 0 0 1 285 165H210Z M340 100H445M445 60L535 100L445 140Z M535 100H595"/><circle cx="548" cy="100" r="12"/><text x="605" y="106">Q</text><text x="243" y="106">AND</text><text x="466" y="106">NOT</text></svg></figure>;
  if (type === "erd" && data?.entities?.length) return <ERDDiagram entities={data.entities} relationships={data.relationships ?? []}/>;
  if (type === "erd") return <figure className="question-visual"><figcaption>Figure 1: entity–relationship diagram</figcaption><svg viewBox="0 0 640 230" role="img" aria-label="Student and Course entities connected through Enrollment"><rect x="25" y="45" width="150" height="120" rx="8"/><text x="100" y="73">STUDENT</text><text x="45" y="105">PK student_id</text><text x="45" y="135">name</text><rect x="245" y="70" width="150" height="80" rx="8"/><text x="320" y="98">ENROLLMENT</text><text x="265" y="130">grade</text><rect x="465" y="45" width="150" height="120" rx="8"/><text x="540" y="73">COURSE</text><text x="485" y="105">PK course_id</text><text x="485" y="135">title</text><path d="M175 105H245M395 105H465"/><text x="197" y="96">1:M</text><text x="414" y="96">M:1</text></svg></figure>;
  if (type === "circuit" && data?.components?.length) return <CircuitDiagram components={data.components} cellLabel={data.cellLabel}/>;
  if (type === "circuit") return <figure className="question-visual"><figcaption>Figure 1: electrical circuit</figcaption><svg viewBox="0 0 640 220" role="img" aria-label="Cell connected to two parallel resistors and an ammeter"><path d="M90 55H290M350 55H545V180H90V55M290 30V80M315 20V90M350 55H315M200 55V105H440V55M200 105V150H440V105"/><rect x="270" y="91" width="100" height="28"/><text x="320" y="111">R₁ = 6 Ω</text><rect x="270" y="136" width="100" height="28"/><text x="320" y="156">R₂ = 3 Ω</text><circle cx="510" cy="180" r="25"/><text x="510" y="187">A</text></svg></figure>;
  if ((type === "motion-graph" || type === "function-graph" || type === "wave" || type === "data-graph") && data?.x?.length && data.y?.length === data.x.length) {
    const caption = type === "motion-graph" ? "Figure 1: velocity–time graph" : type === "function-graph" ? "Figure 1: function model" : type === "wave" ? "Figure 1: wave at one instant" : "Figure 1: experimental data with uncertainty";
    return <XYPlot x={data.x} y={data.y} xLabel={data.xLabel} yLabel={data.yLabel} uncertainty={data.uncertainty} markers={data.markers} caption={caption}/>;
  }
  const label = type === "motion-graph" ? "velocity / m s⁻¹" : type === "function-graph" ? "f(x)" : type === "data-graph" ? "measured value" : "Figure 1";
  return <figure className="question-visual"><figcaption>Figure 1: {type === "motion-graph" ? "velocity–time graph" : type === "function-graph" ? "function model" : "experimental data"}</figcaption><svg viewBox="0 0 640 250" role="img" aria-label={label}><path className="axis" d="M65 205V25M65 205H610"/><path className="plot" d={type === "motion-graph" ? "M65 180L190 70L330 70L470 165L580 165" : type === "function-graph" ? "M70 190C155 187 195 165 245 122S350 35 430 75S520 175 595 190" : "M80 182L160 160L240 135L320 115L400 82L480 70L570 45"}/><text x="8" y="30">{label}</text><text x="545" y="232">{type === "motion-graph" ? "time / s" : "independent variable"}</text>{type === "data-graph" && [80,160,240,320,400,480,570].map((x,index)=><circle key={x} cx={x} cy={[182,160,135,115,82,70,45][index]} r="5"/>)}</svg></figure>;
}
