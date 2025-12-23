const db = require('../../../config/connection');
const lib = require('jarmlib');

const Speech = function () {
  this.id;
  this.content;
  this.url;
  this.voice;

  this.create = () => {
    let obj = lib.convertTo.object(this);
    let { query, values } = lib.Query.save(obj, 'cms_prospector.speech');

    return db(query, values);
  };

  this.update = () => {
    let obj = lib.convertTo.object(this);
    let { query, values } = lib.Query.update(obj, 'cms_prospector.speech', 'id');

    return db(query, values);
  };
};

Speech.filter = ({ props, inners, lefts, params, strict_params, in_params, order_params, limit }) => {
  let { query, values } = new lib.Query().select()
    .props(props)
    .table("cms_prospector.speech")
    .inners(inners)
    .lefts(lefts)
    .params(params)
    .strictParams(strict_params)
    .inParams(in_params)
    .order(order_params)
    .limit(limit).build();
  return db(query, values);
};

Speech.delete = (id) => {
  let query = `DELETE FROM cms_prospector.speech WHERE id = ?;`
  return db(query, id);
};

module.exports = Speech;