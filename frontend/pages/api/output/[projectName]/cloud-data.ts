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
    const response = await axios.get(`${BACKEND_URL}/output/${projectName}/cloud-data`)
    
    // Return the response from the backend
    return res.status(200).json(response.data)
  } catch (error: any) {
    console.error(`Error fetching cloud data for project ${projectName}:`, error)
    
    // If backend request failed, return appropriate error
    if (error.response) {
      // Return the status and message from the backend if available
      return res.status(error.response.status || 500).json({
        message: error.response.data?.detail || 'Failed to fetch cloud readiness data'
      })
    }
    
    // Generic error
    return res.status(500).json({
      message: error.message || 'An error occurred while fetching cloud readiness data'
    })
  }
} 