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
    // Make sure include_patterns and exclude_patterns are properly formatted as arrays
    const requestBody = {...req.body};
    
    // Ensure patterns are arrays (handle case where they might be strings)
    if (requestBody.include_patterns && !Array.isArray(requestBody.include_patterns)) {
      if (typeof requestBody.include_patterns === 'string') {
        requestBody.include_patterns = requestBody.include_patterns.split('\n').filter((pattern: string) => pattern.trim() !== '');
      } else {
        requestBody.include_patterns = [];
      }
    }
    
    if (requestBody.exclude_patterns && !Array.isArray(requestBody.exclude_patterns)) {
      if (typeof requestBody.exclude_patterns === 'string') {
        requestBody.exclude_patterns = requestBody.exclude_patterns.split('\n').filter((pattern: string) => pattern.trim() !== '');
      } else {
        requestBody.exclude_patterns = [];
      }
    }
    
    // Forward the processed request body to the backend
    const response = await axios.post(`${BACKEND_URL}/analyze-cloud`, requestBody)
    
    // Return the response from the backend
    return res.status(200).json(response.data)
  } catch (error: any) {
    console.error('Error starting cloud analysis:', error)
    
    // If backend request failed, return appropriate error
    if (error.response) {
      // Return the status and message from the backend if available
      return res.status(error.response.status || 500).json({
        detail: error.response.data?.detail || 'Failed to start cloud analysis'
      })
    }
    
    // Generic error
    return res.status(500).json({
      detail: error.message || 'An error occurred while starting the cloud analysis'
    })
  }
} 