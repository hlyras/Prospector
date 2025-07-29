const router = require("express").Router();
const lib = require('jarmlib');

const Lead = require("../controller/lead/main");

router.post('/create', lib.route.toHttps, Lead.create);
router.post('/update', lib.route.toHttps, Lead.update);
router.post('/filter', lib.route.toHttps, Lead.filter);
router.delete('/delete/:id', lib.route.toHttps, Lead.delete);

module.exports = router;