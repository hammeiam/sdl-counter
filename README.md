# SDL Balances

> Calculates veSDL and SDL balances (including unclaimed SDL) for all users on all chains

## Getting started

1. Install dependencies with `pnpm install`
2. Copy `template.env` and add infura API key
3. Export addresses as `targets.csv` from https://dune.com/queries/2759260, save in project root
4. Export uniswap v3 positiosn as `univ3_lps.csv` from https://dune.com/queries/2727107, save in project root
5. Run with `pnpm run exec`

## Checklist

### VESDL Balances

- [x] vesdl contract #getVesdlBalances

### SDL Balances

- [x] user wallet `#getWalletSdlBalances`
- [x] unclaimed employee/investor vesting `#getVestingClaimableBalances`
- [x] unclaimed retro vesting `#getRetroVestingBalances`
- [x] sdl locked in vesdl `#getLockedSdlBalances`
- [x] unclaimed gauges `#getGaugesUnclaimedBalances`
  - `#getAllGaugeAddresses`
    - mainnet
    - sidechain
- [x] SLP pool `#getSushiSDLBalances`
- [x] UniV3 positions `#getUniV3PositionBalance`

### Utils

- [x] Helper to create client for chain #createPublicClient
- [x] Helper to output as CSV #formatValuesAsCsv
- [x] Helper to merge n {address:balance} maps #mergeBalanceMaps

### Operational

- [x] fetch values accross all chains
- [x] aggregate results and display
- [x] omit addresses (eg msig, treasury)
