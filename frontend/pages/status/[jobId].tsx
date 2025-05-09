import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import axios from 'axios'
import Link from 'next/link'
import Head from 'next/head'

interface JobStatus {
  id: string
  status: string
  start_time: string
  end_time?: string
  project_name?: string
  output_dir?: string
  error?: string
  progress?: number
  current_phase?: string
  phase_index?: number
  phase_progress?: number
  phase_total?: number
  total_phases?: number
  phases?: string[]
  phase_message?: string
  progress_message?: string
  detailed_status?: {
    [key: string]: any
  }
}

export default function JobStatusPage() {
  const router = useRouter()
  const { jobId } = router.query
  const [job, setJob] = useState<JobStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    // Poll job status every 3 seconds
    const fetchStatus = async () => {
      if (!jobId) return

      try {
        const response = await axios.get(`/api/status/${jobId}`)
        setJob(response.data)
        setLoading(false)

        // If job is completed or failed, stop polling
        if (['completed', 'failed'].includes(response.data.status)) {
          return
        }
      } catch (err: any) {
        setError(err.message || 'Failed to fetch job status')
        setLoading(false)
      }
    }

    fetchStatus()
    const intervalId = setInterval(fetchStatus, 3000)

    return () => clearInterval(intervalId)
  }, [jobId])

  const handleDeleteJob = async () => {
    if (!job) return
    
    try {
      await axios.delete(`/api/jobs/${job.id}`)
      router.push('/')
    } catch (err: any) {
      setError(err.message || 'Failed to delete job')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="p-6 text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-wf-red mx-auto mb-4"></div>
          <p className="text-xl text-gray-600">Loading job status...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md p-8 bg-white rounded-lg shadow-md">
          <h1 className="text-2xl font-bold text-wf-red mb-4">Error</h1>
          <p className="text-gray-700 mb-6">{error}</p>
          <Link href="/" className="inline-block bg-wf-red hover:bg-opacity-90 text-white font-bold py-2 px-6 rounded-md transition duration-200">
            Back to Home
          </Link>
        </div>
      </div>
    )
  }

  if (!job) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md p-8 bg-white rounded-lg shadow-md">
          <h1 className="text-2xl font-bold text-wf-red mb-4">Job Not Found</h1>
          <p className="text-gray-700 mb-6">The requested job could not be found.</p>
          <Link href="/" className="inline-block bg-wf-red hover:bg-opacity-90 text-white font-bold py-2 px-6 rounded-md transition duration-200">
            Back to Home
          </Link>
        </div>
      </div>
    )
  }

  // Calculate time elapsed 
  const startTime = new Date(job.start_time);
  const endTime = job.end_time ? new Date(job.end_time) : new Date();
  const elapsedMs = endTime.getTime() - startTime.getTime();
  const elapsedSec = Math.floor(elapsedMs / 1000);
  const minutes = Math.floor(elapsedSec / 60);
  const seconds = elapsedSec % 60;
  const elapsedFormatted = `${minutes}m ${seconds}s`;

  // Format phase progress (if available)
  const phaseProgress = job.phase_progress !== undefined && job.phase_total ? 
    Math.min(100, Math.round((job.phase_progress / job.phase_total) * 100)) : 0;
  
  // Determine the progress message to display
  const progressMessage = job.progress_message || job.phase_message || '';
  
  // Organize detailed status for display
  const detailedStatus = job.detailed_status || {};
  const detailedStatusItems = Object.entries(detailedStatus)
    .map(([key, value]) => ({key, value}))
    .filter(item => item.value !== undefined && item.value !== null);

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>Job Status - {job.project_name || job.id}</title>
        <meta name="description" content="Tutorial generation job status" />
      </Head>

      {/* Header */}
      <header className="bg-wf-red text-white py-4 px-6 shadow-md">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-tight">CloudView</h1>
          <Link href="/" className="hover:underline text-white font-medium">
            Home
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <h2 className="text-2xl font-bold text-gray-800 mb-2 md:mb-0">
                {job.project_name || 'Cloud Analysis'}
              </h2>
              
              <div className="inline-flex items-center">
                <span className={`px-3 py-1 text-sm rounded-full ${
                  job.status === 'completed' ? 'bg-green-100 text-green-800' :
                  job.status === 'failed' ? 'bg-red-100 text-red-800' :
                  job.status === 'running' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                </span>
              </div>
            </div>
          </div>

          <div className="p-6">
            {job.status === 'running' && (
              <div className="mb-6">
                <div className="relative pt-1">
                  {job.progress !== undefined ? (
                    <>
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs font-semibold inline-block text-gray-600">
                            Overall Progress: {job.progress}%
                          </span>
                        </div>
                      </div>
                      <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-gray-200">
                        <div 
                          style={{ width: `${job.progress}%` }} 
                          className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-wf-red transition-all duration-300"
                        ></div>
                      </div>
                    </>
                  ) : (
                    <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-gray-200">
                      <div className="w-full bg-wf-red animate-pulse rounded"></div>
                    </div>
                  )}
                  
                  {/* Current phase information */}
                  {job.current_phase && (
                    <div className="mt-4 mb-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-sm font-semibold inline-block text-gray-700">
                            Current Phase: {job.current_phase} 
                            {job.phase_index !== undefined && job.total_phases && 
                              ` (${job.phase_index + 1}/${job.total_phases})`}
                          </span>
                        </div>
                        {job.phase_progress !== undefined && job.phase_total && (
                          <div>
                            <span className="text-xs font-semibold inline-block text-gray-600">
                              {job.phase_progress}/{job.phase_total} ({phaseProgress}%)
                            </span>
                          </div>
                        )}
                      </div>
                      
                      {/* Phase progress bar */}
                      {job.phase_progress !== undefined && job.phase_total && (
                        <div className="overflow-hidden h-2 mb-1 text-xs flex rounded bg-gray-100">
                          <div 
                            style={{ width: `${phaseProgress}%` }} 
                            className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500 transition-all duration-300"
                          ></div>
                        </div>
                      )}
                      
                      {/* Progress message */}
                      {progressMessage && (
                        <p className="text-sm text-gray-600 mt-1">
                          {progressMessage}
                        </p>
                      )}
                    </div>
                  )}
                  
                  {/* Phases timeline */}
                  {job.phases && job.phases.length > 0 && (
                    <div className="mt-6">
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">Processing Phases:</h4>
                      <div className="flex flex-wrap">
                        {job.phases.map((phase, index) => (
                          <div key={index} className="flex items-center mr-4 mb-2">
                            <div className={`w-3 h-3 rounded-full mr-1 ${
                              job.phase_index === undefined ? 'bg-gray-300' :
                              index < job.phase_index ? 'bg-green-500' :
                              index === job.phase_index ? 'bg-blue-500 animate-pulse' :
                              'bg-gray-300'
                            }`}></div>
                            <span className={`text-xs ${
                              job.phase_index === undefined ? 'text-gray-600' :
                              index < job.phase_index ? 'text-green-700' :
                              index === job.phase_index ? 'text-blue-700 font-medium' :
                              'text-gray-600'
                            }`}>
                              {phase}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Detailed status information */}
                  {detailedStatusItems.length > 0 && (
                    <div className="mt-4 bg-gray-50 p-3 rounded-md">
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">Analysis Status:</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {detailedStatusItems.map(({key, value}) => (
                          <div key={key} className="text-xs">
                            <span className="font-medium text-gray-700">{key.replace(/_/g, ' ')}:</span>{' '}
                            <span className="text-gray-600">{value.toString()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium text-gray-700 mb-2">Job Details</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-gray-500 text-sm">Job ID</p>
                    <p className="font-mono text-sm truncate" title={job.id}>{job.id}</p>
                  </div>
                  
                  {job.project_name && (
                    <div>
                      <p className="text-gray-500 text-sm">Project Name</p>
                      <p className="font-medium">{job.project_name}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium text-gray-700 mb-2">Timing</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-gray-500 text-sm">Started</p>
                    <p>{new Date(job.start_time).toLocaleString()}</p>
                  </div>
                  
                  {job.end_time ? (
                    <div>
                      <p className="text-gray-500 text-sm">Completed</p>
                      <p>{new Date(job.end_time).toLocaleString()}</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-gray-500 text-sm">Time Elapsed</p>
                      <p>{elapsedFormatted}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {job.error && (
              <div className="mb-6 p-4 bg-red-50 border-l-4 border-wf-red rounded-r-md">
                <div className="flex">
                  <svg className="h-6 w-6 text-wf-red mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div>
                    <p className="font-medium text-wf-red">Processing Error</p>
                    <p className="text-sm text-gray-700 mt-1">{job.error}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-3 mt-6">
              <Link href="/" className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none transition duration-150">
                Back to Home
              </Link>

              {job.status === 'completed' && job.project_name && (
                <Link 
                  href={`/view/cloud-dashboard/${job.project_name}`}
                  className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-wf-red hover:bg-opacity-90 focus:outline-none transition duration-150"
                >
                  View Results
                </Link>
              )}

              <button
                onClick={handleDeleteJob}
                className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-wf-red bg-white border-wf-red hover:bg-red-50 focus:outline-none transition duration-150"
              >
                Delete Job
              </button>
            </div>
          </div>
        </div>
      </main>

      <footer className="mt-12 py-6 bg-gray-100">
        <div className="max-w-4xl mx-auto px-6 text-center text-gray-600">
          <p className="text-sm">
            &copy; {new Date().getFullYear()} CloudView
          </p>
        </div>
      </footer>
    </div>
  )
} 