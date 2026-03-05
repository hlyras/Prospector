const ContactQueue = {};

ContactQueue.filter = async (queue) => {
  let response = await fetch("/contact/queue/filter", {
    method: "POST",
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(queue)
  });
  response = await response.json();

  if (API.verifyResponse(response)) { return false; };

  return response.queues;
};

ContactQueue.update = async (contact) => {
  let response = await fetch("/contact/queue/update", {
    method: "POST",
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(contact)
  });
  response = await response.json();

  if (API.verifyResponse(response)) { return false; };

  return response;
};

ContactQueue.delete = async (queue_id) => {
  let response = await fetch(`/contact/queue/delete/${queue_id}`, {
    method: "DELETE"
  });
  response = await response.json();

  if (API.verifyResponse(response)) { return false; };

  return response.done;
};