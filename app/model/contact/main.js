const db = require('../../../config/connection');
const lib = require('jarmlib');

const Contact = function () {
  this.id;
  this.business;
  this.phone;
  this.name;
  this.autochat;

  this.create = () => {
    // if (!this.name) { return { err: "É necessário informar seu nome" }; }
    // if (this.phone.length < 14) { return { err: "O Telefone informado é inválido" }; }

    let obj = lib.convertTo.object(this);
    let { query, values } = lib.Query.save(obj, 'cms_prospector.contact');

    return db(query, values);
  };

  this.update = () => {
    if (!this.phone) { return { err: "O telefone do contato é inválido" }; }

    let obj = lib.convertTo.object(this);
    let { query, values } = lib.Query.update(obj, 'cms_prospector.contact', 'phone');

    return db(query, values);
  };
};

Contact.filter = ({ props, inners, lefts, params, strict_params, order_params }) => {
  let { query, values } = new lib.Query().select()
    .props(props)
    .table("cms_prospector.contact")
    .inners(inners)
    .lefts(lefts)
    .params(params)
    .strictParams(strict_params)
    .order(order_params).build();
  return db(query, values);
};

Contact.delete = ({ inners, params, strict_params }) => {
  let { query, values } = new lib.Query().delete()
    .table("cms_prospector.contact")
    .inners(inners)
    .params(params)
    .strictParams(strict_params).build();
  return db(query, values);
}

module.exports = Contact;