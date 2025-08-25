import jwt from 'jsonwebtoken'
import { UserRole } from '@/types/database'

interface JWTPayload {
  sub: string
  email: string
  role: UserRole
  agency_id?: string
  tier_level?: number
  permissions: string[]
  iat: number
  exp: number
}

const JWT_SECRET = process.env.JWT_SECRET!
const JWT_EXPIRES_IN = '3h'

export function generateToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  })
}

export function verifyToken(token: string): JWTPayload {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload
  } catch (error) {
    throw new Error('Invalid or expired token')
  }
}

export function getPermissionsByRole(role: UserRole): string[] {
  const basePermissions = ['view_own_data']
  
  switch (role) {
    case 'super_admin':
      return [
        ...basePermissions,
        'manage_system',
        'manage_all_agencies',
        'manage_all_sales',
        'manage_all_commissions',
        'manage_settings',
        'view_all_data',
        'approve_agencies',
        'process_payments'
      ]
    case 'admin':
      return [
        ...basePermissions,
        'manage_agencies',
        'manage_sales',
        'manage_commissions',
        'view_reports',
        'approve_agencies'
      ]
    case 'agency':
      return [
        ...basePermissions,
        'view_sales',
        'create_sales',
        'view_commission',
        'create_invitation',
        'view_sub_agencies'
      ]
    case 'viewer':
      return [
        ...basePermissions,
        'view_sales',
        'view_commission'
      ]
    default:
      return basePermissions
  }
}