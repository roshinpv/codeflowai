import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import axios from 'axios'
import Layout from '../../components/Layout'
import Link from 'next/link'

interface CloudFactor {
  score: number
  reasoning?: string
  recommendations?: string
}

interface CloudEvaluation {
  id: string
  project_name: string
  timestamp: string
  formatted_date?: string
  formatted_time?: string
  overall_score: number
  readiness_level: string
  data: {
    scores: {
      [key: string]: number
    }
    overall_score: number
    readiness_level: string
    llm_analysis?: any
  }
}

export default function CompareEvaluationsPage() {
  const router = useRouter()
  const { baseId, compareId } = router.query
  const [baseEvaluation, setBaseEvaluation] = useState<CloudEvaluation | null>(null)
  const [compareEvaluation, setCompareEvaluation] = useState<CloudEvaluation | null>(null)
  const [availableEvaluations, setAvailableEvaluations] = useState<CloudEvaluation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
  // Max score map for each category
  const maxScoreMap: Record<string, number> = {
    language_compatibility: 15,
    containerization: 15,
    ci_cd: 10,
    configuration: 10,
    cloud_integration: 10,
    service_coupling: 5,
    logging_practices: 5,
    state_management: 5,
    code_modularity: 5,
    dependency_management: 5,
    health_checks: 5,
    testing: 5,
    instrumentation: 5,
    infrastructure_as_code: 5
  }
  
  // Fetch evaluation data
  useEffect(() => {
    if (!baseId) return
    
    setLoading(true)
    setError('')
    
    // Fetch the base evaluation
    const fetchBaseEvaluation = axios.get(`/api/cloud-evaluation/${baseId}`)
      .then(response => {
        setBaseEvaluation(response.data)
        
        // After we get the base evaluation, fetch other evaluations for the same project
        return axios.get(`/api/cloud-history/${response.data.project_name}`)
          .then(historyResponse => {
            setAvailableEvaluations(historyResponse.data.evaluations || [])
          })
      })
    
    // If compareId is provided, fetch that evaluation as well
    const fetchCompareEvaluation = compareId && typeof compareId === 'string'
      ? axios.get(`/api/cloud-evaluation/${compareId}`)
        .then(response => {
          setCompareEvaluation(response.data)
        })
      : Promise.resolve()
    
    // Run both fetches in parallel
    Promise.all([fetchBaseEvaluation, fetchCompareEvaluation])
      .then(() => {
        setLoading(false)
      })
      .catch(err => {
        console.error('Error fetching evaluations:', err)
        setError('Failed to load evaluation data. Please try again.')
        setLoading(false)
      })
  }, [baseId, compareId])
  
  // Handle selecting a different evaluation to compare
  const handleCompareChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCompareId = e.target.value
    if (newCompareId) {
      router.push(`/view/compare-evaluations?baseId=${baseId}&compareId=${newCompareId}`)
    } else {
      router.push(`/view/compare-evaluations?baseId=${baseId}`)
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
  
  // Calculate score difference and determine color
  const getScoreDifference = (baseScore: number, compareScore: number) => {
    const diff = compareScore - baseScore
    
    if (diff === 0) return { diff: 0, color: 'text-gray-500' }
    
    return {
      diff: diff,
      color: diff > 0 ? 'text-green-600' : 'text-red-600'
    }
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
  
  // Return loading state
  if (loading) {
    return (
      <Layout title="Compare Evaluations - Loading...">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-wf-red"></div>
          </div>
        </div>
      </Layout>
    )
  }
  
  // Return error state
  if (error || !baseEvaluation) {
    return (
      <Layout title="Error - Compare Evaluations">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error || 'Failed to load evaluation data'}</p>
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
  
  return (
    <Layout title={`Compare Evaluations - ${baseEvaluation.project_name}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Compare Cloud Readiness</h1>
          <Link 
            href={`/view/cloud-history/${baseEvaluation.project_name}`}
            className="text-wf-red hover:underline"
          >
            ← Back to History
          </Link>
        </div>
        
        <div className="bg-white shadow-sm rounded-lg overflow-hidden border border-gray-200 mb-8">
          <div className="px-4 py-5 sm:px-6 bg-gray-50 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Evaluation Comparison</h2>
            <p className="mt-1 text-sm text-gray-500">
              Compare cloud readiness metrics between evaluations
            </p>
          </div>
          
          <div className="p-6">
            {/* Evaluation selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* Base evaluation info */}
              <div className="border rounded-lg p-4 bg-blue-50 border-blue-200">
                <h3 className="font-medium text-gray-900 mb-2">Base Evaluation</h3>
                <div className="text-sm text-gray-600">
                  <p><span className="font-medium">Date:</span> {baseEvaluation.formatted_date || formatTimestamp(baseEvaluation.timestamp)}</p>
                  <p className="mt-1"><span className="font-medium">Score:</span> {Math.round(baseEvaluation.overall_score)}/100</p>
                  <p className="mt-1">
                    <span className="font-medium">Readiness:</span> 
                    <span className={`ml-2 inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${getReadinessColorClass(baseEvaluation.readiness_level)}`}>
                      {baseEvaluation.readiness_level}
                    </span>
                  </p>
                </div>
              </div>
              
              {/* Compare evaluation selection */}
              <div className="border rounded-lg p-4 bg-gray-50 border-gray-200">
                <h3 className="font-medium text-gray-900 mb-2">Compare With</h3>
                <select
                  className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  value={compareId || ''}
                  onChange={handleCompareChange}
                >
                  <option value="">Select an evaluation to compare</option>
                  {availableEvaluations
                    .filter(evaluation => evaluation.id !== baseId)
                    .map(evaluation => (
                      <option key={evaluation.id} value={evaluation.id}>
                        {evaluation.formatted_date || formatTimestamp(evaluation.timestamp)} (Score: {Math.round(evaluation.overall_score)})
                      </option>
                    ))}
                </select>
                
                {compareEvaluation && (
                  <div className="mt-3 text-sm text-gray-600">
                    <p><span className="font-medium">Date:</span> {compareEvaluation.formatted_date || formatTimestamp(compareEvaluation.timestamp)}</p>
                    <p className="mt-1"><span className="font-medium">Score:</span> {Math.round(compareEvaluation.overall_score)}/100</p>
                    <p className="mt-1">
                      <span className="font-medium">Readiness:</span> 
                      <span className={`ml-2 inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${getReadinessColorClass(compareEvaluation.readiness_level)}`}>
                        {compareEvaluation.readiness_level}
                      </span>
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Overall score comparison */}
            {compareEvaluation && (
              <>
                <div className="border rounded-lg p-4 mb-8">
                  <h3 className="font-medium text-gray-900 mb-4">Overall Comparison</h3>
                  
                  <div className="grid grid-cols-3 gap-4 mb-2 text-sm font-medium text-gray-700">
                    <div>Metric</div>
                    <div>Base</div>
                    <div>Compare</div>
                  </div>
                  
                  <div className="border-t border-gray-200 pt-2">
                    <div className="grid grid-cols-3 gap-4 py-3 text-sm">
                      <div className="font-medium">Overall Readiness Score</div>
                      <div>{Math.round(baseEvaluation.overall_score)}/100</div>
                      <div className="flex items-center">
                        {Math.round(compareEvaluation.overall_score)}/100
                        {compareEvaluation && (
                          <span className={`ml-2 ${getScoreDifference(
                            baseEvaluation.overall_score, 
                            compareEvaluation.overall_score
                          ).color}`}>
                            {getScoreDifference(
                              baseEvaluation.overall_score, 
                              compareEvaluation.overall_score
                            ).diff > 0 ? '+' : ''}
                            {Math.round(getScoreDifference(
                              baseEvaluation.overall_score, 
                              compareEvaluation.overall_score
                            ).diff)}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 py-3 text-sm border-t border-gray-100">
                      <div className="font-medium">Readiness Level</div>
                      <div>
                        <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${getReadinessColorClass(baseEvaluation.readiness_level)}`}>
                          {baseEvaluation.readiness_level}
                        </span>
                      </div>
                      <div>
                        <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${getReadinessColorClass(compareEvaluation.readiness_level)}`}>
                          {compareEvaluation.readiness_level}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Detailed factors comparison */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-4">Factor Comparison</h3>
                  
                  <div className="grid grid-cols-4 gap-4 mb-2 text-sm font-medium text-gray-700">
                    <div>Factor</div>
                    <div>Base</div>
                    <div>Compare</div>
                    <div>Difference</div>
                  </div>
                  
                  <div className="border-t border-gray-200 pt-2">
                    {Object.entries(baseEvaluation.data.scores).map(([factor, score]) => {
                      const compareScore = compareEvaluation?.data.scores[factor] || 0
                      const { diff, color } = getScoreDifference(score, compareScore)
                      const maxScore = maxScoreMap[factor] || 10
                      
                      // Format the factor name for display
                      const displayName = factor
                        .split('_')
                        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                        .join(' ')
                      
                      return (
                        <div key={factor} className="grid grid-cols-4 gap-4 py-3 text-sm border-t border-gray-100">
                          <div className="font-medium">{displayName}</div>
                          <div>{Math.round(score)}/{maxScore}</div>
                          <div>{Math.round(compareScore)}/{maxScore}</div>
                          <div className={color}>
                            {diff > 0 ? '+' : ''}{Math.round(diff)}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
} 