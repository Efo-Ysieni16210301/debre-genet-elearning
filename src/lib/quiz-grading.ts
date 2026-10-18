import { LIMITS, type QuestionTypeValue } from "./quiz-types";

export function round2(value: number) {
  return Math.round(value * 100) / 100;
}

const PUNCTUATION = new RegExp("[\\p{P}\\p{S}]", "gu");

const HOMOPHONES: [from: number, to: number][] = [
  [0x1210, 0x1200],
  [0x1280, 0x1200],
  [0x1220, 0x1230],
  [0x12d0, 0x12a0],
  [0x1340, 0x1338],
];

function foldEthiopic(value: string) {
  let result = "";

  for (const char of value) {
    const code = char.codePointAt(0) ?? 0;
    let mapped = code;

    for (const [from, to] of HOMOPHONES) {
      if (code >= from && code <= from + 7) {
        mapped = to + (code - from);
        break;
      }
    }

    result += String.fromCodePoint(mapped);
  }

  return result;
}

export function normalizeText(value: string) {
  return foldEthiopic(value.normalize("NFC").toLowerCase())
    .replace(/['\u2019]/g, "")
    .replace(PUNCTUATION, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export type GradableQuestion = {
  id: string;
  type: QuestionTypeValue;
  points: number;
  acceptedAnswers: string[];
  options: { id: string; isCorrect: boolean }[];
  pairs: { id: string; right: string }[];
};

export type GradeResult = {
  response: string;
  isCorrect: boolean | null;
  points: number;
};

export function gradeQuestion(
  question: GradableQuestion,
  read: (name: string) => string | null,
): GradeResult {
  switch (question.type) {
    case "SINGLE_CHOICE":
    case "TRUE_FALSE": {
      const chosen = read(`q_${question.id}`) ?? "";
      const option = question.options.find((item) => item.id === chosen);
      const correct = !!option?.isCorrect;

      return {
        response: option ? option.id : "",
        isCorrect: correct,
        points: correct ? question.points : 0,
      };
    }

    case "SHORT_ANSWER": {
      const text = (read(`q_${question.id}`) ?? "")
        .trim()
        .slice(0, LIMITS.shortAnswer);
      const wanted = normalizeText(text);
      const correct =
        wanted !== "" &&
        question.acceptedAnswers.some((item) => normalizeText(item) === wanted);

      return {
        response: text,
        isCorrect: correct,
        points: correct ? question.points : 0,
      };
    }

    case "MATCHING": {
      const chosen: Record<string, string> = {};
      let right = 0;

      for (const pair of question.pairs) {
        const value = (read(`m_${question.id}_${pair.id}`) ?? "")
          .trim()
          .slice(0, LIMITS.pairItem);

        chosen[pair.id] = value;

        if (
          value !== "" &&
          normalizeText(value) === normalizeText(pair.right)
        ) {
          right++;
        }
      }

      const total = question.pairs.length;

      return {
        response: JSON.stringify(chosen),
        isCorrect: total > 0 && right === total,
        points: total === 0 ? 0 : round2((question.points * right) / total),
      };
    }

    case "EXPLANATION": {
      const text = (read(`q_${question.id}`) ?? "")
        .trim()
        .slice(0, LIMITS.explanation);

      return text === ""
        ? { response: "", isCorrect: false, points: 0 }
        : { response: text, isCorrect: null, points: 0 };
    }
  }
}

export function summarize(
  questions: { points: number }[],
  results: GradeResult[],
) {
  return {
    score: round2(results.reduce((sum, result) => sum + result.points, 0)),
    total: round2(
      questions.reduce((sum, question) => sum + question.points, 0),
    ),
    pending: results.some((result) => result.isCorrect === null),
  };
}
