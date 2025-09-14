const { Client } = require('pg');

exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  // Parse the request body
  let body;
  try {
    body = JSON.parse(event.body);
  } catch (error) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid JSON' }),
    };
  }

  const { email } = body;
  if (!email) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Email is required' }),
    };
  }

  // Simple email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid email format' }),
    };
  }

  const client = new Client({
    connectionString: process.env.NETLIFY_DATABASE_URL,
  });

  try {
    await client.connect();

    // Create table if not exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Check if email already exists
    const checkResult = await client.query('SELECT id FROM subscriptions WHERE email = $1', [email]);
    if (checkResult.rows.length > 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Email already subscribed' }),
      };
    }

    // Insert the email
    await client.query('INSERT INTO subscriptions (email) VALUES ($1)', [email]);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Successfully subscribed' }),
    };
  } catch (error) {
    console.error('Database error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  } finally {
    await client.end();
  }
};
