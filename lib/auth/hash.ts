import bcrypt from 'bcryptjs'

const SALT_ROUNDS = 10

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  
  if (password.length < 8) {
    errors.push('パスワードは8文字以上である必要があります')
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('パスワードには大文字を含める必要があります')
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('パスワードには小文字を含める必要があります')
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('パスワードには数字を含める必要があります')
  }
  
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('パスワードには特殊文字を含める必要があります')
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}