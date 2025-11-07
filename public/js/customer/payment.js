const CustomerPayment = {};

CustomerPayment.filter = async (payment_options) => {
  let response = await fetch("/customer/payment/filter", {
    method: "POST",
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payment_options)
  });
  response = await response.json();

  if (API.verifyResponse(response)) { return false; };

  return response;
};