export const INDIAN_MOBILE_PATTERN = "(?:\\+91)?[6-9][0-9]{9}";

export function sanitizeIndianMobile(value: string) {
  const trimmed = value.trimStart();
  const digits = value.replace(/\D/g, "");
  if (trimmed.startsWith("+") || (digits.length > 10 && digits.startsWith("91"))) {
    return `+${digits.slice(0, 12)}`;
  }
  return digits.slice(0, 10);
}
