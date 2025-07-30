const Contact = {};

Contact.create = async (contact) => {
  let response = await fetch("/contact/create", {
    method: "POST",
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(contact)
  });
  response = await response.json();

  if (API.verifyResponse(response)) { return false; };

  return response;
};

Contact.update = async (contact) => {
  let response = await fetch("/contact/update", {
    method: "POST",
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(contact)
  });
  response = await response.json();

  if (API.verifyResponse(response)) { return false; };

  return response;
};

Contact.filter = async (contact) => {
  let response = await fetch("/contact/filter", {
    method: "POST",
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(contact)
  });
  response = await response.json();

  if (API.verifyResponse(response)) { return false; };

  return response.contacts;
};

Contact.delete = async (task_id) => {
  let response = await fetch(`/contact/delete/${task_id}`, {
    method: "DELETE"
  });
  response = await response.json();

  if (API.verifyResponse(response)) { return false; };

  return response.done;
};