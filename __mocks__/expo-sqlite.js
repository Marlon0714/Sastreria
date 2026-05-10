module.exports = {
  openDatabaseSync: jest.fn(() => ({
    transactionSync: jest.fn(),
    execSync: jest.fn(),
    closeSync: jest.fn(),
  })),
};
