const db = require('../../../config/connection_cotalogo');
const lib = require('jarmlib');

const Catalog = function () {
  this.id;
  this.user_id;
  this.url;

  this.create = () => {
    if (!this.user_id) { return { err: "Usuário inválido" }; }
    if (!this.url || this.url.length < 1 || this.url.length > 30) { return { err: "URL inválida" }; }

    let obj = lib.convertTo.object(this);

    let { query, values } = lib.Query.save(obj, 'cms_cotalogo.catalog');
    return db(query, values);
  };

  this.update = () => {
    if (!this.id) { return { err: "O id do produto é inválido" }; }

    let obj = lib.convertTo.object(this);
    let { query, values } = lib.Query.update(obj, 'cms_cotalogo.catalog', 'id');

    return db(query, values);
  };
};

Catalog.findByUserId = async (user_id) => {
  let query = `SELECT * FROM cms_cotalogo.catalog WHERE user_id = ?;`;
  return db(query, [user_id]);
};

Catalog.findById = (id) => {
  let query = `SELECT * FROM cms_cotalogo.catalog WHERE id = ?`;
  return db(query, [id]);
};

Catalog.filter = (options) => {
  let { query, values } = new lib.Query().select()
    .props(options.props)
    .table("cms_cotalogo.catalog")
    .inners(options.inners)
    .lefts(options.lefts)
    .params(options.params)
    .strictParams(options.strict_params)
    .order(options.order_params)
    .build();
  return db(query, values);
};

Catalog.delete = async (id) => {
  let query = `DELETE FROM cms_cotalogo.catalog WHERE id = ?;`;
  return db(query, [id]);
};

module.exports = Catalog;