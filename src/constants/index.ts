import { arbitrum, evmos, mainnet, optimism } from "viem/chains";

import { Address } from "viem";
import { stringToHex } from "viem";
import { default as vestingToBeneficiaryContracts } from "./vestingContracts";

export const POOL_REGISTRY_NAME = stringToHex("PoolRegistry", { size: 32 });
export const CHILD_GAUGE_FACTORY_NAME = stringToHex("ChildGaugeFactory", {
  size: 32,
});

export { default as etherscanMevBots } from "./mevbots";
export { default as vestingToBeneficiaryContracts } from "./vestingContracts";
export { saddleCreators } from "./nftHolders";
export { delosSigners } from "./delosSigners";

export const BI_1e18 = 10n ** 18n;
export const ADDRESSES: {
  [chainId: number]: {
    [contract: string]: Address;
  };
} = {
  [mainnet.id]: {
    sdl: "0xf1Dc500FdE233A4055e25e5BbF516372BC4F6871",
    vesdl: "0xD2751CdBED54B87777E805be36670D7aeAe73bb2",
    retroVesting: "0x5DCA270671935cf3dF78bd8373C22BE250198a03",
    slp: "0x0C6F06b32E6Ae0C110861b8607e67dA594781961",
    slpGauge: "0xc64F8A9fe7BabecA66D3997C9d15558BF4817bE3",
    sushiMasterchef: "0xEF0881eC094552b2e128Cf945EF17a6752B4Ec5d",
    masterRegistry: "0xc5ad17b98D7fe73B6dD3b0df5b3040457E68C045",
    minichef: "0x691ef79e40d909C715BE5e9e93738B3fF7D58534",
    gaugeMinter: "0x358fE82370a1B9aDaE2E3ad69D6cF9e503c96018",
    gaugeController: "0x99Cb6c36816dE2131eF2626bb5dEF7E5cc8b9B14",
    uniV3Positions: "0xC36442b4a4522E871399CD717aBDD847Ab11FE88",
  },
  [arbitrum.id]: {
    sdl: "0x75C9bC761d88f70156DAf83aa010E84680baF131",
    masterRegistry: "0xaB94A2c0D8F044AA439A5654f06b5797928396cF",
    minichef: "0x2069043d7556B1207a505eb459D18d908DF29b55",
    childGaugeFactory: "0x19a5Ec09eE74f64573ac53f48A48616CE943C047",
    uniV3Positions: "0xC36442b4a4522E871399CD717aBDD847Ab11FE88",
  },
  [optimism.id]: {
    sdl: "0xAe31207aC34423C41576Ff59BFB4E036150f9cF7",
    masterRegistry: "0x0E510c9b20a5D136E75f7FD2a5F344BD98f9d875",
    minichef: "0x220d6bEedeA6a6317DaE19d39cd62EB7bb0ae5e4",
    childGaugeFactory: "0x19a5Ec09eE74f64573ac53f48A48616CE943C047",
    uniV3Positions: "0xC36442b4a4522E871399CD717aBDD847Ab11FE88",
  },
  [evmos.id]: {
    sdl: "0x3344e55C6DDE2A01F4ED893f97bAC1f99EC24f8B",
  },
};

export const EXCLUSION_LIST: { [chainId: number]: Address[] } = {
  [mainnet.id]: [
    "0x5DFbCeea7A5F6556356C7A66d2A43332755D68A5", // Saddle Treasury
    "0x3F8E527aF4e0c6e763e8f368AC679c44C45626aE", // Saddle Multisig
    "0x4802CedbDF865382dbaED8D5e41a65C8AB840676", // Saddle ops multisig
    "0x5DCA270671935cf3dF78bd8373C22BE250198a03", // Saddle retrovesting contract
    "0x87f194b4175d415E399E5a77fCfdFA66040199b6", // Saddle grants multisig
    "0x03D319a9921474B9cdE1fff1DBaFba778f9eFEb0", // Delos Multisig
    "0x75e89d5979E4f6Fba9F97c104c2F0AFB3F1dcB88", // MEXC CEX
    "0xf16E9B0D03470827A95CDfd0Cb8a8A3b46969B91", // Kucoin CEX
    "0x99C9fc46f92E8a1c0deC1b1747d010903E884bE1", // Optimism Gateway
    "0xa3A7B6F88361F48403514059F1F16C8E78d60EeC", // Arbitrum Gateway
    "0x27182842E098f60e3D576794A5bFFb0777E025d3", // Euler
    "0xBC8021015db2ca0599e0692d63ae6B91564cf026", // EulerClaims
    "0x4ba5B41c4378966f08E3E4F7dd80840191D54C69", // Incite multisig address
    "0xc7b10D3B08CEB05d8ff58a3c781225D9a72078Ae", // veSDL Rewards
    "0xa4B86BcbB18639D8e708d6163a0c734aFcDB770c", // NoMad Recover
    "0x46866D274E6D9015c5FDc098CE270803e11e3eF4", // SwapMigrator
    "0x00000000009726632680FB29d3F7A9734E3010E2", // rainbow.me router
    "0xD5B927956057075377263aaB7f8AfC12F85100dB", // Paraswap
    "0x0b139682D5C9Df3e735063f46Fb98c689540Cf3A", // redacted
    "0xfFc026655b71147784f1CCd9D410c5Bc11d41cEF", // Pickle Finance Strategy
    "0xCCB26b5CC4e1Ce29521DA281a0107A6672bfe099", // Frax Swap pair
    "0x6E399F1d376237aE705DD015894fC3FB559521b4", // Unknown contract without payable function
    "0x2d5D79753bB8e02ca1ce8EcE0aa55288F8c8d840", // Generalized swap migrator
    "0x0535f1f43Ee274123291bbAB284948CAED46C65D", // nestedfi.eth reserve
    ...Object.values(ADDRESSES[mainnet.id]),
    ...(Object.keys(vestingToBeneficiaryContracts) as Address[]),
  ],
  [arbitrum.id]: [
    "0x6d9b26C25993358dCa0ABE9BF6A26Ddb18583200", // Saddle ops multisig
    "0x8e6e84DDab9d13A17806d34B097102605454D147", // Saddle multisig
    "0x9E233DD6a90678BaaCd89c05ce5C48f43fCc106E", // ClipperCoves
    "0x00000000009726632680FB29d3F7A9734E3010E2", // rainbow.me router
    "0xD5B927956057075377263aaB7f8AfC12F85100dB", // Paraswap
    "0x0b139682D5C9Df3e735063f46Fb98c689540Cf3A", // redacted
    ...Object.values(ADDRESSES[arbitrum.id]),
  ],
  [optimism.id]: [
    ...Object.values(ADDRESSES[optimism.id]),
    "0x00000000009726632680FB29d3F7A9734E3010E2", // rainbow.me router
    "0xD5B927956057075377263aaB7f8AfC12F85100dB", // Paraswap
    "0x0b139682D5C9Df3e735063f46Fb98c689540Cf3A", // redacted
  ],
};

export const REMAPPING: { [address: Address]: Address } = {
  "0x851aBEf4d67E8bb4eE2f90E5dE5e880f6235d028":
    "0x7e108711771DfdB10743F016D46d75A9379cA043", // Eth: Alchemix SDL controller -> Arbitrum Alchemix dev multisig
  "0x886f2d09909CaA489c745927E200AFd5aF198444":
    "0xb56e5620A79cfe59aF7c0FcaE95aADbEA8ac32A1", // Arb: Sperax's custom contract for holding gauge tokens -> Sperax multisig
  "0xaa4D101eFD2F57dd9E3767F2b850417E7744367e":
    "0xb56e5620A79cfe59aF7c0FcaE95aADbEA8ac32A1", // Arb: Sperax's unknown contract -> Sperax multisig
  "0x634EAbE7C03Bcf701a5FF3C0510E9AcB2d5F5196":
    "0x5318f07A3a20A2f8bb0DDf14F1DD58C517a76508", // Eth: L2DAO -> Arbitrum L2DAO
};

export const CHAIN_ASSIGNMENT: { [address: Address]: number } = {
  "0x5318f07A3a20A2f8bb0DDf14F1DD58C517a76508": arbitrum.id, // Arbitrum L2DAO
  "0x53AB8F38EE493d88553Ea6c2766d574E404e249B": mainnet.id,
  "0x461aa63A98e6f8BdAa19CA3f2258670E794FFF34": mainnet.id,
  "0x67E3ea119E141406c37e2CA783b749Fe1437673f": mainnet.id,
  "0x3dFc49e5112005179Da613BdE5973229082dAc35": mainnet.id,
  "0x99b36fDbC582D113aF36A21EBa06BFEAb7b9bE12": mainnet.id,
  "0x7e108711771DfdB10743F016D46d75A9379cA043": arbitrum.id, // Arbitrum Alchemix multisig
};
