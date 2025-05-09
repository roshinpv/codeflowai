import { useState } from 'react'
import axios from 'axios'
import { useRouter } from 'next/router'
import Layout from '../components/Layout'
import Link from 'next/link'
import CloudAnalysisForm from '../components/CloudAnalysisForm'

export default function Home() {
  const router = useRouter()

  return (
    <Layout 
      title="CloudView - Cloud Readiness Analysis" 
      description="Analyze your codebase to assess cloud readiness with comprehensive scoring and recommendations"
      transparentHeader={true}
      withPadding={false}
    >
      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-wf-red to-wf-red/80 pb-32 pt-16">
        <div className="absolute inset-0 bg-pattern opacity-10"></div>
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight animate-fade-in">
            Analyze Your Codebase for <br className="hidden md:block" />
            <span className="text-wf-gold">Cloud Readiness</span>
          </h1>
          <p className="mt-6 max-w-2xl mx-auto text-xl text-white/90 animate-fade-in delay-100">
            Get comprehensive cloud readiness scores, detailed analysis, and actionable recommendations to migrate your application to the cloud
          </p>
        </div>
      </div>

      {/* Form Card */}
      <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 -mt-24 animate-slide-up">
        <CloudAnalysisForm />
      </div>

      {/* Features Section */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-bold text-gray-900">Cloud Readiness Analysis</h2>
          <div className="mt-2 h-1 w-16 bg-wf-red mx-auto rounded-full"></div>
          <p className="mt-4 text-gray-600 max-w-3xl mx-auto">
            Our intelligent analyzer evaluates your codebase against 14 key cloud readiness factors and provides actionable recommendations.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-wf-red" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              ),
              title: "Containerization Analysis",
              description: "Evaluates Docker and Kubernetes configurations and provides containerization recommendations"
            },
            {
              icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-wf-red" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              ),
              title: "Security Assessment",
              description: "Detects hardcoded secrets, analyzes environment variables, and evaluates security best practices"
            },
            {
              icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-wf-red" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                </svg>
              ),
              title: "Cloud Integration",
              description: "Identifies usage of cloud services, evaluates cloud SDKs, and suggests service improvements"
            },
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

      {/* Cloud Readiness Scores Section */}
      <div className="bg-gray-50 py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold text-gray-900">Comprehensive Scoring System</h2>
            <div className="mt-2 h-1 w-16 bg-wf-red mx-auto rounded-full"></div>
            <p className="mt-4 text-gray-600 max-w-3xl mx-auto">
              Your codebase is evaluated across 14 key dimensions of cloud readiness with detailed scoring
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { category: "Language Compatibility", score: 15, description: "Evaluates how well your programming languages work in cloud environments" },
              { category: "Containerization", score: 15, description: "Checks for Docker and Kubernetes configurations" },
              { category: "CI/CD Integration", score: 10, description: "Detects CI/CD pipelines like GitHub Actions, GitLab CI" },
              { category: "Configuration", score: 10, description: "Analyzes environment variables and identifies hardcoded secrets" },
              { category: "Cloud Service Integration", score: 10, description: "Detects usage of AWS, Azure, GCP services" },
              { category: "Service Coupling", score: 5, description: "Analyzes how tightly coupled your app is to external services" },
              { category: "Logging Practices", score: 5, description: "Evaluates structured logging and log level management" },
              { category: "State Management", score: 5, description: "Checks for stateless design patterns" },
              { category: "Code Modularity", score: 5, description: "Analyzes the codebase structure for modularity" },
              { category: "Dependency Management", score: 5, description: "Verifies proper dependency management tools" },
              { category: "Health Checks", score: 5, description: "Identifies health check endpoints" },
              { category: "Testing", score: 5, description: "Evaluates unit and integration tests" },
              { category: "Instrumentation", score: 5, description: "Checks for metrics, tracing, and profiling" },
              { category: "Infrastructure as Code", score: 5, description: "Detects Terraform, CloudFormation, and other IaC tools" },
            ].map((item, index) => (
              <div key={index} className="bg-white p-4 rounded-lg shadow border border-gray-100">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-medium text-gray-900">{item.category}</h3>
                  <span className="text-sm font-bold bg-wf-red/10 text-wf-red px-2 py-1 rounded-full">
                    {item.score}%
                  </span>
                </div>
                <p className="text-sm text-gray-600">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

     
    </Layout>
  )
} 