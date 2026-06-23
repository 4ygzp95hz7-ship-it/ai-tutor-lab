import { prisma } from '@/lib/prisma'
import { getTodayDate } from '@/lib/utils'

const LIMITS = {
  free: { doubt: 100, roadmap: 20, module: 100 },
  pro:  { doubt: 200, roadmap: 999, module: 999 },
  team: { doubt: 500, roadmap: 999, module: 999 },
}

type LimitType = 'doubt' | 'roadmap' | 'module'

export async function checkAndIncrementUsage(
  userId: string,
  type: LimitType,
  delta: number = 1,
  checkOnly: boolean = false
): Promise<{ allowed: boolean; remaining: number }> {
  const tier = 'free'
  const limit = LIMITS[tier][type]
  const date = getTodayDate()

  const tracking = await prisma.usageTracking.upsert({
    where: { userId_date: { userId, date } },
    create: { userId, date },
    update: {},
  })

  const currentCount = type === 'doubt' ? tracking.doubtCount
    : type === 'roadmap' ? tracking.roadmapCount
    : 0

  if (delta > 0 && currentCount >= limit) {
    return { allowed: false, remaining: 0 }
  }

  if (!checkOnly || delta < 0) {
    const update = type === 'doubt'
      ? { doubtCount: { increment: delta } }
      : type === 'roadmap'
      ? { roadmapCount: { increment: delta } }
      : {}

    await prisma.usageTracking.update({
      where: { userId_date: { userId, date } },
      data: update,
    })
  }

  return { allowed: true, remaining: limit - currentCount - Math.max(delta, 0) }
}
