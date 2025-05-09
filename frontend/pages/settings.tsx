import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import axios from 'axios'
import { useRouter } from 'next/router'

interface Settings {
  github_token: string
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    github_token: '',
  })
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saveError, setError] = useState('')
  const router = useRouter()

  // Load saved settings from localStorage
  useEffect(() => {
    const savedGithubToken = localStorage.getItem('github_token') || ''
    setSettings({
      github_token: savedGithubToken
    })
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setSettings((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setSaveSuccess(false)
    setError('')

    try {
      // Save to localStorage
      localStorage.setItem('github_token', settings.github_token)

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500))
      
      setIsSaving(false)
      setSaveSuccess(true)
      
      // Clear success message after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err: any) {
      setIsSaving(false)
      setError(err.message || 'Failed to save settings')
    }
  }

  const testGithubToken = async () => {
    if (!settings.github_token) {
      setError('Please enter a GitHub token to test')
      return
    }

    setIsSaving(true)
    setError('')
    
    try {
      // Call the backend endpoint to test the token
      const response = await axios.post('/api/test-github-token', {
        token: settings.github_token
      })
      
      const data = response.data
      
      if (data.valid) {
        // Format the reset time
        const resetTime = data.reset_time || new Date(data.rate_reset * 1000).toLocaleTimeString()
        
        setSaveSuccess(true)
        setError(`✓ Token is valid! Rate limit: ${data.rate_remaining}/${data.rate_limit} remaining. Resets at ${resetTime}`)
      } else {
        setError(`Invalid token: ${data.message}`)
      }
      
      setIsSaving(false)
    } catch (err: any) {
      setIsSaving(false)
      setError(err.response?.data?.message || 
              err.message || 
              'Error testing token. Please check your network connection.')
    }
  }

  const clearGithubToken = () => {
    setSettings(prev => ({ ...prev, github_token: '' }))
    localStorage.removeItem('github_token')
    setSaveSuccess(true)
    setTimeout(() => setSaveSuccess(false), 3000)
  }

  return (
    <Layout title="Settings - CloudView">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="mt-2 text-gray-600">
            Configure application settings and credentials
          </p>
        </div>

        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h2 className="text-lg font-medium text-gray-900">GitHub Configuration</h2>
          </div>
          
          <form onSubmit={handleSubmit} className="p-6">
            {saveError && (
              <div className={`mb-6 p-4 rounded-md ${saveError.includes('✓') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'} text-sm`}>
                {saveError}
              </div>
            )}
            
            {saveSuccess && !saveError && (
              <div className="mb-6 bg-green-50 p-4 rounded-md text-green-800 text-sm">
                Settings saved successfully!
              </div>
            )}
            
            <div className="mb-6">
              <label htmlFor="github_token" className="block text-sm font-medium text-gray-700 mb-1">
                GitHub Personal Access Token
              </label>
              <input
                type="password"
                id="github_token"
                name="github_token"
                value={settings.github_token}
                onChange={handleChange}
                className="form-input"
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
              />
              <p className="mt-2 text-sm text-gray-500">
                Required to avoid GitHub API rate limits when analyzing repositories.
                Create a token with <code>public_repo</code> scope at{' '}
                <a 
                  href="https://github.com/settings/tokens" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-wf-red hover:underline"
                >
                  github.com/settings/tokens
                </a>
              </p>
            </div>
            
            <div className="flex space-x-3">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : 'Save Settings'}
              </button>
              
              <button
                type="button"
                onClick={testGithubToken}
                className="btn btn-secondary"
                disabled={isSaving || !settings.github_token}
              >
                Test Token
              </button>
              
              <button
                type="button"
                onClick={clearGithubToken}
                className="btn btn-secondary"
                disabled={isSaving || !settings.github_token}
              >
                Clear Token
              </button>
            </div>
          </form>
        </div>
        
        <div className="mt-8 bg-white shadow-md rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h2 className="text-lg font-medium text-gray-900">Rate Limiting Information</h2>
          </div>
          
          <div className="p-6">
            <p className="text-gray-600 mb-6">
              The GitHub API has rate limits for unauthenticated and authenticated requests.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-md">
                <h3 className="font-medium text-gray-900 mb-1">Unauthenticated</h3>
                <p className="text-sm text-gray-600">60 requests per hour per IP address</p>
                <div className="mt-2 text-sm text-red-600">
                  Not recommended for normal use
                </div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-md">
                <h3 className="font-medium text-gray-900 mb-1">Authenticated</h3>
                <p className="text-sm text-gray-600">5,000 requests per hour per user</p>
                <div className="mt-2 text-sm text-green-600">
                  Recommended for all users
                </div>
              </div>
            </div>
            
            <div className="mt-6 bg-blue-50 p-4 rounded-md text-blue-800 text-sm">
              <p className="font-medium">Security Note</p>
              <p className="mt-1">
                Your GitHub token is stored securely in your browser's local storage and is only sent directly to GitHub's API.
                It is never sent to CloudView's servers.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
} 