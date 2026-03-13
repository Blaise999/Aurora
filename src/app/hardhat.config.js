require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.24", // Make sure this matches your contract version
  networks: {
    // This is for your local "God Mode" testing
    hardhat: {
      chainId: 1337, 
    },
    // This allows your webapp to talk to the local node
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 1337,
    }
  },
};
