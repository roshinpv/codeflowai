import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import axios from 'axios'
import Link from 'next/link'
import Head from 'next/head'
import CloudDashboard from '../../components/CloudDashboard'

interface CloudData {
  project_name: string
}

export default function ProjectViewPage() {
  const router = useRouter()
  const { projectName } = router.query
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    // If projectName is available, redirect to the cloud dashboard
    if (projectName && typeof projectName === 'string') {
      router.push(`/view/cloud-dashboard/${projectName}`)
    }
  }, [projectName, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="p-6 text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-wf-red mx-auto mb-4"></div>
          <p className="text-xl text-gray-600">Loading dashboard...</p>
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="p-6 text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-wf-red mx-auto mb-4"></div>
        <p className="text-xl text-gray-600">Redirecting to cloud dashboard...</p>
      </div>
    </div>
  )
} 