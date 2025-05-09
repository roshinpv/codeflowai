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

  const { limit } = req.query
  const limitValue = limit && typeof limit === 'string' ? parseInt(limit, 10) : 10

  try {
    // Forward request to the backend
    const response = await axios.get(`${BACKEND_URL}/latest-evaluations?limit=${limitValue}`)
    
    // Return the response from the backend
    return res.status(200).json(response.data)
  } catch (error) {
    console.error('Error fetching latest evaluations:', error)
    
    // Check if it's an axios error with a response
    if (axios.isAxiosError(error) && error.response) {
      return res.status(error.response.status).json({ 
        message: error.response.data?.detail || 'Failed to fetch latest evaluations'
      })
    }
    
    // Generic error handling
    return res.status(500).json({ message: 'Failed to fetch latest evaluations' })
  }
} 