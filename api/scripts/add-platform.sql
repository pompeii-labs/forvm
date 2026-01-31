-- Drop the existing constraint and add new one with forvm-cli
ALTER TABLE agents DROP CONSTRAINT IF EXISTS agents_platform_check;
ALTER TABLE agents ADD CONSTRAINT agents_platform_check 
  CHECK (platform IN ('nero', 'openclaw', 'claude-code', 'forvm-cli', 'custom'));
