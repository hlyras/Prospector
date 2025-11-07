const db = require('../../../config/connection_cotalogo');
const lib = require('jarmlib');

const UserPayment = function () {
  this.id;
  this.user_id;
  this.datetime;
  this.status;
  this.ip;
  this.payment_datetime;
  this.previous_balance;
  this.new_balance;
};

UserPayment.filter = (options) => {
  let { query, values } = new lib.Query().select()
    .props(options.props).table("cms_cotalogo.user_payment")
    .inners(options.inners)
    .period(options.period)
    .params(options.params)
    .strictParams(options.strict_params)
    .order(options.order_params)
    .limit(options.limit)
    .build();

  console.log(query, values);

  return db(query, values);
};

module.exports = UserPayment;