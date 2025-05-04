import { useState } from 'react'
import axios from 'axios'
import { useRouter } from 'next/router'
import Layout from '../components/Layout'

interface JobFormData {
  repo_url: string
  local_dir: string
  project_name: string
  language: string
  max_abstractions: number
}

export default function Home() {
  const router = useRouter()
  const [formData, setFormData] = useState<JobFormData>({
    repo_url: '',
    local_dir: '',
    project_name: '',
    language: 'english',
    max_abstractions: 10
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [formTab, setFormTab] = useState<'repo' | 'local'>('repo')

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    
    // Convert to number if the field is max_abstractions
    const processedValue = name === 'max_abstractions' ? parseInt(value) || 10 : value
    
    setFormData({
      ...formData,
      [name]: processedValue
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')

    try {
      // Validate form
      if (formTab === 'repo' && !formData.repo_url) {
        throw new Error('Repository URL is required')
      }
      
      if (formTab === 'local' && !formData.local_dir) {
        throw new Error('Local Directory is required')
      }

      // Clear the field not being used based on the tab
      const dataToSubmit = {
        ...formData,
        repo_url: formTab === 'repo' ? formData.repo_url : '',
        local_dir: formTab === 'local' ? formData.local_dir : '',
      }

      // Call API to generate tutorial
      const response = await axios.post('/api/generate', dataToSubmit)
      
      // Redirect to status page
      router.push(`/status/${response.data.id}`)
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Layout 
      title="CodeFlowAI - Generate Code Tutorials" 
      description="Transform your codebase into comprehensive, structured tutorials with AI"
      transparentHeader={true}
      withPadding={false}
    >
      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-wf-red to-wf-red/80 pb-32 pt-16">
        <div className="absolute inset-0 bg-pattern opacity-10"></div>
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight animate-fade-in">
            Transform Code Into <br className="hidden md:block" />
            <span className="text-wf-gold">Beautiful Documentation</span>
          </h1>
          <p className="mt-6 max-w-2xl mx-auto text-xl text-white/90 animate-fade-in delay-100">
            Generate comprehensive documentation and tutorials from any repository with AI analysis
          </p>
        </div>
      </div>

      {/* Form Card */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 -mt-24 relative z-10 mb-16 animate-slide-up">
        <div className="bg-white rounded-lg shadow-xl border border-gray-100 overflow-hidden">
          <div className="border-b border-gray-100">
            <div className="flex">
              <button
                className={`px-6 py-4 text-sm font-medium focus:outline-none border-b-2 transition-colors ${
                  formTab === 'repo'
                    ? 'text-wf-red border-wf-red'
                    : 'text-gray-500 border-transparent hover:text-gray-700'
                }`}
                onClick={() => setFormTab('repo')}
              >
                GitHub Repository
              </button>
              <button
                className={`px-6 py-4 text-sm font-medium focus:outline-none border-b-2 transition-colors ${
                  formTab === 'local'
                    ? 'text-wf-red border-wf-red'
                    : 'text-gray-500 border-transparent hover:text-gray-700'
                }`}
                onClick={() => setFormTab('local')}
              >
                Local Directory
              </button>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border-l-4 border-wf-red">
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-wf-red mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="p-6">
            {formTab === 'repo' && (
              <div className="mb-6 animate-fade-in">
                <label className="form-label" htmlFor="repo_url">
                  Repository URL
                </label>
                <input
                  id="repo_url"
                  name="repo_url"
                  type="text"
                  className="form-input"
                  placeholder="https://github.com/username/repository"
                  value={formData.repo_url}
                  onChange={handleInputChange}
                />
                <p className="mt-2 text-xs text-gray-500">
                  Enter a public GitHub repository URL
                </p>
              </div>
            )}

            {formTab === 'local' && (
              <div className="mb-6 animate-fade-in">
                <label className="form-label" htmlFor="local_dir">
                  Local Directory
                </label>
                <input
                  id="local_dir"
                  name="local_dir"
                  type="text"
                  className="form-input"
                  placeholder="/path/to/local/directory"
                  value={formData.local_dir}
                  onChange={handleInputChange}
                />
                <p className="mt-2 text-xs text-gray-500">
                  Path to a local code directory (server-side path, not on client)
                </p>
              </div>
            )}

            <div className="mb-6 animate-fade-in delay-100">
              <label className="form-label" htmlFor="project_name">
                Project Name
              </label>
              <input
                id="project_name"
                name="project_name"
                type="text"
                className="form-input"
                placeholder="My Project"
                value={formData.project_name}
                onChange={handleInputChange}
              />
              <p className="mt-2 text-xs text-gray-500">
                Optional. If not provided, will be derived from repository name or directory
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 animate-fade-in delay-200">
              <div>
                <label className="form-label" htmlFor="language">
                  Language
                </label>
                <select
                  id="language"
                  name="language"
                  className="form-select"
                  value={formData.language}
                  onChange={handleInputChange}
                >
                  <option value="english">English</option>
                  <option value="spanish">Spanish</option>
                  <option value="french">French</option>
                  <option value="german">German</option>
                  <option value="chinese">Chinese</option>
                  <option value="japanese">Japanese</option>
                </select>
              </div>

              <div>
                <label className="form-label" htmlFor="max_abstractions">
                  Max Concepts
                </label>
                <input
                  id="max_abstractions"
                  name="max_abstractions"
                  type="number"
                  min="1"
                  max="20"
                  className="form-input"
                  value={formData.max_abstractions}
                  onChange={handleInputChange}
                />
                <p className="mt-2 text-xs text-gray-500">
                  The maximum number of concepts to explain (5-10 recommended)
                </p>
              </div>
            </div>

            <div className="flex items-center justify-center animate-fade-in delay-300">
              <button
                type="submit"
                className="btn btn-primary w-full md:w-auto py-3 px-10"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </span>
                ) : 'Generate Tutorial'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-bold text-gray-900">Key Features</h2>
          <div className="mt-2 h-1 w-16 bg-wf-red mx-auto rounded-full"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-wf-red" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
              ),
              title: "Code Analysis",
              description: "Intelligent scanning identifies key structures and relationships"
            },
            {
              icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-wf-red" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              ),
              title: "Rich Documentation",
              description: "Generated tutorials with diagrams, examples, and explanations"
            },
            {
              icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-wf-red" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                </svg>
              ),
              title: "Interactive Tutorials",
              description: "Navigate through documentation with intuitive organization"
            }
          ].map((feature, index) => (
            <div key={index} className="card p-6 hover-lift">
              <div className="w-12 h-12 mx-auto bg-wf-red/10 rounded-full flex items-center justify-center mb-4">
                {feature.icon}
              </div>
              <h3 className="text-lg font-medium text-center text-gray-900 mb-2">{feature.title}</h3>
              <p className="text-center text-gray-600 text-sm">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  )
} 