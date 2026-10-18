export const QUESTION_TYPES = [
  {
    value: "SINGLE_CHOICE",
    label: "Multiple choice",
    hint: "Students pick one answer. Fill in two to four answers and mark the correct one.",
  },
  {
    value: "TRUE_FALSE",
    label: "True or false",
    hint: "Students decide whether the statement is true or false.",
  },
  {
    value: "SHORT_ANSWER",
    label: "Short answer",
    hint: "Students type a word or a short phrase. List every spelling you accept.",
  },
  {
    value: "MATCHING",
    label: "Matching",
    hint: "Students match each item on the left with the right item. Fill in two to six pairs.",
  },
  {
    value: "EXPLANATION",
    label: "Written explanation",
    hint: "Students write an answer in their own words. You read it and give a mark.",
  },
] as const;

export type QuestionTypeValue = (typeof QUESTION_TYPES)[number]["value"];

export function isQuestionType(value: string): value is QuestionTypeValue {
  return QUESTION_TYPES.some((type) => type.value === value);
}

export function typeLabel(value: QuestionTypeValue) {
  return QUESTION_TYPES.find((type) => type.value === value)?.label ?? value;
}

export function trueFalseLabel(text: string) {
  return text === "true" ? "True" : "False";
}

export const LIMITS = {
  question: 500,
  option: 200,
  pairItem: 150,
  shortAnswer: 300,
  explanation: 5000,
  modelAnswer: 3000,
  feedback: 1000,
} as const;
