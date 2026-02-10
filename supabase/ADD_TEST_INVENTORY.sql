-- Add sample inventory items for test user
-- Replace 'YOUR_USER_ID' with the actual user ID from auth.users where email = 'test@koope.app'

-- First, let's get the user ID (run this first to get the ID)
SELECT id, email FROM auth.users WHERE email = 'test@koope.app';

-- Then run this INSERT with the actual user_id:
INSERT INTO user_inventory (user_id, item_type, item_name, category, added_at) VALUES
-- Spirits
('00c1001a-d4fa-43ce-b706-27bd8bec33e5', 'spirit', 'Vodka', 'vodka', NOW()),
('00c1001a-d4fa-43ce-b706-27bd8bec33e5', 'spirit', 'Gin', 'gin', NOW()),
('00c1001a-d4fa-43ce-b706-27bd8bec33e5', 'spirit', 'Bourbon', 'whiskey', NOW()),
('00c1001a-d4fa-43ce-b706-27bd8bec33e5', 'spirit', 'White Rum', 'rum', NOW()),
('00c1001a-d4fa-43ce-b706-27bd8bec33e5', 'spirit', 'Dark Rum', 'rum', NOW()),
('00c1001a-d4fa-43ce-b706-27bd8bec33e5', 'spirit', 'Tequila', 'tequila', NOW()),

-- Liqueurs
('00c1001a-d4fa-43ce-b706-27bd8bec33e5', 'ingredient', 'Triple Sec', 'liqueur', NOW()),
('00c1001a-d4fa-43ce-b706-27bd8bec33e5', 'ingredient', 'Orange Curaçao', 'liqueur', NOW()),
('00c1001a-d4fa-43ce-b706-27bd8bec33e5', 'ingredient', 'Coffee Liqueur', 'liqueur', NOW()),
('00c1001a-d4fa-43ce-b706-27bd8bec33e5', 'ingredient', 'Campari', 'liqueur', NOW()),
('00c1001a-d4fa-43ce-b706-27bd8bec33e5', 'ingredient', 'Sweet Vermouth', 'vermouth', NOW()),
('00c1001a-d4fa-43ce-b706-27bd8bec33e5', 'ingredient', 'Dry Vermouth', 'vermouth', NOW()),
('00c1001a-d4fa-43ce-b706-27bd8bec33e5', 'ingredient', 'Aperol', 'liqueur', NOW()),

-- Mixers & Ingredients
('00c1001a-d4fa-43ce-b706-27bd8bec33e5', 'ingredient', 'Lime Juice', 'juice', NOW()),
('00c1001a-d4fa-43ce-b706-27bd8bec33e5', 'ingredient', 'Lemon Juice', 'juice', NOW()),
('00c1001a-d4fa-43ce-b706-27bd8bec33e5', 'ingredient', 'Pineapple Juice', 'juice', NOW()),
('00c1001a-d4fa-43ce-b706-27bd8bec33e5', 'ingredient', 'Orange Juice', 'juice', NOW()),
('00c1001a-d4fa-43ce-b706-27bd8bec33e5', 'ingredient', 'Simple Syrup', 'syrup', NOW()),
('00c1001a-d4fa-43ce-b706-27bd8bec33e5', 'ingredient', 'Agave Syrup', 'syrup', NOW()),
('00c1001a-d4fa-43ce-b706-27bd8bec33e5', 'ingredient', 'Orgeat Syrup', 'syrup', NOW()),
('00c1001a-d4fa-43ce-b706-27bd8bec33e5', 'ingredient', 'Coconut Cream', 'mixer', NOW()),
('00c1001a-d4fa-43ce-b706-27bd8bec33e5', 'ingredient', 'Ginger Beer', 'mixer', NOW()),
('00c1001a-d4fa-43ce-b706-27bd8bec33e5', 'ingredient', 'Soda Water', 'mixer', NOW()),
('00c1001a-d4fa-43ce-b706-27bd8bec33e5', 'ingredient', 'Prosecco', 'wine', NOW()),
('00c1001a-d4fa-43ce-b706-27bd8bec33e5', 'ingredient', 'Champagne', 'wine', NOW()),
('00c1001a-d4fa-43ce-b706-27bd8bec33e5', 'ingredient', 'Espresso', 'coffee', NOW()),

-- Bitters & Garnishes
('00c1001a-d4fa-43ce-b706-27bd8bec33e5', 'ingredient', 'Angostura Bitters', 'bitters', NOW()),
('00c1001a-d4fa-43ce-b706-27bd8bec33e5', 'ingredient', 'Orange Bitters', 'bitters', NOW()),
('00c1001a-d4fa-43ce-b706-27bd8bec33e5', 'ingredient', 'Mint Leaves', 'garnish', NOW()),
('00c1001a-d4fa-43ce-b706-27bd8bec33e5', 'ingredient', 'Sugar', 'sweetener', NOW()),
('00c1001a-d4fa-43ce-b706-27bd8bec33e5', 'ingredient', 'Orange Peel', 'garnish', NOW()),
('00c1001a-d4fa-43ce-b706-27bd8bec33e5', 'ingredient', 'Egg White', 'ingredient', NOW())

ON CONFLICT DO NOTHING;

-- Verify items were added
SELECT item_name, category, item_type
FROM user_inventory
WHERE user_id = '00c1001a-d4fa-43ce-b706-27bd8bec33e5'
ORDER BY item_name;
