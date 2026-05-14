import { ZodError } from "zod";

export type ProblemJson = {
  code: string;
  message: string;
};

export function problemJson(code: string, message: string): ProblemJson {
  return { code, message };
}

export function zodToProblemJson(error: ZodError): ProblemJson {
  const first = error.issues[0];
  return {
    code: "validation_error",
    message: first?.message ?? "Invalid request",
  };
}
