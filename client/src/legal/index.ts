import type { LegalDoc } from './types'
import privacy from './privacy'
import terms from './terms'
import oferta from './oferta'
import refund from './refund'
import cookie from './cookie'

export type { LegalDoc, LegalSection } from './types'

// Реестр документов — добавляй новые сюда
export const legalDocs: LegalDoc[] = [
  privacy,
  terms,
  oferta,
  refund,
  cookie,
]
