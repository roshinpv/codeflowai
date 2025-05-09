import { useState, useEffect } from 'react'
import axios from 'axios'
import { useRouter } from 'next/router'
import Link from 'next/link'

// Define default include patterns for all major programming languages and config files
const defaultIncludePatterns = [
  // Make sure to include typical Java project structure
  "**/src/**/*.java",
  "**/src/**/*.kt",
  "**/src/**/*.scala",
  "**/src/**/*.groovy",
  
  // General project files with simplified patterns
  "**/*.json", "**/*.yaml", "**/*.yml", "**/*.xml", "**/*.toml", "**/*.ini", "**/*.config",
  
  // Web and Frontend
  "**/*.html", "**/*.css", "**/*.scss", "**/*.sass", "**/*.less", 
  "**/*.js", "**/*.jsx", "**/*.ts", "**/*.tsx", "**/*.vue", "**/*.svelte",
  
  // Backend Languages - simplified patterns
  "**/*.py", "**/*.rb", "**/*.php", "**/*.java", "**/*.scala", "**/*.kt", "**/*.go",
  "**/*.cs", "**/*.fs", "**/*.vb", "**/*.rs", "**/*.dart", "**/*.swift", "**/*.c",
  "**/*.cpp", "**/*.h", "**/*.hpp", "**/*.cxx", "**/*.cc", "**/*.zig", "**/*.ex", 
  "**/*.exs", "**/*.erl", "**/*.lua", "**/*.pl", "**/*.pm", "**/*.r", "**/*.clj",
  
  // Configuration/Infrastructure
  "**/*.env", "**/.env.*", "**/Dockerfile*", "**/docker-compose*.yml", "**/nginx*.conf",
  "**/serverless.yml", "**/terraform.tf", "**/*.tf", "**/*.tfvars", "**/Chart.yaml",
  "**/Jenkinsfile", "**/.gitlab-ci.yml", "**/.github/workflows/*.yml", "**/ansible*.yml",
  "**/k8s/*.yaml", "**/kubernetes/*.yaml", "**/manifests/*.yaml", "**/*.conf", "**/*.properties",
  
  // Common project config
  "**/package.json", "**/package-lock.json", "**/yarn.lock", "**/pnpm-lock.yaml",
  "**/requirements.txt", "**/setup.py", "**/pyproject.toml", "**/Gemfile", "**/Gemfile.lock",
  "**/composer.json", "**/composer.lock", "**/Cargo.toml", "**/Cargo.lock", "**/pom.xml",
  "**/build.gradle", "**/settings.gradle", "**/*.csproj", "**/*.fsproj", "**/*.sln",
  
  // SQL and database files
  "**/*.sql", "**/*.prisma", "**/*.graphql", "**/*.gql", "**/schema.graphql",
  
  // Catch-all pattern for any source files in standard directories
  "**/src/**/*",
  "**/app/**/*",
  "**/lib/**/*",
  "**/main/**/*",
  "**/test/**/*"
];

// Default exclude patterns
const defaultExcludePatterns = [
  "**/node_modules/**", 
  "**/.git/**", 
  "**/dist/**", 
  "**/build/**", 
  "**/target/**", 
  "**/.next/**",
  "**/.nuxt/**",
  "**/vendor/**",
  "**/__pycache__/**",
  "**/venv/**",
  "**/.venv/**",
];

interface CloudFormData {
  repo_url: string
  local_dir: string
  project_name: string
  max_file_size: number
  use_llm_cloud_analysis: boolean
  include_patterns: string[]
  exclude_patterns: string[]
}

export default function CloudAnalysisForm() {
  const router = useRouter()
  const [formData, setFormData] = useState<CloudFormData>({
    repo_url: '',
    local_dir: '',
    project_name: '',
    max_file_size: 100000,
    use_llm_cloud_analysis: true,
    include_patterns: defaultIncludePatterns,
    exclude_patterns: defaultExcludePatterns
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [jobId, setJobId] = useState('')
  const [hasGithubToken, setHasGithubToken] = useState(false)
  const [showPatterns, setShowPatterns] = useState(false)

  // Check if GitHub token is configured
  useEffect(() => {
    const token = localStorage.getItem('github_token')
    setHasGithubToken(!!token)
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement
    
    // Handle checkbox toggles
    if (type === 'checkbox') {
      setFormData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }))
      return
    }
    
    // Clear the other field if entering something in this field
    if (name === 'repo_url' && value !== '' && formData.local_dir !== '') {
      setFormData(prev => ({ ...prev, [name]: value, local_dir: '' }))
    } else if (name === 'local_dir' && value !== '' && formData.repo_url !== '') {
      setFormData(prev => ({ ...prev, [name]: value, repo_url: '' }))
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
  }

  const fillSampleRepo = (repoUrl: string) => {
    setFormData(prev => ({ ...prev, repo_url: repoUrl, local_dir: '' }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')

    try {
      // Validate input
      if (!formData.repo_url && !formData.local_dir) {
        throw new Error('Please provide either a repository URL or a local directory path')
      }

      // Validate GitHub URL format
      if (formData.repo_url && !formData.repo_url.match(/^https:\/\/github\.com\/[^/]+\/[^/]+/)) {
        throw new Error('Please enter a valid GitHub repository URL (https://github.com/username/repo)')
      }

      // Automatically generate project name if not provided
      let projectName = formData.project_name
      if (!projectName) {
        if (formData.repo_url) {
          // Extract name from repo URL
          const urlParts = formData.repo_url.split('/')
          projectName = urlParts[urlParts.length - 1].replace('.git', '')
        } else if (formData.local_dir) {
          // Extract name from local directory path
          const pathParts = formData.local_dir.split('/')
          projectName = pathParts[pathParts.length - 1]
        }
        // Update form data
        setFormData(prev => ({ ...prev, project_name: projectName }))
      }

      // Get GitHub token if analyzing a repo
      const token = localStorage.getItem('github_token')
      if (formData.repo_url && !token) {
        console.warn("No GitHub token found in localStorage. Analysis may hit rate limits.")
      }

      // Send request to backend
      const requestData = {
        ...formData,
        project_name: projectName,
        github_token: token || undefined,
        include_patterns: formData.include_patterns,
        exclude_patterns: formData.exclude_patterns
      }

      const response = await axios.post('/api/analyze-cloud', requestData)

      // Store job ID
      const newJobId = response.data.id
      setJobId(newJobId)
      
      // Redirect to cloud-history page immediately
      setIsSubmitting(false)
      router.push(`/cloud-history?job_id=${newJobId}`)

      // No need to poll for status here since we're redirecting to the history page
      // The history page will show the job status

    } catch (err: any) {
      setIsSubmitting(false)
      
      // Extract error message
      const errorMessage = err.response?.data?.detail || err.message || 'An error occurred';
      
      // Enhance error message with token suggestion if needed
      if (formData.repo_url && (
          errorMessage.includes('rate limit') || 
          errorMessage.includes('API rate limit') || 
          errorMessage.includes('not found or is private') || 
          errorMessage.includes('404'))) {
        setError(`${errorMessage} Please configure a GitHub token in the Settings page.`)
      } else {
        setError(errorMessage)
      }
    }
  }

  return (
    <div className="bg-white shadow-md rounded-lg p-6 border border-gray-200 relative">
      <h2 className="text-xl font-semibold mb-4 text-center">Analyze Cloud Readiness</h2>
      
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {isSubmitting ? (
        <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center z-10 rounded-lg">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-wf-red mx-auto"></div>
            <p className="mt-4 text-gray-600 max-w-xs">
              {jobId ? (
                <>Analyzing repository... <br /><span className="text-xs">(Job ID: {jobId})</span></>
              ) : (
                'Starting analysis...'
              )}
            </p>
          </div>
        </div>
      ) : null}

      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          {!hasGithubToken && formData.repo_url && (
            <div className="border-l-4 border-yellow-500 bg-yellow-50 p-4 rounded">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-700">
                    <span className="font-medium">GitHub Token Recommended</span>: Analysis may be limited by GitHub's API rate limits. 
                    <Link href="/settings" className="ml-1 text-yellow-800 underline">
                      Configure a token
                    </Link>.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label htmlFor="repo_url" className="block text-sm font-medium text-gray-700">
                GitHub Repository URL
              </label>
              <input
                type="text"
                name="repo_url"
                id="repo_url"
                placeholder="https://github.com/username/repo"
                value={formData.repo_url}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
              <div className="mt-2 text-xs text-gray-500">
                <p>Quick Select:</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  <button 
                    type="button" 
                    className="px-2 py-1 bg-gray-100 rounded text-xs hover:bg-gray-200"
                    onClick={() => fillSampleRepo('https://github.com/langchain-ai/langchain')}
                  >
                    LangChain
                  </button>
                  <button 
                    type="button" 
                    className="px-2 py-1 bg-gray-100 rounded text-xs hover:bg-gray-200"
                    onClick={() => fillSampleRepo('https://github.com/nextauthjs/next-auth')}
                  >
                    NextAuth.js
                  </button>
                  <button 
                    type="button" 
                    className="px-2 py-1 bg-gray-100 rounded text-xs hover:bg-gray-200"
                    onClick={() => fillSampleRepo('https://github.com/vercel/next.js')}
                  >
                    Next.js
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center">
              <div className="w-full flex items-center justify-center text-gray-500">
                <div className="border-t border-gray-300 flex-grow"></div>
                <span className="px-3 text-sm">OR</span>
                <div className="border-t border-gray-300 flex-grow"></div>
              </div>
            </div>

            <div>
              <label htmlFor="local_dir" className="block text-sm font-medium text-gray-700">
                Local Directory Path
              </label>
              <input
                type="text"
                name="local_dir"
                id="local_dir"
                placeholder="/path/to/your/code"
                value={formData.local_dir}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>

            <div>
              <label htmlFor="project_name" className="block text-sm font-medium text-gray-700">
                Project Name (Optional)
              </label>
              <input
                type="text"
                name="project_name"
                id="project_name"
                placeholder="Will be auto-generated if not provided"
                value={formData.project_name}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>

            <div>
              <label htmlFor="max_file_size" className="block text-sm font-medium text-gray-700">
                Max File Size (bytes)
              </label>
              <input
                type="number"
                name="max_file_size"
                id="max_file_size"
                value={formData.max_file_size}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
              <p className="mt-1 text-xs text-gray-500">Files larger than this will be skipped. Default: 100,000 bytes.</p>
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                name="use_llm_cloud_analysis"
                id="use_llm_cloud_analysis"
                checked={formData.use_llm_cloud_analysis}
                onChange={handleChange}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="use_llm_cloud_analysis" className="ml-2 block text-sm text-gray-700">
                Use LLM-based analysis (provides deeper insights, but slower)
              </label>
            </div>

            {/* Advanced Options Toggle */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowPatterns(!showPatterns)}
                className="text-sm text-wf-red flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 mr-1 transition-transform ${showPatterns ? 'rotate-90' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
                Advanced Options
              </button>
            </div>

            {/* File Pattern Settings */}
            {showPatterns && (
              <div className="border rounded-md p-4 bg-gray-50 mt-2">
                <h3 className="text-sm font-medium text-gray-700 mb-2">File Pattern Settings</h3>
                <p className="text-xs text-gray-500 mb-4">
                  CloudView will analyze files matching the include patterns while excluding files matching the exclude patterns.
                  The defaults include all major programming languages and configuration files.
                </p>

                <div className="mb-4">
                  <div className="flex items-center justify-between">
                    <label htmlFor="include_patterns" className="block text-sm font-medium text-gray-700 mb-1">
                      Include Patterns
                    </label>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, include_patterns: defaultIncludePatterns }))}
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      Reset to default
                    </button>
                  </div>
                  <textarea
                    id="include_patterns"
                    name="include_patterns"
                    rows={4}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    value={formData.include_patterns.join('\n')}
                    onChange={(e) => {
                      const patterns = e.target.value.split('\n').filter(pattern => pattern.trim() !== '');
                      setFormData(prev => ({ ...prev, include_patterns: patterns }));
                    }}
                    placeholder="Enter glob patterns, one per line"
                  />
                  <p className="mt-1 text-xs text-gray-500">Examples: *.js, *.py, **/*.json</p>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label htmlFor="exclude_patterns" className="block text-sm font-medium text-gray-700 mb-1">
                      Exclude Patterns
                    </label>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, exclude_patterns: defaultExcludePatterns }))}
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      Reset to default
                    </button>
                  </div>
                  <textarea
                    id="exclude_patterns"
                    name="exclude_patterns"
                    rows={4}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    value={formData.exclude_patterns.join('\n')}
                    onChange={(e) => {
                      const patterns = e.target.value.split('\n').filter(pattern => pattern.trim() !== '');
                      setFormData(prev => ({ ...prev, exclude_patterns: patterns }));
                    }}
                    placeholder="Enter glob patterns, one per line"
                  />
                  <p className="mt-1 text-xs text-gray-500">Examples: node_modules/**, .git/**, dist/**</p>
                </div>
              </div>
            )}
          </div>

          <div className="pt-5">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-wf-red hover:bg-wf-red-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Analyze Cloud Readiness
            </button>
          </div>
        </div>
      </form>
    </div>
  )
} 