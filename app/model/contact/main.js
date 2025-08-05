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
    if (!this.jid) { return { err: "O telefone do contato é inválido" }; }

    let obj = lib.convertTo.object(this);
    let { query, values } = lib.Query.update(obj, 'cms_prospector.contact', 'jid');

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

Contact.findByJid = (jid) => {
  let { query, values } = new lib.Query().select()
    .props([
      "contact.*",
      "last_message.type last_message_type",
      "last_message.content last_message_content",
      "last_message.wa_id last_message_wa_id",
      "last_message.participant last_message_participant",
      "last_message.from_me last_message_from_me",
      "last_message.datetime last_message_datetime"
    ])
    .table("cms_prospector.contact")
    .lefts([["cms_prospector.message last_message",
      "last_message.jid", "contact.jid",
      "last_message.datetime", "(SELECT MAX(datetime) FROM cms_prospector.message WHERE message.jid = contact.jid)"
    ]])
    .strictParams({ keys: ["contact.jid"], values: [jid] })
    .build();
  console.log(query);
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