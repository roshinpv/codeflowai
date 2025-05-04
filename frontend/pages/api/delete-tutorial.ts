import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

// Get the backend URL from environment variable or use default
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow DELETE requests
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { project_name } = req.query;

  if (!project_name || typeof project_name !== 'string') {
    return res.status(400).json({ error: 'Project name is required' });
  }

  try {
    // Proxy the request to the backend
    const response = await axios.delete(`${BACKEND_URL}/tutorials/${project_name}`);
    
    // Return the response data
    res.status(200).json(response.data);
  } catch (error) {
    console.error('Error deleting tutorial:', error);
    res.status(500).json({ 
      error: 'Failed to delete tutorial from backend',
      details: error instanceof Error ? error.message : String(error)
    });
  }
} 