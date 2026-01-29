const ContactAgenda = {};

ContactAgenda.create = async (contact) => {
  let response = await fetch("/contact/agenda/create", {
    method: "POST",
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(contact)
  });
  response = await response.json();

  if (API.verifyResponse(response)) { return false; };

  return response;
};

ContactAgenda.update = async (contact) => {
  let response = await fetch("/contact/agenda/update", {
    method: "POST",
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(contact)
  });
  response = await response.json();

  if (API.verifyResponse(response)) { return false; };

  return response;
};

ContactAgenda.filter = async (contact) => {
  let response = await fetch("/contact/agenda/filter", {
    method: "POST",
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(contact)
  });
  response = await response.json();

  if (API.verifyResponse(response)) { return false; };

  return response;
};

ContactAgenda.delete = async (contact_agenda_id) => {
  let response = await fetch(`/contact/agenda/delete/${contact_agenda_id}`, {
    method: "DELETE"
  });
  response = await response.json();

  if (API.verifyResponse(response)) { return false; };

  return response.done;
};