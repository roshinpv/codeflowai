import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import axios from 'axios'
import Layout from '../../../components/Layout'
import Link from 'next/link'

// Define data interfaces
interface CloudFactor {
  score: number
  reasoning?: string
  recommendations?: string
}

interface LLMAnalysis {
  summary: string
  key_strengths: string[]
  key_weaknesses: string[]
  factors: {
    [key: string]: CloudFactor
  }
}

interface CloudRecommendation {
  category: string
  priority: string
  description: string
  source?: string
}

interface CloudReadinessData {
  technology_stack: any
  architecture: any
  scores: {
    [key: string]: number
  }
  overall_score: number
  readiness_level: string
  recommendations: CloudRecommendation[]
  llm_analysis?: LLMAnalysis
}

interface EvaluationMetadata {
  id: string
  timestamp: string
  formatted_date?: string
}

// Component for displaying factor scores as progress bars
const ScoreBar = ({ 
  name, 
  score, 
  maxScore, 
  description = '' 
}: { 
  name: string; 
  score: number; 
  maxScore: number; 
  description?: string;
}) => {
  // Calculate percentage for the progress bar
  const percentage = Math.min(100, Math.round((score / maxScore) * 100))
  
  // Determine color based on percentage
  let colorClass = 'bg-red-500'
  if (percentage >= 80) colorClass = 'bg-green-500'
  else if (percentage >= 60) colorClass = 'bg-yellow-500'
  else if (percentage >= 40) colorClass = 'bg-orange-500'
  
  // Format the display name
  const displayName = name
    .split('_')
    .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
  
  return (
    <div className="mb-3">
      <div className="flex justify-between items-center mb-1">
        <div className="text-sm font-medium text-gray-700">
          {displayName}
          {description && (
            <span className="ml-2 text-xs text-gray-500">{description}</span>
          )}
        </div>
        <div className="text-sm font-medium text-gray-700">{Math.round(score)}/{maxScore}</div>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div className={`${colorClass} h-2.5 rounded-full transition-all duration-500`} style={{ width: `${percentage}%` }}></div>
      </div>
    </div>
  )
}

export default function CloudDashboardPage() {
  const router = useRouter()
  const { projectName, evaluationId } = router.query
  const [cloudData, setCloudData] = useState<CloudReadinessData | null>(null)
  const [evaluationMeta, setEvaluationMeta] = useState<EvaluationMetadata | null>(null)
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
  
  // Fetch cloud data
  useEffect(() => {
    if (!projectName) return
    
    setLoading(true)
    setError('')
    
    // Build the API URL with or without evaluationId
    let apiUrl = `/api/output/${projectName}/cloud-data`
    if (evaluationId && typeof evaluationId === 'string') {
      apiUrl += `?evaluation_id=${evaluationId}`
    }
    
    // If we have an evaluationId, also fetch the evaluation metadata
    const fetchEvaluation = evaluationId && typeof evaluationId === 'string'
      ? axios.get(`/api/cloud-evaluation/${evaluationId}`)
      : Promise.resolve({ data: null })
    
    // Fetch both data and metadata
    Promise.all([
      axios.get(apiUrl),
      fetchEvaluation
    ])
      .then(([dataResponse, metaResponse]) => {
        setCloudData(dataResponse.data)
        
        if (metaResponse.data) {
          setEvaluationMeta({
            id: metaResponse.data.id,
            timestamp: metaResponse.data.timestamp,
            formatted_date: metaResponse.data.formatted_date || formatTimestamp(metaResponse.data.timestamp)
          })
        }
        
        setLoading(false)
      })
      .catch(err => {
        console.error('Error fetching cloud data:', err)
        setError('Failed to load cloud readiness data. Please try again.')
        setLoading(false)
      })
  }, [projectName, evaluationId])
  
  // Format timestamp 
  const formatTimestamp = (timestamp: string): string => {
    try {
      const date = new Date(timestamp)
      return date.toLocaleString()
    } catch (e) {
      return timestamp
    }
  }
  
  // Color class based on readiness level
  const getReadinessColorClass = (level: string) => {
    switch (level) {
      case 'Cloud-Native': return 'bg-green-100 text-green-800 border-green-200'
      case 'Cloud-Ready': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'Cloud-Friendly': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'Cloud-Challenged': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }
  
  // Priority badge color
  const getPriorityColorClass = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'critical': return 'bg-red-100 text-red-800'
      case 'high': return 'bg-orange-100 text-orange-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }
  
  // Return loading state
  if (loading) {
    return (
      <Layout title={`Cloud Readiness - ${projectName || 'Loading...'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-wf-red"></div>
          </div>
        </div>
      </Layout>
    )
  }
  
  // Return error state
  if (error || !cloudData) {
    return (
      <Layout title="Error - Cloud Readiness">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error || 'Failed to load cloud readiness data'}</p>
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
  
  // Main dashboard view
  return (
    <Layout title={`Cloud Readiness - ${projectName}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{projectName}</h1>
            <div className="flex items-center mt-2">
              <span className={`inline-block px-3 py-1 text-sm font-medium rounded-full ${getReadinessColorClass(cloudData.readiness_level)}`}>
                {cloudData.readiness_level}
              </span>
              <span className="ml-3 text-lg font-semibold">
                {Math.round(cloudData.overall_score)}/100
              </span>
              
              {evaluationMeta && (
                <span className="ml-4 text-sm text-gray-500">
                  Evaluated on: {evaluationMeta.formatted_date}
                </span>
              )}
            </div>
          </div>
          
          <div className="flex space-x-4">
            <Link 
              href={`/view/cloud-history/${projectName}`}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <svg className="mr-2 h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              View History
            </Link>
            
            <Link 
              href={`/view/${projectName}`}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-wf-red hover:bg-wf-red/90"
            >
              View Project
            </Link>
          </div>
        </div>
        
        {/* LLM Analysis Summary (if available) */}
        {cloudData.llm_analysis && (
          <div className="mb-8 bg-white shadow-sm rounded-lg overflow-hidden border border-gray-200">
            <div className="px-4 py-5 sm:px-6 bg-gray-50 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">AI Analysis Summary</h2>
            </div>
            <div className="p-6">
              <p className="text-gray-700 mb-4">{cloudData.llm_analysis.summary}</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <div>
                  <h3 className="font-medium text-green-700 mb-2">Key Strengths</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    {cloudData.llm_analysis.key_strengths.map((strength, i) => (
                      <li key={i} className="text-sm text-gray-700">{strength}</li>
                    ))}
                  </ul>
                </div>
                
                <div>
                  <h3 className="font-medium text-red-700 mb-2">Key Weaknesses</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    {cloudData.llm_analysis.key_weaknesses.map((weakness, i) => (
                      <li key={i} className="text-sm text-gray-700">{weakness}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Score breakdown panel */}
          <div className="col-span-1 bg-white shadow-sm rounded-lg overflow-hidden border border-gray-200">
            <div className="px-4 py-5 sm:px-6 bg-gray-50 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Score Breakdown</h2>
            </div>
            <div className="p-6">
              {Object.entries(cloudData.scores)
                .filter(([key]) => key !== 'overall')
                .sort(([, scoreA], [, scoreB]) => (scoreB as number) - (scoreA as number))
                .map(([key, score]) => (
                  <ScoreBar 
                    key={key}
                    name={key}
                    score={score as number}
                    maxScore={maxScoreMap[key] || 10}
                  />
                ))
              }
            </div>
          </div>
          
          {/* Recommendations panel */}
          <div className="col-span-2 bg-white shadow-sm rounded-lg overflow-hidden border border-gray-200">
            <div className="px-4 py-5 sm:px-6 bg-gray-50 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Recommendations</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {cloudData.recommendations.map((rec, index) => (
                  <div key={index} className="border rounded-md p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex justify-between items-start">
                      <h3 className="font-medium text-gray-900">{rec.category.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}</h3>
                      <div className="flex space-x-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColorClass(rec.priority)}`}>
                          {rec.priority}
                        </span>
                        {rec.source === 'llm' && (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                            AI
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="mt-2 text-sm text-gray-700">{rec.description}</p>
                    
                    {/* If it's an LLM recommendation and we have more details, show them */}
                    {rec.source === 'llm' && cloudData.llm_analysis?.factors[rec.category]?.reasoning && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <details className="text-sm">
                          <summary className="cursor-pointer text-blue-600 hover:text-blue-700">View AI reasoning</summary>
                          <p className="mt-2 text-gray-700">{cloudData.llm_analysis.factors[rec.category].reasoning}</p>
                        </details>
                      </div>
                    )}
                  </div>
                ))}
                
                {cloudData.recommendations.length === 0 && (
                  <div className="text-center py-6 text-gray-500">
                    No recommendations available
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Technology Stack Section */}
        <div className="mt-8 bg-white shadow-sm rounded-lg overflow-hidden border border-gray-200">
          <div className="px-4 py-5 sm:px-6 bg-gray-50 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Technology Stack</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Languages */}
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Languages</h3>
                <div className="space-y-1">
                  {Object.entries(cloudData.technology_stack.languages).map(([lang, count]) => (
                    <div key={lang} className="flex justify-between">
                      <span className="text-sm">{lang}</span>
                      <span className="text-sm text-gray-500">{String(count)}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Frameworks */}
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Frameworks</h3>
                <div className="space-y-1">
                  {Object.entries(cloudData.technology_stack.frameworks).map(([fw, count]) => (
                    <div key={fw} className="flex justify-between">
                      <span className="text-sm">{fw}</span>
                      <span className="text-sm text-gray-500">{String(count)}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Containerization */}
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Containerization</h3>
                <div className="space-y-1">
                  {Object.entries(cloudData.technology_stack.containerization).map(([tech, count]) => (
                    <div key={tech} className="flex justify-between">
                      <span className="text-sm">{tech}</span>
                      <span className="text-sm text-gray-500">{String(count)}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Cloud Services */}
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Cloud Services</h3>
                <div className="space-y-1">
                  {Object.entries(cloudData.technology_stack.cloud_services).map(([service, count]) => (
                    <div key={service} className="flex justify-between">
                      <span className="text-sm">{service}</span>
                      <span className="text-sm text-gray-500">{String(count)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
} 