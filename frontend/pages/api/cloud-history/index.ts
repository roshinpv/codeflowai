import type { NextApiRequest, NextApiResponse } from 'next'
import axios from 'axios'

// Define backend URL from environment or use default
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000'

interface CloudEvaluation {
  id: string
  project_name: string
  timestamp: string
  overall_score: number
  readiness_level: string
  recommendations_count?: number
  job_id?: string
  status?: string
  formatted_date?: string
  formatted_time?: string
}

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

  try {
    // Get the limit parameter or use default
    const limit = parseInt(req.query.limit as string) || 20
    
    // Call the backend API to get evaluations
    const evaluationsPromise = axios.get(`${BACKEND_URL}/latest-evaluations?limit=${limit}`)
    
    // Also get the current jobs to check for running jobs
    const jobsPromise = axios.get(`${BACKEND_URL}/jobs`)
    
    // Wait for both requests to complete
    const [evaluationsResponse, jobsResponse] = await Promise.all([evaluationsPromise, jobsPromise])
    
    // Get evaluations
    let evaluations: CloudEvaluation[] = evaluationsResponse.data.evaluations || []
    
    // Get jobs
    const jobs: JobStatus[] = jobsResponse.data || []
    
    // Add running jobs to the evaluations list
    const runningJobs = jobs.filter(job => job.status === 'running' || job.status === 'failed')
    
    // Map of job IDs already in evaluations to avoid duplicates
    const existingJobIds = new Set(evaluations.filter(e => e.job_id).map(e => e.job_id))
    
    // Add running jobs to evaluations if they're not already there
    for (const job of runningJobs) {
      if (job.project_name && !existingJobIds.has(job.id)) {
        const timestamp = new Date(job.start_time)
        
        // Create an evaluation entry for this running job
        evaluations.push({
          id: `job_${job.id}`,  // Temporary ID
          project_name: job.project_name,
          timestamp: job.start_time,
          overall_score: 0,  // No score yet
          readiness_level: 'Processing...',
          job_id: job.id,
          status: job.status,
          formatted_date: timestamp.toLocaleDateString(),
          formatted_time: timestamp.toLocaleTimeString()
        })
      }
    }
    
    // Add formatted date and time for all evaluations
    evaluations = evaluations.map(evaluation => {
      // If it's already been processed, just return it
      if (evaluation.formatted_date && evaluation.formatted_time) {
        return evaluation
      }
      
      // Add status to each evaluation - default to 'completed' if none is provided
      // This is important for existing evaluations that don't have status
      let status = evaluation.status || 'completed'
      
      // If it has a job_id, check if it's in the running jobs
      if (evaluation.job_id) {
        const matchingJob = jobs.find(job => job.id === evaluation.job_id)
        if (matchingJob) {
          status = matchingJob.status
        }
      }
      
      const date = new Date(evaluation.timestamp)
      return {
        ...evaluation,
        status,
        formatted_date: date.toLocaleDateString(),
        formatted_time: date.toLocaleTimeString()
      }
    })
    
    // Sort by timestamp descending (newest first)
    evaluations.sort((a, b) => {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    })
    
    // Return the response with evaluations
    return res.status(200).json({ 
      evaluations,
      count: evaluations.length
    })
  } catch (error) {
    console.error('Error fetching cloud history:', error)
    
    // Check if it's an axios error with a response
    if (axios.isAxiosError(error) && error.response) {
      return res.status(error.response.status).json({ 
        message: error.response.data?.detail || 'Failed to fetch cloud history',
        evaluations: [] 
      })
    }
    
    // Generic error handling
    return res.status(500).json({ 
      message: 'Failed to fetch cloud history',
      evaluations: []
    })
  }
} 