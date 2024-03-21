import { Router } from "express";
import { logOutUser, loginUser, refreshAcessToken, registerUser } from "../controller/user.controller.js";
import {upload} from "../middleware/multer.middleware.js";
import { verifyJWT } from "../middleware/auth.middleware.js";
const router = Router();

router.route('/register').post(
    upload.fields([
        {
            name:'avatar',
            maxCount: 1
        },
        {
            name:'coverImage',
            maxCount: 1
        }
    ]),
    registerUser
);
router.route('/login').post(loginUser);

//* secured routes
router.route('/logout').post(verifyJWT, logOutUser);
router.route('/logout').post( refreshAcessToken);

export default router;