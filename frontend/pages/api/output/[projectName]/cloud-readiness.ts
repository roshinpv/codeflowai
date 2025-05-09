import type { NextApiRequest, NextApiResponse } from 'next'
import axios from 'axios'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { projectName } = req.query

  try {
    // Call the backend API to get the cloud readiness report
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000'
    const response = await axios.get(`${backendUrl}/output/${projectName}/cloud-readiness`)
    
    // Return the report
    res.status(200).json(response.data)
  } catch (error: any) {
    console.error('Error fetching cloud readiness report:', error.message)
    
    // Handle 404 specifically
    if (error.response && error.response.status === 404) {
      return res.status(404).json({ 
        message: 'Cloud readiness report not found',
        details: 'The report may not have been generated for this project' 
      })
    }
    
    // Return a generic error for any other issue
    res.status(500).json({ 
      message: 'Failed to fetch cloud readiness report',
      details: error.message
    })
  }
} 