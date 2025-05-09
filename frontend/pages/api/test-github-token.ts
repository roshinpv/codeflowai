import type { NextApiRequest, NextApiResponse } from 'next'
import axios from 'axios'

// Define backend URL from environment or use default
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    // Extract token from request body
    const { token } = req.body

    if (!token) {
      return res.status(400).json({ 
        valid: false,
        message: 'GitHub token is required'
      })
    }

    // Forward request to the backend
    const response = await axios.post(`${BACKEND_URL}/test-github-token`, {
      token: token
    })

    // Return the response from the backend
    return res.status(200).json(response.data)
  } catch (error: any) {
    console.error('Error testing GitHub token:', error)
    
    // If backend request failed, return appropriate error
    if (error.response) {
      // Return the status and message from the backend if available
      return res.status(error.response.status || 500).json({
        valid: false,
        message: error.response.data?.message || 'Failed to validate GitHub token'
      })
    }
    
    // Generic error
    return res.status(500).json({
      valid: false,
      message: error.message || 'An error occurred while testing the GitHub token'
    })
  }
} 