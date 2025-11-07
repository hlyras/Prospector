// const User = require("../model/user/main");
const lib = require('jarmlib');

const userController = {};

userController.login = (req, res) => {
  if (req.user) { return res.redirect("/"); }

  res.render('user/login/index', {
    user: req.user,
    message: req.flash('loginMessage')
  });
};

userController.logout = (req, res) => {
  req.logout(function (err) {
    res.redirect('/user/login');
  });
};

module.exports = userController;