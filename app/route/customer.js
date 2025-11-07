const router = require("express").Router();
const lib = require('jarmlib');

const multer = require("multer");

const upload = multer({ dest: "public/uploads/images" });

const Customer = require("../controller/customer/main");
const CustomerPayment = require("../controller/customer/payment");

router.post('/create', lib.route.toHttps, upload.single('file'), Customer.create);
router.post('/update', lib.route.toHttps, Customer.update);
router.post('/filter', lib.route.toHttps, Customer.filter);

router.post('/payment/filter', lib.route.toHttps, CustomerPayment.filter);

module.exports = router;