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

  const prompt = `You are an expert curriculum designer and master educator. Create a COMPLETE, UNCOMPROMISED learning roadmap for someone who wants to learn: "${topic}".

Experience level: ${experienceLevel}

Your job is to design a syllabus that covers EVERYTHING a person needs to truly master this topic. Do not restrict the number of modules or sub-modules. If the topic requires 5 modules, create 5. If it requires 18, create 18.

Return a JSON object with this exact structure (no markdown, just raw JSON):
{
  "title": "string",
  "description": "string - 2-3 sentence overview",
  "totalHours": number,
  "stages": [
    {
      "title": "string",
      "description": "string",
      "objectives": ["string"],
      "estimatedHours": number,
      "subModules": [
        {
          "title": "string",
          "description": "string",
          "objectives": ["string", "string"],
          "estimatedHours": number,
          "resources": [
            { "title": "string", "url": "https://...", "type": "article|video|docs|exercise" }
          ]
        }
      ],
      "resources": [
        { "title": "string", "url": "https://...", "type": "article|video|docs|exercise" }
      ]
    }
  ]
}

Rules:
- Create AS MANY modules as the topic genuinely requires — never cap at any arbitrary number
- Break each complex module into 2-6 focused sub-modules
- Progress naturally: fundamentals → core → intermediate → advanced → real-world application
- Tailor depth to experience level: beginners need fundamentals; advanced learners skip basics
- Each sub-module: 2-4 focused objectives, 2-3 real resources, 0.5-4 estimated hours
- Return ONLY valid JSON, no markdown fences, no commentary`

  const message = await client.messages.create({
    model: SONNET,
    max_tokens: 16000,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''
  const cleaned = text.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim()
  return JSON.parse(cleaned) as GeneratedRoadmap
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
  return `You are an expert AI tutor helping a student learn "${ctx.topic}".

Current module: "${ctx.stageTitle}"
Module description: ${ctx.stageDescription}
Student level: ${ctx.userLevel}

Learning objectives for this module:
${ctx.objectives.map((o, i) => `${i + 1}. ${o}`).join('\n')}

Your role:
- Answer questions clearly with code examples where relevant
- Use analogies and real-world examples for complex concepts
- Break down topics into digestible steps
- Encourage the student when they make progress
- Never give direct answers to quiz questions — guide with hints instead
- Use markdown formatting for code blocks and structured content
- Keep responses focused and educational`
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
  level: string
): Promise<GeneratedExercise> {
  const client = getClaudeClient()

  const message = await client.messages.create({
    model: HAIKU,
    max_tokens: 2048,
    messages: [{
      role: 'user',
      content: `Generate a coding exercise for a student learning "${stageTopic}" on the module "${moduleTitle}". Student level: ${level}.

Return JSON only:
{
  "title": "string",
  "problem": "string - clear problem statement with examples",
  "starterCode": "string - helpful starter code scaffold",
  "language": "python|javascript|typescript",
  "testCases": [{ "input": "string", "expectedOutput": "string", "description": "string" }],
  "hints": ["string", "string", "string"],
  "difficulty": "easy|medium|hard"
}

Make it practical, educational, and achievable in 20-30 minutes. Return ONLY valid JSON.`,
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
