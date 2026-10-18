"use client";

import { useState, type FormEvent } from "react";
import type { FormResult } from "@/lib/form-result";
import {
  LIMITS,
  QUESTION_TYPES,
  type QuestionTypeValue,
} from "@/lib/quiz-types";

export default function QuestionForm({
  action,
}: {
  action: (formData: FormData) => Promise<FormResult>;
}) {
  const [type, setType] = useState<QuestionTypeValue>("SINGLE_CHOICE");
  const [formKey, setFormKey] = useState(0);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{
    kind: "error" | "success";
    text: string;
  } | null>(null);

  const current = QUESTION_TYPES.find((item) => item.value === type);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setPending(true);

    try {
      const result = await action(new FormData(event.currentTarget));

      if (result.ok) {
        setFormKey((key) => key + 1);
        setMessage({ kind: "success", text: "Question added." });
      } else {
        setMessage({ kind: "error", text: result.message });
      }
    } catch {
      setMessage({
        kind: "error",
        text: "Could not reach the server. Please try again.",
      });
    }

    setPending(false);
  }

  return (
    <div>
      {message && (
        <p
          role={message.kind === "error" ? "alert" : "status"}
          className={`mb-4 px-3 py-2 text-sm ${
            message.kind === "error"
              ? "border-l-4 border-madder bg-madder/10"
              : "border-l-4 border-fern bg-fern/10"
          }`}
        >
          {message.text}
        </p>
      )}

      <form key={formKey} onSubmit={handleSubmit} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
          <div>
            <label
              htmlFor="question-type"
              className="mb-1.5 block text-sm font-bold"
            >
              Question type
            </label>
            <select
              id="question-type"
              name="type"
              value={type}
              onChange={(event) =>
                setType(event.target.value as QuestionTypeValue)
              }
              className="field"
            >
              {QUESTION_TYPES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="question-points"
              className="mb-1.5 block text-sm font-bold"
            >
              Points
            </label>
            <input
              id="question-points"
              name="points"
              type="number"
              min={1}
              max={10}
              step={1}
              defaultValue={1}
              required
              className="field"
            />
          </div>
        </div>

        {current && <p className="-mt-2 text-sm text-muted">{current.hint}</p>}

        <div>
          <label
            htmlFor="question-text"
            className="mb-1.5 block text-sm font-bold"
          >
            {type === "TRUE_FALSE" ? "Statement" : "Question"}
          </label>
          <textarea
            id="question-text"
            name="text"
            required
            rows={2}
            maxLength={LIMITS.question}
            className="field"
          />
        </div>

        {type === "SINGLE_CHOICE" && (
          <fieldset>
            <legend className="mb-1 text-sm font-bold">Answers</legend>
            <p className="mb-3 text-sm text-muted">
              Fill in at least two answers, then select the correct one.
            </p>
            <div className="space-y-2">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="correct"
                    value={i}
                    required={i === 0}
                    aria-label={`Answer ${i + 1} is the correct one`}
                    className="h-4 w-4 shrink-0 accent-lapis"
                  />
                  <input
                    type="text"
                    name={`option${i}`}
                    required={i < 2}
                    maxLength={LIMITS.option}
                    aria-label={`Answer ${i + 1}`}
                    placeholder={`Answer ${i + 1}${i < 2 ? "" : " (optional)"}`}
                    className="field"
                  />
                </div>
              ))}
            </div>
          </fieldset>
        )}

        {type === "TRUE_FALSE" && (
          <fieldset>
            <legend className="mb-2 text-sm font-bold">The statement is</legend>
            <div className="flex gap-6">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="answer"
                  value="true"
                  required
                  className="h-4 w-4 accent-lapis"
                />
                True
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="answer"
                  value="false"
                  className="h-4 w-4 accent-lapis"
                />
                False
              </label>
            </div>
          </fieldset>
        )}

        {type === "SHORT_ANSWER" && (
          <div>
            <label
              htmlFor="accepted"
              className="mb-1.5 block text-sm font-bold"
            >
              Accepted answers
            </label>
            <textarea
              id="accepted"
              name="accepted"
              required
              rows={3}
              className="field"
            />
            <p className="mt-1.5 text-sm text-muted">
              One answer per line. Capital letters, extra spaces and punctuation
              are ignored. In Amharic, letters that sound the same (such as ሰ
              and ሠ) count as the same letter.
            </p>
          </div>
        )}

        {type === "MATCHING" && (
          <fieldset>
            <legend className="mb-1 text-sm font-bold">Pairs</legend>
            <p className="mb-3 text-sm text-muted">
              Fill in at least two pairs. Students see the left items in this
              order and the right items mixed up.
            </p>
            <div className="space-y-2">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="grid gap-2 sm:grid-cols-2">
                  <input
                    type="text"
                    name={`left${i}`}
                    required={i < 2}
                    maxLength={LIMITS.pairItem}
                    aria-label={`Pair ${i + 1}, left item`}
                    placeholder={`Left item ${i + 1}${i < 2 ? "" : " (optional)"}`}
                    className="field"
                  />
                  <input
                    type="text"
                    name={`right${i}`}
                    required={i < 2}
                    maxLength={LIMITS.pairItem}
                    aria-label={`Pair ${i + 1}, right item`}
                    placeholder={`Matching item ${i + 1}${i < 2 ? "" : " (optional)"}`}
                    className="field"
                  />
                </div>
              ))}
            </div>
          </fieldset>
        )}

        {type === "EXPLANATION" && (
          <div>
            <label
              htmlFor="model-answer"
              className="mb-1.5 block text-sm font-bold"
            >
              Model answer{" "}
              <span className="font-normal text-muted">(optional)</span>
            </label>
            <textarea
              id="model-answer"
              name="modelAnswer"
              rows={4}
              maxLength={LIMITS.modelAnswer}
              className="field"
            />
            <p className="mt-1.5 text-sm text-muted">
              Only you see this, to help you mark. Students see it only if you
              switch on &quot;Show correct answers&quot; for the quiz.
            </p>
          </div>
        )}

        <button type="submit" disabled={pending} className="btn btn-primary">
          {pending ? "Adding..." : "Add question"}
        </button>
      </form>
    </div>
  );
}
