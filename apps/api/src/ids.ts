import * as crypto from 'crypto'

const CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
const BASE = CHARSET.length

const SECRET = 'your-super-secret-key'

function randomChar(): string {
  return CHARSET[Math.floor(Math.random() * BASE)]
}

function generateRandomPart(length: number): string {
  let result = ''
  for (let i = 0; i < length; i++) {
    result += randomChar()
  }
  return result
}

function toBase62(buffer: Buffer, length: number): string {
  let num = BigInt('0x' + buffer.toString('hex'))
  let result = ''

  while (result.length < length) {
    result = CHARSET[Number(num % BigInt(BASE))] + result
    num = num / BigInt(BASE)
  }

  return result
}

function hmacSignature(secret: string, input: string, length: number): string {
  if (!secret) {
    throw 'illegal secret'
  }
  const hmac = crypto.createHmac('sha256', secret).update(input).digest()
  return toBase62(hmac, length)
}

export function generateCalendarId(): string {
  const randomPart = generateRandomPart(10)
  const signature = hmacSignature(process.env.CALENDAR_ID_SECRET ?? '', randomPart, 6)
  return `${randomPart}${signature}`
}

export function generateEventId(): string {
  const randomPart = generateRandomPart(10)
  const signature = hmacSignature(process.env.EVENT_ID_SECRET ?? '', randomPart, 6)
  return `${randomPart}${signature}`
}

export function validateCalendarId(id: string): boolean {
  if (!id || id.length !== 16) return false

  const randomPart = id.slice(0, 10)
  const signature = id.slice(10)

  const expected = hmacSignature(process.env.CALENDAR_ID_SECRET ?? '', randomPart, 6)
  return signature === expected
}

export function validateEventId(id: string): boolean {
  if (!id || id.length !== 16) return false

  const randomPart = id.slice(0, 10)
  const signature = id.slice(10)

  const expected = hmacSignature(process.env.EVENT_ID_SECRET ?? '', randomPart, 6)
  return signature === expected
}
