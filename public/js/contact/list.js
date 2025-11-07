const ContactList = {};

ContactList.create = async (contact) => {
  let response = await fetch("/contact/list/create", {
    method: "POST",
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(contact)
  });
  response = await response.json();

  if (API.verifyResponse(response)) { return false; };

  return response;
};

ContactList.update = async (contact) => {
  let response = await fetch("/contact/list/update", {
    method: "POST",
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(contact)
  });
  response = await response.json();

  if (API.verifyResponse(response)) { return false; };

  return response;
};

ContactList.filter = async (contact) => {
  let response = await fetch("/contact/list/filter", {
    method: "POST",
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(contact)
  });
  response = await response.json();

  if (API.verifyResponse(response)) { return false; };

  return response;
};

ContactList.delete = async (contact_list_id) => {
  let response = await fetch(`/contact/list/delete/${contact_list_id}`, {
    method: "DELETE"
  });
  response = await response.json();

  if (API.verifyResponse(response)) { return false; };

  return response.done;
};