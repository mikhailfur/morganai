export interface LegalSection {
  sym: string
  title: string
  text: string
}

export interface LegalDoc {
  id: string
  num: string
  name: string
  version: string
  heading: string
  summary: string
  sections: LegalSection[]
}
