const router = require("express").Router();
const lib = require('jarmlib');

const passport = require('../../config/passport');
const User = require("../controller/user/main");

router.get("/login", lib.route.toHttps, User.login);
router.post('/login', lib.route.toHttps, passport.authenticate('local', { successRedirect: '/', failureRedirect: '/user/login' }));

router.get("/logout", lib.route.toHttps, User.logout);

module.exports = router;