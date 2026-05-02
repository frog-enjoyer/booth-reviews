INSERT OR IGNORE INTO creators (creator_id, booth_shop_url, display_name)
VALUES ('demo-shop', 'https://booth.pm/demo-shop', 'Demo Shop');

INSERT OR IGNORE INTO items (item_id, booth_url, canonical_url, creator_id)
VALUES ('123456', 'https://booth.pm/en/items/123456', 'https://booth.pm/en/items/123456', 'demo-shop');

INSERT OR IGNORE INTO users (user_id, discord_id, public_name)
VALUES ('demo-user', '100000000000000001', 'Reviewer 0001');

INSERT OR IGNORE INTO reviews (id, item_id, user_id, rating, body, lang, purchase_state)
VALUES (
  'demo-review',
  '123456',
  'demo-user',
  'down',
  'Demo review: files were missing and the prefab needed manual repair.',
  'en',
  'appears_purchased'
);
