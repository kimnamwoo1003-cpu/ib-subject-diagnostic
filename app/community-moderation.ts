export const COMMUNITY_CATEGORIES = [
  { id: "ib-study", label: "IB study" },
  { id: "subjects", label: "Subjects" },
  { id: "school-life", label: "School life" },
  { id: "university", label: "University" },
  { id: "resources", label: "Resources" },
  { id: "off-topic", label: "Off-topic" },
] as const;

export type ModerationSeverity = "none" | "review" | "block";
export type ModerationSignal = { code: string; label: string; weight: number };

const rules: Array<{ code: string; label: string; weight: number; pattern: RegExp }> = [
  { code: "credible-threat", label: "Possible threat of violence", weight: 5, pattern: /\b(?:i(?:'ll| will| am going to)|we(?:'ll| will))\s+(?:kill|shoot|stab|hurt|attack)\b|죽여\s*버|죽이겠|칼로\s*(?:찌르|찔러)|폭탄\s*(?:설치|터뜨)/iu },
  { code: "targeted-abuse", label: "Targeted abusive language", weight: 3, pattern: /\b(?:you are|you're|ur)\s+(?:a\s+)?(?:fucking\s+)?(?:idiot|moron|loser|trash)\b|너(?:는|가)?\s*(?:병신|멍청이|쓰레기)|닥쳐\s*(?:병신|새끼)/iu },
  { code: "harassment", label: "Harassing or degrading language", weight: 2, pattern: /\b(?:fuck\s+you|go\s+die|kys|piece\s+of\s+shit)\b|꺼져|닥쳐|병신|개새끼|씨발/iu },
  { code: "self-harm", label: "Possible self-harm concern", weight: 4, pattern: /\b(?:kill myself|end my life|want to die|suicide)\b|자살|죽고\s*싶|목숨을\s*끊/iu },
  { code: "personal-data", label: "Possible personal contact information", weight: 2, pattern: /(?:\+?\d[\d\s().-]{8,}\d)|(?:[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/iu },
  { code: "doxxing", label: "Possible attempt to expose private information", weight: 4, pattern: /\b(?:home address|phone number|doxx?|real address)\b|집\s*주소|전화번호\s*(?:공개|올려)|신상\s*(?:공개|털)/iu },
  { code: "sexual", label: "Sexually explicit language", weight: 3, pattern: /\b(?:send nudes?|explicit sex|pornographic)\b|야한\s*사진|누드\s*(?:사진|보내)|음란물/iu },
];

export function moderateCommunityText(title: string, body: string) {
  const text = `${title}\n${body}`.trim();
  const signals: ModerationSignal[] = rules.filter((rule) => rule.pattern.test(text)).map(({ code, label, weight }) => ({ code, label, weight }));
  const links = text.match(/https?:\/\/\S+/giu)?.length ?? 0;
  if (links >= 4) signals.push({ code: "link-spam", label: "Repeated external links", weight: 2 });
  if (/(.)\1{9,}/u.test(text) || /\b(.{2,12})(?:\s+\1){5,}\b/iu.test(text)) signals.push({ code: "repetition-spam", label: "Repeated or spam-like text", weight: 2 });
  const score = signals.reduce((sum, signal) => sum + signal.weight, 0);
  const severity: ModerationSeverity = signals.some((signal) => signal.weight >= 5) || score >= 6 ? "block" : score >= 2 ? "review" : "none";
  return { severity, score, signals, moderationState: severity === "block" ? "blocked" : severity === "review" ? "flagged" : "clean" } as const;
}
