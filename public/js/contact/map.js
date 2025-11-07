const ContactMap = {};

ContactMap.create = async (map) => {
  let response = await fetch("/contact/map/create", {
    method: "POST",
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(map)
  });
  response = await response.json();

  if (API.verifyResponse(response)) { return false; };

  return response;
};

ContactMap.filter = async (map) => {
  let response = await fetch("/contact/map/filter", {
    method: "POST",
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(map)
  });
  response = await response.json();

  if (API.verifyResponse(response)) { return false; };

  return response;
};