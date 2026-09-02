const GITHUB_API_BASE = 'https://api.github.com'
const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com'
const GITHUB_OWNER = 'pmndrs'
const GITHUB_REPO = 'examples'
const GITHUB_REF = 'main'

type GitHubContentEntry = {
  download_url: string | null
  path: string
  type: 'dir' | 'file'
}

type ZipFile = {
  data: Uint8Array
  name: string
}

const crcTable = (() => {
  const table = new Uint32Array(256)

  for (let i = 0; i < 256; i += 1) {
    let c = i
    for (let bit = 0; bit < 8; bit += 1) {
      c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    table[i] = c >>> 0
  }

  return table
})()

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ demo: string }> }
) {
  const { demo } = await params
  const demoPath = `demos/${demo}`

  try {
    const files = await collectFiles(demoPath, demo)

    if (files.length === 0) {
      return Response.json({ error: 'Demo not found' }, { status: 404 })
    }

    const zip = buildZip(files)

    return new Response(zip, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        'Content-Disposition': `attachment; filename="${demo}.zip"`,
        'Content-Type': 'application/zip',
      },
    })
  } catch (error) {
    console.error(`Failed to build ZIP for demo "${demo}"`, error)
    return Response.json({ error: 'Unable to download demo ZIP' }, { status: 500 })
  }
}

async function collectFiles(dirPath: string, rootName: string): Promise<ZipFile[]> {
  const entries = await fetchContents(dirPath)
  const files = await Promise.all(
    entries.map(async (entry) => {
      if (entry.type === 'dir') {
        return collectFiles(entry.path, rootName)
      }

      const rawUrl =
        entry.download_url ??
        `${GITHUB_RAW_BASE}/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_REF}/${entry.path}`
      const response = await fetch(rawUrl, {
        headers: {
          Accept: 'application/vnd.github.raw',
          'User-Agent': 'pmndrs-website',
        },
        next: { revalidate: 3600 },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch file "${entry.path}" (${response.status})`)
      }

      const data = new Uint8Array(await response.arrayBuffer())
      const relativePath = entry.path.replace(/^demos\/[^/]+\//, '')

      return [
        {
          data,
          name: `${rootName}/${relativePath}`,
        },
      ]
    })
  )

  return files.flat()
}

async function fetchContents(path: string): Promise<GitHubContentEntry[]> {
  const url = `${GITHUB_API_BASE}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}?ref=${GITHUB_REF}`
  const response = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'pmndrs-website',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    next: { revalidate: 3600 },
  })

  if (response.status === 404) {
    return []
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch directory "${path}" (${response.status})`)
  }

  const data = (await response.json()) as GitHubContentEntry[]
  return Array.isArray(data) ? data : []
}

function buildZip(files: ZipFile[]) {
  const centralDirectory: Uint8Array[] = []
  const localFileParts: Uint8Array[] = []
  let offset = 0

  for (const file of files) {
    const nameBytes = new TextEncoder().encode(file.name)
    const crc = crc32(file.data)
    const timestamp = getDosDateTime()

    const localHeader = concatUint8Arrays([
      uint32LE(0x04034b50),
      uint16LE(20),
      uint16LE(0),
      uint16LE(0),
      uint16LE(timestamp.time),
      uint16LE(timestamp.date),
      uint32LE(crc),
      uint32LE(file.data.length),
      uint32LE(file.data.length),
      uint16LE(nameBytes.length),
      uint16LE(0),
      nameBytes,
    ])

    localFileParts.push(localHeader, file.data)

    const centralHeader = concatUint8Arrays([
      uint32LE(0x02014b50),
      uint16LE(20),
      uint16LE(20),
      uint16LE(0),
      uint16LE(0),
      uint16LE(timestamp.time),
      uint16LE(timestamp.date),
      uint32LE(crc),
      uint32LE(file.data.length),
      uint32LE(file.data.length),
      uint16LE(nameBytes.length),
      uint16LE(0),
      uint16LE(0),
      uint16LE(0),
      uint16LE(0),
      uint32LE(0),
      uint32LE(offset),
      nameBytes,
    ])

    centralDirectory.push(centralHeader)
    offset += localHeader.length + file.data.length
  }

  const centralDirectoryBytes = concatUint8Arrays(centralDirectory)
  const localFileBytes = concatUint8Arrays(localFileParts)
  const endOfCentralDirectory = concatUint8Arrays([
    uint32LE(0x06054b50),
    uint16LE(0),
    uint16LE(0),
    uint16LE(files.length),
    uint16LE(files.length),
    uint32LE(centralDirectoryBytes.length),
    uint32LE(localFileBytes.length),
    uint16LE(0),
  ])

  return concatUint8Arrays([localFileBytes, centralDirectoryBytes, endOfCentralDirectory])
}

function crc32(data: Uint8Array) {
  let crc = 0xffffffff

  for (const byte of data) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  }

  return (crc ^ 0xffffffff) >>> 0
}

function getDosDateTime() {
  const date = new Date()
  const year = Math.max(date.getFullYear(), 1980)

  return {
    date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1),
  }
}

function uint16LE(value: number) {
  const bytes = new Uint8Array(2)
  const view = new DataView(bytes.buffer)
  view.setUint16(0, value, true)
  return bytes
}

function uint32LE(value: number) {
  const bytes = new Uint8Array(4)
  const view = new DataView(bytes.buffer)
  view.setUint32(0, value, true)
  return bytes
}

function concatUint8Arrays(parts: Uint8Array[]) {
  const totalLength = parts.reduce((sum, part) => sum + part.length, 0)
  const result = new Uint8Array(totalLength)
  let offset = 0

  for (const part of parts) {
    result.set(part, offset)
    offset += part.length
  }

  return result
}
