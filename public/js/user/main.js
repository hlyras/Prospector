const User = {};

User.session = async (user_options) => {
  let response = await fetch("/user/session", {
    method: "POST",
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(user_options)
  });
  response = await response.json();

  if (API.verifyResponse(response)) { return false; };

  return response;
};

User.connect = async (user_options) => {
  let response = await fetch("/user/connect", {
    method: "POST",
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(user_options)
  });
  response = await response.json();

  if (API.verifyResponse(response)) { return false; };

  return response;
};

User.disconnect = async (user_options) => {
  let response = await fetch("/user/disconnect", {
    method: "POST",
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(user_options)
  });
  response = await response.json();

  if (API.verifyResponse(response)) { return false; };

  return response;
};

User.filter = async (user_options) => {
  let response = await fetch("/user/filter", {
    method: "POST",
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(user_options)
  });
  response = await response.json();

  if (API.verifyResponse(response)) { return false; };

  return response;
};