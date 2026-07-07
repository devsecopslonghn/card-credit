import crypto from "node:crypto";

const SCRYPT_KEY_LENGTH = 64;

export const hashPassword = async (password) => {
  if (typeof password !== "string" || password.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }
  const salt = crypto.randomBytes(16).toString("base64url");
  const key = await new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, SCRYPT_KEY_LENGTH, (error, derivedKey) => {
      if (error) reject(error);
      else resolve(derivedKey);
    });
  });
  return `scrypt$${salt}$${key.toString("base64url")}`;
};

export const verifyPassword = async (password, passwordHash) => {
  if (typeof password !== "string" || typeof passwordHash !== "string") return false;
  const [algorithm, salt, encodedKey] = passwordHash.split("$");
  if (algorithm !== "scrypt" || !salt || !encodedKey) return false;

  const expected = Buffer.from(encodedKey, "base64url");
  const actual = await new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, expected.length, (error, derivedKey) => {
      if (error) reject(error);
      else resolve(derivedKey);
    });
  });
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
};
