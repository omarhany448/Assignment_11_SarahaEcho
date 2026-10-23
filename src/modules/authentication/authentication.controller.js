import { Router } from "express"
import { confirmEmail, login, requestForgotPasswordCode, resendConfirmEmail, resetForgotPassword, signup, signupWithGmail, verifyForgetPasswordCode } from "./authentication.service.js";
import { successResponse } from "../../common/utils/index.js";
import * as validators from './authentication.validation.js'
import { BadException } from "../../common/exceptions/error.exceptions.js";
import { validation } from "../../middleware/validation.middleware.js";

const router = Router();

router.post("/signup", validation(validators.signup) ,async(req,res,next) => {
    const data = await signup(req.body)
    return successResponse({res, status:201, data})
})


router.patch("/confirm-email", validation(validators.confirmEmail), async (req, res, next) => {
  const data = await confirmEmail(req.body)
  return successResponse({ res, status: 200, data })
})


router.post("/verify-forget-password", validation(validators.confirmEmail), async (req, res, next) => {
  const data = await verifyForgetPasswordCode(req.body)
  return successResponse({ res, status: 200, data })
})



router.patch("/reset-forget-password", validation(validators.resetForgotPassword), async (req, res, next) => {
  const data = await resetForgotPassword(req.body)
  return successResponse({ res, status: 200, data })
})


router.patch("/resend-confirm-email", validation(validators.resendConfirmEmail), async (req, res, next) => {
  const data = await resendConfirmEmail(req.body)
  return successResponse({ res, status: 200, data })
})



router.post("/request-forget-password-email", validation(validators.resendConfirmEmail), async (req, res, next) => {
  const data = await requestForgotPasswordCode(req.body)
  return successResponse({ res, status: 201, data })
})


router.post("/signup-with-gmail", async(req,res,next) => {
    console.log("🔥 SIGNUP WITH GMAIL CALLED");
    console.log("BODY:", req.body);
    const {status,data} = await signupWithGmail(req.body, `${req.protocol}://${req.host}`)
    return successResponse({res, status, data})
})


router.post("/login", validation(validators.login) , async(req,res,next) => {
   
    const data = await login(req.validate.body  , `${req.protocol}://${req.host}`)
    return successResponse({res, data})
})

export default router