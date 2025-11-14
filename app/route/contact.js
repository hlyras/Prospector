const router = require("express").Router();
const lib = require('jarmlib');

const Contact = require("../controller/contact/main");
const ContactList = require("../controller/contact/list");
const ContactMap = require("../controller/contact/map");

router.post('/create', lib.route.toHttps, Contact.create);
router.post('/prospect', lib.route.toHttps, Contact.prospect);
router.post('/update', lib.route.toHttps, Contact.update);
router.post('/filter', lib.route.toHttps, Contact.filter);
router.delete('/delete/:id', lib.route.toHttps, Contact.delete);

router.post('/list/create', lib.route.toHttps, ContactList.create);
router.post('/list/send', lib.route.toHttps, ContactList.send);
router.post('/list/filter', lib.route.toHttps, ContactList.filter);
router.post('/list/check', lib.route.toHttps, ContactList.check);

router.post('/map/filter', lib.route.toHttps, ContactMap.filter);

module.exports = router;