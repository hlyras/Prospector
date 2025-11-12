const router = require("express").Router();
const lib = require('jarmlib');

const passport = require('../../config/passport');
const User = require("../controller/user/main");

router.get("/login", lib.route.toHttps, User.login);
router.post('/login', lib.route.toHttps, passport.authenticate('local', { successRedirect: '/', failureRedirect: '/user/login' }));
router.get("/logout", lib.route.toHttps, User.logout);

router.post("/session", lib.route.toHttps, User.session);
router.post("/connect", lib.route.toHttps, User.connect);
router.post("/disconnect", lib.route.toHttps, User.disconnect);

router.post("/filter", lib.route.toHttps, User.filter);

module.exports = router;