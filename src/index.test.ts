import { beforeAll, expect, test } from "vitest";
import {
  getVesdlBalances,
  getLockedSdlBalances,
  getWalletSdlBalances,
  getGaugesUnclaimedBalances,
  getAllGaugeAddresses,
  getVestingClaimableBalances,
  getUniV3PositionBalance,
  getSushiSDLBalances,
} from "./index";
import { createClient } from "./utils";
import { arbitrum, mainnet } from "viem/chains";
import { getAddress } from "viem";
import { PublicChainClient } from "./types";

// sdl / vesdl values of various wallets at TARGET_BLOCK
const TEST_ADDRESSES = [
  "0xff0000000000000000000000000000000000dead", // random address that holds nothing
  "0x5416808256eA66367d7Ec1Ae2C37BB64EC2425d4", // vesdl / slp holder
  "0x4802CedbDF865382dbaED8D5e41a65C8AB840676", // saddle msig with SDL, SLP
  "0x806b885aCb0494925c68C279C2A1D3C03ed67FC6", // vesting recipient
  "0x5BDb37d0Ddea3A90F233c7B7F6b9394B6b2eef34", // sdl deployer, uni holder
  "0xB1748C79709f4Ba2Dd82834B8c82D4a505003f27", // frax comptroller
].map((item) => getAddress(item));

const zeroes = {
  vesdl: 0n,
  sdl: 0n,
  lockedSdl: 0n,
  gaugesSdl: 0n,
  uniV3Sdl: undefined,
  vestingClaimable: 0n,
  slpSdl: 0n,
};
const valuesAtBlock = {
  [TEST_ADDRESSES[0]]: zeroes,
  [TEST_ADDRESSES[1]]: {
    ...zeroes,
    vesdl: 478913652624628805576000n,
    lockedSdl: 524933902593242866751385n,
    slpSdl: 100692253029117087395614n,
  },
  [TEST_ADDRESSES[2]]: {
    ...zeroes,
    sdl: 16973150794510652261608n,
    slpSdl: 6945131733638339272131460n,
  },
  [TEST_ADDRESSES[3]]: {
    ...zeroes,
    vestingClaimable: 21258863254185692541857n,
    slpSdl: 180050867461712451244n,
  },
  [TEST_ADDRESSES[4]]: {
    ...zeroes,
    lockedSdl: 1000000000000000000n,
    slpSdl: 645172226345845379285n,
    uniV3Sdl: 41653996825712739404669n,
  },
  [TEST_ADDRESSES[5]]: {
    ...zeroes,
    vesdl: 18777850464322296424876525n,
    lockedSdl: 25888162698459793121714440n,
    gaugesSdl: 221046232885664457961n,
    sdl: 165916729435621443876322n,
  },
};

const TARGET_BLOCK = 17816406n;

let publicClientEth: PublicChainClient;
let publicClientArb: PublicChainClient;

beforeAll(() => {
  publicClientEth = createClient(mainnet);
  publicClientArb = createClient(arbitrum);
});

test.concurrent("getVesdlBalances", async () => {
  const balances = await getVesdlBalances(
    publicClientEth,
    TEST_ADDRESSES,
    TARGET_BLOCK
  );

  TEST_ADDRESSES.forEach((address) => {
    expect(balances[address], `Wallet ${address}`).toEqual(
      valuesAtBlock[address].vesdl
    );
  });
});

test.concurrent("getLockedSdlBalances", async () => {
  const balances = await getLockedSdlBalances(
    publicClientEth,
    TEST_ADDRESSES,
    TARGET_BLOCK
  );

  TEST_ADDRESSES.forEach((address) => {
    expect(balances[address], `Wallet ${address}`).toEqual(
      valuesAtBlock[address].lockedSdl
    );
  });
});

test.concurrent("getWalletSdlBalances", async () => {
  const balances = await getWalletSdlBalances(
    publicClientEth,
    TEST_ADDRESSES,
    TARGET_BLOCK
  );

  TEST_ADDRESSES.forEach((address) => {
    expect(balances[address], `Wallet ${address}`).toEqual(
      valuesAtBlock[address].sdl
    );
  });
});

test.concurrent("getSushiSDLBalances", async () => {
  const balances = await getSushiSDLBalances(
    publicClientEth,
    TEST_ADDRESSES,
    TARGET_BLOCK
  );

  TEST_ADDRESSES.forEach((address) => {
    expect(balances[address], `Wallet ${address}`).toEqual(
      valuesAtBlock[address].slpSdl
    );
  });
});

test.concurrent("getUniV3PositionBalance", async () => {
  const balances = await getUniV3PositionBalance(
    publicClientEth,
    { "0x498495e3ee98241993304c1a16fcc061cee6c2f8": [287013n] },
    TARGET_BLOCK
  );

  TEST_ADDRESSES.forEach((address) => {
    expect(balances[address], `Wallet ${address}`).toEqual(
      valuesAtBlock[address].uniV3Sdl
    );
  });
});

test.concurrent("getAllGaugeAddresses", async () => {
  const addresses = await getAllGaugeAddresses(publicClientArb);
  expect(addresses.length).toEqual(9);
});

test("getGaugesUnclaimedBalances", async () => {
  const balances = await getGaugesUnclaimedBalances(
    publicClientEth,
    TEST_ADDRESSES,
    TARGET_BLOCK
  );

  TEST_ADDRESSES.forEach((address) => {
    expect(balances[address], `Wallet ${address}`).toEqual(
      valuesAtBlock[address].gaugesSdl
    );
  });
});

test.todo("getVestingClaimableBalances", async () => {
  const balances = await getVestingClaimableBalances(
    publicClientEth,
    TARGET_BLOCK
  );

  TEST_ADDRESSES.forEach((address) => {
    expect(balances[address], `Wallet ${address}`).toEqual(
      valuesAtBlock[address].vestingClaimable
    );
  });
});
