# Substitution Blueprint

## Purpose
Provide practical swaps that keep drinks usable without overwhelming users.

## Confidence Legend
- **High**: Same family or near-identical flavor role; minimal change to drink intent.
- **Medium**: Different expression but still structurally compatible; noticeable profile shift.
- **Low**: Backup option; useful for flexibility, but flavor/structure may change significantly.

## Decision Flow
1. **Same-family first**: Try spirit-for-spirit within family.
2. **Flavor-role match second**: If unavailable, match by role (neutral, botanical, smoky, oak-aged, bitter, citrus).
3. **Shelf-first ranking**: Prefer options user already has.
4. **Show alternatives**: Always include 1 primary + up to 2 secondary options.
5. **Guardrails**: Keep garnish swaps garnish-adjacent and citrus swaps citrus-adjacent.

## Category Starter Matrix
- **Vodka** -> Gin (High), White Rum (Medium), Tequila Blanco (Low)
- **Gin** -> Vodka (High), White Rum (Medium), Tequila Blanco (Low)
- **White Rum** -> Light Rum (High), Vodka (Medium), Tequila Blanco (Medium)
- **Dark/Aged Rum** -> Aged Rum (High), Bourbon (Medium), Cognac (Low)
- **Cachaca** -> White Rum (High), Agricole Rhum (Medium), Tequila Blanco (Low)
- **Bourbon** -> Rye Whiskey (High), Tennessee Whiskey (High), Irish Whiskey (Medium)
- **Rye Whiskey** -> Bourbon (High), Scotch (Medium)
- **Scotch** -> Irish Whiskey (Medium), Bourbon (Medium)
- **Irish Whiskey** -> Bourbon (High), Scotch (Medium)
- **Tequila Blanco** -> Tequila Silver (High), Mezcal (Medium), Vodka (Low)
- **Tequila Reposado** -> Tequila Anejo (High), Tequila Blanco (Medium), Mezcal (Medium)
- **Mezcal** -> Tequila Blanco (Medium), Tequila Reposado (Medium), Dark Rum (Low)
- **Cognac/Brandy** -> Each other (High), Bourbon (Medium), Dark Rum (Low)

## Garnish / Adjacent Rules
- **Citrus garnish** stays in citrus world (orange/lemon/lime/grapefruit).
- **Cherry garnish** stays in berry world (raspberry/blackberry/strawberry).
- **Herb garnish** stays in herb world (rosemary/basil/thyme/mint).

## UI Contract
For each ingredient row:
- `Try: <primary substitute>`
- `Confidence: High/Medium/Low`
- `Why: <short reason>`
- `Also consider: <alt1>, <alt2>`
- `You already have this substitute` when inventory match exists.
