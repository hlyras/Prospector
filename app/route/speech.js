const router = require("express").Router();
const lib = require('jarmlib');

const Speech = require("../controller/speech/main");

router.post('/create', lib.route.toHttps, Speech.create);
router.post('/filter', lib.route.toHttps, Speech.filter);
router.delete('/:id', lib.route.toHttps, Speech.delete);

module.exports = router;