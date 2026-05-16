import type { Request, Response, NextFunction } from 'express'
import geoip from 'geoip-lite'

// Страны, для которых заблокированы NSFW-функции
const NSFW_BLOCKED_COUNTRIES = ['KR']

export interface GeoBlockRequest extends Request {
  nsfwGeoBlocked?: boolean
  geoCountry?: string
}

export function geoBlockMiddleware(req: GeoBlockRequest, _res: Response, next: NextFunction): void {
  const forwarded = req.headers['x-forwarded-for']
  const rawIp = typeof forwarded === 'string'
    ? forwarded.split(',')[0].trim()
    : req.socket.remoteAddress || ''

  // Убираем IPv6-префикс ::ffff: для корректного lookup
  const ip = rawIp.replace(/^::ffff:/, '')

  const geo = geoip.lookup(ip)
  const country = geo?.country || ''

  req.geoCountry = country
  req.nsfwGeoBlocked = NSFW_BLOCKED_COUNTRIES.includes(country)

  next()
}
