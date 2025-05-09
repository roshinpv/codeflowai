import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import CloudAnalysisForm from '../components/CloudAnalysisForm'
import Link from 'next/link'

export default function CloudAnalysisPage() {
  const [hasGithubToken, setHasGithubToken] = useState(false)
  
  // Check if GitHub token is configured
  useEffect(() => {
    const token = localStorage.getItem('github_token')
    setHasGithubToken(!!token)
  }, [])
  
  return (
    <Layout>
      <div className="relative bg-gradient-to-br from-wf-red to-wf-red/80 pb-32 pt-8">
        <div className="absolute inset-0 bg-pattern opacity-10"></div>
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight animate-fade-in">
            Cloud Readiness Analysis
          </h1>
          <p className="mt-6 max-w-2xl mx-auto text-xl text-white/90 animate-fade-in delay-100">
            Evaluate your application's readiness for cloud migration with our comprehensive analysis
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-24 relative z-10 mb-12">
        {!hasGithubToken && (
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-5 rounded shadow-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-blue-700">
                  <span className="font-medium">GitHub Token Recommended</span>: Configure a personal access token in{' '}
                  <Link href="/settings" className="underline font-medium">
                    Settings
                  </Link>{' '}
                  to avoid API rate limits when analyzing repositories.
                </p>
              </div>
            </div>
          </div>
        )}
        
        <CloudAnalysisForm />
        
        <div className="mt-12 bg-white shadow-md rounded-lg p-6 border border-gray-200">
          <h2 className="text-xl font-semibold mb-4">About Cloud Readiness Analysis</h2>
          <div className="prose prose-lg max-w-none">
            <p>
              Our cloud readiness analysis evaluates your codebase across 14 dimensions to determine 
              how prepared it is for cloud deployment. We analyze:
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 mt-4">
              <div className="flex items-start">
                <svg className="h-5 w-5 text-green-500 mr-2 mt-0.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Language compatibility</span>
              </div>
              <div className="flex items-start">
                <svg className="h-5 w-5 text-green-500 mr-2 mt-0.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Containerization readiness</span>
              </div>
              <div className="flex items-start">
                <svg className="h-5 w-5 text-green-500 mr-2 mt-0.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>CI/CD Integration</span>
              </div>
              <div className="flex items-start">
                <svg className="h-5 w-5 text-green-500 mr-2 mt-0.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Configuration management</span>
              </div>
              <div className="flex items-start">
                <svg className="h-5 w-5 text-green-500 mr-2 mt-0.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Cloud service integration</span>
              </div>
              <div className="flex items-start">
                <svg className="h-5 w-5 text-green-500 mr-2 mt-0.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Logging and monitoring</span>
              </div>
            </div>
            
            <p className="mt-4">
              Based on the analysis, we'll provide a comprehensive score and actionable recommendations
              to improve your cloud readiness.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-bold text-gray-900">How It Works</h2>
          <div className="mt-2 h-1 w-16 bg-wf-red mx-auto rounded-full"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              number: "01",
              title: "Submit Your Code",
              description: "Provide a GitHub repository URL or a local directory path containing your code."
            },
            {
              number: "02",
              title: "Automated Analysis",
              description: "Our system scans your codebase for cloud readiness indicators across 14 key dimensions."
            },
            {
              number: "03",
              title: "Review Results",
              description: "Get a comprehensive dashboard with scores, visualizations, and actionable recommendations."
            }
          ].map((step, index) => (
            <div key={index} className="relative">
              <div className="absolute -left-4 -top-4 w-12 h-12 rounded-full bg-wf-red/10 flex items-center justify-center text-wf-red font-bold">
                {step.number}
              </div>
              <div className="bg-white shadow-md rounded-lg p-6 pl-8">
                <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                <p className="text-gray-600">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-gray-50 py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold text-gray-900">What We Analyze</h2>
            <div className="mt-2 h-1 w-16 bg-wf-red mx-auto rounded-full"></div>
            <p className="mt-4 text-gray-600 max-w-3xl mx-auto">
              Our comprehensive cloud readiness analysis evaluates your application across 14 dimensions critical for successful cloud deployments
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              "Programming languages & frameworks",
              "Containerization (Docker, Kubernetes)",
              "CI/CD pipeline integration",
              "Configuration management",
              "Cloud service integration",
              "External service coupling",
              "Logging practices",
              "State management",
              "Code modularity",
              "Dependency management",
              "Health check endpoints",
              "Testing coverage",
              "Application instrumentation",
              "Infrastructure as code"
            ].map((item, index) => (
              <div key={index} className="bg-white p-4 rounded-lg shadow-sm flex items-center">
                <div className="w-2 h-2 rounded-full bg-wf-red mr-3"></div>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <div className="bg-blue-50 rounded-lg p-8 shadow-sm">
          <h3 className="text-xl font-semibold text-blue-800 mb-4">Example Projects</h3>
          <p className="text-blue-600 mb-6">
            Try these sample repositories to see how CloudView evaluates different types of applications
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-left mt-8">
            {[
              {
                name: "Express API",
                url: "https://github.com/expressjs/express",
                description: "Node.js web application framework"
              },
              {
                name: "Spring Boot",
                url: "https://github.com/spring-projects/spring-boot",
                description: "Java-based enterprise application framework"
              },
              {
                name: "Django",
                url: "https://github.com/django/django",
                description: "Python web framework"
              }
            ].map((repo, index) => (
              <div key={index} className="bg-white p-4 rounded-lg shadow border border-gray-100">
                <h4 className="font-medium text-blue-700">{repo.name}</h4>
                <p className="text-sm text-gray-600 mt-1">{repo.description}</p>
                <div className="mt-3">
                  <a 
                    href="#" 
                    onClick={(e) => {
                      e.preventDefault();
                      document.getElementById('repo_url')?.setAttribute('value', repo.url);
                      document.querySelector('input[name="repo_url"]')?.dispatchEvent(new Event('change', { bubbles: true }));
                      window.scrollTo({top: 0, behavior: 'smooth'});
                    }}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Use this repository
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  )
} 