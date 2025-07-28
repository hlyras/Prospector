const Messenger = {};

Messenger.qrcode = async () => {
    let response = await fetch("/qrcode", {
        method: "GET"
    });
    response = await response.json();

    if (API.verifyResponse(response)) { return false; };

    return response;
}