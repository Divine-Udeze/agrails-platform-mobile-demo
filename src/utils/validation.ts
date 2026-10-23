/** Returns +2547XXXXXXXX / +2541XXXXXXXX or null if not a Kenyan mobile number. */
export function normalizeKenyanPhone(input: string): string | null {
  let digits = input.replace(/\D/g, '')
  if (digits.startsWith('254')) digits = digits.slice(3)
  else if (digits.startsWith('0')) digits = digits.slice(1)
  return /^[17]\d{8}$/.test(digits) ? `+254${digits}` : null
}

export function isValidNationalId(id: string): boolean {
  return /^\d{7,8}$/.test(id.trim())
}

export function isValidName(name: string): boolean {
  return name.replace(/\s/g, '').length >= 3
}

export function isValidOtp(code: string): boolean {
  return /^\d{6}$/.test(code)
}
