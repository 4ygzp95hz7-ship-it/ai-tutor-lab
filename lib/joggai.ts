const BASE_URL = 'https://api.jogg.ai'

function getApiKey(): string {
  const key = process.env.JOGGAI_API_KEY
  if (!key) throw new Error('JOGGAI_API_KEY is not set')
  return key
}

interface JoggaiResponse<T> {
  code: number
  msg: string
  data: T
}

async function joggaiFetch<T>(path: string, init: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', 'x-api-key': getApiKey(), ...(init.headers ?? {}) },
  })
  const json = (await res.json()) as JoggaiResponse<T>
  if (json.code !== 0) throw new Error(`JoggAI error ${json.code}: ${json.msg}`)
  return json.data
}

// ─── Create an avatar video from a narration script ─────────────────────────

export async function createAvatarVideo(script: string, videoName: string): Promise<string> {
  const avatarId = Number(process.env.JOGGAI_AVATAR_ID ?? '81')
  const voiceId = process.env.JOGGAI_VOICE_ID ?? 'en-US-ChristopherNeural'

  const data = await joggaiFetch<{ video_id: string }>('/v2/create_video_from_avatar', {
    method: 'POST',
    body: JSON.stringify({
      avatar: { avatar_type: 0, avatar_id: avatarId },
      voice: { type: 'script', voice_id: voiceId, script },
      aspect_ratio: 'landscape',
      screen_style: 1,
      caption: true,
      video_name: videoName,
    }),
  })
  return data.video_id
}

// ─── Poll video generation status ───────────────────────────────────────────

// Normalized status used throughout the app. JoggAI's docs say the terminal
// state is "completed", but the live API actually returns "success" — this
// maps both to "completed" so the rest of the codebase only deals with one value.
export type JoggaiVideoStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface VideoStatusResult {
  status: JoggaiVideoStatus
  videoUrl?: string
}

export async function getAvatarVideoStatus(videoId: string): Promise<VideoStatusResult> {
  const data = await joggaiFetch<{ status: string; video_url?: string }>(
    `/v2/avatar_video/${videoId}`,
    { method: 'GET' }
  )
  const status: JoggaiVideoStatus = data.status === 'success' ? 'completed' : (data.status as JoggaiVideoStatus)
  return { status, videoUrl: data.video_url }
}
