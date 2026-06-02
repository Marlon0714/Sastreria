module.exports = {
  addEventListener: jest.fn((callback) => {
    // Llama al callback inmediatamente con estado online
    callback({
      isConnected: true,
      isInternetReachable: true,
      type: "wifi",
      details: {},
    });
    // Retorna función de unsubscribe
    return jest.fn();
  }),
  fetch: jest.fn(() =>
    Promise.resolve({
      type: "wifi",
      isConnected: true,
      isInternetReachable: true,
      details: {},
    }),
  ),
  useNetInfo: () => ({
    isConnected: true,
    isInternetReachable: true,
    type: "wifi",
    details: {},
  }),
};
