import type { NextApiRequest, NextApiResponse } from 'next'
import axios from 'axios'

// Define backend URL from environment or use default
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000'

interface JobStatus {
  id: string
  status: string
  start_time: string
  end_time?: string
  project_name?: string
  output_dir?: string
  error?: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  // Get job ID from the URL
  const { id } = req.query
  
  if (!id) {
    return res.status(400).json({ message: 'Job ID is required' })
  }

  try {
    // Call the backend API to get job status
    const response = await axios.get(`${BACKEND_URL}/status/${id}`)
    
    // Return the job status
    return res.status(200).json(response.data)
  } catch (error) {
    console.error(`Error fetching status for job ${id}:`, error)
    
    // Check if it's an axios error with a response
    if (axios.isAxiosError(error) && error.response) {
      return res.status(error.response.status).json({ 
        message: error.response.data?.detail || 'Failed to fetch job status',
      })
    }
    
    // Generic error handling
    return res.status(500).json({ 
      message: 'Failed to fetch job status'
    })
  }
} 