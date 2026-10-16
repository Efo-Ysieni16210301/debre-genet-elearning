export type FormResult = { ok: true } | { ok: false; message: string };

export type ResetResult =
  | { ok: true; password: string }
  | { ok: false; message: string };
