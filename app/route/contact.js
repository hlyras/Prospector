const router = require("express").Router();
const lib = require('jarmlib');

const Contact = require("../controller/contact/main");
const ContactList = require("../controller/contact/list");
const ContactMap = require("../controller/contact/map");
const ContactAgenda = require("../controller/contact/agenda");

router.post('/create', lib.route.toHttps, Contact.create);
router.post('/prospect', lib.route.toHttps, Contact.prospect);
router.post('/update', lib.route.toHttps, Contact.update);
router.post('/filter', lib.route.toHttps, Contact.filter);
router.delete('/delete/:id', lib.route.toHttps, Contact.delete);

ContactList.queue();
router.post('/list/create', lib.route.toHttps, ContactList.create);
router.post('/list/send', lib.route.toHttps, ContactList.send);
router.post('/list/filter', lib.route.toHttps, ContactList.filter);
router.post('/list/check', lib.route.toHttps, ContactList.check);
router.post('/map/filter', lib.route.toHttps, ContactMap.filter);

router.post('/agenda/create', lib.route.toHttps, ContactAgenda.create);
// router.post('/agenda/update', lib.route.toHttps, ContactList.update);
router.post('/agenda/filter', lib.route.toHttps, ContactAgenda.filter);
// router.delete('/agenda/delete/:id', lib.route.toHttps, ContactList.delete);

module.exports = router;