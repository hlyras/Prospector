const Message = {};

Message.send = async (message) => {
  let response = await fetch("/message/send", {
    method: "POST",
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(message)
  });
  response = await response.json();

  if (API.verifyResponse(response)) { return false; };

  return response;
};

Message.update = async (message) => {
  let response = await fetch("/message/update", {
    method: "POST",
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(message)
  });
  response = await response.json();

  if (API.verifyResponse(response)) { return false; };

  return response;
};

Message.filter = async (message) => {
  let response = await fetch("/message/filter", {
    method: "POST",
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(message)
  });
  response = await response.json();

  if (API.verifyResponse(response)) { return false; };

  return response;
};

Message.delete = async (task_id) => {
  let response = await fetch(`/message/delete/${task_id}`, {
    method: "DELETE"
  });
  response = await response.json();

  if (API.verifyResponse(response)) { return false; };

  return response.done;
};