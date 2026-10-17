import { randomInt } from "node:crypto";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function block(length: number) {
  let result = "";

  for (let i = 0; i < length; i++) {
    result += ALPHABET[randomInt(ALPHABET.length)];
  }

  return result;
}

export function newCertificateCode() {
  return `DG-${block(4)}-${block(4)}-${block(4)}`;
}

export function normalizeCode(input: string): string | null {
  const cleaned = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const match = cleaned.match(
    /^DG([A-HJ-NP-Z2-9]{4})([A-HJ-NP-Z2-9]{4})([A-HJ-NP-Z2-9]{4})$/,
  );

  return match ? `DG-${match[1]}-${match[2]}-${match[3]}` : null;
}
