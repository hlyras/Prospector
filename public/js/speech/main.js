const Speech = {};

Speech.create = async (speech) => {
  let response = await fetch("/speech/create", {
    method: "POST",
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(speech)
  });
  response = await response.json();

  if (API.verifyResponse(response)) { return false; };

  return response;
};

Speech.filter = async (speech) => {
  let response = await fetch("/speech/filter", {
    method: "POST",
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(speech)
  });
  response = await response.json();

  if (API.verifyResponse(response)) { return false; };

  return response.speechs;
};

Speech.delete = async (speech_id) => {
  let response = await fetch(`/speech/${speech_id}`, {
    method: "DELETE"
  });
  response = await response.json();

  if (API.verifyResponse(response)) { return false; };

  return response.done;
};