import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JsonGenerator } from '../src/index.js';

test('JsonGenerator initialization', (t) => {
  // Should throw when no API key is provided
  assert.throws(() => {
    new JsonGenerator({});
  }, /OpenRouter API key is required/);

  // Should create instance with minimal config
  const generator = new JsonGenerator({ apiKey: 'test-key' });
  assert.equal(generator.apiKey, 'test-key');
  assert.equal(generator.model, 'mistralai/mistral-nemo');
});

test('JsonGenerator with custom config', (t) => {
  const config = {
    apiKey: process.env.OPENROUTER_API_KEY,
    model: 'custom-model',
    referer: 'http://example.com',
    appName: 'Test App'
  };

  const generator = new JsonGenerator(config);
  assert.equal(generator.model, 'custom-model');
  assert.equal(generator.referer, 'http://example.com');
  assert.equal(generator.appName, 'Test App');
}); 

test('JsonGenerator generate method', async (t) => {
  const generator = new JsonGenerator({ apiKey: process.env.OPENROUTER_API_KEY });
  const schema = {
    name: 'string',
    age: 'integer'
  };
  const result = await generator.generate({ 
    prompt: 'Generate a JSON object with a name of John and age of 30.',
    schema
  });
  assert.equal(result.name, 'John');
  assert.equal(result.age, 30);
});