const Lead = {};

Lead.create = async (lead) => {
  let response = await fetch("/lead/create", {
    method: "POST",
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(lead)
  });
  response = await response.json();

  if (API.verifyResponse(response)) { return false; };

  return response;
};

Lead.update = async (lead) => {
  let response = await fetch("/lead/update", {
    method: "POST",
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(lead)
  });
  response = await response.json();

  if (API.verifyResponse(response)) { return false; };

  return response;
};

Lead.filter = async (lead) => {
  let response = await fetch("/lead/filter", {
    method: "POST",
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(lead)
  });
  response = await response.json();

  if (API.verifyResponse(response)) { return false; };

  return response.tasks;
};

Lead.delete = async (task_id) => {
  let response = await fetch(`/lead/delete/${task_id}`, {
    method: "DELETE"
  });
  response = await response.json();

  if (API.verifyResponse(response)) { return false; };

  return response.done;
};