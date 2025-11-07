const db = require('../../../config/connection');
const lib = require('jarmlib');

const ContactMap = function () {
  this.id;
  this.datetime;
  this.cidade;
  this.bairro;
  this.uf;

  this.create = () => {
    if (!this.datetime) { return { err: "É necessário informar a data" }; }
    if (!this.cidade) { return { err: "É necessário informar a cidade" }; }
    if (!this.bairro) { return { err: "É necessário informar o bairro" }; }
    if (!this.uf) { return { err: "É necessário informar o estado/uf" }; }

    let obj = lib.convertTo.object(this);
    let { query, values } = lib.Query.save(obj, 'cms_prospector.contact_map');

    return db(query, values);
  };

  this.update = () => {
    if (!this.id) { return { err: "O telefone do contato é inválido" }; }

    let obj = lib.convertTo.object(this);
    let { query, values } = lib.Query.update(obj, 'cms_prospector.contact_map', 'id');

    return db(query, values);
  };
};

ContactMap.filter = ({ props, inners, lefts, period, params, strict_params, order_params }) => {
  let { query, values } = new lib.Query().select()
    .props(props)
    .table("cms_prospector.contact_map")
    .inners(inners)
    .lefts(lefts)
    .period(period)
    .params(params)
    .strictParams(strict_params)
    .order(order_params).build();
  return db(query, values);
};

ContactMap.delete = ({ inners, params, strict_params }) => {
  let { query, values } = new lib.Query().delete()
    .table("cms_prospector.contact_map")
    .inners(inners)
    .params(params)
    .strictParams(strict_params).build();
  return db(query, values);
}

module.exports = ContactMap;