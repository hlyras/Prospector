function getProfilePicWithTimeout(waSocket, jid, timeout = 5000) {
  return Promise.race([
    waSocket.profilePictureUrl(jid, 'image'),
    new Promise((resolve) =>
      setTimeout(() => resolve(null), timeout)
    )
  ]);
};

module.exports = {
  getProfilePicWithTimeout
};