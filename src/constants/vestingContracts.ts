import { Address } from "viem";

// mapping of vesting to beneficiary contract addresses, as vesting addresses are unique
const vestingToBeneficiaryContracts: {
  [vestingContractAddr: Address]: Address;
} = {
  "0xF8b70d8Cf29ee045aCC5623ebe61037b33228fd1":
    "0x31421C442c422BD16aef6ae44D3b11F404eeaBd9",
  "0xA663Ae21db74048E50401f542703e0802A3aFEB9":
    "0x4e33D9523AB9CC36cDf923dEe0E8a7d11308595b",
  "0x2F246c27ED9f4839DFf70233cE250A3f6024F484":
    "0x3f1f7DF41CcE79f4840067106184079236784ad2",
  "0xC7B3DbC8424A11255cF895C2916f24e0063dcdc3":
    "0x84ADB7653B176A5cEeBCe0b927f83F0D3eFD89c7",
  "0x039827df17AE5449B31162eC579bBbbE72300188":
    "0x546560eFB65988D2c94E37b59CA11629C8584f91",
  "0xAF8094420749B0131200B8E85F5018688261f110":
    "0x44692cd1FBd67acFA3cA0c089B4f06dFae07df79",
  "0x3cFd17F9CF57164eD64B91d25f72C2C6dFAeAb48":
    "0xb9136F75e4F0eFAb9869c6C1d4659E3a585E9091",
  "0x1aC13ff6e1bBcA5B49C3F12468689289fB93c388":
    "0xbB49444efe86b167d1Cc35C79A9eb39110DbD5E3",
  "0x45545BD03CcB1cD84D3c8F000a7d6c709d84720D":
    "0x156c2d0D9CfA744615b022229026423E24a566ee",
  "0xbe3e1228D471Fc747d7a4c68823910153eE552a5":
    "0x2550761D44e709710C15B718B2B73A65151a8488",
  "0xdc0E9a031E9fC09681495a5AE5912954cbD858E4":
    "0xA58d1ebC8f9526fBdAE0aeb12532D13BA2ddf871",
  "0xdCaE005FcF34cF3E2B12b662DDED94d0f7bf2977":
    "0xd9d77Edc0650261e0b2b1F99327d538A613BF930",
  "0x3bBFB974fC85286CA6DB8162C312459A92f3E302":
    "0x8D60876891Ed33e0d40Ff677baDb9b8A9E775CC5",
  "0x0622927Ecf00406d48D05c39134Bcd53eD396CB4":
    "0xcA59254EF758Ddfa5aae350422Fdd816c11D9031",
  "0xb39c77901054766662B77E3269D3B622E7cAcAB4":
    "0xaC136EdAa6e5280e344dd3a2d463d7C5Ed93cDC5",
  "0xFde9512C0C4D7b092674229A42ab4AeA5F743dA1":
    "0x3631401a11Ba7004d1311e24d177B05Ece39B4b3",
  "0x3d2aB86DA84B2496168e5Cf841D42A4ac27511d3":
    "0x806b885aCb0494925c68C279C2A1D3C03ed67FC6",
  "0x493eCf1EcE448eE83f72098cFF0E196Fb2948cb9":
    "0xe2eC0bC10C1ac3510a6687481d2dFa567e340469",
  "0xE68319E9389554aF7fe3F7eD41FF1901632634b6":
    "0xFcfBF39D5211498AfD8a00C07AAD44A2a96118d0",
  "0x3E5F69698628b92e0A47f9c2C9e14Ab892216096":
    "0x72E5f354645e8212D3Fa9B80717E6c31887eAa7F",
  "0x5412a79E9cAE0bad06bD9Dd33f97ae2e196519e1":
    "0xbf6b82232Ab643ffb85578868B74919fE30E26e2",
  "0xd6c29B1a8106584dC21Ac3dB4F4863e3cAa47A60":
    "0x89a88bcfe0A8BB0BD240FACf5f20385Cdc48eC4C",
  "0x971B5edA88A400974556ac82d37389dE8F140543":
    "0xf75B575FB27BEF41bb2825E96Dc53D5E95BA26Fe",
  "0xdddf8b5c211fd97967EDa1B7aD6330B9066bdEE4":
    "0xdd85061c99d4c6F4B199333ccE156CD5C6dc03a3",
  "0xEE08C493a458876520813b256e9688EaEDe6A91a":
    "0x92DE4fF2037f8508c8A2D8EfB61868B284c6081c",
  "0xCFB49d2B349d389C41e5F915d1250e36A4eB42CA":
    "0xb4d47Add34a5dF5Ce64DdC6e926A99fc1F8F817f",
  "0xE1aECa359B91EADcD9934b3584B39fefFF4C3B16":
    "0x7fCAf93cc92d51c490FFF701fb2C6197497a80db",
  "0x338179f237EeCC39d3C0aD1A776Ad02b1Bf3761A":
    "0xe016ec54349E1Fdc09C86878F25760ED317a7911",
  "0x76Cb506fC99c10000145796B7E5E00d91b06829B":
    "0x4e7541783a0256e0EEf6cCA2b175Da79548db269",
  "0xdf239A0397C4f1D39B4CF414a1A06aa0f3797FBa":
    "0x4d108e41b380AeCd04693690996192BEEe29174c",
  "0x5c17B22A49Ac26305d9A001FDc41733E59d868D0":
    "0x6b339824883E59676EA605260E4DdA71DcCA29Ae",
  "0xa0e5ca644b026377F8F280e35438BF8aCB0B5790":
    "0x43Bf99D656be7c354B26e63F01f18faB88714D64",
  "0xC896e23A786b51A55fe0C2d5091FAa4Bf2eE0896":
    "0xe5D0Ef77AED07C302634dC370537126A2CD26590",
  "0x7A1c42297c00823736FD91E3d0F2Cc7ca848e98e":
    "0xA44ED7D06cbEE6F7d166A7298Ec61724C08163F5",
  "0x6672fbE9793970fd762Ed7A48cBAe81db7bb0A5E":
    "0xda7Dc67829F5c1Ad7eC4C6174a6Fbbc722229a40",
  "0x94FCEfc941eF42510E166746c9a8AB8FE4933cBc":
    "0x74c5E6Dc988989D3025292C94d36B9e0ABBcf3d0",
  "0xB6Fa5B81f6898b9acfa2D5aF352B3aE25105028B":
    "0x79129d8A02d60D9E9AcF47632B11fC56DE3EcB08",
  "0x8a81e676D2f32c9CbaA0f5Ea48d36eF7172Eda97":
    "0x973B1E385659E317Dd43B49C29E45e66c0275696",
  "0xF1dfa2B7331f31317d15d74121485068589e0D8D":
    "0x231A07C825f052B895DE5FD1513CE40D18E14aF5",
  "0xA5a5f2CDefBBEc9B107032edAa737c0B947aCC9c":
    "0x5e1042b15B3B0Cf1875A7e9Ea379A9e75318a099",
  "0x3cE780be5Cfa346f60D1919451ec0dc9df316A12":
    "0x9AF628d4Fb349c2bA6B4813bBde613A1668b346c",
  "0xB5C81597f982DEdf7452AECfE9EA0D2317D0a6cB":
    "0x8d7C49bF99861A4A189F8adf7882BD85f47E298D",
  "0x12cE3E43D2d6d793F2af61ff8e8Ae7Df88704b32":
    "0x67E3ea119E141406c37e2CA783b749Fe1437673f",
  "0x2a611277d378b475bA7BAd5D601a94d19F6A5eB3":
    "0x30A14d1BfBa95f1867a67Ae8C18A950075592C99",
  "0x64cAc463Ac033534BdBc94b9Da06193b95cf779F":
    "0xDe3258C1C45a557F4924d1E4e3d0A4E5341607Ee",
  "0xf5d69f455474F1F78654b08138178622dC20651a":
    "0x50AdF7A75d7cD6132ACc0a2FB21C019011286635",
  "0xFdC134499b7de70eE88f4594761B8F6AcF9C64A0":
    "0xB3E2B1808ab9e81F3Abfc8C9f78B1dD680Cef948",
  "0xb8196a14c3318EB39518BC1977b99Ea000E02F66":
    "0xc90eA4d8D214D548221EE3622a8BE1D61f7077A2",
  "0x7024716497D385aD9e5762a17e5d91893AF5A47b":
    "0x4F20Cb7a1D567A54350a18DAcB0cc803aEBB4483",
  "0xf8264AfE6483E7149Ad9Bc9D27759E37Ce03F0ed":
    "0x83b1a48376E045D26420200345414e6b93066396",
  "0x32B58b1Bc7d10d5313b87b4E45C17D9Cd342DCf6":
    "0x6C2a066B6CE2872BD5398347E97223C6F6F84104",
  "0xcd57F671C59e32AF35258c19ED112BAc6c5dB48B":
    "0x6De56F8fB34d6081FA173bFC29b3E953a78998dC",
  "0xA382a5427B387A8eA419D7259496d5b5d8930d43":
    "0xCf67910ed04fB23a2ccff3A4bEC259Bb0bf3841c",
  "0x8e0B95B6040188Ac4a51Da2eAf11eF93Cc9Af89F":
    "0xdB7A80DdfDeB83573636B84862803bB07317194C",
  "0x3F2763cAce9B48f0cDBE84E049b5695ce3CF7D7E":
    "0x987FC4FC9aba7fFbDb3E8d0F9FfED364E01DC18c",
  "0x5F4d8017aB0b5476a7177b2f1200f1ccf23f396D":
    "0x3b08AA814bEA604917418A9F0907E7fC430e742C",
  "0x878A65846a37B8cb117662BfDdA596ed99B50f0D":
    "0x53AB8F38EE493d88553Ea6c2766d574E404e249B",
  "0xEed792FdA7bd79398D4F3CC28f02bB65bfB7700F":
    "0xFABEcA5418bDC3A8289EC0FA5B04edEb1D09c90f",
  "0xCDEc570c3eFF689d97EAf3aD9EB31993dCF04f51":
    "0x60063d83E8AB6f2266b6eFcbfa985640CDD3Fc90",
  "0x85C77d06F326381390B619eF202Fe8Fb9CE40679":
    "0x779492ADFff61f10e224184201979C97Cf7B1ED4",
  "0xC7B2F1a2D0838370f88a2FD5c2E3F64D8aF89a18":
    "0x4ba5B41c4378966f08E3E4F7dd80840191D54C69",
  "0xB960FaFEBb589ca3500Eb9350Eea503548bCcFC2":
    "0xCB11d6C568448cAbEC62C2c3469b538Eb37E1341",
  "0x92ff688D17504FF04F6551150fF34dE61Cf6f772":
    "0xC13F274e5608C6976463fB401EcAbd7301187937",
  "0x85f99b73d0edd9cDb3462C94Ebe4c5758684BDf1":
    "0x4ba5B41c4378966f08E3E4F7dd80840191D54C69",
  "0xd17c31796d3Cb41d9d211904780320C4be286172":
    "0x4ba5B41c4378966f08E3E4F7dd80840191D54C69",
  "0xaFC5D02588035124273291E35Cacc11ce4249295":
    "0x82AbEDF193942a6Cdc4704A8D49e54fE51160E99",
  "0x1e82992cD3f1f495827b545fA1d0845316C3404d":
    "0xD9AED190e9Ae62b59808537D2EBD9E123eac4703",
  "0xa440423cC4731909D21CDa5b80CDf4a0E998a046":
    "0x27E2E09a84BaE20C2a9667594896EaF132c862b7",
  "0x5DFbCeea7A5F6556356C7A66d2A43332755D68A5":
    "0x3F8E527aF4e0c6e763e8f368AC679c44C45626aE",
  "0x597E475a5Ddd90b3EB2135AC47319BD866F685d8":
    "0xEC6f7607cD7E4C942a75d40C269deC01BBc9A15e",
  "0x41092B4eCF2C4db719EC5Ab67DBD0C66F095eE97":
    "0x17f61d0F9701A7fB5814C2d4AD3dC3831e07b277",
  "0x5c85B43468da23F86016f508f14cA927bfD8A737":
    "0x53ab66E5bAb196CF86F65feD79981cb85470200e",
};

export default vestingToBeneficiaryContracts;
