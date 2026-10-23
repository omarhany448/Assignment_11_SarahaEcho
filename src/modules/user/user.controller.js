import { Router } from "express";
import { fileValidation, localFileUpload, successResponse, processFile, processMulterUpload, uploadMiddleware } from "../../common/utils/index.js";
import { logout, profile, rotateToken, update } from "./user.service.js";
import { authentication, authorization } from "../../middleware/authentication.middleware.js";
import { TokenTypeEnum } from "../../common/enum/security.enum.js";
import { RoleEnum } from "../../common/enum/user.enum.js";

const router = Router()


router.patch(
    "/profile-image",
    authentication(),
    uploadMiddleware({
        multerMiddleware: localFileUpload({ maxFileSize: 2 }).single("attachment"),
        // .fields([{ name: "attachment", maxCount: 1 }, { name: "cover", maxCount: 2 }]),
        // .array("attachment" , 2),
        
        customPath: "users",
        validation: fileValidation.image
    }),
    async (req, res, next) => {
        console.log({ after: req.body });
        req.user.image = req.file.finalPath;
        await req.user.save()
        return successResponse({ res, data: { user: req.user } })
    }
)


router.get("/", authentication(), async (req, res, next) => {
    const data = await profile(req.user)
    return successResponse({ res, data })
})

router.patch("/", authentication(), authorization([RoleEnum.USER, RoleEnum.ADMIN]) , async (req, res, next) => {
    const data = await update(req.user, req.body)
    return successResponse({ res, data })
})


router.post("/rotate-token", authentication(TokenTypeEnum.REFRESH) , async (req, res, next) => {
    const data = await rotateToken(req.payload, req.user, `${req.protocol}://${req.host}`)
    return successResponse({ res, data })
})


router.post("/logout", authentication() , async (req, res, next) => {
    const data = await logout(req.payload, req.user, req.body)
    return successResponse({ res, data })
})

export default router