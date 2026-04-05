# Test prompts — PrismRx Workspace (`/workspace`)

Copy any line below into the chat. **Indexed** = hits your Postgres policy rows first. **Live** = DB miss, then web crawl (slower; needs API/network).

## Indexed coverage (payer + drug)

- Does Aetna cover infliximab? Is prior authorization required?
- UnitedHealthcare rituximab — step therapy and site of care?
- Cigna vedolizumab coverage criteria and PA
- Does UHC cover Remicade for Crohn’s?

## Live-heavy (often unindexed — exercises `/api/policy/live`)

- Anthem infliximab prior authorization requirements
- Priority Health rituximab medical policy

## Greeting & navigation (widgets, no full lookup)

- Hi
- What drugs are in the indexed dataset?
- Compare indexed payers
- I want to check coverage for a specific payer and drug

## Short / natural

- Aetna + Entyvio PA?
- Is infliximab covered under Cigna?
