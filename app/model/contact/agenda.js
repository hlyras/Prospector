const db = require('../../../config/connection');
const lib = require('jarmlib');

const ContactAgenda = function () {
  this.id;
  this.business;
  this.phone;
  this.name;
  this.autochat;

  this.create = () => {
    if (!this.status) { return { err: "É necessário informar seu nome" }; }
    if (!this.datetime) { return { err: "É necessário informar seu nome" }; }
    if (!this.contact_jid) { return { err: "É necessário informar seu nome" }; }
    if (!this.content) { return { err: "É necessário informar seu nome" }; }

    let obj = lib.convertTo.object(this);
    let { query, values } = lib.Query.save(obj, 'cms_prospector.contact_agenda');

    return db(query, values);
  };

  this.update = () => {
    if (!this.id) { return { err: "O telefone do contato é inválido" }; }

    let obj = lib.convertTo.object(this);
    let { query, values } = lib.Query.update(obj, 'cms_prospector.contact_agenda', 'id');

    return db(query, values);
  };
};

ContactAgenda.filter = ({ props, inners, lefts, period, params, strict_params, order_params }) => {
  let { query, values } = new lib.Query().select()
    .props(props)
    .table("cms_prospector.contact_agenda")
    .inners(inners)
    .lefts(lefts)
    .period(period)
    .params(params)
    .strictParams(strict_params)
    .order(order_params).build();
  return db(query, values);
};

ContactAgenda.delete = ({ inners, params, strict_params }) => {
  let { query, values } = new lib.Query().delete()
    .table("cms_prospector.contact_agenda")
    .inners(inners)
    .params(params)
    .strictParams(strict_params).build();
  return db(query, values);
};

module.exports = ContactAgenda;