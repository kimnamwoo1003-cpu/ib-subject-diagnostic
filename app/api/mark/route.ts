import { requireApiUser } from "../../server-auth";
import { apiJson, apiOptions } from "../../api-response";
import { generateJSON } from "../../ai-client";

export const OPTIONS = apiOptions;

type MarkPayload = {
  prompt?: string;
  context?: string;
  commandTerm?: string;
  responseType?: string;
  marks?: number;
  modelAnswer?: string;
  markschemePoints?: string[];
  commonErrors?: string[];
  criterionCodes?: string[];
  answer?: string;
  language?: string;
};

const FEEDBACK_LANGUAGES: Record<string, string> = {
  en: "English",
  ko: "Korean",
  ja: "Japanese",
  fr: "French",
  it: "Italian",
  zh: "Chinese",
};

type CriterionResult = { code: string; marksAwarded: number; maxMarks: number; feedback: string };
type MarkResult = { marksAwarded: number; maxMarks: number; feedback: string; metRequirements: string[]; missedRequirements: string[]; criteria?: CriterionResult[] };

export async function POST(request: Request) {
  const user = await requireApiUser();
  if (!user) return apiJson(request, { error: "Sign in required" }, { status: 401 });

  const payload = await request.json() as MarkPayload;
  const answer = (payload.answer ?? "").trim();
  const marks = Math.max(1, Math.round(Number(payload.marks) || 1));
  if (!payload.prompt) return apiJson(request, { error: "Missing question prompt" }, { status: 400 });

  if (!answer) {
    return apiJson(request, { result: { marksAwarded: 0, maxMarks: marks, feedback: "No response was submitted.", metRequirements: [], missedRequirements: payload.markschemePoints ?? [] } satisfies MarkResult });
  }

  const criteriaInstruction = payload.criterionCodes?.length
    ? `The student is assessed against these IB criteria: ${payload.criterionCodes.join(", ")}. Also return a "criteria" array with one entry per criterion code: {"code","marksAwarded","maxMarks","feedback"}. Split the ${marks} total marks fairly across criteria (maxMarks per criterion should sum to ${marks}).`
    : "";

  const languageName = FEEDBACK_LANGUAGES[payload.language ?? "en"] ?? "English";
  const languageInstruction = languageName === "English"
    ? "Write the \"feedback\" text in English."
    : `IMPORTANT: Write the "feedback" string (and each "criteria[].feedback" if present) in natural ${languageName}, as a ${languageName}-speaking IB tutor would write it — NOT in English. Within that ${languageName} text, keep IB subject names, command terms and scientific/technical terminology in English (natural code-switching), rather than translating those specific terms. "metRequirements" and "missedRequirements" can stay in English, close to the markscheme wording.`;

  const systemPrompt = `You are an experienced IB examiner marking a student's response strictly against the provided markscheme. Award marks only for what the response actually demonstrates — do not give credit for confident tone, length, or restating the question. Be consistent with real IB marking standards: partial credit is normal, full marks require every markscheme point to be genuinely present. Respond with ONLY a single valid JSON object, no markdown formatting, no commentary outside the JSON.`;

  const userPrompt = `Question (command term: ${payload.commandTerm ?? "n/a"}, response type: ${payload.responseType ?? "n/a"}, total marks: ${marks}):
${payload.prompt}

${payload.context ? `Stimulus/context:\n${payload.context}\n` : ""}
Markscheme requirements:
${payload.markschemePoints?.length ? payload.markschemePoints.map((point, i) => `${i + 1}. ${point}`).join("\n") : payload.modelAnswer ?? "(no markscheme provided — judge against general subject knowledge)"}

${payload.commonErrors?.length ? `Common errors to watch for:\n${payload.commonErrors.map((e) => `- ${e}`).join("\n")}\n` : ""}
${criteriaInstruction}

Student's response:
"""
${answer}
"""

Return JSON with this exact shape: {"marksAwarded": number (0 to ${marks}), "maxMarks": ${marks}, "feedback": string (2-4 sentences, specific to this response, addressed to the student), "metRequirements": string[] (markscheme points actually satisfied), "missedRequirements": string[] (markscheme points not satisfied or only partially satisfied)${payload.criterionCodes?.length ? `, "criteria": [{"code": string, "marksAwarded": number, "maxMarks": number, "feedback": string}]` : ""}}

${languageInstruction}`;

  try {
    const result = await generateJSON<MarkResult>([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ], { temperature: 0.2, maxTokens: 900 });
    const clampedMarks = Math.max(0, Math.min(marks, Math.round(Number(result.marksAwarded) || 0)));
    return apiJson(request, { result: { ...result, marksAwarded: clampedMarks, maxMarks: marks } });
  } catch (error) {
    return apiJson(request, { error: `AI marking failed: ${error instanceof Error ? error.message : "unknown error"}` }, { status: 502 });
  }
}
