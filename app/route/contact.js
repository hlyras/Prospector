const router = require("express").Router();
const lib = require('jarmlib');

const Contact = require("../controller/contact/main");

router.post('/create', lib.route.toHttps, Contact.create);
router.post('/update', lib.route.toHttps, Contact.update);
router.post('/filter', lib.route.toHttps, Contact.filter);
router.delete('/delete/:id', lib.route.toHttps, Contact.delete);

module.exports = router;