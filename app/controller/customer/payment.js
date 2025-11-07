let lib = require("jarmlib");

const CustomerPayment = require('../../model/customer/payment');

const customerPaymentController = {};

customerPaymentController.filter = async (req, res) => {
  console.log(req.user);
  console.log(req.body);

  if (!req.user) {
    return res.send({ unauthorized: "Você não tem acesso para realizar essa ação." });
  }

  try {
    let payment_options = {
      props: [
        "user_payment.*",
        "user.datetime user_datetime",
        "user.email",
        "user.business",
        "user.domain",
        "user.phone",
        "user.status user_status",
        "user.seller_status",
        "user.logo_url",
      ],
      inners: [
        ["cms_cotalogo.user", "user.id", "user_payment.user_id"]
      ],
      period: { key: "user_payment.payment_datetime", start: req.body.period_start, end: req.body.period_end },
      strict_params: { keys: [], values: [] },
      order_params: [["user_payment.payment_datetime", "ASC"]],
      limit: 1
    };
    lib.Query.fillParam('user.id', req.body.id, payment_options.strict_params);
    lib.Query.fillParam('user_payment.status', "Pago", payment_options.strict_params);

    let payments = await CustomerPayment.filter(payment_options);

    res.send(payments);
  } catch (err) {
    console.log(err);
    res.send({ msg: "Ocorreu um erro ao encontrar o usuário" });
  }
};

module.exports = customerPaymentController;