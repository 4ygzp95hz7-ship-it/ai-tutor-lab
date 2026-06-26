import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getClaudeClient, SONNET } from '@/lib/claude'
import { parseJSON } from '@/lib/utils'

interface SubModule { title: string; description: string; objectives: string[] }

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const stage = await prisma.stage.findFirst({
    where: { id },
    include: { roadmap: { select: { topic: true, userId: true } } },
  })

  if (!stage || stage.roadmap.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Return cached cheat sheet
  if (stage.cheatSheet && stage.cheatSheet.length > 100) {
    return NextResponse.json({ cheatSheet: stage.cheatSheet })
  }

  const subModules = parseJSON<SubModule[]>(stage.subModules, [])
  const client = getClaudeClient()

  const prompt = `Create a comprehensive cheat sheet for this learning module. This will be printed as a reference card.

Topic: ${stage.roadmap.topic}
Module: "${stage.title}"
Description: ${stage.description}
${subModules.length > 0 ? `Sub-modules covered:\n${subModules.map(s => `- ${s.title}: ${s.description}`).join('\n')}` : ''}

Create a cheat sheet with these exact sections using markdown:

# ${stage.title} — Cheat Sheet

## Core Concepts
- [bullet: each key concept in 1 line, use **bold** for the term]

## Key Syntax / Patterns
\`\`\`language
// Most important code patterns with brief inline comments
\`\`\`

## When to Use What
| Situation | Approach | Why |
|---|---|---|
| [scenario] | [what to do] | [reason] |

## Common Mistakes
- ❌ **[mistake]:** [brief explanation]
- ✓ **[correct approach]**

## Quick Reference
[2-3 most important things to remember — the "if you forget everything else, remember this" section]

## Interview Must-Knows
- [3-4 key points interviewers always ask about this topic]

Keep each section tight. This is a reference card, not a lesson — be dense and precise.`

  const message = await client.messages.create({
    model: SONNET, max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  })

  const cheatSheet = message.content[0].type === 'text' ? message.content[0].text : ''

  await prisma.stage.update({ where: { id }, data: { cheatSheet } })

  return NextResponse.json({ cheatSheet })
}
