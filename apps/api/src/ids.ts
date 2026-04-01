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

function hmacSignature(input: string, length: number): string {
  const secret = process.env.ID_SECRET
  if (!secret) {
    throw 'illegal secret'
  }
  const hmac = crypto.createHmac('sha256', secret).update(input).digest()
  return toBase62(hmac, length)
}

export function generateId(prefix: string): string {
  const randomPart = generateRandomPart(10)
  const signature = hmacSignature(randomPart, 6)
  return `${prefix}_${randomPart}${signature}`
}

export function validateId(prefix: string, id: string): boolean {
  if (!id) {
    return false
  }
  if (!id.startsWith(`${prefix}_`)) {
    return false
  }
  const prefixLen = prefix.length
  if (id.length - prefixLen - 1 !== 16) return false

  const randomPart = id.slice(prefixLen + 1, 10 + prefixLen + 1)
  const signature = id.slice(10 + prefixLen + 1)

  const expected = hmacSignature(randomPart, 6)
  return signature === expected
}
