const db = require('../../../config/connection');
const lib = require('jarmlib');

const Queue = function () {
  this.id;
  this.contact_jid;
  this.message;

  this.create = () => {
    let obj = lib.convertTo.object(this);
    let { query, values } = lib.Query.save(obj, 'cms_prospector.queue');

    return db(query, values);
  };

  this.update = () => {
    let obj = lib.convertTo.object(this);
    let { query, values } = lib.Query.update(obj, 'cms_prospector.queue', 'id');

    return db(query, values);
  };
};

Queue.filter = ({ props, inners, lefts, params, strict_params, in_params, order_params, limit }) => {
  let { query, values } = new lib.Query().select()
    .props(props)
    .table("cms_prospector.queue")
    .inners(inners)
    .lefts(lefts)
    .params(params)
    .strictParams(strict_params)
    .inParams(in_params)
    .order(order_params)
    .limit(limit).build();
  return db(query, values);
};

module.exports = Queue;