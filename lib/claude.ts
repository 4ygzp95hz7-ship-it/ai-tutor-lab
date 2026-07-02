import Anthropic from '@anthropic-ai/sdk'

let _client: Anthropic | null = null

export function getClaudeClient(): Anthropic {
  if (!_client) {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set')
    _client = new Anthropic({ apiKey })
  }
  return _client
}

export const SONNET = 'claude-sonnet-4-6'
export const HAIKU = 'claude-haiku-4-5-20251001'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SubModule {
  title: string
  description: string
  objectives: string[]
  estimatedHours: number
  resources: { title: string; url: string; type: string }[]
}

export interface RoadmapStage {
  title: string
  description: string
  objectives: string[]
  estimatedHours: number
  subModules: SubModule[]
  resources: { title: string; url: string; type: string }[]
}

export interface GeneratedRoadmap {
  title: string
  description: string
  totalHours: number
  stages: RoadmapStage[]
}

// ─── Roadmap generation ──────────────────────────────────────────────────────

export async function generateRoadmap(
  topic: string,
  experienceLevel: string
): Promise<GeneratedRoadmap> {
  const client = getClaudeClient()

  const prompt = `Create a learning roadmap outline for "${topic}" (${experienceLevel} level).

Return ONLY this JSON, no markdown, no explanation:
{
  "title": "string",
  "description": "string (1 sentence)",
  "totalHours": number,
  "stages": [
    {
      "title": "string",
      "description": "string (1 sentence, max 15 words)",
      "estimatedHours": number,
      "objectives": ["string", "string"],
      "resources": [{"title": "string", "url": "https://...", "type": "docs"}],
      "subModules": []
    }
  ]
}

Rules:
- 8-14 stages covering ${topic} completely (beginner → advanced)
- NO sub-modules (leave subModules as empty array [])
- Each stage: 2 objectives max, 1 resource, description under 15 words
- Output ONLY complete valid JSON`

  const message = await client.messages.create({
    model: HAIKU,
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''
  // Strip markdown fences and find the JSON object
  let cleaned = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/,'').trim()
  // Extract just the JSON object if there's surrounding text
  const jsonStart = cleaned.indexOf('{')
  const jsonEnd = cleaned.lastIndexOf('}')
  if (jsonStart !== -1 && jsonEnd !== -1) {
    cleaned = cleaned.slice(jsonStart, jsonEnd + 1)
  }
  try {
    return JSON.parse(cleaned) as GeneratedRoadmap
  } catch {
    throw new Error(`Claude returned invalid JSON. Response was: ${text.slice(0, 200)}`)
  }
}

// ─── Doubt assistant system prompt ───────────────────────────────────────────

export interface ChatContext {
  topic: string
  stageTitle: string
  stageDescription: string
  objectives: string[]
  userLevel: string
  recentMessages: { role: 'user' | 'assistant'; content: string }[]
}

export function buildDoubtSystemPrompt(ctx: ChatContext): string {
  const levelContext = ctx.userLevel === 'beginner'
    ? 'The student is a beginner — use plain language, everyday analogies, and never assume prior knowledge beyond the current module.'
    : ctx.userLevel === 'advanced'
    ? 'The student is advanced — be technical, skip basics, go deeper when relevant.'
    : 'The student knows the fundamentals — skip extreme basics but do not assume expert knowledge.'

  return `You are a brilliant friend who happens to be an expert in ${ctx.topic}. You are helping them understand "${ctx.stageTitle}".

${levelContext}

## What the student is studying right now
Module: ${ctx.stageTitle}
Context: ${ctx.stageDescription}
${ctx.objectives.length > 0 ? `Learning goals: ${ctx.objectives.join(' · ')}` : ''}

## Your communication style
You sound like a knowledgeable friend, not a textbook or a chatbot. Here is exactly how you communicate:

**Lead with the answer.** Never open with "Great question!", "Certainly!", "Of course!", or any filler. The first sentence answers the question directly.

**One clear explanation.** Pick the best explanation and commit to it. Do not offer multiple approaches unless the student explicitly asks for alternatives — that creates confusion.

**Short, punchy sentences.** Two to three sentences per paragraph. No walls of text. If a concept needs more, break it into numbered steps or bullet points.

**Analogies over jargon.** When explaining a concept, reach for a real-world analogy before technical terms. After the analogy lands, name the technical term.

**Code is surgical.** Only include code when it directly answers the question. When you do, keep it to 5–15 lines, focus on the exact thing being asked, and add a single-line comment on any non-obvious line.

**End with a hook.** After your explanation, ask one focused question to check understanding OR point to the logical next thing to try. Never end with "Hope that helps!" or similar.

**Forbidden phrases:** "As an AI", "I should mention", "It's worth noting", "Great question", "Certainly", "Of course", "I'd be happy to", "Let me know if you need anything else".

**If they ask a quiz question:** Do not give the answer. Instead, give a hint that points them toward the answer — one nudge, not a walkthrough.

**Match the energy.** If they're frustrated, be calm and reassuring. If they're curious, match their enthusiasm. If they're stuck, be direct and practical.

## Format
- Use markdown: **bold** for key terms on first use, \`inline code\` for any code/variable names, \`\`\`language blocks for multi-line code
- Max response length: 200 words for simple questions, 350 words for complex ones. If you need more, something is wrong — simplify
- Never start with "I" — rephrase to lead with the concept or answer`
}

// ─── Exercise generation + evaluation ────────────────────────────────────────

export interface GeneratedExercise {
  title: string
  problem: string
  starterCode: string
  language: string
  testCases: { input: string; expectedOutput: string; description: string }[]
  hints: string[]
  difficulty: 'easy' | 'medium' | 'hard'
}

export async function generateExercise(
  stageTopic: string,
  moduleTitle: string,
  level: string,
  difficulty: 'easy' | 'medium' | 'hard' = 'medium',
  industryDomain: string = ''
): Promise<GeneratedExercise> {
  const client = getClaudeClient()

  const industryContext = industryDomain
    ? `Frame the problem in a ${industryDomain} context — use examples, data, and scenarios from that industry.`
    : ''

  const difficultyGuide = {
    easy: 'Simple, well-defined problem. Minimal edge cases. Clear expected output. Achievable in 10-15 minutes.',
    medium: 'Requires combining 2-3 concepts. Some edge cases to handle. Achievable in 20-30 minutes.',
    hard: 'Complex problem with multiple constraints. Requires efficient solution. Edge cases matter. 30-45 minutes.',
  }[difficulty]

  const message = await client.messages.create({
    model: HAIKU,
    max_tokens: 2048,
    messages: [{
      role: 'user',
      content: `Generate a ${difficulty} coding exercise for a student learning "${stageTopic}" on the module "${moduleTitle}". Student level: ${level}.

Difficulty guidance: ${difficultyGuide}
${industryContext}

Return JSON only:
{
  "title": "string",
  "problem": "string - clear problem statement with concrete examples and expected input/output",
  "starterCode": "string - helpful starter code scaffold",
  "language": "python|javascript|typescript",
  "testCases": [{ "input": "string", "expectedOutput": "string", "description": "string" }],
  "hints": ["string (general direction)", "string (more specific)", "string (almost a solution)"],
  "difficulty": "${difficulty}"
}

Return ONLY valid JSON.`,
    }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : '{}'
  const cleaned = text.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim()
  return JSON.parse(cleaned) as GeneratedExercise
}

export async function evaluateSubmission(
  problem: string,
  studentCode: string,
  testsPassed: number,
  testsTotal: number,
  language: string
): Promise<{ score: number; feedback: string }> {
  const client = getClaudeClient()

  const message = await client.messages.create({
    model: HAIKU,
    max_tokens: 512,
    messages: [{
      role: 'user',
      content: `Evaluate this student's coding submission.

Problem: ${problem}
Language: ${language}
Code:
\`\`\`${language}
${studentCode}
\`\`\`
Tests: ${testsPassed}/${testsTotal} passed

Score: 60% test results + 40% code quality/approach.
Return JSON only: { "score": number (0-100), "feedback": "string (2-3 constructive sentences)" }`,
    }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : '{}'
  try {
    const cleaned = text.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim()
    return JSON.parse(cleaned)
  } catch {
    const passRate = testsTotal > 0 ? testsPassed / testsTotal : 0
    return { score: Math.round(passRate * 100), feedback: `${testsPassed} of ${testsTotal} tests passed. Keep refining!` }
  }
}

// ─── Video narration script ─────────────────────────────────────────────────

export async function generateVideoScript(
  topic: string,
  title: string,
  description: string,
  objectives: string[]
): Promise<string> {
  const client = getClaudeClient()

  const message = await client.messages.create({
    model: SONNET,
    max_tokens: 600,
    messages: [{
      role: 'user',
      content: `Write a spoken narration script for a short (~45-60 second) educational video explaining "${title}" as part of a course on "${topic}".

Context: ${description}
${objectives.length > 0 ? `Key points to cover:\n${objectives.map(o => `- ${o}`).join('\n')}` : ''}

Rules:
- Plain spoken prose only — no markdown, no headers, no bullet points, no code, no stage directions
- Sound like a friendly, knowledgeable tutor talking directly to camera
- HARD LIMIT: under 850 characters total (including spaces) — this is a strict technical constraint, not a suggestion. Aim for ~100-120 words.
- Start with a hook, explain the core idea with one concrete example or analogy, end with what the viewer now understands
- Return ONLY the narration text, nothing else`,
    }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''
  const trimmed = text.trim()
  // Hard safety net — JoggAI rejects scripts over 920 chars regardless of what we asked for
  return trimmed.length > 900 ? trimmed.slice(0, 900).replace(/\s+\S*$/, '') + '.' : trimmed
}

// ─── Interview generation + evaluation ───────────────────────────────────────

export interface InterviewQuestion {
  id: string
  question: string
  type: 'conceptual' | 'coding' | 'system-design' | 'behavioral'
  difficulty: 'easy' | 'medium' | 'hard'
}

export async function generateInterviewQuestions(
  topic: string,
  difficulty: string,
  count = 10
): Promise<InterviewQuestion[]> {
  const client = getClaudeClient()

  const message = await client.messages.create({
    model: HAIKU,
    max_tokens: 2048,
    messages: [{
      role: 'user',
      content: `Generate ${count} interview questions for "${topic}" at ${difficulty} difficulty.

Mix: 40% conceptual, 30% coding, 20% system-design, 10% behavioral.
Return JSON array only:
[{ "id": "q1", "question": "string", "type": "conceptual|coding|system-design|behavioral", "difficulty": "${difficulty}" }]

Make questions realistic — the kind asked at top tech companies. Return ONLY the JSON array.`,
    }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : '[]'
  try {
    const cleaned = text.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim()
    return JSON.parse(cleaned) as InterviewQuestion[]
  } catch {
    return []
  }
}

export async function evaluateInterviewAnswer(
  question: string,
  answer: string,
  topic: string
): Promise<{ score: number; feedback: string; keyPoints: string[] }> {
  const client = getClaudeClient()

  const message = await client.messages.create({
    model: HAIKU,
    max_tokens: 512,
    messages: [{
      role: 'user',
      content: `Evaluate this interview answer for topic: "${topic}"

Question: ${question}
Answer: ${answer}

Grade on: accuracy, completeness, clarity, depth.
Return JSON only:
{ "score": number (0-100), "feedback": "string (2-3 sentences)", "keyPoints": ["string", "string"] }`,
    }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : '{}'
  try {
    const cleaned = text.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim()
    return JSON.parse(cleaned)
  } catch {
    return { score: 50, feedback: 'Keep practicing! Be more specific in your answers.', keyPoints: ['Needs more detail'] }
  }
}
