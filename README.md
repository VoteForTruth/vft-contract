# vft-contract

Smart contracts of **Vote For Truth**: any disputed statement gets a tree of pro/con arguments, and people vote for arguments with money. A vote is refundable: money only raises an argument in the ranking, and revoking it lowers the argument again.

Written in [Tolk](https://docs.ton.org/languages/tolk), built and tested with [Acton](https://ton-blockchain.github.io/acton/).

## Contracts

```
VftMaster                      registry of root statements, owner = init parameter
 └─ VftStatement (idx, pro)    root topic or argument: short thesis + url; the text is immutable, the url can be replaced, deletable while unanswered
     ├─ VftStatement (pro)     arguments for, numbered 0..proCount-1
     ├─ VftStatement (con)     arguments against, numbered 0..conCount-1
     └─ VftVote (owner)        one vote contract per (statement, owner), holds the money
```

| Action | Message | To | Value |
|---|---|---|---|
| Create a root statement | `NewParentStatement { data }` | master | ≥ 0.1 TON (0.05 stays as the storage reserve, the change comes back) |
| Create an argument | `NewChildStatement { data, pro }` | statement | same as above |
| Vote / add to a vote | `Vote { amount }` | statement | ≥ amount + 0.05 TON, the excess comes back |
| Revoke part of a vote | `Withdraw { amount }` | vote | gas, comes back |
| Revoke the whole vote | `WithdrawAll {}` | vote | gas; the vote contract is destroyed, a new vote re-creates it |
| Donate to the author | text comment `donate` | statement | any; can be sent from any wallet |
| Replace the source link | `SetUrl { url }` | statement | gas, comes back; only the author, `null` removes the link. The text never changes; the indexer keeps the public history of links |
| Delete a statement | `DeleteStatement {}` | statement | gas; only the author and only while it has no arguments. The contract is destroyed and its reserve comes back; votes stay in their contracts and are withdrawn by their owners. The text remains in the transaction history |

Statement data (`VftData`): text 1..500 bytes, url 1..256 bytes (UTF-8 bytes, not characters) or none, and the required language of the text — `lang`, an ISO 639-1 code as two lowercase ASCII letters in a `uint16` (`"ru"` = `0x7275`); it lets indexers filter by language.

Getters: `VftMaster.statementsCount/statementAddress/owner`, `VftStatement.info/childCount/childAddress/voteAddress`, `VftVote.amount/owner/statement`. Getters are flat (no nested structs), so any client can decode them.

Sums and ranking are computed off-chain by the indexer from vote contracts.

## Development

Install Acton:

```bash
curl -LsSf https://github.com/ton-blockchain/acton/releases/latest/download/acton-installer.sh | sh
```

```bash
acton build                 # compile contracts
acton test                  # run tests
acton test --coverage       # with coverage
acton test --mutate --mutate-contract VftVote   # mutation testing
acton check && acton fmt    # lint and format
acton wrapper --all         # regenerate Tolk wrappers after ABI changes
acton run wrappers-ts       # regenerate TypeScript wrappers (wrappers-ts/) for the indexer and the app
```

## Scripts (testnet)

Scripts sign with a TON Connect wallet (Tonkeeper etc.). The session is saved in `build/sessions/`. Every input comes from an environment variable or is asked interactively. Amounts are in TON, e.g. `1.5`.

```bash
acton run deploy-testnet                                     # prints VFT_MASTER
VFT_TEXT="Question" VFT_URL="" acton run create-statement-testnet
VFT_STATEMENT=<addr> VFT_SIDE=pro VFT_TEXT="Argument" VFT_URL="" acton run create-argument-testnet
VFT_STATEMENT=<addr> VFT_AMOUNT=1 acton run vote-testnet
VFT_STATEMENT=<addr> VFT_AMOUNT=0.3 acton run revoke-testnet  # or VFT_AMOUNT=all
VFT_STATEMENT=<addr> VFT_AMOUNT=0.1 acton run donate-testnet
VFT_MASTER=<addr> VFT_VOTER=<wallet> acton run inspect-testnet  # read-only tree dump
```

`VFT_MASTER` is optional: by default the master owned by the connected wallet is used.
