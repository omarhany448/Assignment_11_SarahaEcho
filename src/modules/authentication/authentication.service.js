import { EmailSubjectEnum } from "../../common/enum/email.enum.js"
import { ProviderEnum } from "../../common/enum/user.enum.js"
import { BadException, ConflictException, NotfoundException, TooManyRequestException } from "../../common/exceptions/error.exceptions.js"
import { createOne , findOne } from "../../common/repository/index.js"
import { hash , compare , encryption , createLoginCredentials, userBaseRevokeTokenKey } from "../../common/security/index.js"
import { set , get, del, ttl, incrBy, expire, keys } from "../../common/services/cache.service.js"
import { createOtp, emailEvent, sendEmail, UserEmailKey, UserEmailTrailsKey } from "../../common/utils/index.js"
import { WEB_CLIENT_ID } from "../../config.js"
import { UserModel } from "../../DB/model/user.model.js"
import bcrypt from "bcrypt"
import {OAuth2Client} from 'google-auth-library'

const client = new OAuth2Client();


async function verifyGoogleAccount(idToken) {
  const ticket = await client.verifyIdToken({
      idToken,
      audience: WEB_CLIENT_ID,  
  });
  const payload = ticket.getPayload();
  if (!payload.email_verified) {
    throw BadException("email not verified")
  }
  return payload
}



export const loginWithGmail = async(account, issuer) => {

    return await createLoginCredentials({ user:account , issuer})
}



export const signupWithGmail = async({ idToken } , issuer) => {
    console.log({ idToken });

    const {name,email,picture} = await verifyGoogleAccount(idToken);
    console.log({name,email,picture});

    const existAccount = await findOne({
        model: UserModel,
        filter: { email }
    })
    
    if (existAccount) {
        if (existAccount.provider != ProviderEnum.GOOGLE) {
            throw ConflictException("Invalid account provider")
        }
        return { status:200 , data: await createLoginCredentials({ user: existAccount, issuer })}
    }

    //add user
    const user = await createOne({
        model: UserModel,
        data: {
            username: name,
            email,
            confirmEmail: new Date(),
            provider: ProviderEnum.GOOGLE,
            image: picture
        }
    })
        return { status:201 , data: await createLoginCredentials({ user, issuer })}
}




const sendEmailOtp = async ({ email , subject , expiresIn = 120 , maxTrails = 3 , blockInSeconds = 300 , title }) => {

    const existOTP_TTl = await ttl({ key: UserEmailKey({ email, subject }) })

    if (existOTP_TTl > 0) {
        throw ConflictException(`Sorry we cannot send a new OTP before ${existOTP_TTl}s`)
    }

    const oldTrails = await get({key:UserEmailTrailsKey({ email , subject })}) ?? 0

    if (oldTrails >= maxTrails) {
        throw TooManyRequestException("Max OTP trails has been reached")
    }

    const code = createOtp();
    await set({
        key: UserEmailKey({ email, subject }),
        value: await hash(code.toString()),
        ttl: expiresIn
    });

    const currentTrails = await incrBy({ key: UserEmailTrailsKey({ email , subject }) });

    if (currentTrails == maxTrails) {
        await expire({ key: UserEmailTrailsKey({ email , subject }) , ttl:blockInSeconds })
    }
    
    emailEvent.emit("sendEmail", { recipients: { to: email } , subject: EmailSubjectEnum.CONFIRM_EMAIL , data:{code, title: title ?? subject} })

}




export const signup = async({username , email , password , phone}) => {
    const duplicatedAccount = await findOne({
        model: UserModel,
        filter: { email },
        options: { select: "email" }
    })
    if (duplicatedAccount) throw ConflictException("Email Exist")
    
    
    
    const account = await createOne({
        model: UserModel,
        data: { 
            username,
            email,
            password: await hash(password),
            phone:await encryption(phone)
        }
    })

    await sendEmailOtp({ email , subject: EmailSubjectEnum.CONFIRM_EMAIL })
    
    return account
}



export const confirmEmail = async ({ otp, email }) => {
    const account = await findOne({
        model: UserModel,
        filter: { email, provider: ProviderEnum.SYSTEM, confirmEmail: { $exists: false } }
    })
    if (!account) throw NotfoundException("Invalid account")

    const hashOtp = await get({ key: UserEmailKey({ email, subject: EmailSubjectEnum.CONFIRM_EMAIL }), })
    if (!hashOtp || ! await compare(otp, hashOtp)) {
        throw ConflictException("Invalid OTP")
    }

    account.confirmEmail = new Date();
    await account.save();
    await del({ key: await keys({ prefix: UserEmailKey({ email, subject: EmailSubjectEnum.CONFIRM_EMAIL }) }) })
    return
}



export const resendConfirmEmail = async ({ email }) => {
    const account = await findOne({
        model: UserModel,
        filter: { email, provider: ProviderEnum.SYSTEM, confirmEmail: { $exists: false } }
    })
    if (!account) throw NotfoundException("Invalid account")

    await sendEmailOtp({ email , subject: EmailSubjectEnum.CONFIRM_EMAIL })
    
    return
}


export const requestForgotPasswordCode = async ({ email }) => {
    const account = await findOne({
        model: UserModel, filter: {
            email,
            provider: ProviderEnum.SYSTEM,
            confirmEmail: { $exists: true }
        }
    })
    if (!account) throw NotfoundException("Fail to find user account");
    await sendEmailOtp({ email, subject: EmailSubjectEnum.FORGET_PASSWORD })

    return;
}


export const verifyForgetPasswordCode = async ({ otp, email }) => {
    const account = await findOne({
        model: UserModel,
        filter: { email, provider: ProviderEnum.SYSTEM, confirmEmail: { $exists: true } }
    })
    if (!account) throw NotfoundException("Invalid account")

    const hashOtp = await get({ key: UserEmailKey({ email, subject: EmailSubjectEnum.FORGET_PASSWORD }), })
    if (!hashOtp || ! await compare(otp, hashOtp)) {
        throw ConflictException("Invalid OTP")
    }

    return account
}


export const resetForgotPassword = async ({ otp, email, password }) => {
  const account = await verifyForgetPasswordCode({ otp, email })
  account.password = await hash(password)
  account.changeCredentialsTime = new Date();
  await account.save();

  const result = await Promise.all([
    keys({ prefix: userBaseRevokeTokenKey({ userId: account._id }) }),
    keys({ prefix: UserEmailKey({ email, subject: EmailSubjectEnum.FORGET_PASSWORD }) })
  ])
  await del({
    key: [...result[0], ...result[1]]
  })

  return;
}


export const login = async({ email, password } , issuer) => {

      const account = await findOne({
        model: UserModel,
        filter: { email, provider: ProviderEnum.SYSTEM, confirmEmail: { $exists: true } },
        // options: { select: "-password" }
    })
    if (!account) {
        throw NotfoundException("Not Exist")
    }

    const match = await bcrypt.compare(password, account.password)

    if (!match) {
        throw NotfoundException("Not Exist")
    }

    return await createLoginCredentials({ user:account , issuer})
}