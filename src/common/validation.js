import { z } from 'zod';
import { GenderEnum } from './enum/user.enum.js';
import { LanguageEnum } from './enum/security.enum.js';

const validationMessages = {
  102: {
    ar: "عفوا لا يمكن ادخل اسم مستخدم اقل من حرفين",
    en: "min length is 2 char",
  }
}



const getValidationMessage = (lang, code) => {
  return lang == LanguageEnum.AR ?
    validationMessages[code].ar : validationMessages[code].en
}


const matchFields = ({ original, copy, data, ctx, lang }) => {
  if (data[original] != data[copy]) {
    ctx.addIssue({
      code: "custom",
      path: [copy],
      message: lang == LanguageEnum.AR ? `فشل التطابق بين كلا من ${original} و ${copy}` : `Fail to match...`
    })
  }
}


export const generalValidationFields = {
  email: (lang) => z.email({ message: "please enter valid email format like example@any.extra ?" }),
  otp: (lang) => z.string().regex(/^\d{6}$/, {error:"invalid code"}),
  password: (lang) => z.string().regex(/^(?=.*[a-z])(?=.*\s{0,})(?=.*[A-Z])(?=.*\d)(?=.*[!@#_$%\^&*(>)]).{8,16}$/).min(8).max(16),
  username: (lang) => z.string().min(2,{message: getValidationMessage(lang, 102)}),
  phone: (lang) => z.e164(),
  gender: (lang) => z.enum(GenderEnum),
  matchFields
}
