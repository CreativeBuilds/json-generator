/**
 * A class for generating structured JSON objects from text input using AI
 */
export class JsonGenerator {
  /**
   * @param {Object} config Configuration object
   * @param {string} config.apiKey OpenRouter API key
   * @param {string} [config.model='mistralai/mistral-nemo'] Model to use for generation
   * @param {string} [config.referer] Optional HTTP referer for OpenRouter analytics
   * @param {string} [config.appName] Optional app name for OpenRouter analytics
   * @param {number} [config.maxRetries=3] Maximum number of retries for generation
   * @param {string} [config.delimiter='###'] Delimiter for key wrapping
   */
  constructor({
    apiKey,
    model = 'mistralai/mistral-nemo',
    referer = undefined,
    appName = undefined,
    maxRetries = 3,
    delimiter = '###'
  }) {
    if (!apiKey) throw new Error('OpenRouter API key is required');
    this.apiKey = apiKey;
    this.model = model;
    this.referer = referer;
    this.appName = appName;
    this.maxRetries = maxRetries;
    this.delimiter = delimiter;
  }

  /**
   * Wraps keys with delimiters and values with angle brackets
   * @private
   */
  _wrapFormat(format, level = 1) {
    if (typeof format === 'object' && format !== null) {
      if (Array.isArray(format)) {
        return format.map(item => this._wrapFormat(item, level + 1));
      }
      const wrapped = {};
      for (const [key, value] of Object.entries(format)) {
        const wrappedKey = `${this.delimiter.repeat(level)}${key}${this.delimiter.repeat(level)}`;
        wrapped[wrappedKey] = this._wrapFormat(value, level + 1);
      }
      return wrapped;
    }
    return `<${format}>`;
  }

  /**
   * Validates and converts types according to schema
   * @private
   */
  _validateType(value, type, key) {
    if (!type.startsWith('type:')) return value;
    
    const typeStr = type.split('type:')[1].trim();
    
    // Basic type validations
    switch (typeStr.toLowerCase()) {
      case 'string':
      case 'str':
        return String(value);
      case 'number':
      case 'float':
        const num = parseFloat(value);
        if (isNaN(num)) throw new Error(`Field "${key}" must be a number`);
        return num;
      case 'integer':
      case 'int':
        const int = parseInt(value);
        if (isNaN(int)) throw new Error(`Field "${key}" must be an integer`);
        return int;
      case 'boolean':
      case 'bool':
        if (typeof value === 'string') {
          if (value.toLowerCase() === 'true') return true;
          if (value.toLowerCase() === 'false') return false;
        }
        if (typeof value === 'boolean') return value;
        throw new Error(`Field "${key}" must be a boolean`);
      case 'array':
      case 'list':
        if (!Array.isArray(value)) {
          try {
            const parsed = JSON.parse(value);
            if (!Array.isArray(parsed)) throw new Error();
            return parsed;
          } catch {
            throw new Error(`Field "${key}" must be an array`);
          }
        }
        return value;
    }

    // Handle enums if type is like "type:enum[value1,value2]"
    if (typeStr.startsWith('enum[')) {
      const enumValues = typeStr
        .slice(5, -1)
        .split(',')
        .map(v => v.trim());
      if (!enumValues.includes(value)) {
        throw new Error(`Field "${key}" must be one of: ${enumValues.join(', ')}`);
      }
      return value;
    }

    return value;
  }

  /**
   * Cleans up JSON string by removing markdown formatting and code blocks
   * @private
   */
  _cleanJsonString(str) {
    // Remove markdown code blocks
    str = str.replace(/```(?:json)?\n?/g, '');
    // Remove any trailing backticks
    str = str.replace(/`+$/, '');
    // Trim whitespace
    str = str.trim();
    return str;
  }

  /**
   * Formats a value for prompt generation
   * @private
   */
  _formatValue(value) {
    if (typeof value === 'string') return `"${value}"`;
    if (Array.isArray(value)) return `[${value.map(v => this._formatValue(v)).join(', ')}]`;
    return String(value);
  }

  /**
   * Creates a structured prompt from the schema
   * @private
   */
  _createStructuredPrompt(userPrompt, schema, example = {
    string: "example_text",
    integer: 42,
    float: 42.5,
    boolean: true,
    array: ["item1", "item2"]
  }) {
    const formatField = (key, type, path = '') => {
      const currentPath = path ? `${path}.${key}` : key;
      if (typeof type === 'string' && type.startsWith('type:')) {
        const baseType = type.split('type:')[1].trim();
        if (baseType.startsWith('enum[')) {
          const options = baseType.slice(5, -1).split(',').map(v => v.trim());
          return `${currentPath}=${this._formatValue(options[0])}`;
        }
        return `${currentPath}=${this._formatValue(example[baseType.toLowerCase()] || example.string)}`;
      }
      if (typeof type === 'object' && !Array.isArray(type)) {
        return Object.entries(type)
          .map(([k, v]) => formatField(k, v, currentPath))
          .join(', ');
      }
      return `${currentPath}=${this._formatValue(example.array)}`;
    };

    const fieldExamples = Object.entries(schema)
      .map(([key, type]) => formatField(key, type))
      .join(', ');

    return `${userPrompt}\nReturn a raw JSON object (no markdown, no code blocks) with exactly these fields and values as a template: ${fieldExamples}`;
  }

  /**
   * Generate a JSON object from text input with schema validation
   * @param {Object} params Generation parameters
   * @param {string} params.prompt Text prompt to generate JSON from
   * @param {Object} params.schema JSON schema to validate against
   * @param {string} [params.systemPrompt] Optional system prompt override
   * @param {Function[]} [params.customValidators] Optional array of custom validation functions
   * @returns {Promise<Object>} Generated JSON object
   */
  async generate({ prompt, schema = {}, systemPrompt = undefined, customValidators = [] }) {
    if (Object.keys(schema).length === 0) {
      // If no schema provided, attempt to infer it from the prompt
      console.warn('No schema provided. Attempting to generate JSON without schema validation.');
      const response = await this._makeRequest(prompt, systemPrompt || 'Generate a JSON object based on the prompt. Return only the raw JSON.');
      return JSON.parse(response);
    }
    
    const wrappedSchema = this._wrapFormat(schema);
    const structuredPrompt = this._createStructuredPrompt(prompt, schema);
    
    const baseSystemPrompt = `You are a JSON generator. Generate a raw JSON object (no markdown, no code blocks) that conforms to this schema: ${JSON.stringify(schema)}. 
Important:
- Return ONLY the raw JSON object, no markdown formatting or code blocks
- Ensure all fields are present and match their types exactly
- Do not include any explanation or additional text
- Use the field names and types exactly as specified`;
    const finalSystemPrompt = systemPrompt || baseSystemPrompt;

    let lastError = null;
    
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            ...(this.referer && { 'HTTP-Referer': this.referer }),
            ...(this.appName && { 'X-Title': this.appName })
          },
          body: JSON.stringify({
            model: this.model,
            messages: [
              { 
                role: 'system', 
                content: finalSystemPrompt + (lastError ? `\nPrevious error: ${lastError}` : '')
              },
              { role: 'user', content: structuredPrompt }
            ],
            response_format: { type: 'json_object' },
            provider: {
              require_parameters: true
            }
          })
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(`OpenRouter API error: ${error.message || response.statusText}`);
        }

        const data = await response.json();
        const cleanedJson = this._cleanJsonString(data.choices[0].message.content);
        let result = JSON.parse(cleanedJson);

        // Validate types according to schema
        result = this._validateSchema(result, schema);

        // Run custom validators
        for (const validator of customValidators) {
          const { valid, error } = await validator(result);
          if (!valid) throw new Error(error);
        }

        return result;
      } catch (error) {
        lastError = error.message;
        console.error(`Attempt ${attempt + 1} failed:`, error.message);
        if (attempt === this.maxRetries - 1) throw error;
      }
    }
  }

  /**
   * Recursively validates and converts types according to schema
   * @private
   */
  _validateSchema(data, schema) {
    // Handle primitive type definitions
    if (typeof schema === 'string' && schema.startsWith('type:')) {
      return this._validateType(data, schema, 'field');
    }

    // Handle objects
    if (typeof schema === 'object' && schema !== null) {
      if (Array.isArray(schema)) {
        if (!Array.isArray(data)) {
          throw new Error('Expected an array');
        }
        return data.map((item, i) => this._validateSchema(item, schema[0]));
      }

      if (typeof data !== 'object' || data === null) {
        throw new Error('Expected an object');
      }

      const validated = {};
      for (const [key, schemaValue] of Object.entries(schema)) {
        if (!(key in data)) {
          throw new Error(`Missing required field: ${key}`);
        }
        validated[key] = this._validateSchema(data[key], schemaValue);
      }
      return validated;
    }

    return data;
  }

  /**
   * Generate multiple JSON objects in parallel with schema validation
   * @param {Object[]} prompts Array of generation parameters
   * @returns {Promise<Object[]>} Array of generated JSON objects
   */
  async generateBatch(prompts) {
    return Promise.all(prompts.map(p => this.generate(p)));
  }
} 