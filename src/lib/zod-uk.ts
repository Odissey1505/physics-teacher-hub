import { z } from "zod";

/** Українські повідомлення валідації за замовчуванням (для полів без власного тексту). */
z.setErrorMap((issue, ctx) => {
  switch (issue.code) {
    case z.ZodIssueCode.invalid_type:
      if (issue.received === "undefined" || issue.received === "null") return { message: "Обов'язкове поле" };
      return { message: "Некоректне значення" };
    case z.ZodIssueCode.too_small:
      if (issue.type === "string") return { message: issue.minimum === 1 ? "Обов'язкове поле" : `Мінімум ${issue.minimum} символів` };
      if (issue.type === "array") return { message: `Потрібно щонайменше ${issue.minimum}` };
      return { message: `Значення має бути не менше ${issue.minimum}` };
    case z.ZodIssueCode.too_big:
      if (issue.type === "string") return { message: `Максимум ${issue.maximum} символів` };
      if (issue.type === "array") return { message: `Не більше ${issue.maximum}` };
      return { message: `Значення має бути не більше ${issue.maximum}` };
    case z.ZodIssueCode.invalid_string:
      if (issue.validation === "email") return { message: "Некоректний email" };
      if (issue.validation === "url") return { message: "Некоректне посилання" };
      return { message: "Некоректний формат" };
    case z.ZodIssueCode.invalid_enum_value:
      return { message: "Оберіть значення зі списку" };
    default:
      return { message: ctx.defaultError };
  }
});
