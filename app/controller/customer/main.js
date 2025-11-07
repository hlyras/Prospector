let lib = require("jarmlib");
const { uploadFileS3, deleteFileS3 } = require("../../middleware/s3/main");
const path = require("path");
const fs = require("fs");

const Customer = require('../../model/customer/main');
const Catalog = require('../../model/customer/catalog');

const { compressImage } = require('../../middleware/sharp/main');

const customerController = {};

customerController.create = async (req, res) => {
  if (!req.user?.id) {
    return res.send({ msg: "Você não tem permissão para realizar essa ação." });
  }

  try {
    let customer = new Customer();
    customer.datetime = lib.date.timestamp.generate();
    customer.business = req.body.business;
    customer.email = req.body.email;
    customer.domain = req.body.domain;
    customer.password = req.body.password;
    customer.color = req.body.color;
    customer.secondary_color = req.body.secondary_color;
    customer.access = "adm";
    customer.balance = 0;
    customer.status = "Ativo";

    if ((await Customer.findByEmail(customer.email)).length) { return res.send({ msg: 'Este E-mail já está sendo utilizado.' }); }
    if ((await Customer.findByDomain(customer.domain)).length) { return res.send({ msg: 'Este domínio já está sendo utilizado.' }); }

    const webpPath = await compressImage(req.file);
    const fileName = path.basename(webpPath);
    let imageData = await uploadFileS3(webpPath, fileName, 'webp');
    fs.promises.unlink(webpPath);

    customer.logo_etag = imageData.ETag.replaceAll(`"`, "");
    customer.logo_url = imageData.Location;
    customer.logo_keycode = imageData.Key;
    customer.seller_id = req.user.id;
    customer.seller_status = "Demonstração";

    let customer_create = await customer.create();
    if (customer_create.err) { return res.send({ msg: customer_create.err }); }

    customer.id = customer_create.insertId;

    let catalog = new Catalog();
    catalog.user_id = customer.id;
    catalog.url = '/';

    let catalog_response = await catalog.create();
    if (catalog_response.err) { return res.send({ msg: catalog_response.err }); }

    return res.send({ done: "Criado com sucesso" });
  } catch (err) {
    console.log(err);
    res.send({ msg: 'Ocorreu um erro ao excluir a imagem.' });
  }
};

customerController.update = async (req, res) => {
  if (!req.user?.id) {
    return res.send({ msg: "Você não tem permissão para realizar essa ação." });
  }

  try {
    let customers = await Customer.filter({
      strict_params: {
        keys: ["id"],
        values: [req.body.id]
      }
    });

    if (!customers.length) {
      return res.send({ msg: "Usuário não encontrado." });
    }

    if (customers[0].id != req.body.id) {
      return res.send({ msg: "Usuário inválido." });
    }

    if (customers[0].seller_status != "Demonstração") {
      return res.send({ msg: "Status inválido." });
    }

    if (customers[0].seller_id != req.user.id) {
      return res.send({ msg: "Vendedor inválido." });
    }

    let customer = new Customer();
    customer.id = req.body.id;
    customer.email = req.body.email;
    customer.balance = 0;
    customer.status = "Inativo";
    customer.seller_status = "Pendente";

    let customer_create = await customer.update();
    if (customer_create.err) { return res.send({ msg: customer_create.err }); }

    return res.send({ done: "Atualizado com sucesso" });
  } catch (err) {
    console.log(err);
    res.send({ msg: 'Ocorreu um erro ao excluir a imagem.' });
  }
};

customerController.filter = async (req, res) => {
  if (!req.user?.id) {
    return res.send({ msg: "Você não tem permissão para realizar essa ação." });
  }

  try {
    let customer_options = {
      props: [],
      period: { key: "user.datetime", start: req.body.period_start, end: req.body.period_end },
      strict_params: { keys: [], values: [] },
    };

    lib.Query.fillParam("user.business", req.body.business, customer_options.strict_params);
    lib.Query.fillParam("user.seller_status", req.body.seller_status, customer_options.strict_params);
    lib.Query.fillParam("user.seller_id", req.user.id, customer_options.strict_params);
    let customers = await Customer.filter(customer_options);

    res.send(customers);
  } catch (error) {
    console.log(error);
    res.send({ msg: "Ocorreu um erro ao filtrar os contatos" });
  }
};

module.exports = customerController;