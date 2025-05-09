import type { NextApiRequest, NextApiResponse } from 'next'
import axios from 'axios'

// Define backend URL from environment or use default
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  const { projectName } = req.query
  
  if (!projectName || typeof projectName !== 'string') {
    return res.status(400).json({ message: 'Project name is required' })
  }

  try {
    // Forward request to the backend
    const response = await axios.get(`${BACKEND_URL}/cloud-history/${projectName}`)
    
    // Return the response from the backend
    return res.status(200).json(response.data)
  } catch (error) {
    console.error('Error fetching cloud history:', error)
    
    // Check if it's an axios error with a response
    if (axios.isAxiosError(error) && error.response) {
      return res.status(error.response.status).json({ 
        message: error.response.data?.detail || 'Failed to fetch cloud history'
      })
    }
    
    // Generic error handling
    return res.status(500).json({ message: 'Failed to fetch cloud history' })
  }
} 