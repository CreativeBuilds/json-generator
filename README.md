# JSON Generator

A robust Node.js module for generating structured JSON objects from text input using AI via OpenRouter.

## Features

- Generate JSON objects from natural language text
- Schema validation support
- Batch processing
- Customizable AI model selection
- TypeScript-friendly JSDoc annotations

## Installation
```bash
npm install @creativebuilds/json-generator
```

## Usage

### Basic Usage

```javascript
import { JsonGenerator } from '@creativebuilds/json-generator';

const generator = new JsonGenerator({
  apiKey: 'your-openrouter-api-key'
});

const result = await generator.generate({
  prompt: 'Create a user profile for John Doe'
});
```

### With Schema Validation

```javascript
const schema = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    age: { type: 'number' },
    skills: { type: 'array', items: { type: 'string' } }
  },
  required: ['name', 'age', 'skills']
};

const result = await generator.generate({
  prompt: 'Create a profile for a web developer',
  schema
});
```

### Batch Processing

```javascript
const prompts = [
  { prompt: 'Create a recipe for chocolate cake' },
  { prompt: 'Create a movie review for The Matrix' }
];

const results = await generator.generateBatch(prompts);
```

## Configuration

The `JsonGenerator` constructor accepts the following options:

```javascript
const generator = new JsonGenerator({
  apiKey: 'your-openrouter-api-key',     // Required
  model: 'mistralai/mistral-nemo',       // Optional, defaults to mistral-nemo
  referer: 'http://your-site.com',       // Optional, for OpenRouter analytics
  appName: 'Your App Name'               // Optional, for OpenRouter analytics
});
```

## API Reference

### `generate(options)`

Generate a single JSON object from text.

- `options.prompt` (string) - The text prompt to generate JSON from
- `options.schema` (object, optional) - JSON Schema for validation
- `options.systemPrompt` (string, optional) - Override the default system prompt

Returns: Promise<object>

### `generateBatch(prompts)`

Generate multiple JSON objects in parallel.

- `prompts` (array) - Array of generation options
- Returns: Promise<object[]>

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Build
npm run build
```

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. 
