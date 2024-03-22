import { Router } from "express";
import { changeCurrentPassword, getCurrentUser, getUserChannelProfile, getUserWatchHistory, logOutUser, loginUser, refreshAcessToken, registerUser, updateAccountDetails, updateUserAvatar, updateUserCoverImage } from "../controller/user.controller.js";
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
router.route('/change-password').post(verifyJWT, changeCurrentPassword);
router.route('current-user').post(verifyJWT, getCurrentUser);
router.route('/update-account').patch(verifyJWT, updateAccountDetails);
router.route('/change-avatar').patch(verifyJWT, upload.single("avatar") ,updateUserAvatar);
router.route('cover-image').patch(verifyJWT,upload.single("coverImage"),updateUserCoverImage);
router.route('/channel/:username').get(verifyJWT,getUserChannelProfile);
router.route('/history').get(verifyJWT, getUserWatchHistory);

export default router;