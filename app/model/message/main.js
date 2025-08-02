const db = require('../../../config/connection');
const lib = require('jarmlib');

const Message = function () {
  this.id;
  this.key;
  this.origin; // P2P || GROUP
  this.content;

  this.create = () => {
    // if (!this.name) { return { err: "É necessário informar seu nome" }; }
    // if (this.phone.length < 14) { return { err: "O Telefone informado é inválido" }; }

    let obj = lib.convertTo.object(this);
    let { query, values } = lib.Query.save(obj, 'cms_prospector.message');

    return db(query, values);
  };

  this.update = () => {
    if (!this.phone) { return { err: "O id da tarefa é inválido" }; }

    let obj = lib.convertTo.object(this);
    let { query, values } = lib.Query.update(obj, 'cms_prospector.message', 'phone');

    return db(query, values);
  };
};

Message.filter = ({ props, inners, lefts, params, strict_params, in_params, order_params, limit }) => {
  let { query, values } = new lib.Query().select()
    .props(props)
    .table("cms_prospector.message")
    .inners(inners)
    .lefts(lefts)
    .params(params)
    .strictParams(strict_params)
    .inParams(in_params)
    .order(order_params)
    .limit(limit).build();
  return db(query, values);
};

Message.delete = ({ inners, params, strict_params }) => {
  let { query, values } = new lib.Query().delete()
    .table("cms_prospector.message")
    .inners(inners)
    .params(params)
    .strictParams(strict_params).build();
  return db(query, values);
}

module.exports = Message;