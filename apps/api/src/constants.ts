import * as crypto from 'crypto'

const DICTIONARY = 'abcdefghijklmnopqrstuvwxyz0123456789'

export const generateRandomString = (size: number): string =>
  Array.from({ length: size }, () => DICTIONARY[crypto.randomInt(DICTIONARY.length)]).join('')
