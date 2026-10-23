import { literal, z } from "zod";
import { GenderEnum, RoleEnum } from "../../common/enum/user.enum.js";
import { generalValidationFields } from "../../common/validation.js";


export const loginSchema = (lang) => {
  return  z.strictObject({
  email: generalValidationFields.email(lang),
  password: generalValidationFields.password(lang)
})

}


export const login = (lang) => {
  return z.object({
  body: loginSchema(lang),
  query: z.strictObject({
    lang: z.enum(["ar" , "en"]).default("ar"),
    // darkMood:z.coerce.boolean(),
    // darkMood: z.stringbool({
    //   truthy: ["true", "1", "yes"],
    //   falsy: ["false", "0", "no"]
    // })
    // extra: z.literal("25")
  })
})

}


export const signup = (lang) => {
  return  z.object({
  body: loginSchema(lang).safeExtend({
  username: generalValidationFields.username(lang),
  phone: generalValidationFields.phone(lang),
  confirmPassword: generalValidationFields.password(lang),
  gender: generalValidationFields.gender(lang)


  // gender:z.coerce.number().enum(Object.values(RoleEnum))
  // gender:z.union([
  //   z.literal(GenderEnum.MALE),
  //   z.literal(GenderEnum.FEMALE),
  // ])

}).superRefine((data, ctx) => {
  console.log({ data, ctx }); 
  generalValidationFields.matchFields({original:"password" , copy:"confirmPassword", data, ctx , lang})

 if (!data.username.includes(" ")) {
    ctx.addIssue({
      code: "custom",
      path: ['username'],
      message: "username must contain 2  parts"
    })
  }
})
})

}


export const confirmEmail = (lang) => {
  return z.object({
    body: z.strictObject({
      email: generalValidationFields.email(lang),
      otp: z.string()
    })
  })
}



export const resendConfirmEmail = (lang) => {
  return z.object({
    body: z.strictObject({
      email: generalValidationFields.email(lang),
    })
  })
}


export const resetForgotPassword = (lang) => {
  return z.object({
    body: z.strictObject({
      email: generalValidationFields.email(lang),
      otp: generalValidationFields.otp(lang),
      password: generalValidationFields.password(lang),
      confirmPassword: generalValidationFields.password(lang),
    }).superRefine((data, ctx) => {
      generalValidationFields.matchFields({ original: "password", copy: "confirmPassword", data, ctx })
    })
  })
}