const CustomerImage = {};

CustomerImage.generate = async (prompt) => {
  const response = await fetch("/customer/image/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });

  const data = await response.json();
  if (API.verifyResponse(data)) return false;

  return data;
};

CustomerImage.edit = async (file, prompt) => {
  const formData = new FormData();
  formData.append("image", file);
  formData.append("prompt", prompt);

  const response = await fetch("/customer/image/edit", {
    method: "POST",
    body: formData,
  });

  const data = await response.json();
  if (API.verifyResponse(data)) return false;

  return data;
};

CustomerImage.variations = async (file) => {
  const formData = new FormData();
  formData.append("image", file);

  const response = await fetch("/customer/image/variations", {
    method: "POST",
    body: formData,
  });

  const data = await response.json();
  if (API.verifyResponse(data)) return false;

  return data;
};