# Settler Smart Contracts

This directory will contain Clarity smart contracts for the Settler platform.

## Planned Contracts

- `settler-invoice.clar` - Invoice management and payment tracking
- `settler-treasury.clar` - Treasury and yield strategy management

## Development

Contracts will be developed using [Clarinet](https://github.com/hirosystems/clarinet).

```bash
# Initialize Clarinet project
clarinet new .

# Run tests
clarinet test

# Deploy to testnet
clarinet deploy --testnet
```
