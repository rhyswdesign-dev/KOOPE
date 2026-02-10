-- Seed cocktails table with popular cocktails
INSERT INTO cocktails (name, ingredients, instructions, category, glass_type, garnish) VALUES

-- Classics
('Martini', 'Gin, Dry Vermouth',
 'Stir gin and vermouth with ice. Strain into chilled martini glass.',
 'Classic', 'Martini Glass', 'Olive or lemon twist'),

('Manhattan', 'Bourbon, Sweet Vermouth, Angostura Bitters',
 'Stir all ingredients with ice. Strain into chilled coupe glass.',
 'Classic', 'Coupe Glass', 'Cherry'),

('Old Fashioned', 'Bourbon, Sugar, Angostura Bitters, Orange Peel',
 'Muddle sugar with bitters and water. Add bourbon and ice. Stir.',
 'Classic', 'Rocks Glass', 'Orange peel'),

('Margarita', 'Tequila, Triple Sec, Lime Juice, Agave Syrup',
 'Shake all ingredients with ice. Strain into salt-rimmed glass.',
 'Classic', 'Margarita Glass', 'Lime wheel'),

('Mojito', 'White Rum, Lime Juice, Sugar, Mint Leaves, Soda Water',
 'Muddle mint with sugar and lime juice. Add rum and ice. Top with soda.',
 'Refreshing', 'Highball Glass', 'Mint sprig'),

-- Popular
('Moscow Mule', 'Vodka, Ginger Beer, Lime Juice',
 'Build in copper mug over ice. Stir gently.',
 'Popular', 'Copper Mug', 'Lime wheel'),

('Whiskey Sour', 'Bourbon, Lemon Juice, Simple Syrup, Egg White',
 'Shake all ingredients without ice (dry shake). Add ice and shake again. Strain.',
 'Popular', 'Rocks Glass', 'Cherry and orange'),

('Daiquiri', 'White Rum, Lime Juice, Simple Syrup',
 'Shake all ingredients with ice. Strain into chilled coupe.',
 'Classic', 'Coupe Glass', 'Lime wheel'),

('Negroni', 'Gin, Campari, Sweet Vermouth',
 'Stir all ingredients with ice. Strain into rocks glass over ice.',
 'Classic', 'Rocks Glass', 'Orange peel'),

('Aperol Spritz', 'Aperol, Prosecco, Soda Water',
 'Build in wine glass over ice. Stir gently.',
 'Refreshing', 'Wine Glass', 'Orange slice'),

-- Tiki
('Mai Tai', 'White Rum, Dark Rum, Orange Curaçao, Lime Juice, Orgeat Syrup',
 'Shake all ingredients with ice. Strain into glass over crushed ice.',
 'Tiki', 'Rocks Glass', 'Mint and lime'),

('Piña Colada', 'White Rum, Coconut Cream, Pineapple Juice',
 'Blend all ingredients with ice until smooth.',
 'Tiki', 'Hurricane Glass', 'Pineapple and cherry'),

-- Modern
('Espresso Martini', 'Vodka, Coffee Liqueur, Espresso, Simple Syrup',
 'Shake all ingredients vigorously with ice. Strain into chilled coupe.',
 'Modern', 'Coupe Glass', 'Coffee beans'),

('French 75', 'Gin, Lemon Juice, Simple Syrup, Champagne',
 'Shake gin, lemon juice, and syrup with ice. Strain into flute. Top with champagne.',
 'Classic', 'Champagne Flute', 'Lemon twist'),

('Dark and Stormy', 'Dark Rum, Ginger Beer, Lime Juice',
 'Build in highball glass over ice.',
 'Popular', 'Highball Glass', 'Lime wheel')

ON CONFLICT DO NOTHING;
