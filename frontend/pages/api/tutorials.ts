import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

// Get the backend URL from environment variable or use default
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Proxy the request to the backend
    const response = await axios.get(`${BACKEND_URL}/tutorials`);
    
    // Return the response data
    res.status(200).json(response.data);
  } catch (error) {
    console.error('Error fetching tutorials:', error);
    res.status(500).json({ 
      error: 'Failed to fetch tutorials from backend',
      details: error instanceof Error ? error.message : String(error)
    });
  }
} 