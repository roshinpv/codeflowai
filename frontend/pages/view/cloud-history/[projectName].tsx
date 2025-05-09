import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import axios from 'axios'
import Layout from '../../../components/Layout'
import Link from 'next/link'

interface CloudEvaluation {
  id: string
  project_name: string
  timestamp: string
  overall_score: number
  readiness_level: string
  job_id?: string
  formatted_date?: string
  formatted_time?: string
}

export default function CloudHistoryPage() {
  const router = useRouter()
  const { projectName } = router.query
  const [evaluations, setEvaluations] = useState<CloudEvaluation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
  // Fetch cloud history data
  useEffect(() => {
    if (!projectName) return
    
    setLoading(true)
    setError('')
    
    axios.get(`/api/cloud-history/${projectName}`)
      .then(response => {
        setEvaluations(response.data.evaluations || [])
        setLoading(false)
      })
      .catch(err => {
        console.error('Error fetching cloud history:', err)
        setError('Failed to load cloud readiness history. Please try again.')
        setLoading(false)
      })
  }, [projectName])
  
  // Return loading state
  if (loading) {
    return (
      <Layout title={`Cloud Readiness History - ${projectName || 'Loading...'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-wf-red"></div>
          </div>
        </div>
      </Layout>
    )
  }
  
  // Return error state
  if (error || !evaluations.length) {
    return (
      <Layout title={`Error - Cloud Readiness History`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">{projectName} - Cloud Readiness History</h1>
            <Link href={`/view/cloud-dashboard/${projectName}`} className="text-wf-red hover:underline flex items-center">
              View Latest Analysis
            </Link>
          </div>
          
          <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error || 'No evaluation history found for this project'}</p>
              </div>
            </div>
          </div>
          <Link href="/" className="text-wf-red hover:underline">
            ← Return to Home
          </Link>
        </div>
      </Layout>
    )
  }
  
  // Get readiness level color class
  const getReadinessColorClass = (level: string) => {
    switch (level) {
      case 'Cloud-Native': return 'bg-green-100 text-green-800 border-green-200'
      case 'Cloud-Ready': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'Cloud-Friendly': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'Cloud-Challenged': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }
  
  // Format timestamp 
  const formatTimestamp = (timestamp: string): string => {
    try {
      const date = new Date(timestamp)
      return date.toLocaleString()
    } catch (e) {
      return timestamp
    }
  }
  
  return (
    <Layout title={`Cloud Readiness History - ${projectName}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{projectName} - Cloud Readiness History</h1>
          <Link href={`/view/cloud-dashboard/${projectName}`} className="text-wf-red hover:underline flex items-center">
            View Latest Analysis
          </Link>
        </div>
        
        <div className="bg-white shadow-sm rounded-lg overflow-hidden border border-gray-200">
          <div className="px-4 py-5 sm:px-6 bg-gray-50 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Evaluation History</h2>
            <p className="mt-1 text-sm text-gray-500">
              View and compare cloud readiness assessments over time
            </p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date & Time
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Readiness Score
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Readiness Level
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {evaluations.map((evaluation) => (
                  <tr key={evaluation.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {evaluation.formatted_date || formatTimestamp(evaluation.timestamp).split(',')[0]}
                      </div>
                      <div className="text-xs text-gray-500">
                        {evaluation.formatted_time || formatTimestamp(evaluation.timestamp).split(',')[1]}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {Math.round(evaluation.overall_score)}/100
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-3 py-1 text-xs font-medium rounded-full ${getReadinessColorClass(evaluation.readiness_level)}`}>
                        {evaluation.readiness_level}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Link 
                        href={`/view/cloud-dashboard/${projectName}?evaluationId=${evaluation.id}`}
                        className="text-wf-red hover:text-wf-red/80 mr-4"
                      >
                        View
                      </Link>
                      <Link 
                        href={`/view/compare-evaluations?baseId=${evaluation.id}`}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        Compare
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  )
} 