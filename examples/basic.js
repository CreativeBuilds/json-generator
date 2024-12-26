import { JsonGenerator } from '../src/index.js';

// Initialize the generator
const generator = new JsonGenerator({
  apiKey: process.env.OPENROUTER_API_KEY,
  appName: 'JSON Generator Example',
  maxRetries: 3
});

// Example 1: Basic type validation
async function basicExample() {
  const schema = {
    name: 'type:string',
    age: 'type:integer',
    isEmployed: 'type:boolean',
    salary: 'type:float',
    skills: 'type:array'
  };

  const result = await generator.generate({
    prompt: 'Generate a profile for a software engineer named John Doe who is 30 years old, currently employed, making $120,000 per year, with skills in JavaScript, Python, and React.',
    schema
  });
  console.log('Basic Type Validation Example:', JSON.stringify(result, null, 2));
}

// Example 2: Using enum validation
async function enumExample() {
  const schema = {
    name: 'type:string',
    role: 'type:enum[warrior,mage,rogue,cleric]',
    level: 'type:integer',
    stats: {
      strength: 'type:integer',
      dexterity: 'type:integer',
      constitution: 'type:integer',
      intelligence: 'type:integer',
      wisdom: 'type:integer',
      charisma: 'type:integer'
    }
  };

  const result = await generator.generate({
    prompt: 'Create a level 5 warrior character named Thorgar. He should be strong and tough but not very intelligent, with balanced wisdom and above-average charisma.',
    schema
  });
  console.log('Enum Validation Example:', JSON.stringify(result, null, 2));
}

// Example 3: Custom validation
async function customValidationExample() {
  const schema = {
    email: 'type:string',
    password: 'type:string',
    age: 'type:integer'
  };

  // Custom validators
  const validators = [
    // Email validator
    (data) => ({
      valid: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email),
      error: 'Invalid email format'
    }),
    // Password strength validator
    (data) => ({
      valid: data.password.length >= 8,
      error: 'Password must be at least 8 characters'
    }),
    // Age validator
    (data) => ({
      valid: data.age >= 18,
      error: 'User must be 18 or older'
    })
  ];

  const result = await generator.generate({
    prompt: 'Create a user account for John Doe who is 25 years old. Use a secure password.',
    schema,
    customValidators: validators
  });
  console.log('Custom Validation Example:', JSON.stringify(result, null, 2));
}

// Run examples
async function runExamples() {
  try {
    console.log('Running examples with schema validation...\n');
    
    await basicExample();
    console.log('\n---\n');
    
    await enumExample();
    console.log('\n---\n');
    
    await customValidationExample();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

runExamples(); 