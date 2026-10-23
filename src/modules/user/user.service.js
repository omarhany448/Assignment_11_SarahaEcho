import jwt from "jsonwebtoken";
import { findById } from "../../common/repository/base.repository.js";
import { findByIdAndUpdate } from "../../common/repository/base.repository.js";
import { UserModel } from "../../DB/model/user.model.js";
import { createLoginCredentials, createRevokeToken, verifyToken } from "../../common/security/token.security.js";
import { ACCESS_TOKEN_EXPIRES_IN, REFRESH_TOKEN_EXPIRES_IN } from "../../config.js";
import { ConflictException } from "../../common/exceptions/error.exceptions.js";
import { set } from "../../common/services/index.js"
import { LogoutEnum } from "../../common/enum/security.enum.js";

export const profile = async (account) => {
    return account
}

export const update = async (user, data) => {

    const account = await findByIdAndUpdate({
        model: UserModel,
        id: user._id,
        update: data
    })
    return account

}



export const rotateToken = async (payload, user, issuer) => {
  console.log({ payload, user });
  const expireAccessAt = (payload.iat + ACCESS_TOKEN_EXPIRES_IN) * 1000;
  const currentTime = Date.now() + (5 * 60000)
  if (currentTime < expireAccessAt) {
    throw ConflictException("Sorry we cannot create new login credentials while current credentials still within valid period")
  }
  const data = await createLoginCredentials({ user, issuer })
  await createRevokeToken({ payload });
  return data
}


export const logout = async (payload, user, { action = LogoutEnum.DEVICE }) => {

  switch (action) {
    case LogoutEnum.ALL:
      user.changeCredentialsTime = new Date();
      await user.save()
      await del({ key: await keys({ prefix: userBaseRevokeTokenKey({ userId: payload.sub }) }) })
      break;
    default:
      await createRevokeToken({ payload })
      break;
  }
  return

}