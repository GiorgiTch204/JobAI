import bcrypt from "bcryptjs";

const ROUNDS = 10;

export async function hashPassword(plain) {
  return bcrypt.hash(plain, ROUNDS);
}

export async function verifyPassword(plain, hash) {
  if (!plain || !hash) return false;
  try {
    return await bcrypt.compare(plain, hash);
  } catch {
    return false;
  }
}

/** 0–4 strength score plus the unmet requirements, shared with the UI copy. */
export function passwordStrength(value = "") {
  const checks = {
    length: value.length >= 8,
    number: /\d/.test(value),
    letter: /[a-zA-Z]/.test(value),
    varied: /[A-Z]/.test(value) || /[^a-zA-Z0-9]/.test(value),
  };
  const score = Object.values(checks).filter(Boolean).length;
  return { score, checks };
}
