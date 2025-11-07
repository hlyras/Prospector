const Customer = {};

Customer.create = async (customer) => {
  let response = await fetch("/customer/create", {
    method: "POST",
    body: customer
  });
  response = await response.json();

  if (API.verifyResponse(response)) { return false; };

  return response.done;
};

Customer.update = async (customer) => {
  let response = await fetch("/customer/update", {
    method: "POST",
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(customer)
  });
  response = await response.json();

  if (API.verifyResponse(response)) { return false; };

  return response.done;
};

Customer.filter = async (customer_options) => {
  let response = await fetch("/customer/filter", {
    method: "POST",
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(customer_options)
  });
  response = await response.json();

  if (API.verifyResponse(response)) { return false; };

  return response;
};

Customer.update = async (message) => {
  let response = await fetch("/customer/update", {
    method: "POST",
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(message)
  });
  response = await response.json();

  if (API.verifyResponse(response)) { return false; };

  return response;
};