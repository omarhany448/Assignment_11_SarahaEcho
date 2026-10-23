import { LanguageEnum } from "../common/enum/security.enum.js"
import { BadException } from "../common/exceptions/error.exceptions.js"

export const validation = (schema) => {
  return (req, res, next) => {
    const lang = Number(req.headers['accept-language'] ?? LanguageEnum.EN);

    const ValidationResult = schema(lang).safeParse({
      body: req.body,
      query: req.query,
      params: req.params,
    })
    // console.log({ ValidationResult });

    // console.log(JSON.stringify(ValidationResult, null, 2));

    if (!ValidationResult.success) {
      throw BadException("ValidationResult Error", ValidationResult.error.issues)
    }
    req.validate = ValidationResult.data
    next()
  }
}