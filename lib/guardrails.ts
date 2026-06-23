import { prisma } from '@/lib/prisma'
import { getTodayDate } from '@/lib/utils'

const LIMITS = {
  free: { doubt: 20, roadmap: 1, module: 10 },
  pro:  { doubt: 200, roadmap: 999, module: 999 },
  team: { doubt: 500, roadmap: 999, module: 999 },
}

type LimitType = 'doubt' | 'roadmap' | 'module'

export async function checkAndIncrementUsage(
  userId: string,
  type: LimitType,
  userRole: string = 'user'
): Promise<{ allowed: boolean; remaining: number }> {
  const tier = userRole === 'pro' ? 'pro' : userRole === 'team' ? 'team' : 'free'
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

  if (currentCount >= limit) {
    return { allowed: false, remaining: 0 }
  }

  const update = type === 'doubt'
    ? { doubtCount: { increment: 1 } }
    : type === 'roadmap'
    ? { roadmapCount: { increment: 1 } }
    : {}

  await prisma.usageTracking.update({ where: { userId_date: { userId, date } }, data: update })

  return { allowed: true, remaining: limit - currentCount - 1 }
}
