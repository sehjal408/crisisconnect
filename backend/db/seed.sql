-- Sample reference data for local development / demos (realistic B.C. incidents).
-- Run after schema.sql. User accounts (with hashed passwords) and sample requests
-- are created by `npm run seed` (src/scripts/seed.js) — bcrypt hashing must happen
-- in application code, not raw SQL.

INSERT INTO shelters (name, address, latitude, longitude, capacity, occupied_beds, medical_support, pet_friendly, accessibility_support, status) VALUES
  ('Guildford Recreation Centre', '15105 105 Ave, Surrey, BC', 49.1894, -122.8094, 40, 18, TRUE, TRUE, TRUE, 'open'),
  ('Cloverdale Arena', '6090 176 St, Surrey, BC', 49.1053, -122.7297, 40, 40, FALSE, FALSE, TRUE, 'full'),
  ('Newton Community Hall', '13730 72 Ave, Surrey, BC', 49.1217, -122.8508, 60, 12, TRUE, TRUE, FALSE, 'open'),
  ('Fleetwood Community Centre', '15996 84 Ave, Surrey, BC', 49.1496, -122.7849, 50, 9, FALSE, TRUE, TRUE, 'open'),
  ('Sunnyside Elementary', '12888 21A Ave, Surrey, BC', 49.0186, -122.8434, 30, 0, FALSE, FALSE, FALSE, 'closed');

INSERT INTO incidents (title, description, type, latitude, longitude, severity, status, source) VALUES
  ('Wildfire near Lytton', 'Fast-moving wildfire approaching a residential area; evacuation alert in effect.', 'wildfire', 50.2306, -121.5816, 'critical', 'verified', 'BC Wildfire Service'),
  ('Fraser River flood watch — Delta', 'Rising water levels along the Fraser River; low-lying areas at risk.', 'flood', 49.0847, -123.0587, 'high', 'verified', 'Environment Canada'),
  ('Highway 1 closure — mudslide', 'Highway 1 closed eastbound near Hope due to a mudslide.', 'road_closure', 49.3358, -121.8033, 'medium', 'verified', 'DriveBC'),
  ('Air quality advisory — Surrey', 'Wildfire smoke is affecting regional air quality.', 'air_quality', 49.1913, -122.8490, 'low', 'verified', 'Metro Vancouver'),
  ('Evacuation order — Sumas Prairie', 'Mandatory evacuation order issued for the Sumas Prairie area.', 'evacuation', 49.0726, -122.1037, 'high', 'verified', 'City of Abbotsford'),
  ('Minor earthquake — Vancouver Island', 'Magnitude 4.1 earthquake recorded offshore; no damage reported.', 'earthquake', 49.6500, -124.9300, 'medium', 'verified', 'U.S. Geological Survey'),
  ('Windstorm warning — Metro Vancouver', 'Strong winds expected overnight; possible power outages.', 'weather', 49.2827, -123.1207, 'medium', 'pending', 'Environment Canada'),
  ('Wildfire smoke — Hope', 'Smoke drifting into the Fraser Canyon from regional fires.', 'wildfire', 49.3830, -121.4410, 'low', 'verified', 'BC Wildfire Service');
