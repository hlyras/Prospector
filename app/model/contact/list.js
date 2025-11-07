const db = require('../../../config/connection');
const lib = require('jarmlib');

const ContactList = function () {
  this.id;
  this.business;
  this.phone;
  this.name;
  this.autochat;

  this.create = () => {
    // if (!this.name) { return { err: "É necessário informar seu nome" }; }
    // if (this.phone.length < 14) { return { err: "O Telefone informado é inválido" }; }

    let obj = lib.convertTo.object(this);
    let { query, values } = lib.Query.save(obj, 'cms_prospector.contact_list');

    return db(query, values);
  };

  this.update = () => {
    if (!this.jid) { return { err: "O telefone do contato é inválido" }; }

    let obj = lib.convertTo.object(this);
    let { query, values } = lib.Query.update(obj, 'cms_prospector.contact_list', 'jid');

    return db(query, values);
  };
};

ContactList.filter = ({ props, inners, lefts, period, params, strict_params, order_params }) => {
  let { query, values } = new lib.Query().select()
    .props(props)
    .table("cms_prospector.contact_list")
    .inners(inners)
    .lefts(lefts)
    .period(period)
    .params(params)
    .strictParams(strict_params)
    .order(order_params).build();
  return db(query, values);
};

ContactList.findByJid = (jid) => {
  let { query, values } = new lib.Query().select()
    .props([
      "contact_list.*"
    ])
    .table("cms_prospector.contact_list")
    .lefts([])
    .strictParams({ keys: ["contact_list.jid"], values: [jid] })
    .build();
  return db(query, values);
};

ContactList.delete = ({ inners, params, strict_params }) => {
  let { query, values } = new lib.Query().delete()
    .table("cms_prospector.contact_list")
    .inners(inners)
    .params(params)
    .strictParams(strict_params).build();
  return db(query, values);
}

module.exports = ContactList;